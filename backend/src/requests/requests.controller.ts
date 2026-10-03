import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthRequest } from '../auth/auth.types.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { createRequestBody, createRequestSchema } from './request-input.js';
import type { CreateRequestInput } from './request-input.js';
import { RequestResponse } from './request-response.js';
import { RequestsService } from './requests.service.js';

@ApiTags('Requests')
@ApiCookieAuth()
@Controller('requests')
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}

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
    if (!request.authUser) throw new UnauthorizedException();
    return this.requests.create(input, request.authUser.id);
  }
}
