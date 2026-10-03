import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRequestInput } from './request-input.js';
import { escapeSearch, utcPeriod } from './request-filters.js';
import type { RequestFilters } from './request-filters.js';

const requestSelect = {
  id: true,
  code: true,
  title: true,
  description: true,
  categoryId: true,
  requesterId: true,
  createdAt: true,
  status: true,
} satisfies Prisma.RequestSelect;

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) throw new BadRequestException();
  }

  async list(filters: RequestFilters) {
    if (filters.categoryId) await this.requireCategory(filters.categoryId);
    const where: Prisma.RequestWhereInput = {
      ...(filters.title
        ? {
            title: {
              contains: escapeSearch(filters.title),
              mode: 'insensitive',
            },
          }
        : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.startDate || filters.endDate
        ? { createdAt: utcPeriod(filters) }
        : {}),
    };
    return this.prisma.request.findMany({
      where,
      select: requestSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async get(id: string) {
    const result = await this.prisma.request.findUnique({
      where: { id },
      select: requestSelect,
    });
    if (!result) throw new NotFoundException();
    return result;
  }

  private async editable(id: string, requesterId: string) {
    const current = await this.get(id);
    if (current.requesterId !== requesterId) throw new ForbiddenException();
    if (current.status !== 'OPEN') throw new ConflictException();
    return current;
  }

  private isDatabaseError(error: unknown, code: string) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }

  async update(id: string, input: CreateRequestInput, requesterId: string) {
    await this.editable(id, requesterId);
    await this.requireCategory(input.categoryId);
    try {
      return await this.prisma.request.update({
        where: { id, requesterId, status: 'OPEN' },
        data: {
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
        },
        select: requestSelect,
      });
    } catch (error) {
      if (this.isDatabaseError(error, 'P2025')) {
        await this.editable(id, requesterId);
        throw new ConflictException();
      }
      if (this.isDatabaseError(error, 'P2003')) throw new BadRequestException();
      throw error;
    }
  }

  async remove(id: string, requesterId: string) {
    await this.editable(id, requesterId);
    try {
      await this.prisma.request.delete({
        where: { id, requesterId, status: 'OPEN' },
      });
    } catch (error) {
      if (this.isDatabaseError(error, 'P2025')) {
        await this.editable(id, requesterId);
        throw new ConflictException();
      }
      throw error;
    }
  }

  async create(input: CreateRequestInput, requesterId: string) {
    await this.requireCategory(input.categoryId);
    try {
      return await this.prisma.request.create({
        data: {
          title: input.title,
          description: input.description,
          categoryId: input.categoryId,
          requesterId,
        },
        select: requestSelect,
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
