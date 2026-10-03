import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../src/generated/prisma/client.js';
import { RequestsService } from '../src/requests/requests.service.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';

it('handles a category removed between validation and insertion without leaking database errors', async () => {
  const databaseError = new Prisma.PrismaClientKnownRequestError(
    'PRIVATE_CONSTRAINT',
    { code: 'P2003', clientVersion: 'test' },
  );
  const prisma = {
    category: {
      findUnique: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ id: 'category' }),
    },
    request: {
      create: jest
        .fn<() => Promise<unknown>>()
        .mockRejectedValue(databaseError),
    },
  };
  const service = new RequestsService(prisma as unknown as PrismaService);
  await expect(
    service.create(
      { title: 'Test', description: 'Test', categoryId: 'category' },
      'owner',
    ),
  ).rejects.toBeInstanceOf(BadRequestException);
});

it('preserves infrastructure failures for the shared sanitized error handler', async () => {
  const failure = new Error('PRIVATE_DATABASE_FAILURE');
  const prisma = {
    category: {
      findUnique: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue({ id: 'category' }),
    },
    request: {
      create: jest.fn<() => Promise<unknown>>().mockRejectedValue(failure),
    },
  };
  const service = new RequestsService(prisma as unknown as PrismaService);
  await expect(
    service.create(
      { title: 'Test', description: 'Test', categoryId: 'category' },
      'owner',
    ),
  ).rejects.toBe(failure);
});
