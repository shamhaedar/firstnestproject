import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/Register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerData: RegisterDto, userAgent?: string) {
    const existUser = await this.prismaService.user.findUnique({
      where: { email: registerData.email },
    });

    if (existUser) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await bcrypt.hash(registerData.password, 10);
    
    
    const user = await this.prismaService.user.create({
      data: {
        fullName: registerData.fullName,
        email: registerData.email,
        password: hashedPassword,
        phone: registerData.phone,
        role: registerData.role || 'YOUTH',
      },
      omit: { password: true },
    });

    
    const session = await this.prismaService.session.create({
      data: {
        userId: user.id,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
        refreshTokenHash: '',
      },
    });

    
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user.id,
          role: user.role,
          sid: session.id,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user.id,
          sid: session.id,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

   
    const hashedRefreshToken = this.hash(refresh_token);
    await this.prismaService.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashedRefreshToken },
    });

    return {
      message: 'User registered successfully',
      access_token,
    };
  }

  async login(loginData: LoginDto, userAgent?: string) {
    const existUser = await this.prismaService.user.findUnique({
      where: { email: loginData.email },
    });

    if (!existUser) {
      throw new UnauthorizedException('Email or password incorrect');
    }

    const isPasswordCorrect = await bcrypt.compare(
      loginData.password,
      existUser.password,
    );

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Email or password incorrect');
    }

   
    const session = await this.prismaService.session.create({
      data: {
        userId: existUser.id,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        refreshTokenHash: '',
      },
    });

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: existUser.id,
          role: existUser.role,
          sid: session.id,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: existUser.id,
          sid: session.id,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    const hashedRefreshToken = this.hash(refresh_token);
    await this.prismaService.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: hashedRefreshToken,
      },
    });

    const { password: _, ...userWithoutPassword } = existUser;
    return {
      message: 'Logged in successfully',
      access_token,
    };
  }

  async getMyProfile(id: number) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: id,
      },
      omit: {
        password: true,
      },
    });
    if (user) {
      return user;
    } else {
      throw new NotFoundException('User not found');
    }
  }

  async refreshToken(refreshToken: string) {
    let payload: { sub: number; sid: number };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prismaService.session.findUnique({
      where: {
        id: payload.sid,
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

   
    if (session.refreshTokenHash !== this.hash(refreshToken)) {
      await this.prismaService.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Security violation: Refresh token reuse detected');
    }

    const existUser = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!existUser) {
      throw new NotFoundException('User not found');
    }

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: existUser.id,
          role: existUser.role,
          sid: session.id,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        },
      ),

      this.jwtService.signAsync(
        {
          sub: existUser.id,
          sid: session.id,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        },
      ),
    ]);

    const hashedRefreshToken = this.hash(refresh_token);
    await this.prismaService.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: hashedRefreshToken,
      },
    });

    return { access_token, refresh_token };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  async logout(sessionId: number) {
  await this.prismaService.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  return {
    message: 'Logged out successfully',
  };
}
}