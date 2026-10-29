import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class CreateApplicationDto {
  @Type(() => Number)
  @IsInt()
  programId: number;
}
