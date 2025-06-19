import { Controller, Post, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthPayloadDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
    @Post('login')
    login(@Body(ValidationPipe) authPayloadDto: AuthPayloadDto) {}
  }
}
