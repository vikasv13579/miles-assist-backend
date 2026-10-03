import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const user = await this.prisma.user.create({ data });
    return { data: user };
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, status, sortBy, sortOrder = 'asc', fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
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
    const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'status'];
    if (sortBy && allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return { data: user };
  }

  async update(id: string, data: UpdateUserDto) {
    if (data.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('User with this email already exists');
      }
    }
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
      });
      return { data: user };
    } catch (e) {
      throw new NotFoundException('User not found');
    }
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');

      await transaction.transaction.deleteMany({ where: { userId: id } });
      await transaction.booking.deleteMany({ where: { userId: id } });
      const deletedUser = await transaction.user.delete({ where: { id } });

      return { data: deletedUser };
    });
  }
}
