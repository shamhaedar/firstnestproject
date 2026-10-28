import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ProgramController } from './program.controller.js';
import { ProgramService } from './program.service.js';


@Module({
  imports: [PrismaModule],
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramModule {}