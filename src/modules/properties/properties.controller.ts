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
import { PaginationDto } from './dto/pagination.dto';
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
  findAll(@Query() pagination: PaginationDto) {
    return this.propertiesService.findAll(pagination);
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
