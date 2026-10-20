import { UploadService } from '../upload/upload.service';
﻿import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
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
    private uploadService: UploadService,
  ) { }

  async create(sellerUserId: string, dto: CreateProductDto) {
    const callingUser = await this.prisma.user.findUnique({
      where: { id: sellerUserId },
    });

    let shop: any = null;

    const userRole = callingUser?.role?.toLowerCase()?.trim();
    const isAdmin = userRole === 'admin' || userRole === 'super_admin' || userRole === 'superadmin';
    if (isAdmin) {
      const targetShopId = dto.shopId || (dto as any).shop;
      if (targetShopId) {
        shop = await this.prisma.shop.findUnique({ where: { id: targetShopId } });
      }
      if (!shop) {
        shop = await this.prisma.shop.findFirst({ orderBy: { createdAt: 'desc' } });
      }
      if (!shop) {
        throw new ForbiddenException('No dealer shop found to add product to. Please create a shop first.');
      }
    } else {
      shop = await this.prisma.shop.findUnique({
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
    }

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

        if (dto.images && Array.isArray(dto.images) && dto.images.length > 0) {
      dto.images = await Promise.all(dto.images.map(img => this.uploadService.uploadBase64Image(img, 'products')));
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
    page?: number;
    limit?: number;
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
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    condition?: string;
    inStockOnly?: boolean | string;
    verifiedOnly?: boolean | string;
    includeUnverified?: boolean | string;
    minRating?: number | string;
    maxBudget?: number | string;
    locationSearch?: string;
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

    // minPrice, maxPrice, and maxBudget are filtered in-memory using effective offer price below

    const inStock = query.inStockOnly === true || query.inStockOnly === 'true';
    if (inStock) {
      where.stock = { gt: 0 };
    }

    const rawLat = query.lat ?? query.latitude;
    const rawLng = query.lng ?? query.longitude;
    const hasLat = rawLat !== undefined && rawLat !== null && !isNaN(Number(rawLat));
    const hasLng = rawLng !== undefined && rawLng !== null && !isNaN(Number(rawLng));

    const includeUnverified = query.includeUnverified === true || query.includeUnverified === 'true';
    const isVerifiedOnly = query.verifiedOnly === true || query.verifiedOnly === 'true';
    const minRating = parseFloat(String(query.minRating)) || 0;

    const shopConditions: any = {};
    // By default, public product listings must only show products from verified shops
    if (!includeUnverified) {
      shopConditions.verified = true;
    } else if (isVerifiedOnly) {
      shopConditions.verified = true;
    }
    if (minRating > 0) {
      shopConditions.rating = { gte: minRating };
    }

    const hasSearch = Boolean(query.search && query.search.trim());
    if (
      query.city &&
      query.city !== 'all' &&
      query.city !== 'All Cities' &&
      query.city !== 'All' &&
      (!hasLat || !hasLng)
    ) {
      shopConditions.OR = [
        { city: { contains: query.city, mode: 'insensitive' } },
        { address: { contains: query.city, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(shopConditions).length > 0) {
      where.shop = shopConditions;
    }

    const rawSearch = hasSearch ? query.search!.trim() : '';
    let detectedMaxBudget: number | undefined = undefined;
    let textSearchQuery = rawSearch;

    if (hasSearch) {
      // Check for budget patterns like "< 5k", "< 10k", "< 25k", "<5k", "<10k", "<25k", "under 5000", "under 10000", "5k", "10k", "25k"
      const budgetPureMatch = rawSearch.match(/^<\s*(\d+)\s*(k)?$/i) ||
        rawSearch.match(/^(?:under|below|less than)\s*(?:₹|rs\.?)?\s*(\d+)\s*(k)?$/i) ||
        rawSearch.match(/^(\d+)\s*k$/i);

      if (budgetPureMatch) {
        const num = Number(budgetPureMatch[1]);
        detectedMaxBudget = (budgetPureMatch[2] || rawSearch.toLowerCase().endsWith('k'))
          ? num * 1000
          : (num < 100 ? num * 1000 : num);
        textSearchQuery = ''; // pure budget search
      } else {
        const mixedMatch = rawSearch.match(/(?:<|under|below)\s*(?:₹|rs\.?)?\s*(\d+)\s*(k)?/i);
        if (mixedMatch) {
          const num = Number(mixedMatch[1]);
          detectedMaxBudget = mixedMatch[2] ? num * 1000 : (num < 100 ? num * 1000 : num);
          textSearchQuery = rawSearch.replace(mixedMatch[0], '').trim();
        }
      }
    }

    if (textSearchQuery) {
      const terms = textSearchQuery.split(/\s+/).filter(Boolean);
      if (terms.length > 0) {
        where.AND = terms.map(term => ({
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { brand: { contains: term, mode: 'insensitive' } },
            { category: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { specsJson: { contains: term, mode: 'insensitive' } },
            { conditionJson: { contains: term, mode: 'insensitive' } },
            { shop: { is: { name: { contains: term, mode: 'insensitive' } } } },
            { shop: { is: { city: { contains: term, mode: 'insensitive' } } } },
            { shop: { is: { address: { contains: term, mode: 'insensitive' } } } },
          ],
        }));
      }
    }

    let orderBy: any = { createdAt: 'desc' };
    if (query.sortBy === 'stock') orderBy = { stock: 'desc' };

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      include: {
        shop: true,
      },
    });

    let formattedProducts = products.map((p) => this.formatProduct(p));

    // Exclude products from revoked or under-verification shops on public listing
    if (!includeUnverified) {
      formattedProducts = formattedProducts.filter((p) => {
        if (!p.shop) return false;
        if (p.shop.verified === false) return false;
        if (p.shop.verificationStatus === 'UNDER_VERIFICATION') return false;
        return true;
      });
    }

    // Filter by detected budget from search query if any
    if (detectedMaxBudget !== undefined && detectedMaxBudget > 0) {
      formattedProducts = formattedProducts.filter(p => this.getEffectivePrice(p) <= detectedMaxBudget!);
    }

    // Search relevance scoring across all fields of the product
    if (textSearchQuery) {
      const lowerQuery = textSearchQuery.toLowerCase();
      const terms = lowerQuery.split(/\s+/).filter(Boolean);

      formattedProducts.forEach((p: any) => {
        let score = 0;
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const specsStr = JSON.stringify(p.specs || {}).toLowerCase();
        const condStr = JSON.stringify(p.conditionInfo || {}).toLowerCase();
        const shopName = (p.shop?.name || '').toLowerCase();
        const shopCity = (p.shop?.city || '').toLowerCase();

        // Exact match bonuses
        if (name === lowerQuery) score += 250;
        else if (name.startsWith(lowerQuery)) score += 150;
        else if (name.includes(lowerQuery)) score += 90;

        if (brand === lowerQuery) score += 120;
        else if (brand.includes(lowerQuery)) score += 70;

        if (category === lowerQuery) score += 100;
        else if (category.includes(lowerQuery)) score += 60;

        // Per-term scores across all product fields
        terms.forEach((term) => {
          if (name.includes(term)) score += 35;
          if (brand.includes(term)) score += 25;
          if (category.includes(term)) score += 20;
          if (specsStr.includes(term)) score += 15;
          if (desc.includes(term)) score += 10;
          if (condStr.includes(term)) score += 10;
          if (shopName.includes(term)) score += 10;
          if (shopCity.includes(term)) score += 10;
        });

        p._searchScore = score;
      });
    }

    // Filter by minPrice, maxPrice, and maxBudget using effective offer price
    if (
      query.minPrice !== undefined &&
      query.minPrice !== null &&
      !isNaN(Number(query.minPrice)) &&
      Number(query.minPrice) > 0
    ) {
      const minP = Number(query.minPrice);
      formattedProducts = formattedProducts.filter(p => this.getEffectivePrice(p) >= minP);
    }

    if (
      query.maxPrice !== undefined &&
      query.maxPrice !== null &&
      !isNaN(Number(query.maxPrice)) &&
      Number(query.maxPrice) > 0
    ) {
      const maxP = Number(query.maxPrice);
      formattedProducts = formattedProducts.filter(p => this.getEffectivePrice(p) <= maxP);
    }

    if (query.maxBudget) {
      const budgetLimit = typeof query.maxBudget === 'number'
        ? query.maxBudget
        : parseInt(String(query.maxBudget).replace(/\D/g, ''), 10);
      if (!isNaN(budgetLimit) && budgetLimit > 0) {
        formattedProducts = formattedProducts.filter(p => this.getEffectivePrice(p) <= budgetLimit);
      }
    }

    if (inStock) {
      formattedProducts = formattedProducts.filter(
        (p: any) => (p.stock !== undefined ? p.stock > 0 : true) && !p.isSoldOut
      );
    }

    // Handle Location Filtering by Latitude & Longitude
    if (hasLat && hasLng) {
      const userLat = Number(rawLat);
      const userLng = Number(rawLng);
      const radiusKm = query.radiusKm ? Number(query.radiusKm) : 10;

      formattedProducts = formattedProducts
        .map((p: any) => {
          if (
            p.shop &&
            p.shop.latitude !== null &&
            p.shop.longitude !== null &&
            p.shop.latitude !== undefined &&
            p.shop.longitude !== undefined &&
            !isNaN(Number(p.shop.latitude)) &&
            !isNaN(Number(p.shop.longitude))
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
            p.distanceKm !== undefined && p.distanceKm <= radiusKm,
        );

      if (query.sortBy === 'distance' || !query.sortBy || query.sortBy === 'featured') {
        formattedProducts.sort(
          (a: any, b: any) =>
            (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999),
        );
      }
    }

    // Location text keyword search (City, landmarks, or street address)
    if (query.locationSearch && query.locationSearch.trim() && !hasLat && !hasLng) {
      const locTerm = query.locationSearch.trim().toLowerCase();
      formattedProducts = formattedProducts.filter((p: any) => {
        const c = (p.shop?.city || '').toLowerCase();
        const a = (p.shop?.address || '').toLowerCase();
        return c.includes(locTerm) || a.includes(locTerm);
      });
    }

    if (query.city && query.city !== 'all' && query.city !== 'All Cities' && query.city !== 'All' && !hasLat && !hasLng) {
      const cityTerm = query.city.trim().toLowerCase();
      formattedProducts = formattedProducts.filter((p: any) => {
        const c = (p.shop?.city || '').toLowerCase();
        const a = (p.shop?.address || '').toLowerCase();
        return c.includes(cityTerm) || a.includes(cityTerm);
      });
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

    // Sort products: Out of stock always pushed to end, then by sortBy using offer price
    formattedProducts.sort((a: any, b: any) => {
      const aOut = (a.stock !== undefined && a.stock <= 0) || Boolean(a.isSoldOut);
      const bOut = (b.stock !== undefined && b.stock <= 0) || Boolean(b.isSoldOut);
      if (aOut !== bOut) return aOut ? 1 : -1;

      // When searching, sort by search relevance score first if no explicit price/stock sort requested
      if (textSearchQuery && (!query.sortBy || query.sortBy === 'featured')) {
        const scoreA = a._searchScore ?? 0;
        const scoreB = b._searchScore ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
      }

      if (query.sortBy === 'price-asc') {
        return this.getEffectivePrice(a) - this.getEffectivePrice(b);
      }
      if (query.sortBy === 'price-desc') {
        return this.getEffectivePrice(b) - this.getEffectivePrice(a);
      }
      if (query.sortBy === 'stock') {
        return (b.stock || 0) - (a.stock || 0);
      }
      if (query.sortBy === 'rating') {
        const ratingA = a.shop?.rating ?? 0;
        const ratingB = b.shop?.rating ?? 0;
        return ratingB - ratingA;
      }
      if (query.sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }
      if (query.sortBy === 'alphabetical') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (query.sortBy === 'distance' && hasLat && hasLng) {
        return (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999);
      }

      if (hasLat && hasLng && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999);
      }
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const total = formattedProducts.length;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = query.limit !== undefined && query.limit !== null && String(query.limit) !== ''
      ? Number(query.limit)
      : (query.page ? 24 : undefined);

    let totalPages = 1;
    let paginatedProducts = formattedProducts;

    if (limit && limit > 0) {
      totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedProducts = formattedProducts.slice(startIndex, endIndex);
    } else {
      totalPages = 1;
    }

    return {
      success: true,
      message: 'Products fetched successfully',
      data: {
        products: paginatedProducts,
        total,
        page,
        limit: limit || total,
        totalPages,
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

    const callingUser = await this.prisma.user.findUnique({
      where: { id: sellerUserId },
    });

    const role = callingUser?.role?.toLowerCase()?.trim();
    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'superadmin';
    const isOwner = product.shop?.ownerId === sellerUserId;

    if (!isAdmin && !isOwner) {
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
      if (Array.isArray(dto.images) && dto.images.length > 0) {
        dto.images = await Promise.all(dto.images.map(img => this.uploadService.uploadBase64Image(img, 'products')));
      }
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

  async remove(id: string, sellerUserId?: string, authHeader?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { shop: true },
    });

    if (!product) {
      return {
        success: true,
        message: 'Product deleted successfully',
        data: { id },
      };
    }

    let effectiveUserId = sellerUserId;
    let userRole = '';

    if (!effectiveUserId && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded: any = jwt.decode(token);
        if (decoded) {
          effectiveUserId = decoded.sub || decoded.id || decoded.userId;
          userRole = decoded.role || '';
        }
      } catch (e) {}
    }

    if (effectiveUserId) {
      const callingUser = await this.prisma.user.findUnique({
        where: { id: effectiveUserId },
      });

      const role = (callingUser?.role || userRole)?.toLowerCase()?.trim();
      const isAdmin = role === 'admin' || role === 'super_admin' || role === 'superadmin';
      const isOwner = product.shop?.ownerId === effectiveUserId;

      if (!isAdmin && !isOwner) {
        throw new ForbiddenException('You can only delete products from your own shop');
      }

      await this.activityLogsService.log(
        effectiveUserId,
        'DELETE_PRODUCT',
        `Deleted product "${product.name}"`,
      ).catch(() => {});
    }

    // 1. Clean up associated wishlists to avoid dangling relations in MongoDB
    await this.prisma.wishlist.deleteMany({
      where: { productId: id },
    }).catch(() => {});

    // 2. Clean up associated leads
    await this.prisma.lead.deleteMany({
      where: { productId: id },
    }).catch(() => {});

    // 3. Delete product from MongoDB database
    await this.prisma.product.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Product deleted successfully',
      data: { id },
    };
  }

  private getEffectivePrice(p: any): number {
    const regular = Number(p.price) || 0;
    const rawOffer = p.offerPrice;
    if (
      rawOffer !== undefined &&
      rawOffer !== null &&
      rawOffer !== '' &&
      !isNaN(Number(rawOffer))
    ) {
      const offer = Number(rawOffer);
      if (offer > 0 && offer < regular) {
        return offer;
      }
    }
    return regular;
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

    const rawOffer = (specs as any)['offerPrice'] ?? (specs as any)['Offer Price'];
    const offerPrice = rawOffer !== undefined && rawOffer !== null && rawOffer !== '' && !isNaN(Number(rawOffer))
      ? Number(rawOffer)
      : undefined;

    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      price: p.price,
      offerPrice,
      stock: p.stock,
      isSoldOut: p.stock <= 0,
      shopId: p.shopId,
      shop: p.shop ? {
        ...p.shop,
        verificationStatus: p.shop.verified ? 'VERIFIED' : 'UNDER_VERIFICATION',
        latitude: p.shop.latitude,
        longitude: p.shop.longitude,
        lat: p.shop.latitude,
        lng: p.shop.longitude,
      } : null,
      specs,
      conditionInfo,
      images,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
