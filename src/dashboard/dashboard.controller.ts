import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UpdateDashboardSettingsDto } from './dto/update-dashboard-settings.dto.js';
import { DashboardReportQueryDto } from './dto/dashboard-report-query.dto.js';
import { DashboardChartQueryDto } from './dto/dashboard-chart-query.dto.js';

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
  getCharts(@Query() query: DashboardChartQueryDto) {
    return this.dashboardService.getCharts(query);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get dashboard alerts' })
  getAlerts() {
    return this.dashboardService.getAlerts();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get live backend health metrics' })
  getSystemHealth() {
    return this.dashboardService.getSystemHealth();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get transaction and booking analytics' })
  getAnalytics() {
    return this.dashboardService.getAnalytics();
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get report data for a date range' })
  getReports(@Query() query: DashboardReportQueryDto) {
    return this.dashboardService.getReports(query);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get editable dashboard system settings' })
  getSettings() {
    return this.dashboardService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update dashboard system settings' })
  updateSettings(@Body() body: UpdateDashboardSettingsDto) {
    return this.dashboardService.updateSettings(body);
  }
}
