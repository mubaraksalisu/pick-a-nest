import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Length(3, 50, { each: true })
  localGovernmentAreas: string[];
}
