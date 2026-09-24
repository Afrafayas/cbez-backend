import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../auth/admin.guard';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ToggleBannerStatusDto } from './dto/toggle-banner-status.dto';
import { BannerFilterDto } from './dto/banner-filter.dto';

@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // Public endpoint for customer-facing active banners
  @Get('active')
  async getActiveBanners(@Query('type') type?: string) {
    return this.bannersService.findActivePublic(type);
  }

  // Admin-only endpoints
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get()
  async getAllBanners(@Query() filter: BannerFilterDto) {
    return this.bannersService.findAllAdmin(filter);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Get(':id')
  async getBannerById(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post()
  async createBanner(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Put(':id')
  async updateBannerPut(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id')
  async updateBannerPatch(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id/status')
  async toggleBannerStatus(
    @Param('id') id: string,
    @Body() dto: ToggleBannerStatusDto,
  ) {
    return this.bannersService.toggleStatus(id, dto.isActive);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete(':id')
  async deleteBanner(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
