import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  ParseIntPipe 
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt.auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ApplicationService } from './application.service.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { UpdateApplicationDto } from './dto/update-application.dto.js';


@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  
  @Post()
  create(@Req() req: any, @Body() createApplicationDto: CreateApplicationDto) {
    const userId = req.user.id; 
    return this.applicationService.create(userId, createApplicationDto);
  }

  
  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.applicationService.findAll();
  }
  
   @Get('my-applications')
  @UseGuards(JwtAuthGuard) 
  findMyApplications(@Req() req: any) {
    const userId = req.user.id; 
    return this.applicationService.findUserApplications(userId);
  }

 
  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.applicationService.findOne(id);
  }

  
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateApplicationDto: UpdateApplicationDto
  ) {
    return this.applicationService.update(id, updateApplicationDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.applicationService.remove(id);
  }
  
  
  @Patch(':id/status')
  @Roles(Role.ADMIN) 
  async changeApplicationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string, 
  ) {
    return this.applicationService.updateStatus(id, status);
  }
 
}