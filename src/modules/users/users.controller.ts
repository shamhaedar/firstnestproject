import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  list(@Query() q: ListUsersDto) {
    return this.users.list(q);
  }

  @Patch('me')
  updateMe(@CurrentUser('id') id: number, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(id, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.users.findOne(id);
  }
}
