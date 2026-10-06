import { hash } from 'bcrypt';
import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { demoCategories } from './seed-demo.js';

const usersSchema = z
  .array(
    z
      .object({
        username: z
          .string()
          .trim()
          .toLowerCase()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9][a-z0-9._-]*$/),
        name: z.string().trim().min(1).max(120),
        password: z
          .string()
          .min(12)
          .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
      })
      .strict(),
  )
  .min(2)
  .max(10)
  .refine(
    (users) =>
      new Set(users.map((user) => user.username)).size === users.length,
  );

export function provisionUsers(input: string | undefined) {
  try {
    return usersSchema.parse(JSON.parse(input ?? ''));
  } catch {
    throw new Error(
      'DEMO_USERS_JSON inválido. Informe de 2 a 10 usuários únicos com nome, login e senha privada de 12 a 72 bytes.',
    );
  }
}

export async function provisionDemo(
  client: Pick<PrismaClient, 'user' | 'category'>,
  users: ReturnType<typeof provisionUsers>,
) {
  for (const user of users) {
    const passwordHash = await hash(user.password, 12);
    await client.user.upsert({
      where: { username: user.username },
      create: { username: user.username, name: user.name, passwordHash },
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
