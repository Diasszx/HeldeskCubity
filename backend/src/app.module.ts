import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { RequestsModule } from './requests/requests.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { createObservability } from './observability/observability.js';

const configuration = ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnvironment,
});
// ConfigModule loads .env synchronously before the opt-in is evaluated.
export const observability = createObservability(process.env);

@Module({
  imports: [
    configuration,
    ...observability.imports,
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    RequestsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
