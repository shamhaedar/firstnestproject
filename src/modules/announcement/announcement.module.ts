import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AnnouncementController } from './announcement.controller.js';
import { AnnouncementService } from './announcement.service.js';
import { BullModule } from '@nestjs/bullmq';
import { AnnouncementProcessor } from '../../mq/announcement.processor.js';


@Module({
  imports: [PrismaModule,
        BullModule.registerQueue({
      name: 'announcement-image-queue', 
    }),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService , AnnouncementProcessor],
})
export class AnnouncementModule {}