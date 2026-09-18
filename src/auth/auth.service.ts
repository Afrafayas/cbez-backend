import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private activityLogsService: ActivityLogsService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string | null, userAgent?: string | null) {
    const role = dto.role || 'customer';

    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }

    if (role === 'seller') {
      const ownerName = dto.ownerName?.trim() || dto.name?.trim();
      if (!ownerName) {
        throw new BadRequestException('Name is required for seller registration');
      }
      const shopName = dto.shopName?.trim() || dto.name?.trim();
      if (!shopName) {
        throw new BadRequestException('Shop name is required for seller registration');
      }
      if (!dto.phone || !dto.phone.trim()) {
        throw new BadRequestException('Phone number is required for seller registration');
      }
      if (!dto.email || !dto.email.trim()) {
        throw new BadRequestException('Email address is required for seller registration');
      }
      if (!dto.address || !dto.address.trim()) {
        throw new BadRequestException('Shop address is required for seller registration');
      }
    } else {
      if (!dto.phone && !dto.email) {
        throw new BadRequestException('Phone number or email is required for customer registration');
      }
    }

    // Check existing user
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingEmail) {
        throw new BadRequestException('Email is already registered');
      }
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new BadRequestException('Phone number is already registered');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    let shopCreateData: any = undefined;
    if (role === 'seller') {
      const ownerName = dto.ownerName?.trim() || dto.name?.trim() || 'Owner';
      const shopName = dto.shopName?.trim() || dto.name?.trim() || 'Shop';
      shopCreateData = {
        name: shopName,
        ownerName: ownerName,
        phone: dto.phone?.trim() || '',
        whatsapp: dto.whatsapp?.trim() || dto.phone?.trim() || '',
        address: dto.address?.trim() || '',
        city: dto.city?.trim() || 'Ernakulam',
        district: dto.district?.trim() || 'Ernakulam',
        country: dto.country?.trim() || 'India',
        aadhaarNumber: dto.aadhaarNumber?.trim() || null,
        panNumber: dto.panNumber?.trim() || null,
        profileImage: dto.profileImage?.trim() || null,
        category: dto.category?.trim() || 'Mobiles & Tablets',
        latitude: dto.latitude !== undefined && dto.latitude !== null && !isNaN(Number(dto.latitude)) ? Number(dto.latitude) : null,
        longitude: dto.longitude !== undefined && dto.longitude !== null && !isNaN(Number(dto.longitude)) ? Number(dto.longitude) : null,
        gstNumber: dto.gstNumber?.trim() || null,
        websiteUrl: dto.websiteUrl?.trim() || null,
        businessHours: dto.businessHours?.trim() || null,
        businessDescription: dto.businessDescription?.trim() || null,
        alternatePhone: dto.alternatePhone?.trim() || null,
      };
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email ? dto.email.toLowerCase() : null,
        password: hashedPassword,
        name: dto.name || dto.ownerName || dto.shopName || 'User',
        phone: dto.phone || null,
        role: role,
        ...(shopCreateData ? { shop: { create: shopCreateData } } : {}),
      },
      include: {
        shop: true,
      },
    });

    // Assign chosen subscription plan to shop
    if (user.shop && dto.subscriptionPlanId) {
      try {
        const sub = await this.prisma.shopSubscription.upsert({
          where: { shopId: user.shop.id },
          create: {
            shopId: user.shop.id,
            planId: dto.subscriptionPlanId,
          },
          update: {
            planId: dto.subscriptionPlanId,
          },
          include: { plan: true },
        });
        (user.shop as any).subscription = sub;
      } catch (err) {
        console.warn('Subscription assignment during registration fallback:', err);
      }
    }

    const token = this.generateToken(user.id, user.email || user.phone || user.id, user.role);

    // Log Activity
    await this.activityLogsService.log(
      user.id,
      'REGISTER',
      `Registered new ${user.role} account (${user.name}) - Email: ${user.email || 'N/A'}, Phone: ${user.phone || 'N/A'}`,
      ipAddress,
      userAgent,
    );

    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: userWithoutPassword,
        token,
      },
      user: userWithoutPassword,
      token,
    };
  }

  async login(dto: LoginDto, ipAddress?: string | null, userAgent?: string | null) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Please provide email or phone number to login');
    }

    let user: any = null;
    if (dto.email) {
      user = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
        include: { shop: { include: { subscription: { include: { plan: true } } } } },
      });
    } else if (dto.phone) {
      user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
        include: { shop: { include: { subscription: { include: { plan: true } } } } },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email || user.phone || user.id, user.role);

    await this.activityLogsService.log(
      user.id,
      'LOGIN',
      `Logged in ${user.role} account (${user.name}) - Email: ${user.email || 'N/A'}, Phone: ${user.phone || 'N/A'}`,
      ipAddress,
      userAgent,
    );

    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      message: 'Logged in successfully',
      data: {
        user: userWithoutPassword,
        token,
      },
      user: userWithoutPassword,
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { shop: { include: { subscription: { include: { plan: true } } } } },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      data: userWithoutPassword,
      user: userWithoutPassword,
    };
  }

  private generateToken(userId: string, identifier: string, role: string): string {
    return this.jwtService.sign(
      { sub: userId, identifier, role },
      { expiresIn: '7d' },
    );
  }
}
