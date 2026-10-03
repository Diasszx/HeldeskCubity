import { ApiProperty } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty({ format: 'uuid' }) declare id: string;
  @ApiProperty() declare name: string;
  @ApiProperty() declare username: string;
}
