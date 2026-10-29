import { Body, Controller, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '../common/enums/index.js';
import { CurrentUser, Roles } from '../common/decorators/index.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

// حماية من brute force: عدد محاولات قليل بالدقيقة (قابل للتعديل من .env للاختبار)
const strict = (envKey: string, fallback: number) => ({
  default: { limit: () => Number(process.env[envKey] ?? fallback), ttl: 60_000 },
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** تسجيل شاب (مفتوح للعموم) */
  @Post('register')
  @Throttle(strict('REGISTER_THROTTLE_LIMIT', 10))
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto, Role.YOUTH);
  }

  /** إنشاء مشرف: بس الأدمن */
  @Post('register/supervisor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  registerSupervisor(@Body() dto: RegisterDto) {
    return this.auth.register(dto, Role.SUPERVISOR);
  }

  /** إنشاء أدمن جديد: بس أدمن موجود (أول أدمن بيجي من الـ seed) */
  @Post('register/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  registerAdmin(@Body() dto: RegisterDto) {
    return this.auth.register(dto, Role.ADMIN);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(strict('LOGIN_THROTTLE_LIMIT', 5))
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent?: string) {
    return this.auth.login(dto, userAgent);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(strict('REFRESH_THROTTLE_LIMIT', 20))
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  logout(@CurrentUser('sid') sid: number) {
    return this.auth.logout(sid);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  me(@CurrentUser('id') id: number) {
    return this.auth.me(id);
  }
}
