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
    const { page = 1, limit = 10, search, status, sortBy, sortOrder = 'desc', fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (search) {
      where.OR = [
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

    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'updatedAt', 'amount', 'status', 'reference'];
    if (sortBy && allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { user: { select: { name: true, email: true } } }
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
