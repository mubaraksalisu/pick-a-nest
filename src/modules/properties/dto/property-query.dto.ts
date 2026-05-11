import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PropertyQueryDto {
  page?: number = 1;
  limit?: number = 10;

  city?: string;
  state?: string;

  type?: 'rent' | 'sale';

  minPrice?: number;
  maxPrice?: number;

  bedrooms?: number;
  bathrooms?: number;

  sortBy?: 'price' | 'createdAt' = 'createdAt';
  sortOrder?: 'asc' | 'desc' = 'desc';

  search?: string;
}
