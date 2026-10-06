import { createObserveModule, defaultTraceIdGenerator } from '@nestjs/observe';
import type { ObserveOptions } from '@nestjs/observe';
import { z } from 'zod';

const schema = z
  .object({
    OBSERVE_ENABLED: z.enum(['true', 'false']).default('false'),
    OBSERVE_APP_KEY: z.string().trim().min(1).optional(),
    OBSERVE_APP_SECRET: z.string().trim().min(1).optional(),
    OBSERVE_SERVICE_ID: z
      .string()
      .regex(/^[a-zA-Z0-9._-]+$/)
      .max(100)
      .default('cubity-support-api'),
    OBSERVE_SERVICE_VERSION: z
      .string()
      .regex(/^[a-zA-Z0-9._-]+$/)
      .max(50)
      .default('0.1.0'),
    OBSERVE_ENDPOINT: z
      .url()
      .default('https://observe-api.nestjs.com')
      .refine((value) => {
        const url = new URL(value);
        return (
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          url.pathname === '/' &&
          (url.protocol === 'https:' ||
            (url.protocol === 'http:' &&
              ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
        );
      }),
    OBSERVE_SAMPLE_RATE: z.coerce.number().gt(0).max(1).default(1),
  })
  .superRefine((env, context) => {
    if (env.OBSERVE_ENABLED === 'true') {
      for (const key of ['OBSERVE_APP_KEY', 'OBSERVE_APP_SECRET'] as const)
        if (!env[key])
          context.addIssue({
            code: 'custom',
            path: [key],
            message: 'Obrigatório quando habilitado.',
          });
    }
  });

export function validateObservability(input: Record<string, unknown>) {
  const version =
    input.OBSERVE_SERVICE_VERSION ??
    (input.RENDER === 'true' ? input.RENDER_GIT_COMMIT : undefined);
  const result = schema.safeParse({
    ...input,
    OBSERVE_SERVICE_VERSION: version,
  });
  if (!result.success)
    throw new Error(
      `Configuração inválida: ${[...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ')}. Confira .env.example.`,
    );
  return result.data;
}

export function createObservability(input: Record<string, unknown>) {
  const env = validateObservability(input);
  if (env.OBSERVE_ENABLED === 'false')
    return { imports: [], instrument: undefined };

  const { ObserveModule, ObserveInstrument } = createObserveModule({
    sourceContext: false,
    // Never trust caller-supplied identifiers as telemetry attributes.
    traceIdGenerator: () => defaultTraceIdGenerator({}),
    attachTraceIdToLogs: true,
  });
  const options: ObserveOptions = {
    appKey: env.OBSERVE_APP_KEY!,
    appSecret: env.OBSERVE_APP_SECRET!,
    serviceId: env.OBSERVE_SERVICE_ID,
    serviceVersion: env.OBSERVE_SERVICE_VERSION,
    endpoint: env.OBSERVE_ENDPOINT,
    tracesSampleRate: env.OBSERVE_SAMPLE_RATE,
    maxTracesPerBatch: 1000,
    flushInterval: 5000,
    runtimeMetrics: true,
    runtimeMetricsInterval: 60000,
    forwardLogs: false,
    debug: false,
    outgoing: { database: true, http: false },
    http: {
      capture: false,
      ignore: ['/api/health', /^\/api\/docs(?:\/|$|-json)/],
      queryParamsObfuscateRegex: /(?<=\?)[\s\S]+/g,
    },
    redaction: {
      enabled: true,
      useDefaultPatterns: true,
      // Prisma errors may embed user input, including strings resembling frames.
      // Preserve error class and outcome; do not export free-form messages/stacks.
      patterns: [/[\s\S]+/g],
      keys: ['username', 'email', 'title', 'description', 'session', 'csrf'],
    },
  };
  return {
    imports: [ObserveModule.forRoot(options)],
    instrument: ObserveInstrument,
  };
}
