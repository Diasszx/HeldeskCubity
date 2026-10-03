import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health — público')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Verifica o processo da API; não verifica o banco.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ok'] } },
      required: ['status'],
    },
  })
  getHealth() {
    return { status: 'ok' };
  }
}
