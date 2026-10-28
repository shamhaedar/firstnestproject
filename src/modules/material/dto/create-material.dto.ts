import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'File URL is required' })
  fileUrl: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Course session ID is required' })
  courseSessionId: number;
}