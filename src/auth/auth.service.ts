import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { Role } from '../common/enums/index.js';
import { SessionsService, REFRESH_TTL_DAYS } from '../modules/sessions/sessions.service.js';
import { NotificationsService } from '../queue/notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 10;
// hash وهمي: بنقارن معه إذا الإيميل مو موجود حتى يبقى زمن الرد متساوي (يمنع user enumeration بالتوقيت)
const DUMMY_HASH = bcrypt.hashSync('dummy-password', BCRYPT_ROUNDS);

const PUBLIC_USER = { id: true, fullName: true, email: true, role: true, phone: true, createdAt: true } as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: SessionsService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto, role: Role) {
    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    try {
      const user = await this.prisma.user.create({
        data: { fullName: dto.fullName, email: dto.email, phone: dto.phone, password, role },
        select: PUBLIC_USER,
      });
      this.notifications.welcome(user);
      return user;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw e;
    }
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const ok = await bcrypt.compare(dto.password, user?.password ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');

    const session = await this.sessions.create(user.id, userAgent);
    const tokens = await this.issueTokens(user.id, user.role, session.id);
    return {
      ...tokens,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    let payload: { sub: number; sid: number; type?: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');

    const session = await this.sessions.findById(payload.sid);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const oldHash = this.hash(refreshToken);
    const access = await this.signAccess(user.id, user.role, session.id);
    const refresh = await this.signRefresh(user.id, session.id);

    // إذا الـ refresh token انستخدم من قبل (أو بنفس اللحظة) => الـ rotation بيفشل => بنلغي الجلسة كلها
    const rotated = await this.sessions.rotate(session.id, oldHash, this.hash(refresh));
    if (!rotated) {
      await this.sessions.revoke(session.id);
      throw new UnauthorizedException('Refresh token reuse detected, please log in again');
    }
    return { access_token: access, refresh_token: refresh };
  }

  async logout(sid: number) {
    await this.sessions.revoke(sid);
    return { message: 'Logged out' };
  }

  async me(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: PUBLIC_USER });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async issueTokens(userId: number, role: Role, sid: number) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccess(userId, role, sid),
      this.signRefresh(userId, sid),
    ]);
    await this.sessions.setHash(sid, this.hash(refresh_token));
    return { access_token, refresh_token };
  }

  private signAccess(userId: number, role: Role, sid: number) {
    return this.jwt.signAsync(
      { sub: userId, role, sid, type: 'access' },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get('JWT_ACCESS_EXPIRES') ?? '15m') as JwtSignOptions['expiresIn'],
      },
    );
  }

  private signRefresh(userId: number, sid: number) {
    return this.jwt.signAsync(
      { sub: userId, sid, type: 'refresh', jti: randomUUID() },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: `${REFRESH_TTL_DAYS}d` as JwtSignOptions['expiresIn'],
      },
    );
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
