import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateShopDto } from './dto/create-shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private subscriptionsService: SubscriptionsService,
  ) { }

  async createOrUpdateForOwner(ownerId: string, dto: CreateShopDto) {
    const existing = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (existing) {
      const shop = await this.prisma.shop.update({
        where: { ownerId },
        data: dto,
      });
      await this.activityLogsService.log(ownerId, 'UPDATE_SHOP', `Updated shop profile "${shop.name}"`);
      return {
        success: true,
        message: 'Shop updated successfully',
        data: { shop },
      };
    }

    const shop = await this.prisma.shop.create({
      data: {
        ...dto,
        ownerId,
      },
    });
    await this.activityLogsService.log(ownerId, 'CREATE_SHOP', `Created shop profile "${shop.name}" (Pending Verification)`);
    return {
      success: true,
      message: 'Shop created successfully',
      data: { shop },
    };
  }

  async findAll(query?: { city?: string; category?: string; search?: string; status?: string }) {
    const where: any = {};

    if (query?.status === 'pending' || query?.status === 'unverified') {
      where.verified = false;
    } else if (query?.status === 'verified') {
      where.verified = true;
    }

    if (query?.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query?.category) {
      where.category = query.category;
    }

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const shops = await this.prisma.shop.findMany({
      where,
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Shops fetched successfully',
      data: {
        shops,
      },
    };
  }

  async findPending() {
    const shops = await this.prisma.shop.findMany({
      where: { verified: false },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Pending shops fetched successfully',
      data: { shops },
    };
  }

  async findVerified() {
    const shops = await this.prisma.shop.findMany({
      where: { verified: true },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Verified shops fetched successfully',
      data: { shops },
    };
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        products: true,
      },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }

    const currentProducts = shop.products ? shop.products.length : 0;
    const plan = shop.subscription?.plan;
    const productLimit = plan ? plan.productLimit : 0;
    const remaining = Math.max(0, productLimit - currentProducts);

    return {
      success: true,
      message: 'Shop fetched successfully',
      data: {
        shop: {
          ...shop,
          subscriptionUsage: {
            planName: plan ? plan.name : 'None',
            productLimit,
            currentProducts,
            remaining,
            isLimitReached: currentProducts >= productLimit,
          },
        },
      },
    };
  }

  async findShopProducts(shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException(`Shop with ID ${shopId} not found`);
    }

    const products = await this.prisma.product.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });

    const formattedProducts = products.map((p) => {
      let specs = {};
      let images: string[] = [];
      try { specs = JSON.parse(p.specsJson || '{}'); } catch (e) {}
      try { images = JSON.parse(p.imagesJson || '[]'); } catch (e) {}
      return {
        ...p,
        specs,
        images,
      };
    });

    return {
      success: true,
      message: `Products for shop "${shop.name}" fetched successfully`,
      data: {
        shopName: shop.name,
        products: formattedProducts,
      },
    };
  }

  async getStats() {
    const [totalShops, verifiedShops, pendingShops, totalProducts, totalLeads, totalUsers] = await Promise.all([
      this.prisma.shop.count(),
      this.prisma.shop.count({ where: { verified: true } }),
      this.prisma.shop.count({ where: { verified: false } }),
      this.prisma.product.count(),
      this.prisma.lead.count(),
      this.prisma.user.count(),
    ]);

    return {
      success: true,
      message: 'Admin statistics fetched successfully',
      data: {
        stats: {
          totalShops,
          verifiedShops,
          pendingShops,
          totalProducts,
          totalLeads,
          totalUsers,
        },
      },
    };
  }

  async toggleVerify(id: string, verified?: boolean) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }

    const newStatus = verified !== undefined ? verified : !shop.verified;
    const updatedShop = await this.prisma.shop.update({
      where: { id },
      data: { verified: newStatus },
      include: { subscription: { include: { plan: true } } },
    });

    if (newStatus) {
      const existingSub = await this.prisma.shopSubscription.findUnique({ where: { shopId: id } });
      if (!existingSub) {
        let starterPlan = await this.prisma.subscriptionPlan.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { productLimit: 'asc' },
        });
        if (!starterPlan) {
          starterPlan = await this.prisma.subscriptionPlan.create({
            data: { name: 'Free Starter Plan', description: 'Default starter plan for new approved shops', productLimit: 5, status: 'ACTIVE' },
          });
        }
        await this.subscriptionsService.assignPlanToShop({ shopId: id, planId: starterPlan.id });
      }
    }

    if (shop.ownerId) {
      await this.activityLogsService.log(
        shop.ownerId,
        newStatus ? 'VERIFY_SHOP' : 'UNVERIFY_SHOP',
        `Shop "${updatedShop.name}" status updated to ${newStatus ? 'Verified' : 'Pending Verification'} by Admin`,
      );
    }

    return {
      success: true,
      message: `Shop "${updatedShop.name}" ${newStatus ? 'verified' : 'unverified'} successfully`,
      data: {
        shop: updatedShop,
      },
    };
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.shop.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Shop not found');
    }
    const shop = await this.prisma.shop.update({
      where: { id },
      data: dto,
      include: { subscription: { include: { plan: true } } },
    });

    return {
      success: true,
      message: 'Shop updated successfully',
      data: {
        shop,
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.shop.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }

    await this.prisma.shop.delete({ where: { id } });
    return {
      success: true,
      message: 'Shop deleted successfully',
      data: { id },
    };
  }
}
