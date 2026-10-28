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
import { ProgramService } from './program.service.js';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { CreateProgramDto } from './dto/create-program.dto.js';
import { UpdateProgramDto } from './dto/update-program.dto.js';


@Controller('programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgramController {
  constructor(private readonly programService: ProgramService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(@Body() createProgramDto: CreateProgramDto) {
    return this.programService.create(createProgramDto);
  }
 @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.programService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.programService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateProgramDto: UpdateProgramDto
  ) {
    return this.programService.update(id, updateProgramDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.programService.remove(id);
  }
}