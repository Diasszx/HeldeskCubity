import 'dotenv/config';
import { spawn } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { validateEnvironment } from '../dist/config/environment.js';
import { frontendMiddleware } from '../dist/hosting/frontend.js';
import { renderMigrationUrl } from '../dist/hosting/database-url.js';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
try {
  const config = validateEnvironment(process.env);
  if (config.HOSTING_PLATFORM !== 'render') throw new Error('Render required');
  // Fail before changing the database if the frontend build is missing.
  frontendMiddleware(config.FRONTEND_DIST);
  console.log('Aplicando migrations versionadas antes de iniciar...');
  const child = spawn(
    process.execPath,
    ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
    {
      env: {
        ...process.env,
        DATABASE_URL: renderMigrationUrl(
          config.DATABASE_MIGRATION_URL ?? config.DATABASE_URL,
        ),
      },
      stdio: 'ignore',
      timeout: 120_000,
    },
  );
  const stop = () => child.kill('SIGTERM');
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code) =>
        code === 0 ? resolve() : reject(new Error('Migration failed')),
      );
    });
  } finally {
    process.removeListener('SIGTERM', stop);
    process.removeListener('SIGINT', stop);
  }
  // Same process owns Nest shutdown hooks. Provisioning is never automatic.
  await import('../dist/main.js');
} catch {
  console.error(
    'Inicialização Render bloqueada. Confira ambiente, build e migrations; a API não foi iniciada.',
  );
  process.exitCode = 1;
}
