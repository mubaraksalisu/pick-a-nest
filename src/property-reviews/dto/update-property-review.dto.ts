import { PartialType } from '@nestjs/mapped-types';
import { CreatePropertyReviewDto } from './create-property-review.dto';

export class UpdatePropertyReviewDto extends PartialType(CreatePropertyReviewDto) {}
