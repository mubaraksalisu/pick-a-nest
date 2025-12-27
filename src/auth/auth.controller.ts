import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import { Request } from 'express';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthPayloadDto } from './dto/auth.dto';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalGuard)
  @Post('login')
  @ApiResponse({ status: 201, description: 'user login success', type: String })
  login(@Req() req: Request, @Body(ValidationPipe) authDto: AuthPayloadDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiResponse({ status: 201, description: 'Create a new user' })
  register(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiResponse({ status: 200, description: 'Return user profile' })
  profile(@Req() req: Request) {
    return req.user;
  }
}
