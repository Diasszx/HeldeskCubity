import {
  Global,
  Module,
  RequestMethod,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { SessionRuntime } from './session.runtime.js';

@Global()
@Module({ providers: [SessionRuntime], exports: [SessionRuntime] })
export class SessionModule implements NestModule {
  constructor(private readonly runtime: SessionRuntime) {}
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(this.runtime.middleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
