import { Module } from '@nestjs/common';
import { ProgramsModule } from '../programs/programs.module.js';
import { CourseSessionsController } from './course-sessions.controller.js';
import { CourseSessionsService } from './course-sessions.service.js';

@Module({
  imports: [ProgramsModule],
  controllers: [CourseSessionsController],
  providers: [CourseSessionsService],
})
export class CourseSessionsModule {}
