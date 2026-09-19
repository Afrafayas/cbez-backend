import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { formatShopModel } from './shop-profile.helper';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private subscriptionsService: SubscriptionsService,
  ) { }

  private readonly shopInclude = {
    subscription: { include: { plan: true } },
    owner: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        latitude: true,
        longitude: true,
      },
    },
    _count: {
      select: { products: true },
    },
  };

  async createOrUpdateForOwner(ownerId: string, dto: CreateShopDto) {
    const existing = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    const data: any = { ...dto };
    if (data.latitude !== undefined) {
      data.latitude = data.latitude !== null && !isNaN(Number(data.latitude)) ? Number(data.latitude) : null;
    }
    if (data.longitude !== undefined) {
      data.longitude = data.longitude !== null && !isNaN(Number(data.longitude)) ? Number(data.longitude) : null;
    }

    if (data.latitude !== undefined || data.longitude !== undefined) {
      await this.prisma.user.update({
        where: { id: ownerId },
        data: {
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        },
      });
    }

    if (existing) {
      const shop = await this.prisma.shop.update({
        where: { ownerId },
        data,
        include: this.shopInclude,
      });

      await this.activityLogsService.log(ownerId, 'UPDATE_SHOP', `Updated shop profile "${shop.name}"`);
      return {
        success: true,
        message: 'Shop updated successfully',
        data: { shop: formatShopModel(shop) },
      };
    }

    const shop = await this.prisma.shop.create({
      data: {
        ...data,
        ownerId,
      },
      include: this.shopInclude,
    });

    await this.activityLogsService.log(ownerId, 'CREATE_SHOP', `Created shop profile "${shop.name}" (Pending Verification)`);
    return {
      success: true,
      message: 'Shop created successfully',
      data: { shop: formatShopModel(shop) },
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
      include: this.shopInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Shops fetched successfully',
      data: {
        shops: shops.map((s) => formatShopModel(s)),
      },
    };
  }

  async findPending() {
    const shops = await this.prisma.shop.findMany({
      where: { verified: false },
      include: this.shopInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Pending shops fetched successfully',
      data: { shops: shops.map((s) => formatShopModel(s)) },
    };
  }

  async findVerified() {
    const shops = await this.prisma.shop.findMany({
      where: { verified: true },
      include: this.shopInclude,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Verified shops fetched successfully',
      data: { shops: shops.map((s) => formatShopModel(s)) },
    };
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        ...this.shopInclude,
        products: true,
      },
    });

    if (!shop) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Shop fetched successfully',
      data: {
        shop: formatShopModel(shop),
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
      include: this.shopInclude,
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
        shop: formatShopModel(updatedShop),
      },
    };
  }

  async update(id: string, dto: any) {
    const existing = await this.prisma.shop.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Shop not found');
    }

    const data: any = { ...dto };
    if (data.latitude !== undefined) {
      data.latitude = data.latitude !== null && !isNaN(Number(data.latitude)) ? Number(data.latitude) : null;
    }
    if (data.longitude !== undefined) {
      data.longitude = data.longitude !== null && !isNaN(Number(data.longitude)) ? Number(data.longitude) : null;
    }

    if (existing.ownerId && (data.latitude !== undefined || data.longitude !== undefined)) {
      await this.prisma.user.update({
        where: { id: existing.ownerId },
        data: {
          ...(data.latitude !== undefined ? { latitude: data.latitude } : {}),
          ...(data.longitude !== undefined ? { longitude: data.longitude } : {}),
        },
      });
    }

    const shop = await this.prisma.shop.update({
      where: { id },
      data,
      include: this.shopInclude,
    });

    return {
      success: true,
      message: 'Shop updated successfully',
      data: {
        shop: formatShopModel(shop),
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
