import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  create(@Body(ValidationPipe) createVisitDto: CreateVisitDto) {
    return this.visitsService.create(createVisitDto);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.visitsService.findAll(userId, propertyId);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.visitsService.findOne(id);
  }

  @UseGuards(ObjectIdGuard)
  @Patch('reschedule/:id')
  reschedule(
    @Param('id') id: string,
    @Body(ValidationPipe) updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitsService.reschedule(id, updateVisitDto);
  }

  @UseGuards(ObjectIdGuard)
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.visitsService.softDelete(id);
  }
}
