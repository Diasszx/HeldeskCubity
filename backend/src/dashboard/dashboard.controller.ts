import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardResponse } from './dashboard-response.js';

@ApiTags('Dashboard')
@ApiCookieAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOkResponse({
    type: DashboardResponse,
    description: 'Contadores globais, sem filtros da listagem.',
  })
  @ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
  @ApiResponse({
    status: 400,
    description: 'Este endpoint não aceita filtros.',
  })
  indicators(@Query() query: Record<string, unknown>) {
    if (Object.keys(query).length) throw new BadRequestException();
    return this.dashboard.indicators();
  }
}
