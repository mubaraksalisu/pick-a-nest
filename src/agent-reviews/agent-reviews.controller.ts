import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AgentReviewsService } from './agent-reviews.service';
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
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { AgentReviewResponseDto } from './dto/agent-review-response.dto';
import { CreateAgentReviewDto } from './dto/create-agent-review.dto';
import { FindAllQueryParamsDto } from './dto/find-all-query-params.dto';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import { UpdateAgentReviewDto } from './dto/update-agent-review.dto';

@ApiTags('agent-reviews')
@Controller('agent-reviews')
export class AgentReviewsController {
  constructor(private readonly agentReviewsService: AgentReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a review for an agent' })
  @ApiBadRequestResponse({
    description:
      'No user with the provided userId found OR No agent with the provided agentId found',
  })
  @ApiConflictResponse({ description: 'User already reviewed agent' })
  @ApiCreatedResponse({
    description: 'Create and return created agent review document',
    type: AgentReviewResponseDto,
  })
  create(@Body(ValidationPipe) createAgentReviewDto: CreateAgentReviewDto) {
    return this.agentReviewsService.create(createAgentReviewDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all agent reviews, pagenation and filter supported',
  })
  @ApiBadRequestResponse({
    description: 'Invalid userId or agentId queryString',
  })
  @ApiOkResponse({
    description:
      'Returns paginated agent reviews based on filter provided in query params',
    type: [AgentReviewResponseDto],
  })
  @ApiQuery({
    name: 'page',
    description: 'page number of documents to get',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    description: 'limit of documents to get',
    type: Number,
  })
  @ApiQuery({
    name: 'agentId',
    description: 'id of the agent which to get reviews of',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'userId',
    description: 'id of user whom to get his reviews',
    required: false,
    type: String,
  })
  findAll(@Query() queryParams: FindAllQueryParamsDto) {
    return this.agentReviewsService.findAll(queryParams);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get agent review based of id provided' })
  @ApiNotFoundResponse({
    description: 'No agent review with the provided id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the agent review to get',
  })
  @ApiOkResponse({
    description: 'Return agent review document based on provided id',
    type: AgentReviewResponseDto,
  })
  findOne(@Param('id') id: string) {
    return this.agentReviewsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update agent review by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the agent review to update',
  })
  @ApiNotFoundResponse({
    description: 'No agent review with the provided id',
  })
  @ApiOkResponse({
    description: 'Update and returns updated agent review',
    type: AgentReviewResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateAgentReviewDto: UpdateAgentReviewDto,
  ) {
    return this.agentReviewsService.update(id, updateAgentReviewDto);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete agent review document by id' })
  @ApiNotFoundResponse({
    description: 'No agent review with the provided id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the agent review to delete',
  })
  @ApiOkResponse({
    description: 'Delete and returns deleted agent review document',
    type: AgentReviewResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.agentReviewsService.remove(id);
  }
}
