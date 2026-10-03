import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

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

  async getCharts() {
    const transactions = await this.prisma.transaction.groupBy({
      by: ['createdAt'],
      _sum: { amount: true },
      _count: { id: true },
      where: { status: 'SUCCESS' },
      orderBy: { createdAt: 'asc' },
      take: 100 // for a realistic time series we would group by month via raw query, or post-process
    });

    // In a real app we would use a raw query or better grouping. For simplicity, we return the raw transactions and group them in JS for this assignment since Prisma native group by date part is complex in SQLite/PG without raw.
    // Instead we'll just fetch recent successful transactions and map them.
    const recentTx = await this.prisma.transaction.findMany({
      where: { status: 'SUCCESS' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, amount: true, id: true }
    });

    const revenueByDate: Record<string, number> = {};
    const txByDate: Record<string, number> = {};
    
    recentTx.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + Number(tx.amount);
      txByDate[date] = (txByDate[date] || 0) + 1;
    });

    const revenue = Object.keys(revenueByDate).map(date => ({ date, value: revenueByDate[date] }));
    const txData = Object.keys(txByDate).map(date => ({ date, count: txByDate[date] }));

    return {
      data: {
        revenue,
        transactions: txData
      }
    };
  }

  async getAlerts() {
    const [pendingTransactions, pendingBookings] = await Promise.all([
      this.prisma.transaction.count({ where: { status: 'PENDING' } }),
      this.prisma.booking.count({ where: { status: 'PENDING' } })
    ]);

    const alerts = [];
    if (pendingTransactions > 0) {
      alerts.push({ type: 'WARNING', message: `You have ${pendingTransactions} pending transactions.` });
    }
    if (pendingBookings > 0) {
      alerts.push({ type: 'INFO', message: `You have ${pendingBookings} pending bookings.` });
    }

    return { data: alerts };
  }
}
