import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new BadRequestException(`Category "${dto.name}" already exists`);
    }

    const slug = dto.slug || dto.name.toLowerCase().replace(/\s+/g, '-');
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        image: dto.image || null,
      },
    });
    return {
      success: true,
      message: 'Category created successfully',
      data: {
        category,
      },
    };
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return {
      success: true,
      message: 'Categories fetched successfully',
      data: {
        categories,
      },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return {
      success: true,
      message: 'Category fetched successfully',
      data: {
        category,
      },
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: dto,
    });
    return {
      success: true,
      message: 'Category updated successfully',
      data: {
        category,
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    await this.prisma.category.delete({
      where: { id },
    });
    return {
      success: true,
      message: 'Category deleted successfully',
      data: { id },
    };
  }
}
