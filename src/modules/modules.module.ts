import { Module } from '@nestjs/common';
import { AnnouncementsModule } from './announcements/announcements.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { CourseSessionsModule } from './course-sessions/course-sessions.module.js';
import { MaterialsModule } from './materials/materials.module.js';
import { ProgramsModule } from './programs/programs.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { UsersModule } from './users/users.module.js';

/** تجميع كل modules الجداول بمكان واحد (app.module بيستورد هاد بس) */
@Module({
  imports: [
    UsersModule,
    SessionsModule,
    ProgramsModule,
    CourseSessionsModule,
    ApplicationsModule,
    MaterialsModule,
    AnnouncementsModule,
  ],
})
export class ModulesModule {}
