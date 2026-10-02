import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/http-exception.filter.js';

export function setupApplication(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  const config = new DocumentBuilder()
    .setTitle('Cubity Support API')
    .setDescription(
      'Base da API. Health é público. Rotas de negócio e autenticação serão adicionadas nas próximas etapas; usarão sessão por cookie. Não há login implementado nesta versão.',
    )
    .setVersion('0.1.0')
    .addCookieAuth('connect.sid')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  return document;
}
