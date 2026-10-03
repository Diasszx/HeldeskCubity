import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponse {
  @ApiProperty({ type: 'integer', minimum: 0 }) declare total: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) declare open: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) declare inProgress: number;
  @ApiProperty({ type: 'integer', minimum: 0 }) declare completed: number;
}
