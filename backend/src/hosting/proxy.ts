import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { RequestHandler } from 'express';

export function setupProxy(app: INestApplication, config: ConfigService) {
  const server = app.getHttpAdapter().getInstance();
  if (config.get<string>('HOSTING_PLATFORM') === 'render') {
    // Render terminates TLS and redirects public HTTP before reaching this port.
    // This mode requires validated Render env; never use it on an exposed server.
    server.set('trust proxy', (_ip: string, hop: number) => hop === 0);
    const normalize: RequestHandler = (request, _response, next) => {
      request.headers['x-forwarded-proto'] = 'https';
      delete request.headers['x-forwarded-host'];
      delete request.headers['x-forwarded-for'];
      next();
    };
    app.use(normalize);
  } else {
    const ips = config.get<string[]>('TRUSTED_PROXY_IPS') ?? [];
    server.set('trust proxy', ips.length ? ips : false);
  }
  server.disable('x-powered-by');
}
