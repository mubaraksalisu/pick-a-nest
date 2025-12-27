import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AuthPayloadDto {
  @IsEmail()
  @MinLength(5)
  @MaxLength(255)
  @ApiProperty({
    example: 'mail@email.com',
    description: 'email address of the user',
  })
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @ApiProperty({ example: '12345', description: 'password of the user' })
  password: string;
}
