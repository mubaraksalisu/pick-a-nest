import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePropertyReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  @IsOptional()
  rating: number;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @IsOptional()
  @IsNotEmpty()
  comment: string;
}
