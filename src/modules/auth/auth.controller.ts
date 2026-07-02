import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalGuard } from './guards/local.guard';
import { Request } from 'express';
import { CreateUserDto, UserResponseDto } from '../users/dto/create-user.dto';
import { JwtAuthGuard } from './guards/jwt.guard';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthPayloadDto, LoginDto, RefreshDto } from './dto/auth.dto';

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
  login(@Req() req: Request, @Body(ValidationPipe) _authDto: AuthPayloadDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Create new user',
    description: 'Register a new user on the system',
  })
  @ApiCreatedResponse({
    description: 'Create a new user',
    type: UserResponseDto,
  })
  @ApiConflictResponse({ description: 'user with this email already exist.' })
  register(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return user profile' })
  @ApiOkResponse({ description: 'Return user profile', type: UserResponseDto })
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

  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiNoContentResponse({ description: 'User logged out successfully' })
  @ApiBody({ type: RefreshDto })
  logout(@Body('refreshToken') token: string) {
    return this.authService.logout(token);
  }

  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email' })
  @ApiOkResponse({
    description: 'Email verified successfully. You can now log in.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired verification token',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token sent to user email',
    required: true,
    type: String,
  })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }
}
