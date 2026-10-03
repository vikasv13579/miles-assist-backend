import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import {
  DashboardResponseTimeMiddleware,
  DashboardRuntimeMetrics,
} from './dashboard-runtime-metrics.js';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRuntimeMetrics, DashboardResponseTimeMiddleware]
})
export class DashboardModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(DashboardResponseTimeMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
