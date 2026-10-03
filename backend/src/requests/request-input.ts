import { z } from 'zod';

export const requestLimits = { title: 60, description: 1000 } as const;

export const createRequestSchema = z.strictObject({
  title: z.string().trim().min(1).max(requestLimits.title),
  description: z.string().trim().min(1).max(requestLimits.description),
  categoryId: z.uuid(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const createRequestBody = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['title', 'description', 'categoryId'],
  properties: {
    title: {
      type: 'string' as const,
      minLength: 1,
      maxLength: requestLimits.title,
      description:
        'Obrigatório após trim; limites aplicados ao texto normalizado.',
    },
    description: {
      type: 'string' as const,
      minLength: 1,
      maxLength: requestLimits.description,
      description:
        'Obrigatória após trim; limites aplicados ao texto normalizado.',
    },
    categoryId: { type: 'string' as const, format: 'uuid' },
  },
};
