import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEventsDto {
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
  size: number = 20;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsIn(['movie', 'show'])
  type?: 'movie' | 'show';

  @IsOptional()
  @IsString()
  date?: string;
}
