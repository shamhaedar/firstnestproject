import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;
}

export const toSkipTake = (p: { page: number; limit: number }) => ({
  skip: (p.page - 1) * p.limit,
  take: p.limit,
});

export function paginated<T>(data: T[], total: number, p: { page: number; limit: number }) {
  return {
    data,
    meta: { total, page: p.page, limit: p.limit, totalPages: Math.ceil(total / p.limit) },
  };
}
