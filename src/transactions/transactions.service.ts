import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto.js';
import { QueryTransactionDto } from './dto/query-transaction.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    // Generate unique reference
    const reference = 'TXN-' + Math.floor(Math.random() * 100000);
    const transaction = await this.prisma.transaction.create({
      data: {
        ...data,
        reference,
      }
    });
    return { data: transaction };
  }

  async findAll(query: QueryTransactionDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy,
      sortOrder = 'desc',
      fromDate,
      toDate,
      minAmount,
      maxAmount,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gt = minAmount;
      if (maxAmount !== undefined) where.amount.lt = maxAmount;
    }

    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'updatedAt', 'amount', 'status', 'reference'];
    if (sortBy && allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total, aggregate, successfulTransactions] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { user: { select: { name: true, email: true } } }
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.transaction.count({ where: { ...where, status: 'SUCCESS' } }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        summary: {
          totalVolume: Number(aggregate._sum.amount ?? 0),
          averageTransaction: Number(aggregate._avg.amount ?? 0),
          successRate: total ? (successfulTransactions / total) * 100 : 0,
        },
      },
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return { data: transaction };
  }

  async updateStatus(id: string, data: UpdateTransactionStatusDto) {
    try {
      const transaction = await this.prisma.transaction.update({
        where: { id },
        data: { status: data.status },
      });
      return { data: transaction };
    } catch (e) {
      throw new NotFoundException('Transaction not found');
    }
  }
}
