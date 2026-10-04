import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule, observability } from './app.module.js';
import { setupApplication } from './setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: observability.instrument,
  });
  setupApplication(app);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  await app.listen(
    config.getOrThrow<number>('PORT'),
    config.getOrThrow<string>('HOST'),
  );
}

void bootstrap().catch(() => {
  console.error(
    'Falha ao iniciar a API. Confira a configuração e a disponibilidade da porta.',
  );
  process.exitCode = 1;
});
