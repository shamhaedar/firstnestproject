import { Module } from '@nestjs/common';
import { ProgramsModule } from '../programs/programs.module.js';
import { MaterialsController } from './materials.controller.js';
import { MaterialsService } from './materials.service.js';

@Module({
  imports: [ProgramsModule],
  controllers: [MaterialsController],
  providers: [MaterialsService],
})
export class MaterialsModule {}
