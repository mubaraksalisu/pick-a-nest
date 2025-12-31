import { PropertyResponseDto } from './create-property.dto';

export class GetPropertiesResponseDto {
  data: PropertyResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
}
