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
import { ChangeStatusDto, CreateVisitDto } from './dto/create-visit.dto';
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

  @UseGuards(ObjectIdGuard)
  @Patch(':id/change-status')
  changeStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) changeStatusDto: ChangeStatusDto,
  ) {
    return this.visitsService.changeStatus(id, changeStatusDto);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.visitsService.findOne(id);
  }

  @UseGuards(ObjectIdGuard)
  @Patch(':id/reschedule')
  reschedule(
    @Param('id') id: string,
    @Body(ValidationPipe) updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitsService.reschedule(id, updateVisitDto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.visitsService.cancel(id);
  }

  @UseGuards(ObjectIdGuard)
  @Delete(':id')
  softDelete(@Param('id') id: string) {
    return this.visitsService.softDelete(id);
  }
}
