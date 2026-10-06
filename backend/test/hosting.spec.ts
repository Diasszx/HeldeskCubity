import 'reflect-metadata';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  Controller,
  Get,
  Module,
  Req,
  type INestApplication,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Request } from 'express';
import request from 'supertest';
import { setupApplication } from '../src/setup.js';
import { frontendMiddleware } from '../src/hosting/frontend.js';

@Controller('probe')
class ProbeController {
  @Get() get(@Req() request: Request) {
    return {
      secure: request.secure,
      hostname: request.hostname,
      ip: request.ip,
    };
  }
}

describe('Single-origin hosting', () => {
  let root: string;
  let app: INestApplication;
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'cubity-hosting-'));
    mkdirSync(join(root, 'assets'));
    writeFileSync(join(root, 'index.html'), '<html>SPA_TEST_SHELL</html>');
    writeFileSync(
      join(root, 'assets', 'main-a1.js'),
      'export const app = true;',
    );
    writeFileSync(join(root, '.env'), 'PRIVATE_FILE_SENTINEL');
    mkdirSync(join(root, 'api'));
    writeFileSync(join(root, 'api', 'private.html'), 'API_MUST_NOT_BE_STATIC');
    @Module({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              FRONTEND_DIST: root,
              HOSTING_PLATFORM: 'render',
            }),
          ],
        }),
      ],
      controllers: [ProbeController],
    })
    class Root {}
    app = await NestFactory.create(Root, { logger: false });
    setupApplication(app);
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    rmSync(root, { recursive: true, force: true });
  });

  it.each(['/', '/login', '/requests', '/requests/123/edit'])(
    'serves HTML navigation %s without redirect',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Accept', 'text/html')
        .expect(200);
      expect(response.text).toContain('SPA_TEST_SHELL');
      expect(response.headers['cache-control']).toBe('no-cache');
      expect(response.headers['set-cookie']).toBeUndefined();
    },
  );
  it('serves assets, supports HEAD, and does not cache the HTML shell forever', async () => {
    const response = await request(app.getHttpServer())
      .get('/assets/main-a1.js')
      .expect(200);
    expect(response.headers['content-type']).toContain('javascript');
    expect(response.headers['cache-control']).toContain('immutable');
    await request(app.getHttpServer()).head('/requests').expect(200);
  });
  it.each([
    '/assets/missing.js',
    '/favicon-missing.svg',
    '/.env',
    '/api/private.html',
    '/api/missing',
  ])('keeps %s out of the SPA fallback', async (path) => {
    const response = await request(app.getHttpServer()).get(path).expect(404);
    expect(response.text).not.toContain('SPA_TEST_SHELL');
    expect(response.text).not.toContain('PRIVATE_FILE_SENTINEL');
    expect(response.text).not.toContain('API_MUST_NOT_BE_STATIC');
  });
  it('does not serve the shell for JSON or POST requests', async () => {
    await request(app.getHttpServer())
      .get('/requests')
      .set('Accept', 'application/json')
      .expect(404);
    await request(app.getHttpServer()).post('/requests').expect(404);
  });
  it.each(['http', 'https', 'http, https', 'https, http'])(
    'ignores client-controlled forwarded headers %s in Render mode',
    async (protocol) => {
      const response = await request(app.getHttpServer())
        .get('/api/probe')
        .set('Host', 'portal.onrender.com')
        .set('X-Forwarded-Proto', protocol)
        .set('X-Forwarded-Host', 'attacker.test')
        .set('X-Forwarded-For', '203.0.113.66')
        .expect(200);
      expect(response.body.secure).toBe(true);
      expect(response.body.hostname).toBe('portal.onrender.com');
      expect(response.body.ip).not.toBe('203.0.113.66');
    },
  );
  it('fails fast if the frontend build is unavailable', () => {
    expect(() => frontendMiddleware(join(root, 'missing'))).toThrow(
      'Build do frontend',
    );
  });
});
