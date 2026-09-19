import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
    private subscriptionsService: SubscriptionsService,
  ) { }

  async create(sellerUserId: string, dto: CreateProductDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: sellerUserId },
    });

    if (!shop) {
      throw new ForbiddenException('You must create a shop profile before adding products');
    }

    if (!shop.verified) {
      throw new ForbiddenException(
        'Your shop account is pending Admin verification. You can upload products once Admin approves your shop.',
      );
    }

    // Check Subscription Plan & Product Limit dynamically
    await this.subscriptionsService.checkProductLimit(shop.id);

    // Validate category and perform dynamic spec validation if category spec config exists
    const categoryRecord = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: { equals: dto.category, mode: 'insensitive' } },
          { slug: dto.category },
        ],
      },
    });

    // Specifications are optional across all categories
    const sanitizedSpecs: Record<string, string> = { ...(dto.specs || {}) };
    if (categoryRecord && categoryRecord.specConfigJson) {
      try {
        const specRules: any[] = JSON.parse(categoryRecord.specConfigJson);
        const incomingSpecs = dto.specs || {};

        for (const rule of specRules) {
          let val = incomingSpecs[rule.key];
          if (val === undefined || val === null || val === '') {
            val = incomingSpecs[rule.label];
          }
          if (val === undefined || val === null || val === '') {
            const matchedEntry = Object.entries(incomingSpecs).find(
              ([k]) =>
                k.trim().toLowerCase() === rule.key.trim().toLowerCase() ||
                k.trim().toLowerCase() === rule.label.trim().toLowerCase(),
            );
            if (matchedEntry) {
              val = matchedEntry[1];
            }
          }
          if (val === undefined || val === null || val === '') {
            val = (dto as any)[rule.key] ?? (dto as any)[rule.label];
          }

          if (val !== undefined && val !== null && val !== '') {
            sanitizedSpecs[rule.key] = String(val);
            sanitizedSpecs[rule.label] = String(val);
          }
        }
      } catch (e) {
        Object.assign(sanitizedSpecs, dto.specs || {});
      }
    } else {
      Object.assign(sanitizedSpecs, dto.specs || {});
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        brand: dto.brand,
        category: dto.category,
        description: dto.description,
        price: Number(dto.price),
        stock: Number(dto.stock),
        specsJson: JSON.stringify(sanitizedSpecs),
        conditionJson: JSON.stringify(dto.conditionInfo || {}),
        imagesJson: JSON.stringify(dto.images || []),
        shopId: shop.id,
      },
      include: {
        shop: true,
      },
    });

    await this.activityLogsService.log(
      sellerUserId,
      'CREATE_PRODUCT',
      `Added product "${product.name}" (Price: ₹${product.price})`,
    );

    return {
      success: true,
      message: 'Product created successfully',
      data: {
        product: this.formatProduct(product),
      },
    };
  }

  async findMine(sellerUserId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: sellerUserId },
    });

    if (!shop) {
      return {
        success: true,
        message: 'Products fetched successfully',
        data: {
          products: [],
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: 'desc' },
      include: { shop: true },
    });

    return {
      success: true,
      message: 'Products fetched successfully',
      data: {
        products: products.map((p) => this.formatProduct(p)),
      },
    };
  }

  async findAll(query: {
    search?: string;
    category?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    city?: string;
    sortBy?: string;
    shopId?: string;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    condition?: string;
  }) {
    const where: any = {};

    if (query.shopId) {
      where.shopId = query.shopId;
    }

    if (
      query.category &&
      query.category !== 'all' &&
      query.category !== 'All Categories' &&
      query.category !== 'All'
    ) {
      where.category = { contains: query.category, mode: 'insensitive' };
    }

    if (
      query.brand &&
      query.brand !== 'all' &&
      query.brand !== 'All Brands' &&
      query.brand !== 'All'
    ) {
      where.brand = { contains: query.brand, mode: 'insensitive' };
    }

    if (
      query.minPrice !== undefined &&
      query.minPrice !== null &&
      !isNaN(Number(query.minPrice)) &&
      Number(query.minPrice) > 0
    ) {
      where.price = where.price || {};
      where.price.gte = Number(query.minPrice);
    }

    if (
      query.maxPrice !== undefined &&
      query.maxPrice !== null &&
      !isNaN(Number(query.maxPrice)) &&
      Number(query.maxPrice) > 0
    ) {
      where.price = where.price || {};
      where.price.lte = Number(query.maxPrice);
    }

    if (
      query.city &&
      query.city !== 'all' &&
      query.city !== 'All Cities' &&
      query.city !== 'All'
    ) {
      where.shop = { city: { contains: query.city, mode: 'insensitive' } };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'price-asc') orderBy = { price: 'asc' };
    if (query.sortBy === 'price-desc') orderBy = { price: 'desc' };
    if (query.sortBy === 'stock') orderBy = { stock: 'desc' };

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      include: {
        shop: true,
      },
    });

    let formattedProducts = products.map((p) => this.formatProduct(p));

    // Handle Location Filtering by Latitude & Longitude
    if (
      query.lat !== undefined &&
      query.lng !== undefined &&
      !isNaN(Number(query.lat)) &&
      !isNaN(Number(query.lng))
    ) {
      const userLat = Number(query.lat);
      const userLng = Number(query.lng);
      const radiusKm = query.radiusKm ? Number(query.radiusKm) : 10;

      formattedProducts = formattedProducts
        .map((p: any) => {
          if (
            p.shop &&
            p.shop.latitude !== null &&
            p.shop.longitude !== null &&
            p.shop.latitude !== undefined &&
            p.shop.longitude !== undefined
          ) {
            const dist = this.calculateHaversineDistance(
              userLat,
              userLng,
              Number(p.shop.latitude),
              Number(p.shop.longitude),
            );
            const distanceKm = Math.round(dist * 10) / 10;
            return {
              ...p,
              distanceKm,
              shop: { ...p.shop, distanceKm },
            };
          }
          return p;
        })
        .filter(
          (p: any) =>
            p.distanceKm === undefined || p.distanceKm <= radiusKm,
        );

      if (query.sortBy === 'distance') {
        formattedProducts.sort(
          (a: any, b: any) =>
            (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999),
        );
      }
    }

    // Handle Condition Filtering (e.g. "Grade A+ Like New", "Mint", "Good")
    if (
      query.condition &&
      query.condition.trim() &&
      query.condition !== 'all' &&
      query.condition !== 'All'
    ) {
      const condTerm = query.condition.trim().toLowerCase();
      formattedProducts = formattedProducts.filter((p: any) => {
        const itemCond = p.conditionInfo?.condition?.toLowerCase() || '';
        return itemCond.includes(condTerm);
      });
    }

    return {
      success: true,
      message: 'Products fetched successfully',
      data: {
        products: formattedProducts,
      },
    };
  }

  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'Product fetched successfully',
      data: {
        product: this.formatProduct(product),
      },
    };
  }

  async findByCategory(category: string) {
    const products = await this.prisma.product.findMany({
      where: {
        category: {
          contains: category,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { shop: true },
    });

    return {
      success: true,
      message: `Products for category "${category}" fetched successfully`,
      data: {
        products: products.map((p) => this.formatProduct(p)),
      },
    };
  }

  async findByBrand(brand: string) {
    const products = await this.prisma.product.findMany({
      where: {
        brand: {
          contains: brand,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { shop: true },
    });

    return {
      success: true,
      message: `Products for brand "${brand}" fetched successfully`,
      data: {
        products: products.map((p) => this.formatProduct(p)),
      },
    };
  }

  async findByShop(shopId: string) {
    const products = await this.prisma.product.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: { shop: true },
    });

    return {
      success: true,
      message: `Products for shop ID "${shopId}" fetched successfully`,
      data: {
        products: products.map((p) => this.formatProduct(p)),
      },
    };
  }

  async update(id: string, sellerUserId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.shop.ownerId !== sellerUserId) {
      throw new ForbiddenException('You can only edit products from your own shop');
    }

    const updateData: any = {};
    if (dto.shopId !== undefined) updateData.shopId = dto.shopId;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = Number(dto.price);
    if (dto.stock !== undefined) updateData.stock = Number(dto.stock);

    if (dto.specs !== undefined) {
      updateData.specsJson = JSON.stringify(dto.specs);
    }
    if (dto.conditionInfo !== undefined) {
      updateData.conditionJson = JSON.stringify(dto.conditionInfo);
    }
    if (dto.images !== undefined) {
      updateData.imagesJson = JSON.stringify(dto.images);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: updateData,
      include: { shop: true },
    });

    await this.activityLogsService.log(
      sellerUserId,
      'UPDATE_PRODUCT',
      'Updated product ' + updated.name,
    );

    return {
      success: true,
      message: 'Product updated successfully',
      data: {
        product: this.formatProduct(updated),
      },
    };
  }

  async remove(id: string, sellerUserId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.shop.ownerId !== sellerUserId) {
      throw new ForbiddenException('You can only delete products from your own shop');
    }

    await this.prisma.product.delete({ where: { id } });
    await this.activityLogsService.log(
      sellerUserId,
      'DELETE_PRODUCT',
      `Deleted product "${product.name}"`,
    );
    return {
      success: true,
      message: 'Product deleted successfully',
      data: { id },
    };
  }

  private formatProduct(p: any) {
    let specs = {};
    let conditionInfo = {};
    let images: string[] = [];

    try {
      specs = JSON.parse(p.specsJson || '{}');
    } catch (e) {
      specs = {};
    }

    try {
      conditionInfo = JSON.parse(p.conditionJson || '{}');
    } catch (e) {
      conditionInfo = {};
    }

    try {
      images = JSON.parse(p.imagesJson || '[]');
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
}
