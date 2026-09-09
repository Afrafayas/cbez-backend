import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async create(sellerUserId: string, dto: CreateProductDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId: sellerUserId },
    });

    if (!shop) {
      throw new ForbiddenException('You must create a shop profile before adding products');
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        brand: dto.brand,
        category: dto.category,
        description: dto.description,
        price: Number(dto.price),
        stock: Number(dto.stock),
        specsJson: JSON.stringify(dto.specs || {}),
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

    return {
      success: true,
      message: 'Products fetched successfully',
      data: {
        products: products.map((p) => this.formatProduct(p)),
      },
    };
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
    let images: string[] = [];

    try {
      specs = JSON.parse(p.specsJson || '{}');
    } catch (e) {
      specs = {};
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
      images,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
