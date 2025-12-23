import { Controller, Get } from '@nestjs/common';

@Controller()
export class HomeController {
  @Get()
  getHomeStatus() {
    return { status: 'Server is running', version: '1.0.0' };
  }
}
