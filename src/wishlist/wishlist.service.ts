import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class WishlistService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
  ) {}

  private formatProduct(p: any) {
    if (!p) return null;
    let specs = {};
    let conditionInfo = {};
    let images: string[] = [];

    try {
      specs = typeof p.specsJson === 'string' ? JSON.parse(p.specsJson || '{}') : (p.specs || {});
    } catch (e) {
      specs = {};
    }

    try {
      conditionInfo = typeof p.conditionJson === 'string' ? JSON.parse(p.conditionJson || '{}') : (p.conditionInfo || {});
    } catch (e) {
      conditionInfo = {};
    }

    try {
      if (Array.isArray(p.images)) {
        images = p.images;
      } else if (typeof p.imagesJson === 'string') {
        images = JSON.parse(p.imagesJson || '[]');
      } else {
        images = [];
      }
    } catch (e) {
      images = [];
    }

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      price: p.price,
      stock: p.stock,
      shopId: p.shopId,
      shop: p.shop,
      specs,
      conditionInfo,
      images,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  async toggleWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: { id: existing.id },
      });

      await this.activityLogsService.log(
        userId,
        'WISHLIST_REMOVE',
        `Removed product "${product.name}" (ID: ${product.id}) from wishlist`,
      );

      return {
        success: true,
        isWishlisted: false,
        message: 'Removed from wishlist',
      };
    } else {
      const wishlist = await this.prisma.wishlist.create({
        data: {
          userId,
          productId,
        },
        include: {
          product: {
            include: {
              shop: true,
            },
          },
        },
      });

      const shopName = product.shop?.name || wishlist.product?.shop?.name || 'Shop';
      await this.activityLogsService.log(
        userId,
        'WISHLIST',
        `Added product "${product.name}" (ID: ${product.id}, Price: ₹${product.price}) to wishlist (Shop: "${shopName}")`,
      );

      return {
        success: true,
        isWishlisted: true,
        message: 'Added to wishlist',
        data: {
          wishlist: {
            ...wishlist,
            product: this.formatProduct(wishlist.product),
          },
        },
      };
    }
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      return {
        success: true,
        isWishlisted: true,
        message: 'Product already in wishlist',
        data: { wishlist: existing },
      };
    }

    const wishlist = await this.prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          include: {
            shop: true,
          },
        },
      },
    });

    const shopName = product.shop?.name || wishlist.product?.shop?.name || 'Shop';
    await this.activityLogsService.log(
      userId,
      'WISHLIST',
      `Added product "${product.name}" (ID: ${product.id}, Price: ₹${product.price}) to wishlist (Shop: "${shopName}")`,
    );

    return {
      success: true,
      isWishlisted: true,
      message: 'Added to wishlist',
      data: {
        wishlist: {
          ...wishlist,
          product: this.formatProduct(wishlist.product),
        },
      },
    };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!existing) {
      return {
        success: true,
        isWishlisted: false,
        message: 'Product not in wishlist',
      };
    }

    await this.prisma.wishlist.delete({
      where: { id: existing.id },
    });

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    const productName = product?.name || productId;

    await this.activityLogsService.log(
      userId,
      'WISHLIST_REMOVE',
      `Removed product "${productName}" (ID: ${productId}) from wishlist`,
    );

    return {
      success: true,
      isWishlisted: false,
      message: 'Removed from wishlist',
    };
  }

  async getUserWishlist(userId: string) {
    const wishlist = await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            shop: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const products = wishlist
      .filter((w) => Boolean(w.product))
      .map((w) => ({
        ...this.formatProduct(w.product),
        wishlistId: w.id,
        wishlistedAt: w.createdAt,
      }));

    return {
      success: true,
      message: 'Wishlist items fetched successfully',
      data: {
        count: wishlist.length,
        items: wishlist,
        products,
      },
    };
  }

  async getWishlistIds(userId: string) {
    const wishlist = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });

    const productIds = wishlist.map((w) => w.productId);

    return {
      success: true,
      data: {
        productIds,
      },
    };
  }
}
