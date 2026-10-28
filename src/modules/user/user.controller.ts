import { 
  Controller, 
  Get, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  ParseIntPipe 
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt.auth.guard.js'; 
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { UserService } from './user.service.js';
import { Roles } from '../../common/decorator/roles.decorator.js';
import { Role } from '../../common/enums/index.js';


@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) 
export class UserController {
  constructor(private readonly userService: UserService) {}

 
  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.userService.findAll();
  }

 
  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERVISOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: { fullName?: string; phone?: string; role?: Role.ADMIN|Role.SUPERVISOR }
  ) {
    return this.userService.update(id, updateData);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}