import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const codes: Record<number, string> = {
      400: 'VALIDATION',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
    };
    const messages: Record<number, string> = {
      400: 'Entrada inválida.',
      401: 'Autenticação necessária.',
      403: 'Operação não permitida.',
      404: 'Recurso não encontrado.',
      409: 'Conflito com o estado atual do recurso.',
    };
    if (status >= 500)
      this.logger.error('Falha interna ao processar requisição.');
    response.status(status).json({
      code: codes[status] ?? 'INTERNAL_ERROR',
      message: messages[status] ?? 'Não foi possível processar a requisição.',
    });
  }
}
