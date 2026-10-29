import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCourseSessionDto {
  /** تاريخ الجلسة (ISO)، مثال: 2026-11-05 */
  @IsDateString()
  date: string;

  /** وقت الجلسة (ISO datetime)، مثال: 2026-11-05T10:00:00Z */
  @IsDateString()
  time: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  locationOrLink: string;
}
