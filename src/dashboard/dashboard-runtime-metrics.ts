import { Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class DashboardRuntimeMetrics {
  private readonly responseTimes: number[] = [];
  private static readonly MAX_SAMPLES = 100;

  recordResponseTime(durationMs: number) {
    this.responseTimes.push(durationMs);
    if (this.responseTimes.length > DashboardRuntimeMetrics.MAX_SAMPLES) {
      this.responseTimes.shift();
    }
  }

  getAverageResponseTimeMs(): number | null {
    if (this.responseTimes.length === 0) return null;
    const average =
      this.responseTimes.reduce((total, duration) => total + duration, 0) /
      this.responseTimes.length;
    return Math.round(average * 100) / 100;
  }
}

@Injectable()
export class DashboardResponseTimeMiddleware {
  constructor(private readonly runtimeMetrics: DashboardRuntimeMetrics) {}

  use(_request: Request, response: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    response.once('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      this.runtimeMetrics.recordResponseTime(durationMs);
    });
    next();
  }
}
