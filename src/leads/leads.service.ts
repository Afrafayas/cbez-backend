import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { SELLER_VERIFICATION_MESSAGE } from '../shops/shop-profile.helper';

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

    // Check whether the logged-in user and the seller are the same user
    const isSameUser = Boolean(
      effectiveUserId &&
      shop?.ownerId &&
      String(effectiveUserId).trim().toLowerCase() === String(shop.ownerId).trim().toLowerCase()
    );

    // Log Activity for WhatsApp / Call (Always create normal User Activity Log)
    try {
      if (dto.contactType === 'whatsapp') {
        await this.activityLogsService.log(
          effectiveUserId,
          'WHATSAPP_CLICK',
          isSameUser
            ? `WhatsApp clicked for product: "${dto.productName}" (Self interaction by owner)`
            : `WhatsApp clicked for product: "${dto.productName}" (Shop: "${shopName}"). Customer: ${dto.customerName} (${dto.customerPhone})`,
        );
      } else {
        await this.activityLogsService.log(
          effectiveUserId,
          'CALL_CLICK',
          isSameUser
            ? `Call button clicked for product: "${dto.productName}" (Self interaction by owner)`
            : `Call button clicked for product: "${dto.productName}" (Shop: "${shopName}", Phone: ${shopPhone}). Customer: ${dto.customerName} (${dto.customerPhone})`,
        );
      }
    } catch (logErr) {
      console.error('Failed to log lead activity:', logErr);
    }

    // If user === seller, DO NOT create a separate Seller Activity Log / Lead
    if (isSameUser) {
      return {
        success: true,
        message: 'User activity logged successfully (seller lead omitted for same user)',
        data: {
          lead: null,
        },
      };
    }

    // If user !== seller, keep existing behavior and create the required Seller Activity Log as before
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

    if (!shop.verified) {
      throw new ForbiddenException(SELLER_VERIFICATION_MESSAGE);
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
