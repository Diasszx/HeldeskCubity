import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, username: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
}
