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
import { SessionService } from './course-session.service.js';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { CreateSessionDto } from './dto/create-course-session.dto.js';
import { UpdateSessionDto } from '../session/dto/update-session.dto.js';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionService.create(createSessionDto);
  }

  @Get()
  findAll() {
    return this.sessionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sessionService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateSessionDto: UpdateSessionDto
  ) {
    return this.sessionService.update(id, updateSessionDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sessionService.remove(id);
  }
}