import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private formatCategory(category: any) {
    let specConfig = [];
    try {
      specConfig = JSON.parse(category.specConfigJson || '[]');
    } catch (e) {
      specConfig = [];
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image,
      specConfig,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

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
        specConfigJson: JSON.stringify(dto.specConfig || []),
      },
    });
    return {
      success: true,
      message: 'Category created successfully',
      data: {
        category: this.formatCategory(category),
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
        categories: categories.map((c) => this.formatCategory(c)),
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
        category: this.formatCategory(category),
      },
    };
  }

  async getCategorySpecifications(idOrSlugOrName: string) {
    let category = await this.prisma.category.findFirst({
      where: {
        OR: [
          { id: idOrSlugOrName },
          { slug: idOrSlugOrName },
          { name: { equals: idOrSlugOrName, mode: 'insensitive' } },
        ],
      },
    });

    if (!category) {
      throw new NotFoundException(`Category "${idOrSlugOrName}" not found`);
    }

    const formatted = this.formatCategory(category);
    return {
      success: true,
      categoryName: category.name,
      categorySlug: category.slug,
      data: {
        specifications: formatted.specConfig,
      },
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const updateData: any = { ...dto };
    if (dto.specConfig !== undefined) {
      updateData.specConfigJson = JSON.stringify(dto.specConfig);
      delete updateData.specConfig;
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: updateData,
    });
    return {
      success: true,
      message: 'Category updated successfully',
      data: {
        category: this.formatCategory(category),
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
