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
import { PropertiesService } from './properties.service';
import {
  CreatePropertyDto,
  PropertyResponseDto,
} from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PropertyQueryDto } from './dto/property-query.dto';
import { GetPropertiesResponseDto } from './dto/get-property-response.dto';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new property listing' })
  @ApiCreatedResponse({
    description: 'Returns the newly created property',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No user found with the provided ownerId',
  })
  @ApiNotFoundResponse({
    description: 'No category found with the provided categoryId',
  })
  create(@Body(ValidationPipe) createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated properties list' })
  @ApiOkResponse({
    description: 'Returns list of paginated properties and pagination data',
    type: GetPropertiesResponseDto,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'number of property document per page to return',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    description: 'page number of document to get',
  })
  @ApiQuery({
    name: 'city',
    type: String,
    description: 'filter properties by city',
    required: false,
  })
  @ApiQuery({
    name: 'state',
    type: String,
    description: 'filter properties by state',
    required: false,
  })
  @ApiQuery({
    name: 'bedrooms',
    type: Number,
    description: 'filter properties by number of bedrooms',
    required: false,
  })
  @ApiQuery({
    name: 'bathrooms',
    type: Number,
    description: 'filter properties by number of bathrooms',
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    type: String,
    description: 'How to sort the properties',
    required: false,
  })
  @ApiQuery({
    name: 'sortOrder',
    type: String,
    description: 'Sort order of properties',
    required: false,
  })
  @ApiQuery({
    name: 'type',
    type: String,
    description: "filter properties for 'sell' or for 'rent'",
    required: false,
  })
  findAll(@Query() query: PropertyQueryDto) {
    return this.propertiesService.findAll(query);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get property by id' })
  @ApiNotFoundResponse({
    description: 'No property with the provided id found',
  })
  @ApiOkResponse({
    description: 'Return property with the provided id',
    type: PropertyResponseDto,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the property to get',
  })
  findOne(@Param('id') id: string) {
    return this.propertiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update property details by id' })
  @ApiOkResponse({
    description: 'Return updated property details',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No category found with the provided categoryId',
  })
  @ApiNotFoundResponse({
    description: 'No property with the provided id found',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the property to update',
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, updatePropertyDto);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'delete property details by id' })
  @ApiOkResponse({
    description: 'Return deleted property details',
    type: PropertyResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No property with the provided id found',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the property to delete',
  })
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }
}
