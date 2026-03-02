import { PropertyReviewResponseDto } from './property-review-response.dto';

export class FindAllResponseDto {
  data: PropertyReviewResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
}
