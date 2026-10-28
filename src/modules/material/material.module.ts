import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { MaterialService } from './material.service.js';
import { MaterialController } from './material.controller.js';

@Module({
  imports: [PrismaModule , MaterialModule],
  controllers: [MaterialController],
  providers: [MaterialService],
})
export class MaterialModule {}