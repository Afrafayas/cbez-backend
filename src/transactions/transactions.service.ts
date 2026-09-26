import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateTransactionDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
    });
    if (!shop) {
      throw new NotFoundException(`Shop with ID "${dto.shopId}" not found`);
    }

    let planName = dto.planName;
    if (dto.planId && !planName) {
      const plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: dto.planId },
      });
      if (plan) {
        planName = plan.name;
      }
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        shopId: dto.shopId,
        planId: dto.planId || null,
        planName: planName || 'Subscription Plan',
        amount: Number(dto.amount || 0),
        paymentStatus: dto.paymentStatus || 'COMPLETED',
        type: dto.type || 'INITIAL_VERIFICATION',
        notes: dto.notes || null,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            ownerName: true,
            phone: true,
            category: true,
            profileImage: true,
          },
        },
        plan: true,
      },
    });

    return {
      success: true,
      message: 'Transaction created successfully',
      data: { transaction },
    };
  }

  async findAll(filter: TransactionFilterDto) {
    const page = Math.max(1, parseInt(filter.page || '1', 10));
    const limit = Math.max(1, parseInt(filter.limit || '10', 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.shopId) {
      where.shopId = filter.shopId;
    }

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.paymentStatus) {
      where.paymentStatus = filter.paymentStatus;
    }

    if (filter.search) {
      const search = filter.search.trim();
      where.OR = [
        { shop: { name: { contains: search, mode: 'insensitive' } } },
        { shop: { ownerName: { contains: search, mode: 'insensitive' } } },
        { planName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const [transactions, total, aggregateRevenue] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              ownerName: true,
              phone: true,
              category: true,
              profileImage: true,
              city: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              productLimit: true,
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.aggregate({
        where: { ...where, paymentStatus: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = aggregateRevenue._sum.amount || 0;

    return {
      success: true,
      message: 'Transactions fetched successfully',
      data: {
        transactions,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalRevenue,
          totalCount: total,
        },
      },
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        shop: true,
        plan: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID "${id}" not found`);
    }

    return {
      success: true,
      message: 'Transaction fetched successfully',
      data: { transaction },
    };
  }

  async update(id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Transaction with ID "${id}" not found`);
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...(dto.planId !== undefined && { planId: dto.planId }),
        ...(dto.planName !== undefined && { planName: dto.planName }),
        ...(dto.amount !== undefined && { amount: Number(dto.amount) }),
        ...(dto.paymentStatus !== undefined && { paymentStatus: dto.paymentStatus }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: {
        shop: true,
        plan: true,
      },
    });

    return {
      success: true,
      message: 'Transaction updated successfully',
      data: { transaction: updated },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Transaction with ID "${id}" not found`);
    }

    await this.prisma.transaction.delete({ where: { id } });

    return {
      success: true,
      message: 'Transaction deleted successfully',
      data: { id },
    };
  }

  async getRevenueStats() {
    const [totalRevenueAgg, totalCount, completedCount, statusBreakdown, typeBreakdown] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({ where: { paymentStatus: 'COMPLETED' } }),
      this.prisma.transaction.groupBy({
        by: ['paymentStatus'],
        _count: { id: true },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);

    const totalRevenue = totalRevenueAgg._sum.amount || 0;

    return {
      success: true,
      message: 'Revenue statistics fetched successfully',
      data: {
        totalRevenue,
        totalTransactions: totalCount,
        completedTransactions: completedCount,
        statusBreakdown,
        typeBreakdown,
      },
    };
  }
}
