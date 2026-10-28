import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/Register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt.auth.guard.js'; 
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.register(registerDto, userAgent);
  }

  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(loginDto, userAgent);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

 
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: any) {

    return this.authService.getMyProfile(req.user.sub);
  }


@UseGuards(JwtAuthGuard)
@Post('logout')
async logout(@Req() req: any) {
  const sessionId = req.user.sid;
  return this.authService.logout(sessionId);
}
}