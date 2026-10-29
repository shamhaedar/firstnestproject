import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { multerOptions } from '../../common/upload/upload.config.js';
import { UploadGuardInterceptor } from '../../common/upload/upload-guard.interceptor.js';
import { ApplicationsService } from './applications.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { ListApplicationsDto } from './dto/list-applications.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-status.dto.js';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  /** الشاب بيقدّم: multipart/form-data (programId + [cv]) */
  @Post()
  @Roles(Role.YOUTH)
  @UseInterceptors(FileInterceptor('cv', multerOptions('cv')), UploadGuardInterceptor)
  apply(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateApplicationDto,
    @UploadedFile() cv?: Express.Multer.File,
  ) {
    return this.applications.apply(user, dto.programId, cv);
  }

  /** طلباتي + حالتها */
  @Get('my')
  @Roles(Role.YOUTH)
  mine(@CurrentUser() user: AuthUser, @Query() q: ListApplicationsDto) {
    return this.applications.mine(user, q);
  }

  /** الأدمن: كل الطلبات | المشرف: طلبات برامجه */
  @Get()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  listAll(@CurrentUser() user: AuthUser, @Query() q: ListApplicationsDto) {
    return this.applications.listAll(user, q);
  }

  @Patch(':id/cancel')
  @Roles(Role.YOUTH)
  cancel(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.cancel(user, id);
  }

  /** قبول/رفض: الأدمن فقط */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  decide(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApplicationStatusDto) {
    return this.applications.decide(id, dto.status);
  }

  @Get(':id/cv')
  downloadCv(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.applications.downloadCv(user, id, res);
  }
}
