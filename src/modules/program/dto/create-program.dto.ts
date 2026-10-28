import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty({ message: 'Program title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
  
}