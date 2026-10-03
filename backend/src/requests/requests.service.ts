import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRequestInput } from './request-input.js';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRequestInput, requesterId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: input.categoryId },
      select: { id: true },
    });
    if (!category) throw new BadRequestException();
    try {
      return await this.prisma.request.create({
        data: {
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          requesterId,
        },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          categoryId: true,
          requesterId: true,
          createdAt: true,
          status: true,
        },
      });
    } catch (error) {
      // A referência pode desaparecer entre a consulta e a escrita.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      )
        throw new BadRequestException();
      throw error;
    }
  }
}
