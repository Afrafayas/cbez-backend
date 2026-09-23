import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { formatUserModel, stripPlaceholderEmail } from '../shops/shop-profile.helper';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private readonly userInclude = {
    shop: {
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { products: true } },
      },
    },
  };

  async findAll(query?: { role?: string; search?: string }) {
    const where: any = {};

    if (query?.role && query.role !== 'all') {
      where.role = query.role;
    }

    if (query?.search) {
      const search = query.search;
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.userInclude,
    });

    return {
      success: true,
      message: 'Users fetched successfully',
      data: {
        users: users.map((u) => formatUserModel(u)),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: this.userInclude,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return {
      success: true,
      message: 'User fetched successfully',
      data: {
        user: formatUserModel(user),
      },
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.email && dto.email !== stripPlaceholderEmail(existing.email)) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) {
        throw new BadRequestException('Email address is already in use');
      }
    }

    if (dto.phone && dto.phone !== existing.phone) {
      const phoneTaken = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneTaken) {
        throw new BadRequestException('Phone number is already in use');
      }
    }

    const updateData: any = {
      ...(dto.name && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.role && { role: dto.role }),
    };

    if (dto.latitude !== undefined) {
      updateData.latitude = dto.latitude !== null && !isNaN(Number(dto.latitude)) ? Number(dto.latitude) : null;
    }
    if (dto.longitude !== undefined) {
      updateData.longitude = dto.longitude !== null && !isNaN(Number(dto.longitude)) ? Number(dto.longitude) : null;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: this.userInclude,
    });

    // If seller has an associated shop, sync shop coordinates
    if (user.shop && (updateData.latitude !== undefined || updateData.longitude !== undefined)) {
      await this.prisma.shop.update({
        where: { id: user.shop.id },
        data: {
          ...(updateData.latitude !== undefined ? { latitude: updateData.latitude } : {}),
          ...(updateData.longitude !== undefined ? { longitude: updateData.longitude } : {}),
        },
      });
    }

    return {
      success: true,
      message: 'User updated successfully',
      data: {
        user: formatUserModel(user),
      },
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'User deleted successfully',
      data: { id },
    };
  }
}
