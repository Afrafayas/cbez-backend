import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNetworkInquiryDto } from './dto/create-network-inquiry.dto';

@Injectable()
export class NetworkService {
  constructor(private prisma: PrismaService) {}

  async createInquiry(dto: CreateNetworkInquiryDto, userId?: string) {
    if (!dto.customerName || !dto.customerPhone || !dto.city || !dto.gadgetNeeded) {
      throw new BadRequestException('Name, phone number, city, and gadget request details are required');
    }

    const inquiry = await this.prisma.networkInquiry.create({
      data: {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail || null,
        city: dto.city,
        category: dto.category || 'Mobiles & Tablets',
        gadgetNeeded: dto.gadgetNeeded,
        targetBudget: dto.targetBudget ? Number(dto.targetBudget) : null,
        notes: dto.notes || null,
        userId: userId || null,
      },
    });

    return {
      success: true,
      message: 'Network gadget sourcing request broadcasted successfully to local merchants',
      data: { inquiry },
    };
  }

  async findAllInquiries(query?: { city?: string; category?: string; search?: string }) {
    const where: any = {};

    if (query?.city && query.city !== 'all' && query.city !== 'All Cities') {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query?.category && query.category !== 'all' && query.category !== 'All Categories') {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { gadgetNeeded: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
      ];
    }

    const inquiries = await this.prisma.networkInquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Network inquiries fetched successfully',
      data: { inquiries },
    };
  }
}
