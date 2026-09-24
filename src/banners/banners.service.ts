import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerFilterDto } from './dto/banner-filter.dto';

@Injectable()
export class BannersService {
  constructor(private prisma: PrismaService) {}

  private isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test((id || '').trim());
  }

  async create(dto: CreateBannerDto) {
    if (dto.type === 'ads') {
      const cleanShopId = (dto.shopId || '').trim();
      if (!cleanShopId) {
        throw new BadRequestException('shopId is mandatory for ads type');
      }
      if (!this.isValidObjectId(cleanShopId)) {
        throw new NotFoundException('Shop with specified ID does not exist');
      }
      const shop = await this.prisma.shop.findUnique({
        where: { id: cleanShopId },
      });
      if (!shop) {
        throw new NotFoundException('Shop with specified ID does not exist');
      }
    } else if (dto.type === 'banner') {
      if (dto.shopId) {
        throw new BadRequestException('shopId must not be provided for platform banner type');
      }
    }

    const banner = await this.prisma.banner.create({
      data: {
        title: dto.title.trim(),
        details: dto.details?.trim() || null,
        image: dto.image.trim(),
        type: dto.type,
        shopId: dto.type === 'ads' ? (dto.shopId || '').trim() : null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            city: true,
            district: true,
            profileImage: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Banner created successfully',
      data: banner,
    };
  }

  async update(id: string, dto: UpdateBannerDto) {
    const cleanId = (id || '').trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const existing = await this.prisma.banner.findFirst({
      where: { id: cleanId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const finalType = dto.type || existing.type;
    let finalShopId: string | null = existing.shopId;

    if (finalType === 'ads') {
      finalShopId = dto.shopId !== undefined ? dto.shopId : existing.shopId;
      if (!finalShopId || !finalShopId.trim()) {
        throw new BadRequestException('shopId is mandatory for ads type');
      }
      const shop = await this.prisma.shop.findUnique({
        where: { id: finalShopId.trim() },
      });
      if (!shop) {
        throw new NotFoundException('Shop with specified ID does not exist');
      }
      finalShopId = finalShopId.trim();
    } else if (finalType === 'banner') {
      if (dto.shopId) {
        throw new BadRequestException('shopId must not be provided for platform banner type');
      }
      finalShopId = null;
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.details !== undefined) updateData.details = dto.details ? dto.details.trim() : null;
    if (dto.image !== undefined) updateData.image = dto.image.trim();
    if (dto.type !== undefined) updateData.type = dto.type;
    updateData.shopId = finalShopId;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.banner.update({
      where: { id },
      data: updateData,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            city: true,
            district: true,
            profileImage: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Banner updated successfully',
      data: updated,
    };
  }

  async toggleStatus(id: string, isActive: boolean) {
    const cleanId = (id || '').trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const existing = await this.prisma.banner.findFirst({
      where: { id: cleanId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const updated = await this.prisma.banner.update({
      where: { id: cleanId },
      data: { isActive },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            city: true,
            district: true,
            profileImage: true,
          },
        },
      },
    });

    return {
      success: true,
      message: `Banner ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    };
  }

  async remove(id: string) {
    const cleanId = (id || '').trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const existing = await this.prisma.banner.findFirst({
      where: { id: cleanId, isDeleted: false },
    });

    if (!existing) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    await this.prisma.banner.update({
      where: { id: cleanId },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Banner deleted successfully',
    };
  }

  async findAllAdmin(filter: BannerFilterDto) {
    const where: any = { isDeleted: false };

    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive === 'true' || filter.isActive === '1' || (filter.isActive as any) === true;
    }

    const banners = await this.prisma.banner.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            city: true,
            district: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: banners.length,
      data: banners,
    };
  }

  async findActivePublic(type?: string) {
    const where: any = {
      isDeleted: false,
      isActive: true,
    };

    if (type) {
      if (type === 'ads' || type === 'banner') {
        where.type = type;
      }
    }

    const banners = await this.prisma.banner.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            city: true,
            district: true,
            profileImage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      count: banners.length,
      data: banners,
    };
  }

  async findOne(id: string) {
    const cleanId = (id || '').trim();
    if (!this.isValidObjectId(cleanId)) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    const banner = await this.prisma.banner.findFirst({
      where: { id: cleanId, isDeleted: false },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            city: true,
            district: true,
            profileImage: true,
          },
        },
      },
    });

    if (!banner) {
      throw new NotFoundException(`Banner with ID ${id} not found`);
    }

    return {
      success: true,
      data: banner,
    };
  }
}
