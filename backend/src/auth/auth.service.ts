import {
  Injectable,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SessionRuntime } from '../session/session.runtime.js';
import { createCsrfToken } from './csrf.guard.js';
import type { AuthRequest } from './auth.types.js';

export interface LoginInput {
  username: string;
  password: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash = '';
  constructor(
    private readonly prisma: PrismaService,
    private readonly runtime: SessionRuntime,
  ) {}
  async onModuleInit() {
    this.dummyHash = await hash(randomBytes(32).toString('hex'), 12);
  }
  async login(request: AuthRequest, input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { username: input.username },
    });
    const valid = await compare(
      input.password,
      user?.passwordHash ?? this.dummyHash,
    );
    if (!user || !valid) throw new UnauthorizedException();
    try {
      await this.runtime.regenerate(request);
      request.session.userId = user.id;
      request.session.csrfToken = createCsrfToken();
      await this.runtime.save(request);
    } catch (error) {
      try {
        await this.runtime.destroy(request);
      } catch {
        /* Store failure is returned to the caller. */
      }
      throw error;
    }
    return { id: user.id, name: user.name, username: user.username };
  }
}
