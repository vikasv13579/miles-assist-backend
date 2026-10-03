import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardRuntimeMetrics } from './dashboard-runtime-metrics.js';
import { DashboardReportQueryDto } from './dto/dashboard-report-query.dto.js';
import { UpdateDashboardSettingsDto } from './dto/update-dashboard-settings.dto.js';
import { DashboardChartQueryDto } from './dto/dashboard-chart-query.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private runtimeMetrics: DashboardRuntimeMetrics,
  ) {}

  async getStats() {
    const [totalUsers, totalTransactions, totalBookings, revenueData] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.transaction.count(),
      this.prisma.booking.count(),
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCESS' }
      })
    ]);

    return {
      data: {
        totalUsers,
        totalTransactions,
        totalBookings,
        totalRevenue: Number(revenueData._sum.amount || 0)
      }
    };
  }

  async getCharts(query: DashboardChartQueryDto) {
    const daysByRange = { '7d': 7, '1m': 30, '3m': 90, '6m': 180, '1y': 365 };
    const dayCount = daysByRange[query.range];
    const fromDate = new Date();
    fromDate.setUTCHours(0, 0, 0, 0);
    fromDate.setUTCDate(fromDate.getUTCDate() - dayCount + 1);

    const transactions = await this.prisma.transaction.findMany({
      where: { status: 'SUCCESS', createdAt: { gte: fromDate } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, amount: true },
    });

    const revenueByDate: Record<string, number> = {};
    const txByDate: Record<string, number> = {};
    
    transactions.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + Number(tx.amount);
      txByDate[date] = (txByDate[date] || 0) + 1;
    });

    const revenue = [];
    const txData = [];
    for (let day = 0; day < dayCount; day += 1) {
      const date = new Date(fromDate);
      date.setUTCDate(fromDate.getUTCDate() + day);
      const key = date.toISOString().slice(0, 10);
      revenue.push({ date: key, value: revenueByDate[key] ?? 0 });
      txData.push({ date: key, count: txByDate[key] ?? 0 });
    }

    return {
      data: {
        range: query.range,
        revenue,
        transactions: txData
      }
    };
  }

  async getAlerts() {
    const [pendingTransactions, pendingBookings, settings] = await Promise.all([
      this.prisma.transaction.count({ where: { status: 'PENDING' } }),
      this.prisma.booking.count({ where: { status: 'PENDING' } }),
      this.getOrCreateSettings(),
    ]);

    const memory = process.memoryUsage();
    const runtimeMemoryPercent = Math.round((memory.heapUsed / memory.heapTotal) * 100);
    const createdAt = new Date().toISOString();
    const alerts: {
      type: 'CRITICAL' | 'WARNING' | 'INFO';
      message: string;
      subtitle: string;
      createdAt: string;
    }[] = [];

    if (runtimeMemoryPercent >= settings.runtimeMemoryAlertThreshold) {
      alerts.push({
        type: 'CRITICAL',
        message: `Runtime memory at ${runtimeMemoryPercent}%`,
        subtitle: `Heap usage is above ${settings.runtimeMemoryAlertThreshold}%`,
        createdAt,
      });
    }
    if (pendingTransactions > 0) {
      alerts.push({
        type: 'WARNING',
        message: `${pendingTransactions} transaction${pendingTransactions === 1 ? '' : 's'} pending`,
        subtitle: 'Pending review',
        createdAt,
      });
    }
    if (pendingBookings > 0) {
      alerts.push({
        type: 'INFO',
        message: `${pendingBookings} booking${pendingBookings === 1 ? '' : 's'} pending`,
        subtitle: 'Pending review',
        createdAt,
      });
    }

    if (settings.maintenanceScheduledAt) {
      const scheduledDate = settings.maintenanceScheduledAt;
      if (scheduledDate.getTime() > Date.now()) {
        alerts.push({
          type: 'INFO',
          message: 'System maintenance scheduled',
          subtitle: `Scheduled for ${scheduledDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short',
          })}`,
          createdAt,
        });
      }
    }

    return { data: alerts };
  }

  async getSystemHealth() {
    const [activeUsers, databaseResponseTimeMs] = await Promise.all([
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.measureDatabaseResponseTime(),
    ]);
    const memory = process.memoryUsage();

    return {
      data: {
        uptimeSeconds: Math.floor(process.uptime()),
        averageResponseTimeMs: this.runtimeMetrics.getAverageResponseTimeMs(),
        activeUsers,
        runtimeMemoryPercent: Math.round((memory.heapUsed / memory.heapTotal) * 100),
        databaseResponseTimeMs,
      },
    };
  }

  async getAnalytics() {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 29);
    since.setUTCHours(0, 0, 0, 0);

    const [transactions, bookings] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, amount: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
    ]);

    const byDate = new Map<string, { revenue: number; transactions: number }>();
    let successfulTransactions = 0;
    let successfulRevenue = 0;
    for (const transaction of transactions) {
      const date = transaction.createdAt.toISOString().slice(0, 10);
      const point = byDate.get(date) ?? { revenue: 0, transactions: 0 };
      point.transactions += 1;
      if (transaction.status === 'SUCCESS') {
        point.revenue += Number(transaction.amount);
        successfulTransactions += 1;
        successfulRevenue += Number(transaction.amount);
      }
      byDate.set(date, point);
    }

    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(since);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, ...(byDate.get(key) ?? { revenue: 0, transactions: 0 }) };
    });

    return {
      data: {
        period: { fromDate: since.toISOString(), toDate: new Date().toISOString() },
        totalTransactions: transactions.length,
        successfulTransactions,
        successRate: transactions.length ? (successfulTransactions / transactions.length) * 100 : 0,
        successfulRevenue,
        averageTransaction: transactions.length
          ? transactions.reduce((total, item) => total + Number(item.amount), 0) / transactions.length
          : 0,
        bookingsByStatus: bookings.map((item) => ({ status: item.status, count: item._count.id })),
        daily: days,
      },
    };
  }

  async getReports(query: DashboardReportQueryDto) {
    const fromDate = query.fromDate ? new Date(query.fromDate) : new Date(0);
    const toDate = query.toDate ? new Date(query.toDate) : new Date();
    if (query.toDate && query.toDate.length === 10) toDate.setUTCHours(23, 59, 59, 999);

    if (fromDate > toDate) {
      throw new BadRequestException('fromDate must be earlier than or equal to toDate.');
    }

    const createdAt = { gte: fromDate, lte: toDate };
    const [transactions, bookings] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['status'],
        where: { createdAt },
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt },
        _count: { id: true },
      }),
    ]);

    return {
      data: {
        fromDate: fromDate.toISOString(),
        toDate: toDate.toISOString(),
        transactionCount: transactions.reduce((sum, item) => sum + item._count.id, 0),
        transactionVolume: transactions.reduce((sum, item) => sum + Number(item._sum.amount ?? 0), 0),
        transactionsByStatus: transactions.map((item) => ({
          status: item.status,
          count: item._count.id,
          amount: Number(item._sum.amount ?? 0),
        })),
        bookingCount: bookings.reduce((sum, item) => sum + item._count.id, 0),
        bookingsByStatus: bookings.map((item) => ({ status: item.status, count: item._count.id })),
      },
    };
  }

  async getSettings() {
    return { data: await this.getOrCreateSettings() };
  }

  async updateSettings(data: UpdateDashboardSettingsDto) {
    const settings = await this.getOrCreateSettings();
    const updated = await this.prisma.dashboardSettings.update({
      where: { id: settings.id },
      data: {
        ...(data.maintenanceScheduledAt !== undefined && {
          maintenanceScheduledAt: data.maintenanceScheduledAt
            ? new Date(data.maintenanceScheduledAt)
            : null,
        }),
        ...(data.runtimeMemoryAlertThreshold !== undefined && {
          runtimeMemoryAlertThreshold: data.runtimeMemoryAlertThreshold,
        }),
      },
    });
    return { data: updated };
  }

  private getOrCreateSettings() {
    return this.prisma.dashboardSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  private async measureDatabaseResponseTime() {
    const start = process.hrtime.bigint();
    await this.prisma.$queryRaw`SELECT 1`;
    return Number(process.hrtime.bigint() - start) / 1_000_000;
  }
}
