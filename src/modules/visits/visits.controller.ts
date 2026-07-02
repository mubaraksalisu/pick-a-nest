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
  Req,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { VisitsService } from './visits.service';
import { CreateVisitDto, VisitResponseDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { CancelVisitDto } from './dto/cancel-visit.dto';
import { FeedbackVisitDto } from './dto/feedback-visit.dto';
import { VisitQueryDto } from './dto/visit-query.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { CanAccessVisitGuard } from './guards/can-access-visit.guard';
import { CanAccessPropertyGuard } from './guards/can-access-property.guard';
import { RolesGuard } from 'src/shared/auth/guards/roles.guard';
import { Roles } from 'src/shared/auth/decorators/roles.decorator';
import { UserRole } from 'src/shared/auth/enums/user-role.enum';
import { AuthenticatedRequest } from 'src/modules/auth/dto/auth.dto';
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
  @ApiOperation({ summary: 'Request a property visit' })
  @ApiBadRequestResponse({
    description: 'If invalid IDs, dates, or times are provided',
  })
  @ApiConflictResponse({
    description: 'Time slot overlaps with existing visit',
  })
  @ApiCreatedResponse({
    description: 'Create and return a visit document',
    type: VisitResponseDto,
  })
  create(
    @Body(ValidationPipe) createVisitDto: CreateVisitDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.visitsService.create({
      ...createVisitDto,
      customerId: req.user._id,
    });
  }

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm a requested visit' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to confirm',
  })
  @ApiOkResponse({
    description: 'Confirm visit and return updated visit record',
    type: VisitResponseDto,
  })
  confirm(@Param('id') id: string) {
    return this.visitsService.confirm(id);
  }

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark a visit as completed' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to complete',
  })
  @ApiOkResponse({
    description: 'Mark visit as completed and return updated visit record',
    type: VisitResponseDto,
  })
  complete(@Param('id') id: string) {
    return this.visitsService.complete(id);
  }

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a visit with reason' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to cancel',
  })
  @ApiBadRequestResponse({
    description: 'Invalid cancellation reason or visit state',
  })
  @ApiOkResponse({
    description: 'Cancel visit and return updated visit record',
    type: VisitResponseDto,
  })
  cancel(
    @Param('id') id: string,
    @Body(ValidationPipe) cancelVisitDto: CancelVisitDto,
  ) {
    return this.visitsService.cancel(id, cancelVisitDto);
  }

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
  @Patch(':id/reschedule')
  @ApiOperation({ summary: 'Reschedule an existing visit' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to reschedule',
  })
  @ApiBadRequestResponse({
    description:
      'Only pending, confirmed, or rescheduled visits can be rescheduled OR invalid dates provided',
  })
  @ApiConflictResponse({
    description: 'Time slot overlaps with existing visit',
  })
  @ApiOkResponse({
    description: 'Reschedule the visit and return the updated record',
    type: VisitResponseDto,
  })
  reschedule(
    @Param('id') id: string,
    @Body(ValidationPipe) updateVisitDto: UpdateVisitDto,
  ) {
    return this.visitsService.reschedule(id, updateVisitDto);
  }

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit feedback for a completed visit' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the visit record to provide feedback for',
  })
  @ApiBadRequestResponse({
    description: 'Feedback is only allowed after the visit is completed',
  })
  @ApiOkResponse({
    description: 'Submit feedback and return the updated visit record',
    type: VisitResponseDto,
  })
  submitFeedback(
    @Param('id') id: string,
    @Body(ValidationPipe) feedbackVisitDto: FeedbackVisitDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user._id.toString();
    return this.visitsService.addFeedback(id, feedbackVisitDto, userId);
  }

  @Get('property/:propertyId')
  @UseGuards(CanAccessPropertyGuard)
  @ApiOperation({ summary: 'Get visits for a property' })
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
  propertyVisitList(
    @Param('propertyId') propertyId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.visitsService.propertyVisitList(propertyId, fromDate, toDate);
  }

  @Get('my-visits')
  @ApiOperation({ summary: 'List visits booked by the current customer' })
  @ApiOkResponse({
    description: 'Return paginated visits for the current user',
  })
  myVisits(@Req() req: AuthenticatedRequest, @Query() query: VisitQueryDto) {
    const userId = req.user._id.toString();
    return this.visitsService.findMyVisits(userId, query);
  }

  @Roles(UserRole.AGENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('agent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List visits assigned to the current agent' })
  @ApiOkResponse({
    description: 'Return paginated visits for the current agent',
  })
  agentVisits(@Req() req: AuthenticatedRequest, @Query() query: VisitQueryDto) {
    const userId = req.user._id.toString();
    return this.visitsService.findAgentVisits(userId, query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming visits for the current user' })
  @ApiQuery({
    name: 'days',
    type: Number,
    description: 'Look ahead window in days',
    required: false,
  })
  @ApiOkResponse({
    description: 'Return upcoming visits for the current user',
    type: [VisitResponseDto],
  })
  upcoming(
    @Req() req: AuthenticatedRequest,
    @Query('days', new DefaultValuePipe(7), ParseIntPipe) days: number,
  ) {
    const userId = req.user._id.toString();
    return this.visitsService.findUpcoming(userId, days);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get visit history for the current user' })
  @ApiOkResponse({
    description: 'Return completed and cancelled visits for the current user',
  })
  history(@Req() req: AuthenticatedRequest, @Query() query: VisitQueryDto) {
    const userId = req.user._id.toString();
    return this.visitsService.findHistory(userId, query);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/visits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin search across all visits' })
  @ApiOkResponse({
    description: 'Return paginated visits matching admin filters',
  })
  adminVisits(@Query() query: VisitQueryDto) {
    return this.visitsService.findAllForAdmin(query);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get visit dashboard statistics' })
  @ApiOkResponse({
    description: 'Return visit counts grouped by status',
  })
  stats() {
    return this.visitsService.getStats();
  }

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
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

  @UseGuards(ObjectIdGuard, CanAccessVisitGuard)
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
    return this.visitsService.softDeleteVisit(id);
  }
}
