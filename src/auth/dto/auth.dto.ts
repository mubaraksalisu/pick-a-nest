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

export class LoginDto {
  accessToken: string;
  refreshToken: string;
}

export class Profile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  active: boolean;
  imageUrl: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export class RegisterationDto {
  accessToken: string;
  refreshToken: string;
  user: Profile;
}

export class RefreshDto {
  refreshToken: string;
}
