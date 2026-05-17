import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { InjectModel } from '@nestjs/mongoose';
import { State } from './schemas/state.schema';
import { Model } from 'mongoose';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class StatesService {
  private readonly statesListCacheKey = 'states:all';

  constructor(
    @InjectModel(State.name) private stateModel: Model<State>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createStateDto: CreateStateDto): Promise<State> {
    let state = await this.stateModel.findOne({ name: createStateDto.name });
    if (state)
      throw new BadRequestException('State with the same name already exist');

    state = await this.stateModel.create({ ...createStateDto });
    await this.cacheService.delete(this.statesListCacheKey);
    return state;
  }

  async findAll() {
    const cached = await this.cacheService.get(this.statesListCacheKey);
    if (cached) return cached;

    const states = await this.stateModel.find().sort('name');
    await this.cacheService.set(
      this.statesListCacheKey,
      states,
      60 * 60 * 1000,
    );
    return states;
  }

  async findOne(id: string) {
    const state = await this.stateModel.findById(id);
    if (!state)
      throw new NotFoundException('No state was found with the provided id');
    return state;
  }

  async update(id: string, updateStateDto: UpdateStateDto): Promise<State> {
    const state = await this.stateModel.findById(id);
    if (!state)
      throw new NotFoundException('No state was found with the provided id');

    if (updateStateDto.name) {
      const existingState = await this.stateModel.findOne({
        name: updateStateDto.name,
      });
      if (existingState && existingState._id.toString() !== id)
        throw new BadRequestException('State with the same name already exist');
    }

    const updatedState = await this.stateModel.findByIdAndUpdate(
      id,
      updateStateDto,
      { new: true },
    );

    if (!updatedState)
      throw new NotFoundException('No state was found with the provided id');

    await this.cacheService.delete(this.statesListCacheKey);
    return updatedState;
  }

  async remove(id: string): Promise<State> {
    const state = await this.stateModel.findByIdAndDelete(id);
    if (!state)
      throw new NotFoundException('No state was found with the provided id');

    await this.cacheService.delete(this.statesListCacheKey);
    return state;
  }
}
