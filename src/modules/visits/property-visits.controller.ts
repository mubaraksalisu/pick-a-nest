import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { CanAccessPropertyGuard } from './guards/can-access-property.guard';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VisitResponseDto } from './dto/create-visit.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertyVisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @UseGuards(JwtAuthGuard, ObjectIdGuard, CanAccessPropertyGuard)
  @Get(':propertyId/visits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all visits for a property' })
  @ApiParam({
    name: 'propertyId',
    type: String,
    description: 'id of the property to retrieve visits for',
  })
  @ApiQuery({
    name: 'fromDate',
    type: String,
    description: 'Filter visits starting after this ISO date',
    required: false,
  })
  @ApiQuery({
    name: 'toDate',
    type: String,
    description: 'Filter visits ending before this ISO date',
    required: false,
  })
  @ApiOkResponse({
    description: 'Return list of visits for the selected property',
    type: [VisitResponseDto],
  })
  propertyVisits(
    @Param('propertyId') propertyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.visitsService.propertyVisitList(propertyId, fromDate, toDate);
  }
}
