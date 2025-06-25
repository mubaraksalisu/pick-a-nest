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
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { QueryParams } from './interfaces/query-params.interface';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';

@Controller('property-reviews')
export class PropertyReviewsController {
  constructor(
    private readonly propertyReviewsService: PropertyReviewsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body(ValidationPipe) createPropertyReviewDto: CreatePropertyReviewDto,
  ) {
    return this.propertyReviewsService.create(createPropertyReviewDto);
  }

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.propertyReviewsService.findAll(userId, propertyId);
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertyReviewsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePropertyReviewDto: UpdatePropertyReviewDto,
  ) {
    return this.propertyReviewsService.update(id, updatePropertyReviewDto);
  }

  @UseGuards(JwtAuthGuard, ObjectIdGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.propertyReviewsService.remove(id);
  }
}
