import { isIP } from 'node:net';
import { z } from 'zod';
import { validateObservability } from '../observability/observability.js';

const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    HOST: z.string().min(1).default('127.0.0.1'),
    HOSTING_PLATFORM: z.enum(['standalone', 'render']).default('standalone'),
    FRONTEND_DIST: z.string().default(''),
    RENDER: z.string().optional(),
    RENDER_EXTERNAL_HOSTNAME: z.string().optional(),
    RENDER_EXTERNAL_URL: z.string().optional(),
    DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:\/\//.test(value)),
    DATABASE_MIGRATION_URL: z
      .url()
      .refine((value) => /^postgres(ql)?:\/\//.test(value))
      .optional(),
    SESSION_SECRET: z.string().min(32),
    SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .min(60)
      .max(2592000)
      .default(28800),
    APP_ORIGIN: z
      .url()
      .refine(
        (value) =>
          ['http:', 'https:'].includes(new URL(value).protocol) &&
          new URL(value).origin === value,
      )
      .default('http://127.0.0.1:3000'),
    TRUSTED_PROXY_IPS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((ip) => ip.trim())
          .filter(Boolean),
      )
      .refine((ips) => ips.every((ip) => isIP(ip) !== 0)),
  })
  .superRefine((env, context) => {
    if (env.HOSTING_PLATFORM === 'render') {
      const reject = (key: string) =>
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Modo Render inválido.',
        });
      if (env.NODE_ENV !== 'production') reject('NODE_ENV');
      if (env.RENDER !== 'true') reject('RENDER');
      if (
        !/^[a-z0-9-]+\.onrender\.com$/.test(env.RENDER_EXTERNAL_HOSTNAME ?? '')
      )
        reject('RENDER_EXTERNAL_HOSTNAME');
      if (env.RENDER_EXTERNAL_URL !== `https://${env.RENDER_EXTERNAL_HOSTNAME}`)
        reject('RENDER_EXTERNAL_URL');
      if (env.APP_ORIGIN !== env.RENDER_EXTERNAL_URL) reject('APP_ORIGIN');
      if (env.TRUSTED_PROXY_IPS.length) reject('TRUSTED_PROXY_IPS');
      if (!env.FRONTEND_DIST) reject('FRONTEND_DIST');
      for (const key of ['DATABASE_URL', 'DATABASE_MIGRATION_URL'] as const) {
        const value = env[key];
        if (
          value &&
          !['require', 'verify-full'].includes(
            new URL(value).searchParams.get('sslmode') ?? '',
          )
        )
          reject(key);
      }
    }
    if (env.NODE_ENV === 'production') {
      if (!env.APP_ORIGIN.startsWith('https://'))
        context.addIssue({
          code: 'custom',
          path: ['APP_ORIGIN'],
          message: 'HTTPS obrigatório.',
        });
      if (env.SESSION_SECRET.includes('replace-with-'))
        context.addIssue({
          code: 'custom',
          path: ['SESSION_SECRET'],
          message: 'Substitua o exemplo público.',
        });
    }
  });

export function validateEnvironment(input: Record<string, unknown>) {
  const observability = validateObservability(input);
  const result = environmentSchema.safeParse({
    ...input,
    APP_ORIGIN:
      input.APP_ORIGIN ??
      (input.HOSTING_PLATFORM === 'render'
        ? input.RENDER_EXTERNAL_URL
        : undefined),
  });
  if (!result.success) {
    const keys = [
      ...new Set(result.error.issues.map((issue) => issue.path.join('.'))),
    ];
    throw new Error(
      `Configuração inválida: ${keys.join(', ')}. Confira .env.example.`,
    );
  }
  return { ...result.data, ...observability };
}
