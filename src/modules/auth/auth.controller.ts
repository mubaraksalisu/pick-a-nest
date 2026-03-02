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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  AuthPayloadDto,
  LoginDto,
  Profile,
  RefreshDto,
  RegisterationDto,
} from './dto/auth.dto';

@Throttle({ default: { limit: 10, ttl: 60000 } })
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalGuard)
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user',
    description: 'returns access_token if credentials are valid',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiCreatedResponse({ description: 'user login success', type: LoginDto })
  login(@Req() req: Request, @Body(ValidationPipe) authDto: AuthPayloadDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Create new user',
    description: 'Register a new user on the system',
  })
  @ApiCreatedResponse({
    description: 'Create a new user',
    type: RegisterationDto,
  })
  @ApiConflictResponse({ description: 'user with this email already exist.' })
  register(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return user profile' })
  @ApiOkResponse({ description: 'Return user profile', type: Profile })
  @ApiUnauthorizedResponse({
    description: 'Authentication required to access resource',
  })
  profile(@Req() req: Request) {
    return req.user;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Create new refresh and access token' })
  @ApiCreatedResponse({
    description: 'Return new access and refresh tokens',
    type: LoginDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @ApiBody({ type: RefreshDto })
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refresh(token);
  }
}
