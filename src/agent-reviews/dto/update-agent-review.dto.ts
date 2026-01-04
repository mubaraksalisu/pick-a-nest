import { PartialType } from '@nestjs/mapped-types';
import { CreateAgentReviewDto } from './create-agent-review.dto';

export class UpdateAgentReviewDto extends PartialType(CreateAgentReviewDto) {}
