import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './schemas/category.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class CategoriesService {
  private readonly categoriesListCacheKey = 'categories:all';

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    let category = await this.categoryModel.findOne({
      name: createCategoryDto.name,
    });
    if (category)
      throw new ConflictException('Category with same name already exist');

    category = new this.categoryModel({
      ...createCategoryDto,
    });
    category = await category.save();
    await this.cacheService.delete(this.categoriesListCacheKey);
    return category;
  }

  async findAll(): Promise<Category[]> {
    const cached = await this.cacheService.get(this.categoriesListCacheKey);
    if (cached) return cached as Category[];

    const categories = await this.categoryModel.find().sort('name');
    await this.cacheService.set(
      this.categoriesListCacheKey,
      categories,
      60 * 60 * 1000,
    );

    return categories;
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category)
      throw new NotFoundException('No category found with the provided id');

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true },
    );
    if (!category)
      throw new NotFoundException('No category found with the provided id');

    await this.cacheService.delete(this.categoriesListCacheKey);
    return category;
  }

  async remove(id: string) {
    const category = await this.categoryModel.findByIdAndDelete(id);
    if (!category)
      throw new NotFoundException('No category found with the provided id');

    await this.cacheService.delete(this.categoriesListCacheKey);
    return category;
  }
}
