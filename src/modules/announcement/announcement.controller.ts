import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AnnouncementService } from './announcement.service.js';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { CreateAnnouncementDto } from './dto/create-announcement.dto.js';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto.js';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    return this.announcementService.create(createAnnouncementDto);
  }

  @Get()
  findAll() {
    return this.announcementService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.announcementService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateAnnouncementDto: UpdateAnnouncementDto
  ) {
    return this.announcementService.update(id, updateAnnouncementDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.announcementService.remove(id);
  }
}