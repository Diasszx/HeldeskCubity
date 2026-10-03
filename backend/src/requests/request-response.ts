import { ApiProperty } from '@nestjs/swagger';
import { requestLimits } from './request-input.js';

export class RequestResponse {
  @ApiProperty({ format: 'uuid' }) declare id: string;
  @ApiProperty({ example: 'SOL-0001' }) declare code: string;
  @ApiProperty({ maxLength: requestLimits.title }) declare title: string;
  @ApiProperty({ maxLength: requestLimits.description })
  declare description: string;
  @ApiProperty({ format: 'uuid' }) declare categoryId: string;
  @ApiProperty({ format: 'uuid' }) declare requesterId: string;
  @ApiProperty({ type: String, format: 'date-time' }) declare createdAt: string;
  @ApiProperty({ enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED'] })
  declare status: string;
}
