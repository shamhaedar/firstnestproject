import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/index.js';
import { Role } from '../../../common/enums/index.js';

export class ListUsersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
