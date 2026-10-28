import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Session name is required' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}