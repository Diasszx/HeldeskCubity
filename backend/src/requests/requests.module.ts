import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RequestsController } from './requests.controller.js';
import { RequestsService } from './requests.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
