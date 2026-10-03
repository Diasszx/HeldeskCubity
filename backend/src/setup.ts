import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

export function setupApplication(app: INestApplication) {
  const envConfig = app.get(ConfigService);
  const ips = envConfig.get<string[]>('TRUSTED_PROXY_IPS') ?? [];
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', ips.length ? ips : false);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('Cubity Support API')
    .setDescription(
      'Sessão persistente PostgreSQL. Health, Swagger, CSRF e login são públicos; login exige CSRF. Rotas protegidas exigem cookie de sessão.',
    )
    .setVersion('0.1.0')
    .addCookieAuth('cubity.sid')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  return document;
}
