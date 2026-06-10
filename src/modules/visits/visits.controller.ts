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
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { CanAccessVisitGuard } from './guards/can-access-visit.guard';
import { CanAccessPropertyGuard } from './guards/can-access-property.guard';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  @UseGuards(CanAccessVisitGuard)
  @Patch(':id/change-status')
  @ApiOperation({ summary: 'Change status of an existing visit record' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to modify',
  })
  @ApiNotFoundResponse({ description: 'No visit with the provided id' })
  @ApiBadRequestResponse({
    description: 'Invalid transition from one status to another',
  })
  @ApiOkResponse({
    description: 'Update visit status and return updated visit record',
    type: VisitResponseDto,
  })
  changeStatus(
    @Param('id') id: string,
    @Body(ValidationPipe) changeStatusDto: ChangeStatusDto,
  ) {
    return this.visitsService.changeStatus(id, changeStatusDto);
  }

  @UseGuards(ObjectIdGuard)
  @UseGuards(CanAccessVisitGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a visit record by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to get',
  })
  @ApiNotFoundResponse({ description: 'No visit with the provided id' })
  @ApiOkResponse({
    description: 'Return visit record with the provided id',
    type: VisitResponseDto,
  })
  findOne(@Param('id') id: string) {
    return this.visitsService.findOne(id);
  }

  @UseGuards(ObjectIdGuard)
  @UseGuards(CanAccessVisitGuard)
  @Patch(':id/reschedule')
  @ApiOperation({
    summary: 'Reschedule a visit by updating the visit record dates and note',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to reschedule',
  })
  @ApiNotFoundResponse({ description: 'No visit with the provided id' })
  @ApiBadRequestResponse({
    description:
      'Only requesting/scheduled visits can be rescheduled OR invalid dates provided',
  })
  @ApiConflictResponse({
    description: 'Time slot overlaps with existing visit',
  })
  @ApiOkResponse({
    description:
      'Reschedules visit by updating visit dates and optionaly note and return the record',
    type: VisitResponseDto,
  })
  reschedule(
    @Param('id') id: string,
    @Body(ValidationPipe) updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitsService.reschedule(id, updateVisitDto);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Get a list of visits associated to a property' })
  @ApiParam({
    name: 'propertyId',
    type: String,
    description: 'id of the property you want to get the visits of',
  })
  @ApiQuery({
    name: 'fromIso',
    type: String,
    description: 'Visit duration start time filter',
    required: false,
  })
  @ApiQuery({
    name: 'toIso',
    type: String,
    description: 'Visit duration end time filter',
    required: false,
  })
  @ApiBadRequestResponse({ description: 'Invalid propertyId parameter' })
  @ApiOkResponse({
    description: 'Return list of visits associated to the specified propertyId',
    type: [VisitResponseDto],
  })
  @UseGuards(CanAccessPropertyGuard)
  propertyVisitList(
    @Param('propertyId') propertyId: string,
    @Query('fromIso') fromIso?: string,
    @Query('toIso') toIso?: string,
  ) {
    return this.visitsService.propertyVisitList(propertyId, fromIso, toIso);
  }

  @UseGuards(ObjectIdGuard)
  @UseGuards(CanAccessVisitGuard)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Update visit status to cancel' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to modify',
  })
  @ApiNotFoundResponse({ description: 'No visit with the provided id' })
  @ApiOkResponse({
    description:
      'Update visit status to cancel and return updated visit record',
    type: VisitResponseDto,
  })
  cancel(@Param('id') id: string) {
    return this.visitsService.cancel(id);
  }

  @UseGuards(ObjectIdGuard)
  @UseGuards(CanAccessVisitGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete visit by id' })
  @ApiNotFoundResponse({
    description: 'No visit with the provided id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to soft delete',
  })
  @ApiOkResponse({
    description:
      'Mark visit record as deleted by setting deletedAt property and returning the record',
    type: VisitResponseDto,
  })
  softDelete(@Param('id') id: string) {
    return this.visitsService.softDelete(id);
  }
}
