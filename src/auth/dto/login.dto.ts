import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'write your email' })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'write your password' })
  @IsString()
  password: string;
}