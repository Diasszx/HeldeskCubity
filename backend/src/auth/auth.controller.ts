import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Req,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import type { Response } from 'express';
import { ZodPipe } from '../common/zod.pipe.js';
import { SessionRuntime } from '../session/session.runtime.js';
import { Public } from './public.decorator.js';
import { createCsrfToken, CsrfGuard } from './csrf.guard.js';
import { AuthService } from './auth.service.js';
import type { LoginInput } from './auth.service.js';
import type { AuthRequest } from './auth.types.js';

const loginSchema = z.strictObject({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9._-]*$/),
  password: z
    .string()
    .min(1)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
});

const userSchema = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['id', 'name', 'username'],
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
    name: { type: 'string' as const },
    username: { type: 'string' as const },
  },
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly runtime: SessionRuntime,
    private readonly csrf: CsrfGuard,
  ) {}
  @Public()
  @Get('csrf')
  @ApiOperation({
    summary:
      'Token CSRF público vinculado à sessão; não armazenar em localStorage.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: { csrfToken: { type: 'string' } },
      required: ['csrfToken'],
    },
  })
  async token(@Req() request: AuthRequest) {
    this.csrf.verifyOrigin(request);
    request.session.csrfToken ??= createCsrfToken();
    await this.runtime.save(request);
    return { csrfToken: request.session.csrfToken };
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', maxLength: 64 },
        password: {
          type: 'string',
          format: 'password',
          minLength: 1,
          description: 'Até 72 bytes UTF-8; espaços são preservados.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, schema: userSchema })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({ status: 403, description: 'CSRF ou origem inválida.' })
  async login(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
    @Body(new ZodPipe(loginSchema)) body: LoginInput,
  ) {
    try {
      return await this.auth.login(request, body);
    } catch (error) {
      if (error instanceof InternalServerErrorException)
        this.runtime.clearCookie(response);
      throw error;
    }
  }
  @Get('me')
  @ApiCookieAuth()
  @ApiResponse({ status: 200, schema: userSchema })
  @ApiResponse({
    status: 401,
    description: 'Sessão ausente, expirada ou revogada.',
  })
  me(@Req() request: AuthRequest) {
    return request.authUser;
  }
  @Post('logout')
  @HttpCode(204)
  @ApiCookieAuth()
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiResponse({
    status: 204,
    description: 'Sessão revogada e cookie expirado.',
  })
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.runtime.destroy(request);
    this.runtime.clearCookie(response);
  }
}
