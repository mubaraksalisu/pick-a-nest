import { AgentReviewResponseDto } from './agent-review-response.dto';

export class FindAllResponseDto {
  data: AgentReviewResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
}
