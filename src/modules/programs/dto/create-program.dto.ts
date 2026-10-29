import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// ملاحظة: الطلب multipart/form-data فكل القيم بتوصل strings، لهيك @Type(() => Number)
export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  totalSeats: number;

  /** للأدمن بس (مطلوب عند إنشاء برنامج). المشرف بيصير هو المشرف تلقائيًا. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supervisorId?: number;
}
