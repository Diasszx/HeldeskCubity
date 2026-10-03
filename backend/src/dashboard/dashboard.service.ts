import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RequestStatus } from '../generated/prisma/client.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async indicators() {
    const groups = await this.prisma.request.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const counts: Record<RequestStatus, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
    };
    for (const group of groups) counts[group.status] = group._count._all;
    const open = counts.OPEN;
    const inProgress = counts.IN_PROGRESS;
    const completed = counts.COMPLETED;
    return {
      total: open + inProgress + completed,
      open,
      inProgress,
      completed,
    };
  }
}
