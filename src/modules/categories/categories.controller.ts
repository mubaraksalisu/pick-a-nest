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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './schemas/category.schema';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt.guard';
import { AdminGuard } from 'src/shared/guards/admin.guard';
import { ObjectIdGuard } from 'src/shared/guards/object-id.guard';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category as admin' })
  @ApiCreatedResponse({
    description: 'Create and return newly create category',
    type: CategoryResponseDto,
  })
  @ApiConflictResponse({ description: 'Category with same name already exist' })
  create(
    @Body(ValidationPipe) createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get list of all categories' })
  @ApiOkResponse({
    description: 'Return list of all categories',
    type: [CategoryResponseDto],
  })
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @UseGuards(ObjectIdGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the category to get',
  })
  @ApiOkResponse({
    description: 'Returns category by id',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No category found with the provided id',
  })
  findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, ObjectIdGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update category by id' })
  @ApiBearerAuth()
  @ApiNotFoundResponse({
    description: 'No category found with the provided id',
  })
  @ApiOkResponse({
    description: 'Update and returns updated property document',
    type: CategoryResponseDto,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the category to update',
  })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard, ObjectIdGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category by id' })
  @ApiNotFoundResponse({
    description: 'No category found with the provided id',
  })
  @ApiOkResponse({
    description: 'Delete and return deleted category document',
    type: CategoryResponseDto,
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'id of the category to delete',
  })
  remove(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.remove(id);
  }
}
