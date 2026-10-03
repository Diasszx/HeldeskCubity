import { z } from 'zod';

export const changeStatusSchema = z.strictObject({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']),
});
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export const changeStatusBody = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['status'],
  properties: {
    status: {
      type: 'string' as const,
      enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED'],
    },
  },
};
