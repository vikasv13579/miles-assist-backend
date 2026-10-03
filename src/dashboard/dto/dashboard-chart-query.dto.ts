import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DASHBOARD_CHART_RANGES = ['7d', '1m', '3m', '6m', '1y'] as const;
export type DashboardChartRange = (typeof DASHBOARD_CHART_RANGES)[number];

export class DashboardChartQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_CHART_RANGES, default: '1m' })
  @IsOptional()
  @IsIn(DASHBOARD_CHART_RANGES)
  range: DashboardChartRange = '1m';
}
