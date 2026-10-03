import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponse {
  @ApiProperty({ format: 'uuid' }) declare id: string;
  @ApiProperty() declare name: string;
}
