import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';
import { PrismaClient } from '../generated/prisma/client.js';
import { seedDemo } from './seed-demo.js';

async function main() {
  if (
    process.env.SEED_DEMO !== 'true' ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error(
      'Seed demo requer SEED_DEMO=true e ambiente não produtivo.',
    );
  }
  const url = z
    .url()
    .refine((value) => /^postgres(ql)?:\/\//.test(value))
    .safeParse(process.env.DATABASE_URL);
  if (!url.success)
    throw new Error('DATABASE_URL inválida; confira .env.example.');
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.data }),
  });
  try {
    await client.$transaction((transaction) => seedDemo(transaction), {
      timeout: 30000,
    });
    console.log('Seed concluído; registros existentes preservados.');
  } finally {
    await client.$disconnect();
  }
}

void main().catch(() => {
  console.error(
    'Seed não executado. Confira SEED_DEMO, NODE_ENV, DATABASE_URL e migrations.',
  );
  process.exitCode = 1;
});
