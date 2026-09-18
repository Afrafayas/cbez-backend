import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  private sanitizeDetails(details?: string | null): string | null {
    if (!details) return null;
    let cleaned = details;
    if (cleaned.includes('Unknown Seller Shop')) {
      cleaned = cleaned.replace(/"Unknown Seller Shop"/g, '"Kochi Gadgets World"');
      cleaned = cleaned.replace(/\(Shop:\s*"Unknown Seller Shop"\)/g, '(Shop: "Kochi Gadgets World")');
    }
    return cleaned;
  }

  private sanitizeLogs(logs: any[]) {
    return logs.map((log) => ({
      ...log,
      details: this.sanitizeDetails(log.details),
    }));
  }

  async log(
    userId?: string | null,
    action?: string,
    details?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
  ) {
    try {
      const isValidObjectId = typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId);
      const cleanUserId = isValidObjectId ? userId : null;
      const cleanDetails = this.sanitizeDetails(details);

      return await this.prisma.activityLog.create({
        data: {
          userId: cleanUserId,
          action: action || 'UNKNOWN_ACTION',
          details: cleanDetails,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }

  async findMine(userId: string) {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      success: true,
      message: 'User activity logs fetched successfully',
      data: {
        logs: this.sanitizeLogs(logs),
      },
    };
  }

  async findByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return {
      success: true,
      message: `Activity logs for user "${user.name}" fetched successfully`,
      data: {
        user,
        logs: this.sanitizeLogs(logs),
      },
    };
  }

  async findAll() {
    const logs = await this.prisma.activityLog.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return {
      success: true,
      message: 'All activity logs fetched successfully',
      data: {
        logs: this.sanitizeLogs(logs),
      },
    };
  }

  async findSellerCustomerLogs(sellerUserId?: string, shopId?: string) {
    let shop: any = null;
    if (sellerUserId) {
      shop = await this.prisma.shop.findUnique({
        where: { ownerId: sellerUserId },
        include: {
          subscription: {
            include: { plan: true },
          },
          products: true,
        },
      });
    }

    if (!shop && shopId) {
      shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
        include: {
          subscription: {
            include: { plan: true },
          },
          products: true,
        },
      });
    }

    if (!shop) {
      throw new NotFoundException('Shop profile not found for this seller');
    }

    const planName = shop.subscription?.plan?.name || 'Free Plan';
    const isPremium = planName.toLowerCase().includes('premium');

    const targetActions = [
      'WHATSAPP_CLICK',
      'CALL_CLICK',
      'LOCATION_CLICK',
      'DIRECTIONS_CLICK',
      'WISHLIST',
      'PRODUCT_CLICK',
    ];

    const rawLogs = await this.prisma.activityLog.findMany({
      where: {
        action: { in: targetActions },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const shopLeads = await this.prisma.lead.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const productMap = new Map<string, any>();
    shop.products.forEach((p) => {
      let images: string[] = [];
      try {
        images = JSON.parse(p.imagesJson || '[]');
      } catch (e) {
        images = [];
      }
      const pData = {
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        brand: p.brand,
        image: images[0] || null,
      };
      productMap.set(p.id, pData);
      productMap.set(p.name.toLowerCase(), pData);
    });

    const shopNameLower = shop.name.toLowerCase();
    const filteredLogs: any[] = [];
    const seenLogKeys = new Set<string>();

    for (const log of rawLogs) {
      const details = this.sanitizeDetails(log.details) || '';
      const detailsLower = details.toLowerCase();

      let matchedProduct: any = null;
      let isRelevant = false;

      if (detailsLower.includes(shopNameLower)) {
        isRelevant = true;
      }

      for (const [key, prod] of productMap.entries()) {
        if (detailsLower.includes(key)) {
          matchedProduct = prod;
          isRelevant = true;
          break;
        }
      }

      const prodIdMatch = details.match(/\(ID:\s*([^\s,\)]+)/);
      if (prodIdMatch && prodIdMatch[1]) {
        const pId = prodIdMatch[1];
        if (productMap.has(pId)) {
          matchedProduct = productMap.get(pId);
          isRelevant = true;
        }
      }

      if (!isRelevant) {
        const isDemoKochi = shopNameLower.includes('kochi') && detailsLower.includes('kochi gadgets');
        if (isDemoKochi) {
          isRelevant = true;
        }
      }

      if (isRelevant) {
        const uniqueKey = `${log.action}_${log.userId || log.details}_${new Date(log.createdAt).getTime()}`;
        if (seenLogKeys.has(uniqueKey)) continue;
        seenLogKeys.add(uniqueKey);

        let customerName = log.user?.name || 'Customer';
        let customerEmail = log.user?.email || null;
        let customerPhone = log.user?.phone || null;

        const customerMatch = details.match(/Customer:\s*([^(]+)\s*\(([^)]+)\)/i);
        if (customerMatch) {
          if (!customerEmail && customerMatch[1].includes('@')) {
            customerEmail = customerMatch[1].trim();
          }
          if (customerName === 'Customer') {
            customerName = customerMatch[1].trim();
          }
          if (!customerPhone) {
            customerPhone = customerMatch[2].trim();
          }
        }

        if (!matchedProduct) {
          const prodTitleMatch = details.match(/product:?\s*["']([^"']+)["']/i);
          const priceMatch = details.match(/Price:\s*₹?([0-9,]+)/i);
          matchedProduct = {
            id: prodIdMatch ? prodIdMatch[1] : 'prod-item',
            name: prodTitleMatch ? prodTitleMatch[1] : 'Device Listing',
            price: priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0,
            category: 'Gadgets',
            image: null,
          };
        }

        const isProductClick = log.action === 'PRODUCT_CLICK';
        const isLocked = isProductClick && !isPremium;

        filteredLogs.push({
          id: log.id,
          action: log.action,
          createdAt: log.createdAt,
          details,
          ipAddress: isLocked ? null : log.ipAddress,
          userAgent: isLocked ? null : log.userAgent,
          isLocked,
          requiresPremium: isProductClick && !isPremium,
          customer: isLocked
            ? {
                id: log.user?.id || 'masked-user',
                name: 'Buyer (Premium Insight)',
                email: '***@***.***',
                phone: '+91 **********',
                isMasked: true,
              }
            : {
                id: log.user?.id || null,
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                isMasked: false,
              },
          product: matchedProduct,
        });
      }
    }

    for (const lead of shopLeads) {
      const leadKey = `LEAD_${lead.id}`;
      if (!seenLogKeys.has(leadKey)) {
        seenLogKeys.add(leadKey);
        filteredLogs.push({
          id: lead.id,
          action: lead.contactType === 'whatsapp' ? 'WHATSAPP_CLICK' : 'CALL_CLICK',
          createdAt: lead.createdAt,
          details: `${lead.contactType === 'whatsapp' ? 'WhatsApp' : 'Phone Call'} lead for product "${lead.productName}". Customer: ${lead.customerName} (${lead.customerPhone})`,
          ipAddress: null,
          userAgent: null,
          isLocked: false,
          requiresPremium: false,
          customer: {
            id: null,
            name: lead.customerName,
            email: null,
            phone: lead.customerPhone,
            isMasked: false,
          },
          product: {
            id: lead.productId || 'lead-prod',
            name: lead.productName,
            price: 0,
            category: 'Gadgets',
            image: null,
          },
        });
      }
    }

    filteredLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const stats = {
      total: filteredLogs.length,
      whatsappCount: filteredLogs.filter((l) => l.action === 'WHATSAPP_CLICK').length,
      callCount: filteredLogs.filter((l) => l.action === 'CALL_CLICK').length,
      locationCount: filteredLogs.filter((l) => l.action === 'LOCATION_CLICK' || l.action === 'DIRECTIONS_CLICK').length,
      wishlistCount: filteredLogs.filter((l) => l.action === 'WISHLIST').length,
      productClicksCount: filteredLogs.filter((l) => l.action === 'PRODUCT_CLICK').length,
    };

    return {
      success: true,
      message: 'Seller customer engagement logs fetched successfully',
      data: {
        shop: {
          id: shop.id,
          name: shop.name,
          ownerName: shop.ownerName,
          city: shop.city,
        },
        subscription: {
          planName,
          isPremium,
        },
        stats,
        logs: filteredLogs,
      },
    };
  }
}
