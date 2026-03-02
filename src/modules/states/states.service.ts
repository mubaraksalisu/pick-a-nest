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

@Injectable()
export class StatesService {
  constructor(@InjectModel(State.name) private stateModel: Model<State>) {}

  async create(createStateDto: CreateStateDto): Promise<State> {
    let state = await this.stateModel.findOne({ name: createStateDto.name });
    if (state)
      throw new BadRequestException('State with the same name already exist');

    state = await this.stateModel.create({ ...createStateDto });
    return state;
  }

  async findAll() {
    return await this.stateModel.find().sort('name');
  }

  async findOne(id: string) {
    const state = await this.stateModel.findById(id);
    if (!state)
      throw new NotFoundException('No state was found with the provided id');
    return state;
  }

  async update(id: string, updateStateDto: UpdateStateDto) {
    let state = await this.stateModel.findById(id);
    if (!state)
      throw new NotFoundException('No state was found with the provided id');

    if (updateStateDto.name) {
      state = await this.stateModel.findOne({
        name: updateStateDto.name,
      });
      if (!state)
        throw new BadRequestException('State with the same name already exist');
    }

    state = new this.stateModel({ ...UpdateStateDto });
    return await state.save();
  }

  async remove(id: string) {
    const state = await this.stateModel.findByIdAndDelete(id);
    if (!state)
      throw new NotFoundException('No state was found with the provided id');
    return state;
  }
}
