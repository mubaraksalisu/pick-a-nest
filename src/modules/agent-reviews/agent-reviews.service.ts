import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AgentReview } from './schema/agent-review.schema';
import { Model } from 'mongoose';
import { UsersService } from 'src/modules/users/users.service';
import { CreateAgentReviewDto } from './dto/create-agent-review.dto';
import { FindAllQueryParamsDto } from './dto/find-all-query-params.dto';
import { UpdateAgentReviewDto } from './dto/update-agent-review.dto';

@Injectable()
export class AgentReviewsService {
  constructor(
    @InjectModel(AgentReview.name) private agentReviewModel: Model<AgentReview>,
    private readonly userService: UsersService,
  ) {}

  async create(
    createAgentReviewDto: CreateAgentReviewDto,
  ): Promise<AgentReview> {
    const { userId, agentId } = createAgentReviewDto;

    // These will throw if not found, so no need for manual checks
    await this.userService.findOne(userId);
    await this.userService.findOne(agentId);

    let agentReview = await this.agentReviewModel.findOne({
      userId,
      agentId,
    });
    if (agentReview) throw new ConflictException('User already reviewed agent');

    agentReview = new this.agentReviewModel({
      ...createAgentReviewDto,
    });
    return await agentReview.save();
  }

  async findAll(queryParams: FindAllQueryParamsDto) {
    const { userId, agentId, page, limit } = queryParams;
    const filter: any = {};
    const skip = (page - 1) * limit;

    if (userId) {
      filter.userId = userId;
    }

    if (agentId) {
      filter.agentId = agentId;
    }

    const [data, total] = await Promise.all([
      this.agentReviewModel.find(filter).skip(skip).limit(limit),
      this.agentReviewModel.countDocuments(filter),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AgentReview> {
    const agentReview = await this.agentReviewModel.findById(id);
    if (!agentReview)
      throw new NotFoundException('No agent review with the provided id');
    return agentReview;
  }

  async update(
    id: string,
    updateAgentReviewDto: UpdateAgentReviewDto,
  ): Promise<AgentReview> {
    let agentReview = await this.agentReviewModel.findById(id);
    if (!agentReview)
      throw new NotFoundException('No agent review with the provided id');

    Object.assign(agentReview, updateAgentReviewDto);
    await agentReview.save();

    return agentReview;
  }

  async remove(id: string): Promise<AgentReview> {
    const agentReview = await this.agentReviewModel.findByIdAndDelete(id);
    if (!agentReview)
      throw new NotFoundException('No agent review with the provided id');

    return agentReview;
  }
}
