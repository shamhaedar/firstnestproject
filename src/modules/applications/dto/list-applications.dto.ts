import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { ApplicationStatus } from '../../../common/enums/index.js';
import { PaginationDto } from '../../../common/pagination/index.js';

export class ListApplicationsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  programId?: number;
}
