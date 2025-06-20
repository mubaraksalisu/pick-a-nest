import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @IsOptional()
  description: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  icon: string;
}
