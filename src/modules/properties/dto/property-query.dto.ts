import { Type } from 'class-transformer';
import { IsOptional, IsEnum } from 'class-validator';

export class PropertyQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  city?: string;

  @IsOptional()
  state?: string;

  @IsOptional()
  @IsEnum(['rent', 'sell'])
  type?: 'rent' | 'sell';

  @IsOptional()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @IsOptional()
  @IsEnum(['price', 'createdAt'])
  sortBy?: 'price' | 'createdAt' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  search?: string;
}
