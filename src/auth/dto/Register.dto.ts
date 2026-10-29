import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName: string;

  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // حد bcrypt
  password: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be 7-15 digits, optional leading +' })
  phone?: string;
}
