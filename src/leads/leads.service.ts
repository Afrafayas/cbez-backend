import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLeadDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const lead = await this.prisma.lead.create({
      data: {
        shopId: dto.shopId,
        productId: dto.productId || undefined,
        productName: dto.productName || 'Direct Shop Call',
        customerName: dto.customerName || 'Local Consumer',
        customerPhone: dto.customerPhone,
        contactType: dto.contactType,
      },
    });

    return {
      success: true,
      message: 'Lead created successfully',
      data: {
        lead,
      },
    };
  }

  async getSellerLeads(sellerUserId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { ownerId: sellerUserId } });
    if (!shop) {
      throw new ForbiddenException('No shop found for this seller account');
    }

    const leads = await this.prisma.lead.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
      },
    });

    return {
      success: true,
      message: 'Leads fetched successfully',
      data: {
        leads,
      },
    };
  }
}
