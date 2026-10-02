import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('127.0.0.1'),
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:\/\//.test(value)),
  SESSION_SECRET: z.string().min(32),
});

export function validateEnvironment(input: Record<string, unknown>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const keys = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(
      `Configuração inválida: ${keys.join(', ')}. Confira .env.example.`,
    );
  }
  return result.data;
}
