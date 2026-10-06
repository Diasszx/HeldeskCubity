import 'dotenv/config';
import { URL } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../dist/generated/prisma/client.js';
import {
  provisionDemo,
  provisionUsers,
} from '../dist/prisma/provision-demo.js';

let client;
try {
  // Explicit operator action, never imported by application startup.
  if (process.env.CONFIRM_DEMO_PROVISION !== 'cubity-demo')
    throw new Error('Confirmation required');
  const users = provisionUsers(process.env.DEMO_USERS_JSON);
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
  )
    throw new Error('TLS database required');
  client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.href }),
  });
  await client.$transaction(
    (transaction) => provisionDemo(transaction, users),
    { timeout: 60_000 },
  );
  console.log(
    'Provisionamento concluído. Identidades e senhas existentes foram preservadas.',
  );
} catch {
  console.error(
    'Provisionamento bloqueado. Confira confirmação, credenciais privadas, TLS e migrations.',
  );
  process.exitCode = 1;
} finally {
  if (client) await client.$disconnect();
}
