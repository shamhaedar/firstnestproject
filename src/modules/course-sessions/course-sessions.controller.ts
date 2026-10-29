import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { CourseSessionsService } from './course-sessions.service.js';
import { CreateCourseSessionDto } from './dto/create-course-session.dto.js';
import { UpdateCourseSessionDto } from './dto/update-course-session.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourseSessionsController {
  constructor(private readonly service: CourseSessionsService) {}

  @Get('programs/:programId/course-sessions')
  list(@Param('programId', ParseIntPipe) programId: number) {
    return this.service.listByProgram(programId);
  }

  @Post('programs/:programId/course-sessions')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(
    @Param('programId', ParseIntPipe) programId: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCourseSessionDto,
  ) {
    return this.service.create(programId, user, dto);
  }

  @Patch('course-sessions/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Body() dto: UpdateCourseSessionDto) {
    return this.service.update(id, user, dto);
  }

  @Delete('course-sessions/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
