import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { multerOptions } from '../../common/upload/upload.config.js';
import { UploadGuardInterceptor } from '../../common/upload/upload-guard.interceptor.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { ListProgramsDto } from './dto/list-programs.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';
import { ProgramsService } from './programs.service.js';

const imageUpload = () => [FileInterceptor('image', multerOptions('image')), UploadGuardInterceptor];

@Controller('programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  /** كل المستخدمين: تصفح + بحث + pagination */
  @Get()
  list(@Query() q: ListProgramsDto) {
    return this.programs.list(q);
  }

  /** برامج المشرف الحالي */
  @Get('mine')
  @Roles(Role.SUPERVISOR)
  mine(@CurrentUser() user: AuthUser, @Query() q: ListProgramsDto) {
    return this.programs.mine(user, q);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programs.findOne(id);
  }

  /** multipart/form-data: title, description, totalSeats, [supervisorId للأدمن], [image] */
  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @UseInterceptors(...imageUpload())
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProgramDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.programs.create(user, dto, image);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @UseInterceptors(...imageUpload())
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProgramDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.programs.update(id, user, dto, image);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.programs.remove(id, user);
  }
}
