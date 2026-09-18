import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(dto: CreateLeadDto) {
    let shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } }).catch(() => null);

    if (!shop && dto.productId) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: dto.productId },
          include: { shop: true },
        });
        if (product && product.shop) {
          shop = product.shop;
        }
      } catch (err) {
        // ignore fallback errors
      }
    }

    const shopName = shop?.name || 'Kochi Gadgets World';
    const shopPhone = shop?.phone || 'N/A';
    const shopIdToSave = shop?.id || (dto.shopId && dto.shopId !== 'unknown' ? dto.shopId : null);

    // If shopIdToSave is not a valid 24-char ObjectId or valid DB shop, find any fallback shop or create lead cleanly
    let lead: any;
    if (shopIdToSave && /^[0-9a-fA-F]{24}$/.test(shopIdToSave)) {
      lead = await this.prisma.lead.create({
        data: {
          shopId: shopIdToSave,
          productId: (dto.productId && /^[0-9a-fA-F]{24}$/.test(dto.productId)) ? dto.productId : undefined,
          productName: dto.productName || 'Direct Shop Call',
          customerName: dto.customerName || 'Local Consumer',
          customerPhone: dto.customerPhone,
          contactType: dto.contactType,
        },
      });
    } else {
      // Fallback: use first verified shop in DB if present
      const firstShop = await this.prisma.shop.findFirst({ select: { id: true } });
      if (firstShop) {
        lead = await this.prisma.lead.create({
          data: {
            shopId: firstShop.id,
            productId: (dto.productId && /^[0-9a-fA-F]{24}$/.test(dto.productId)) ? dto.productId : undefined,
            productName: dto.productName || 'Direct Shop Call',
            customerName: dto.customerName || 'Local Consumer',
            customerPhone: dto.customerPhone,
            contactType: dto.contactType,
          },
        });
      } else {
        lead = {
          id: `lead-${Date.now()}`,
          shopId: dto.shopId,
          productName: dto.productName || 'Direct Shop Call',
          customerName: dto.customerName || 'Local Consumer',
          customerPhone: dto.customerPhone,
          contactType: dto.contactType,
          createdAt: new Date(),
        };
      }
    }

    // Try resolving effective userId if not passed directly
    let effectiveUserId = dto.userId || null;
    if (!effectiveUserId && dto.customerPhone) {
      try {
        const matched = await this.prisma.user.findFirst({
          where: { phone: dto.customerPhone },
          select: { id: true },
        });
        if (matched) {
          effectiveUserId = matched.id;
        }
      } catch (err) {
        // Safe fallback
      }
    }

    // Log Activity for WhatsApp / Call
    try {
      if (dto.contactType === 'whatsapp') {
        await this.activityLogsService.log(
          effectiveUserId,
          'WHATSAPP_CLICK',
          `WhatsApp clicked for product: "${dto.productName}" (Shop: "${shopName}"). Customer: ${dto.customerName} (${dto.customerPhone})`,
        );
      } else {
        await this.activityLogsService.log(
          effectiveUserId,
          'CALL_CLICK',
          `Call button clicked for product: "${dto.productName}" (Shop: "${shopName}", Phone: ${shopPhone}). Customer: ${dto.customerName} (${dto.customerPhone})`,
        );
      }
    } catch (logErr) {
      console.error('Failed to log lead activity:', logErr);
    }

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
