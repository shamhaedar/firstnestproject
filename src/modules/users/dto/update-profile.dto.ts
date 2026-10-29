import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be 7-15 digits, optional leading +' })
  phone?: string;
}
