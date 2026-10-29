import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Res,
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
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { ListMaterialsDto } from './dto/list-materials.dto.js';
import { MaterialsService } from './materials.service.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  /** multipart/form-data: title + file */
  @Post('programs/:programId/materials')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  @UseInterceptors(FileInterceptor('file', multerOptions('material')), UploadGuardInterceptor)
  create(
    @Param('programId', ParseIntPipe) programId: number,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMaterialDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.materials.create(programId, user, dto, file);
  }

  @Get('programs/:programId/materials')
  list(
    @Param('programId', ParseIntPipe) programId: number,
    @CurrentUser() user: AuthUser,
    @Query() q: ListMaterialsDto,
  ) {
    return this.materials.list(programId, user, q);
  }

  @Get('materials/:id/download')
  download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.materials.download(id, user, res);
  }

  @Delete('materials/:id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.materials.remove(id, user);
  }
}
