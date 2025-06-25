import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { StatesService } from './states.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';

@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body(ValidationPipe) createStateDto: CreateStateDto) {
    return this.statesService.create(createStateDto);
  }

  @Get()
  findAll() {
    return this.statesService.findAll();
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.statesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, ObjectIdGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateStateDto: UpdateStateDto,
  ) {
    return this.statesService.update(id, updateStateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.statesService.remove(id);
  }
}
