import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class FindAllQueryParamsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  userId?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @IsMongoId()
  agentId?: string;
}
