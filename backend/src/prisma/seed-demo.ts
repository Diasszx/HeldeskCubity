import { hash } from 'bcrypt';
import type { PrismaClient } from '../generated/prisma/client.js';

export const demoUsers = [
  { username: 'ana.demo', name: 'Ana Silva' },
  { username: 'bruno.demo', name: 'Bruno Costa' },
] as const;
export const demoCategories = [
  'TI',
  'RH',
  'Compras',
  'Financeiro',
  'Infraestrutura',
] as const;

export async function seedDemo(
  client: Pick<PrismaClient, 'user' | 'category'>,
) {
  for (const user of demoUsers) {
    const passwordHash = await hash('demo123', 12);
    await client.user.upsert({
      where: { username: user.username },
      create: { ...user, passwordHash },
      update: {},
    });
  }
  for (const name of demoCategories) {
    await client.category.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }
}
