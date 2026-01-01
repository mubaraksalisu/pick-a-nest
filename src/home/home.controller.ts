import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
export class HomeController {
  @Get()
  @ApiOperation({ summary: 'Home route to test if the server is up' })
  getHomeStatus() {
    return { status: 'Server is running', version: '1.0.0' };
  }
}
