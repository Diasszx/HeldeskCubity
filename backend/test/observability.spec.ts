import 'reflect-metadata';
import { Controller, Get, Injectable, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gunzipSync } from 'node:zlib';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller.js';
import {
  createObservability,
  validateObservability,
} from '../src/observability/observability.js';

const credentials = {
  OBSERVE_ENABLED: 'true',
  OBSERVE_APP_KEY: 'local-test-key',
  OBSERVE_APP_SECRET: 'local-test-secret',
};

describe('Observability configuration', () => {
  it('has no module or instrument when disabled, even with credentials', () => {
    expect(createObservability({})).toEqual({
      imports: [],
      instrument: undefined,
    });
    expect(
      createObservability({ ...credentials, OBSERVE_ENABLED: 'false' }).imports,
    ).toEqual([]);
  });
  it('rejects ambiguous opt-in, missing credentials, insecure collectors and invalid sampling without leaking secrets', () => {
    for (const input of [
      { OBSERVE_ENABLED: '1' },
      { OBSERVE_ENABLED: 'true' },
      { ...credentials, OBSERVE_ENDPOINT: 'http://external.example' },
      { ...credentials, OBSERVE_ENDPOINT: 'https://user:PRIVATE@example.com' },
      { ...credentials, OBSERVE_SAMPLE_RATE: '0' },
      { ...credentials, OBSERVE_SERVICE_ID: 'personal name' },
    ]) {
      expect(() => validateObservability(input)).toThrow(
        'Configuração inválida: OBSERVE_',
      );
      try {
        validateObservability(input);
      } catch (error) {
        expect((error as Error).message).not.toContain('PRIVATE');
        expect((error as Error).message).not.toContain(
          credentials.OBSERVE_APP_SECRET,
        );
      }
    }
  });
});

@Injectable()
class ProbeService {
  execute() {
    return { ok: true };
  }
  fail() {
    throw new Error(
      'PRIVATE_ERROR\nPRIVATE_MULTILINE\n    at fake (PRIVATE_FRAME)',
    );
  }
}
@Controller('probe')
class ProbeController {
  constructor(private readonly service: ProbeService) {}
  @Post() execute() {
    return this.service.execute();
  }
  @Get('failure') fail() {
    return this.service.fail();
  }
  @Get('health') health() {
    return { ok: true };
  }
}

it('exports real lifecycle traces only to a local collector and sanitizes request/error inputs', async () => {
  const batches: string[] = [];
  const collector = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      batches.push(
        (req.headers['content-encoding'] === 'gzip'
          ? gunzipSync(buffer)
          : buffer
        ).toString(),
      );
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{}');
    });
  });
  await new Promise<void>((resolve) =>
    collector.listen(0, '127.0.0.1', resolve),
  );
  const endpoint = `http://127.0.0.1:${(collector.address() as AddressInfo).port}`;
  const integration = createObservability({
    ...credentials,
    OBSERVE_ENDPOINT: endpoint,
  });
  @Module({
    imports: integration.imports,
    controllers: [ProbeController, HealthController],
    providers: [ProbeService],
  })
  class ProbeModule {}
  const app = await NestFactory.create(ProbeModule, {
    instrument: integration.instrument,
    logger: false,
    abortOnError: false,
  });
  try {
    app.setGlobalPrefix('api');
    await app.init();
    await request(app.getHttpServer()).get('/api/health').expect(200);
    await request(app.getHttpServer())
      .post('/api/probe?title=PRIVATE_QUERY')
      .set('cookie', 'sid=PRIVATE_COOKIE')
      .set('x-request-id', 'PRIVATE_TRACE')
      .send({ password: 'PRIVATE_BODY' })
      .expect(201);
    await request(app.getHttpServer()).get('/api/probe/failure').expect(500);
    const deadline = Date.now() + 12000;
    while (
      !batches.some((batch) => batch.includes('ProbeService')) &&
      Date.now() < deadline
    )
      await new Promise((resolve) => setTimeout(resolve, 100));
    const telemetry = batches.join('\n');
    expect(telemetry).toContain('ProbeService');
    expect(telemetry).toContain('ProbeController');
    expect(telemetry).toContain('500');
    expect(telemetry).toContain('/api/probe');
    expect(telemetry).not.toContain('/api/health');
    expect(telemetry).toContain('"cls":"Error"');
    expect(telemetry).not.toContain('PRIVATE_');
    expect(telemetry).toContain('[REDACTED]');
  } finally {
    await app.close();
    await new Promise<void>((resolve, reject) =>
      collector.close((error) => (error ? reject(error) : resolve())),
    );
  }
}, 20000);
