import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsNotEmpty({ message:'write your full name' })
  @IsString()
  fullName: string;

  @IsNotEmpty({ message: 'write your email' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'write your password' })
  @MinLength(6, { message:'password must be at least 6 characters long' })
  @IsString()
  password: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  phone?: string;
}