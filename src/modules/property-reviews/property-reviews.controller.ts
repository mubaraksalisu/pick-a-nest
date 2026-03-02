import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import { PropertyReviewsService } from './property-reviews.service';
import { CreatePropertyReviewDto } from './dto/create-property-review.dto';
import { UpdatePropertyReviewDto } from './dto/update-property-review.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
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
import { FindAllQueryParamsDto } from './dto/find-all-query-params.dto';
import { PropertyReviewResponseDto } from './dto/property-review-response.dto';

@ApiTags('property-reviews')
@Controller('property-reviews')
export class PropertyReviewsController {
  constructor(
    private readonly propertyReviewsService: PropertyReviewsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Post a review for a property' })
  @ApiBadRequestResponse({
    description:
      'No user with the provided userId found OR No property with the provided userId found',
  })
  @ApiConflictResponse({ description: 'User already reviewed property' })
  @ApiCreatedResponse({
    description: 'Create and return created property review document',
    type: PropertyReviewResponseDto,
  })
  create(
    @Body(ValidationPipe) createPropertyReviewDto: CreatePropertyReviewDto,
  ) {
    return this.propertyReviewsService.create(createPropertyReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews, pagenation and filter supported' })
  @ApiBadRequestResponse({
    description: 'Invalid userId or propertyId queryString',
  })
  @ApiOkResponse({
    description:
      'Returns paginated property reviews based on filter provided in query params',
    type: [PropertyReviewResponseDto],
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
    name: 'propertyId',
    description: 'id of the property which to get reviews of',
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
    return this.propertyReviewsService.findAll(queryParams);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get property review based of id provided' })
  @ApiNotFoundResponse({
    description: 'No property review with the provided id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the property review to get',
  })
  @ApiOkResponse({
    description: 'Return property review document based on provided id',
    type: PropertyReviewResponseDto,
  })
  findOne(@Param('id') id: string) {
    return this.propertyReviewsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property review by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the property review to update',
  })
  @ApiNotFoundResponse({
    description: 'No property review with the provided id',
  })
  @ApiOkResponse({
    description: 'Update and returns updated property review',
    type: PropertyReviewResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePropertyReviewDto: UpdatePropertyReviewDto,
  ) {
    return this.propertyReviewsService.update(id, updatePropertyReviewDto);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete property review document by id' })
  @ApiNotFoundResponse({
    description: 'No property review with the provided id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the property review to delete',
  })
  @ApiOkResponse({
    description: 'Delete and returns deleted property review document',
    type: PropertyReviewResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.propertyReviewsService.remove(id);
  }
}
