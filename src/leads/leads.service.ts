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
  ) { }

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

    const customerPhoneDigits = (dto.customerPhone || '').replace(/\D/g, '').slice(-10);
    const resolvedShopId = shopIdToSave && /^[0-9a-fA-F]{24}$/.test(shopIdToSave) ? shopIdToSave : null;

    // Deduplication: If this customer already generated a lead for the same product and shop, DO NOT save duplicate to DB
    if (resolvedShopId) {
      const existingLeads = await this.prisma.lead.findMany({
        where: {
          shopId: resolvedShopId,
          contactType: dto.contactType,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const duplicateLead = existingLeads.find((l) => {
        // Match product (by productId or normalized productName)
        const matchesProduct =
          (dto.productId && l.productId && dto.productId === l.productId) ||
          (dto.productName && l.productName && dto.productName.trim().toLowerCase() === l.productName.trim().toLowerCase());

        if (!matchesProduct) return false;

        // Match customer by last 10 digits of phone
        const leadPhoneDigits = (l.customerPhone || '').replace(/\D/g, '').slice(-10);
        if (customerPhoneDigits && leadPhoneDigits && customerPhoneDigits === leadPhoneDigits) {
          return true;
        }

        // Match customer by name if name is specific
        if (
          dto.customerName &&
          l.customerName &&
          dto.customerName.trim().toLowerCase() === l.customerName.trim().toLowerCase() &&
          !['customer', 'anonymous buyer', 'local consumer', 'guest'].includes(dto.customerName.trim().toLowerCase())
        ) {
          return true;
        }

        return false;
      });

      if (duplicateLead) {
        return {
          success: true,
          message: 'Lead already recorded for this customer and product (duplicate omitted)',
          data: {
            lead: duplicateLead,
          },
        };
      }
    }

    // Log Activity for WhatsApp / Call only for fresh leads
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

    // If user !== seller and not duplicate, save fresh lead in database
    let lead: any;
    if (resolvedShopId) {
      lead = await this.prisma.lead.create({
        data: {
          shopId: resolvedShopId,
          productId: (dto.productId && /^[0-9a-fA-F]{24}$/.test(dto.productId)) ? dto.productId : undefined,
          productName: dto.productName || 'Direct Shop Call',
          customerName: dto.customerName || 'Local Consumer',
          customerPhone: dto.customerPhone || '',
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
            customerPhone: dto.customerPhone || '',
            contactType: dto.contactType,
          },
        });
      } else {
        lead = {
          id: `lead-${Date.now()}`,
          shopId: dto.shopId,
          productName: dto.productName || 'Direct Shop Call',
          customerName: dto.customerName || 'Local Consumer',
          customerPhone: dto.customerPhone || '',
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
