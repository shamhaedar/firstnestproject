import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SessionsService } from '../modules/sessions/sessions.service.js';
import type { AuthUser } from '../common/types/auth-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly sessions: SessionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      ignoreExpiration: false,
    });
  }

  /** بيتأكد إن الـ token من نوع access وإن الجلسة لسا فعّالة (logout بيبطل الـ access token فورًا) */
  async validate(payload: { sub: number; role: AuthUser['role']; sid: number; type: string }): Promise<AuthUser> {
    if (payload.type !== 'access' || !(await this.sessions.isActive(payload.sid, payload.sub))) {
      throw new UnauthorizedException('Session expired, please log in again');
    }
    return { id: payload.sub, role: payload.role, sid: payload.sid };
  }
}
