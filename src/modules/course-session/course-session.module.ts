import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SessionController } from '../session/session.controller.js';
import { SessionService } from './course-session.service.js';


@Module({
  imports: [PrismaModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}