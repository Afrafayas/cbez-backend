import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) { }

  @UseGuards(AuthGuard('jwt'))
  @Post('mine')
  async createOrUpdateMine(@Request() req: any, @Body() dto: CreateShopDto) {
    return this.shopsService.createOrUpdateForOwner(req.user.id, dto);
  }

  @Get('stats')
  async getStats() {
    return this.shopsService.getStats();
  }

  @Get('pending')
  async findPending() {
    return this.shopsService.findPending();
  }

  @Get('verified')
  async findVerified() {
    return this.shopsService.findVerified();
  }

  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.shopsService.findAll({ city, category, search, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @Get(':id/products')
  async findShopProducts(@Param('id') id: string) {
    return this.shopsService.findShopProducts(id);
  }

  @Patch(':id/verify')
  async toggleVerify(@Param('id') id: string, @Body('verified') verified?: boolean) {
    return this.shopsService.toggleVerify(id, verified);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: any) {
    return this.shopsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.shopsService.remove(id);
  }
}


