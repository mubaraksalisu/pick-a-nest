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
import {
  ChangeStatusDto,
  CreateVisitDto,
  VisitResponseDto,
} from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('visits')
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a visit request' })
  @ApiBadRequestResponse({
    description: 'If invalid IDs, dates, or duration provided',
  })
  @ApiConflictResponse({
    description: 'Time slot overlaps with existing visit',
  })
  @ApiCreatedResponse({
    description: 'Create and return a visit document',
    type: VisitResponseDto,
  })
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

  @Get('property/:propertyId')
  propertyVisitList(
    @Param('propertyId') propertyId: string,
    @Query('fromIso') fromIso?: string,
    @Query('toIso') toIso?: string,
  ) {
    return this.visitsService.propertyVisitList(propertyId, fromIso, toIso);
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
