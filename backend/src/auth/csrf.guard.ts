import {
  Injectable,
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual, randomBytes } from 'node:crypto';
import type { Request } from 'express';

export const createCsrfToken = () => randomBytes(32).toString('hex');

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  verifyOrigin(request: Request) {
    if (
      request.get('Sec-Fetch-Site') === 'cross-site' ||
      (request.get('Origin') &&
        request.get('Origin') !== this.config.getOrThrow<string>('APP_ORIGIN'))
    )
      throw new ForbiddenException();
  }
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    this.verifyOrigin(request);
    const supplied = request.get('X-CSRF-Token');
    const expected = request.session?.csrfToken;
    if (
      !supplied ||
      !expected ||
      !/^[a-f0-9]{64}$/.test(supplied) ||
      !/^[a-f0-9]{64}$/.test(expected) ||
      !timingSafeEqual(
        Buffer.from(supplied, 'hex'),
        Buffer.from(expected, 'hex'),
      )
    )
      throw new ForbiddenException();
    return true;
  }
}
