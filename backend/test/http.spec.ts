import 'reflect-metadata';
import {
  INestApplication,
  Controller,
  Get,
  Module,
  Param,
  HttpException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller.js';
import { setupApplication } from '../src/setup.js';

@Controller('errors')
class ErrorController {
  @Get(':status')
  fail(@Param('status') status: string) {
    if (status !== '500')
      throw new HttpException('PRIVATE_DETAIL', Number(status));
    throw new Error('DATABASE_PASSWORD_PRIVATE');
  }
}
@Module({ controllers: [HealthController, ErrorController] })
class TestModule {}

describe('HTTP base', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await NestFactory.create(TestModule, { logger: false });
    setupApplication(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('serves public health beneath /api', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200, { status: 'ok' });
    await request(app.getHttpServer())
      .get('/api/missing')
      .expect(404, { code: 'NOT_FOUND', message: 'Recurso não encontrado.' });
  });
  it('does not expose unimplemented business endpoints', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
    await request(app.getHttpServer()).get('/api/requests').expect(404);
  });
  it.each([
    [400, 'VALIDATION'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
  ])('maps HTTP %s to %s', async (status, code) => {
    const result = await request(app.getHttpServer())
      .get('/api/errors/' + status)
      .expect(Number(status));
    expect(result.body.code).toBe(code);
    expect(JSON.stringify(result.body)).not.toContain('PRIVATE_DETAIL');
  });
  it('redacts internal errors', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/errors/500')
      .expect(500);
    expect(result.body).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Não foi possível processar a requisição.',
    });
    expect(JSON.stringify(result.body)).not.toContain(
      'DATABASE_PASSWORD_PRIVATE',
    );
  });
  it('documents public health and the future cookie security scheme', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    expect(result.body.paths['/api/health'].get.security).toBeUndefined();
    expect(result.body.components.securitySchemes.cookie).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: 'connect.sid',
    });
    await request(app.getHttpServer()).get('/api/docs/').expect(200);
  });
});
