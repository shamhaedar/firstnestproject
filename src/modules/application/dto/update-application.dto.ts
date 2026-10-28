import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}


export class UpdateApplicationDto {
  @IsEnum(ApplicationStatus, { message: 'Invalid status value' })
  @IsOptional()
  status?: ApplicationStatus;

  @IsString()
  @IsOptional()
  adminMessage?: string;
}