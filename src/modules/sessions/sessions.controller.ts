import { Controller, Delete, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { SessionsService } from './sessions.service.js';

/** أجهزتي/جلساتي الفعّالة + إنهاء جلسة معينة */
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  mine(@CurrentUser('id') userId: number) {
    return this.sessions.listActive(userId);
  }

  @Delete(':id')
  revoke(@CurrentUser('id') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.sessions.revokeOwn(userId, id);
  }
}
