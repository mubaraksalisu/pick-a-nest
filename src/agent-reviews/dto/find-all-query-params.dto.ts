import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

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
  userId?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  agentId?: string;
}
