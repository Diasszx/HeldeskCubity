import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { setupApplication } from '../src/setup.js';

describe('Application composition', () => {
  it('starts the complete module tree without opening a database connection', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/unavailable';
    process.env.SESSION_SECRET = 'test-only-secret-with-at-least-32-characters';
    const { AppModule } = await import('../src/app.module.js');
    const app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    try {
      setupApplication(app);
      await app.init();
      await request(app.getHttpServer())
        .get('/api/health')
        .expect(200, { status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
