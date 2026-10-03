import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth.types.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { createRequestBody, createRequestSchema } from './request-input.js';
import type { CreateRequestInput } from './request-input.js';
import { RequestResponse } from './request-response.js';
import { RequestsService } from './requests.service.js';
import { requestFiltersSchema, requestIdSchema } from './request-filters.js';
import type { RequestFilters } from './request-filters.js';

@ApiTags('Requests')
@ApiCookieAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

  private requester(request: AuthRequest) {
    if (!request.authUser) throw new UnauthorizedException();
    return request.authUser.id;
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({
    schema: createRequestBody,
    description: 'Substitui os três campos editáveis; somente o dono de OPEN.',
  })
  @ApiOkResponse({ type: RequestResponse })
  @ApiResponse({
    status: 400,
    description: 'Campos, categoria ou ID inválidos.',
  })
  @ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
  @ApiResponse({
    status: 403,
    description: 'Dono incorreto, CSRF ou origem inválida.',
  })
  @ApiResponse({ status: 404, description: 'Solicitação inexistente.' })
  @ApiResponse({ status: 409, description: 'Solicitação já não está OPEN.' })
  update(
    @Param('id', new ZodPipe(requestIdSchema)) id: string,
    @Req() request: AuthRequest,
    @Body(new ZodPipe(createRequestSchema)) input: CreateRequestInput,
  ) {
    return this.requests.update(id, input, this.requester(request));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiResponse({
    status: 204,
    description: 'Excluída pelo dono enquanto OPEN.',
  })
  @ApiResponse({ status: 400, description: 'ID inválido.' })
  @ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
  @ApiResponse({
    status: 403,
    description: 'Dono incorreto, CSRF ou origem inválida.',
  })
  @ApiResponse({ status: 404, description: 'Solicitação inexistente.' })
  @ApiResponse({ status: 409, description: 'Solicitação já não está OPEN.' })
  remove(
    @Param('id', new ZodPipe(requestIdSchema)) id: string,
    @Req() request: AuthRequest,
  ) {
    return this.requests.remove(id, this.requester(request));
  }

  @Get()
  @ApiQuery({
    name: 'title',
    required: false,
    type: String,
    description: 'Texto parcial literal, sem distinguir caixa; recebe trim.',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    format: 'uuid',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    format: 'date',
    description: 'Dia inicial inclusivo em UTC (YYYY-MM-DD).',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    format: 'date',
    description: 'Dia final inclusivo em UTC (YYYY-MM-DD).',
  })
  @ApiOkResponse({ type: RequestResponse, isArray: true })
  @ApiResponse({
    status: 400,
    description:
      'Filtros inválidos, categoria inexistente ou período invertido.',
  })
  @ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
  list(@Query(new ZodPipe(requestFiltersSchema)) filters: RequestFilters) {
    return this.requests.list(filters);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiOkResponse({ type: RequestResponse })
  @ApiResponse({ status: 400, description: 'ID inválido.' })
  @ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
  @ApiResponse({ status: 404, description: 'Solicitação inexistente.' })
  get(@Param('id', new ZodPipe(requestIdSchema)) id: string) {
    return this.requests.get(id);
  }

  @Post()
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ schema: createRequestBody })
  @ApiCreatedResponse({ type: RequestResponse })
  @ApiResponse({
    status: 400,
    description: 'Campos inválidos ou categoria inexistente.',
  })
  @ApiResponse({ status: 401, description: 'Sessão válida obrigatória.' })
  @ApiResponse({ status: 403, description: 'CSRF ou origem inválida.' })
  create(
    @Req() request: AuthRequest,
    @Body(new ZodPipe(createRequestSchema)) input: CreateRequestInput,
  ) {
    return this.requests.create(input, this.requester(request));
  }
}
