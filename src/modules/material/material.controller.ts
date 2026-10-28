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
import { Role } from '../../common/enums/index.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { MaterialService } from './material.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';


@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard) 
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  create(@Body() createMaterialDto: CreateMaterialDto) {
    return this.materialService.create(createMaterialDto);
  }


  @Get()
  findAll() {
    return this.materialService.findAll();
  }


  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialService.findOne(id);
  }

  
  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateMaterialDto: UpdateMaterialDto
  ) {
    return this.materialService.update(id, updateMaterialDto);
  }


  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.materialService.remove(id);
  }
}