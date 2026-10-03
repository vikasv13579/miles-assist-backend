import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UpdateBookingDto } from './dto/update-booking.dto.js';
import { QueryBookingDto } from './dto/query-booking.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const reference = 'BKG-' + Math.floor(Math.random() * 100000);
    const booking = await this.prisma.booking.create({
      data: {
        ...data,
        reference,
      }
    });
    return { data: booking };
  }

  async findAll(query: QueryBookingDto) {
    const { page = 1, limit = 10, search, status, sortBy, sortOrder = 'desc', fromDate, toDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {};

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
      where.bookingDate = {};
      if (fromDate) where.bookingDate.gte = new Date(fromDate);
      if (toDate) where.bookingDate.lte = new Date(toDate);
    }

    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'updatedAt', 'bookingDate', 'status', 'reference'];
    if (sortBy && allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { user: { select: { name: true, email: true } } }
      }),
      this.prisma.booking.count({ where }),
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
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return { data: booking };
  }

  async update(id: string, data: UpdateBookingDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === 'CANCELLED' && data.status !== 'CANCELLED') {
      throw new BadRequestException('Cannot reschedule a cancelled booking');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data,
    });
    return { data: updated };
  }
}
