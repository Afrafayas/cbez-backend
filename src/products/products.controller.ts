import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { VerifiedSellerGuard } from '../auth/verified-seller.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  async findMine(@Request() req: any) {
    return this.productsService.findMine(req.user.id);
  }

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('city') city?: string,
    @Query('sortBy') sortBy?: string,
    @Query('shopId') shopId?: string,
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('latitude') latitude?: number,
    @Query('longitude') longitude?: number,
    @Query('radiusKm') radiusKm?: number,
    @Query('condition') condition?: string,
    @Query('inStockOnly') inStockOnly?: string,
    @Query('includeUnverified') includeUnverified?: string,
    @Query('verifiedOnly') verifiedOnly?: string,
    @Query('minRating') minRating?: number,
    @Query('maxBudget') maxBudget?: string,
    @Query('locationSearch') locationSearch?: string,
  ) {
    return this.productsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      category,
      brand,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      city,
      sortBy,
      shopId,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      radiusKm: radiusKm ? Number(radiusKm) : undefined,
      condition,
      inStockOnly,
      includeUnverified,
      verifiedOnly,
      minRating: minRating ? Number(minRating) : undefined,
      maxBudget,
      locationSearch,
    });
  }

  @Get('category/:category')
  async findByCategory(@Param('category') category: string) {
    return this.productsService.findByCategory(category);
  }

  @Get('brand/:brand')
  async findByBrand(@Param('brand') brand: string) {
    return this.productsService.findByBrand(brand);
  }

  @Get('shop/:shopId')
  async findByShop(@Param('shopId') shopId: string) {
    return this.productsService.findByShop(shopId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), VerifiedSellerGuard)
  @Post()
  async create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'), VerifiedSellerGuard)
  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    const authHeader = req.headers?.authorization;
    const userId = req.user?.id || req.user?.sub;
    return this.productsService.remove(id, userId, authHeader);
  }
}
