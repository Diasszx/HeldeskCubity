import { spawn } from 'node:child_process';
import { validateEnvironment } from '../dist/config/environment.js';

async function run(args) {
  const child = spawn(process.execPath, args, {
    stdio: 'ignore',
    timeout: 120_000,
  });
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('Database preparation failed')),
    );
  });
}

try {
  validateEnvironment(process.env);
  if (!['true', 'false'].includes(process.env.SEED_DEMO ?? 'false'))
    throw new Error('Invalid seed setting');
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO === 'true')
    throw new Error('Demo seed is unavailable in production');
  console.log('Aplicando migrations versionadas...');
  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  if (process.env.SEED_DEMO === 'true') {
    console.log(
      'Preparando dados de demonstração; registros existentes serão preservados...',
    );
    await run(['dist/prisma/seed.js']);
  }
  console.log('Banco preparado. A API pode iniciar.');
} catch {
  console.error(
    'Preparo do banco falhou. Confira configuração, migrations e disponibilidade do PostgreSQL. A API não será iniciada.',
  );
  process.exitCode = 1;
}
