import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SessionModule } from '../session/session.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import { CsrfGuard } from './csrf.guard.js';

@Module({
  imports: [PrismaModule, SessionModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    CsrfGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useExisting: CsrfGuard },
  ],
})
export class AuthModule {}
