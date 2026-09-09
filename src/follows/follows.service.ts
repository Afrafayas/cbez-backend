import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private prisma: PrismaService) {}

  async followShop(userId: string, shopId: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const existing = await this.prisma.follow.findUnique({
      where: {
        userId_shopId: {
          userId,
          shopId,
        },
      },
    });

    if (existing) {
      return {
        success: true,
        message: 'Already following this shop',
        data: { follow: existing },
      };
    }

    const follow = await this.prisma.follow.create({
      data: {
        userId,
        shopId,
      },
      include: {
        shop: true,
      },
    });

    return {
      success: true,
      message: `You are now following ${shop.name}`,
      data: { follow },
    };
  }

  async unfollowShop(userId: string, shopId: string) {
    const existing = await this.prisma.follow.findUnique({
      where: {
        userId_shopId: {
          userId,
          shopId,
        },
      },
    });

    if (!existing) {
      return {
        success: true,
        message: 'Not currently following this shop',
      };
    }

    await this.prisma.follow.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      success: true,
      message: 'Unfollowed shop successfully',
    };
  }

  async getFollowedShops(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { userId },
      include: {
        shop: {
          include: {
            _count: { select: { products: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Followed shops fetched successfully',
      data: {
        shops: follows.map((f) => f.shop),
        follows,
      },
    };
  }

  async checkFollowStatus(userId: string, shopId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        userId_shopId: {
          userId,
          shopId,
        },
      },
    });

    return {
      success: true,
      isFollowing: Boolean(follow),
    };
  }

  async getShopFollowers(userId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: userId },
    });

    if (!shop) {
      throw new NotFoundException('Shop account not found for this user');
    }

    const follows = await this.prisma.follow.findMany({
      where: { shopId: shop.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const followers = follows.map((f) => ({
      id: f.user.id,
      name: f.user.name,
      email: f.user.email,
      phone: f.user.phone,
      followedAt: f.createdAt,
    }));

    return {
      success: true,
      message: 'Shop followers fetched successfully',
      data: {
        count: followers.length,
        followers,
      },
    };
  }
}
