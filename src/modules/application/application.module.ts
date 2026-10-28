import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ApplicationController } from './application.controller.js';
import { ApplicationService } from './application.service.js';
import { MailModule } from '../../mail/mail.module.js';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ApplicationController],
  providers: [ApplicationService],
})
export class ApplicationModule {}