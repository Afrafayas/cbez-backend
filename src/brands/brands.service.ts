import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Brand "${dto.name}" already exists`);
    }

    let brandLogo = dto.logo || null;
    if (brandLogo && brandLogo.startsWith('data:')) {
      brandLogo = await this.uploadService.uploadBase64Image(brandLogo, 'brands');
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: dto.name,
        logo: brandLogo,
      },
    });
    return {
      success: true,
      message: 'Brand created successfully',
      data: {
        brand,
      },
    };
  }

  async findAll() {
    const brands = await this.prisma.brand.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      message: 'Brands fetched successfully',
      data: {
        brands,
      },
    };
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
    });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return {
      success: true,
      message: 'Brand fetched successfully',
      data: {
        brand,
      },
    };
  }

  async update(id: string, dto: UpdateBrandDto) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    const updateData: any = { ...dto };
    if (updateData.logo && updateData.logo.startsWith('data:')) {
      updateData.logo = await this.uploadService.uploadBase64Image(updateData.logo, 'brands');
    }

    const brand = await this.prisma.brand.update({
      where: { id },
      data: updateData,
    });
    return {
      success: true,
      message: 'Brand updated successfully',
      data: {
        brand,
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    await this.prisma.brand.delete({
      where: { id },
    });
    return {
      success: true,
      message: 'Brand deleted successfully',
      data: { id },
    };
  }
}
