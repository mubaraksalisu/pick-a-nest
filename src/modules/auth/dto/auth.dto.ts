import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Request } from 'express';
import { UserResponseDto } from 'src/modules/users/dto/create-user.dto';

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

export class LoginDto {
  accessToken: string;
  refreshToken: string;
}

export class AuthenticatedRequest extends Request {
  user: UserResponseDto;
}

export class RegisterationDto {
  accessToken: string;
  refreshToken: string;
  user: UserResponseDto;
}

export class RefreshDto {
  refreshToken: string;
}
