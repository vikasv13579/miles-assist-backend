import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get KPI statistics' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Get chart data' })
  getCharts() {
    return this.dashboardService.getCharts();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get dashboard alerts' })
  getAlerts() {
    return this.dashboardService.getAlerts();
  }
}
