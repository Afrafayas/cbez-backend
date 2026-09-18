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

  async register(dto: RegisterDto) {
    const role = dto.role || 'customer';

    if (!dto.password) {
      throw new BadRequestException('Password is required');
    }

    if (role === 'seller') {
      const requiredFields: Array<{ field: keyof RegisterDto; message: string }> = [
        { field: 'email', message: 'Email address is required for shop registration' },
        { field: 'ownerName', message: 'Owner name is required for shop registration' },
        { field: 'profileImage', message: 'Owner profile image is required for shop registration' },
        { field: 'phone', message: 'Phone number is required for shop registration' },
        { field: 'address', message: 'Physical business address is required for shop registration' },
        { field: 'city', message: 'City is required for shop registration' },
        { field: 'district', message: 'District is required for shop registration' },
        { field: 'country', message: 'Country is required for shop registration' },
        { field: 'aadhaarNumber', message: 'Aadhaar number is required for seller verification' },
        { field: 'panNumber', message: 'PAN number is required for seller verification' },
      ];

      for (const { field, message } of requiredFields) {
        const val = dto[field];
        if (typeof val !== 'string' || !val.trim()) {
          throw new BadRequestException(message);
        }
      }

      if (!dto.shopName && !dto.name) {
        throw new BadRequestException('Shop business name is required for registration');
      }
      if (dto.latitude === undefined || dto.latitude === null || isNaN(Number(dto.latitude))) {
        throw new BadRequestException('Shop location latitude is required. Please select your shop location on map.');
      }
      if (dto.longitude === undefined || dto.longitude === null || isNaN(Number(dto.longitude))) {
        throw new BadRequestException('Shop location longitude is required. Please select your shop location on map.');
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
      shopCreateData = {
        name: dto.shopName || dto.name,
        ownerName: dto.ownerName || dto.name,
        phone: dto.phone || '',
        whatsapp: dto.whatsapp || dto.phone || '',
        address: dto.address,
        city: dto.city,
        district: dto.district || 'Ernakulam',
        country: dto.country || 'India',
        aadhaarNumber: dto.aadhaarNumber,
        panNumber: dto.panNumber,
        profileImage: dto.profileImage,
        category: dto.category || 'Mobiles & Tablets',
        latitude: Number(dto.latitude),
        longitude: Number(dto.longitude),
        gstNumber: dto.gstNumber || null,
        websiteUrl: dto.websiteUrl || null,
        businessHours: dto.businessHours || null,
        businessDescription: dto.businessDescription || null,
        alternatePhone: dto.alternatePhone || null,
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
        await this.prisma.shopSubscription.upsert({
          where: { shopId: user.shop.id },
          create: {
            shopId: user.shop.id,
            planId: dto.subscriptionPlanId,
          },
          update: {
            planId: dto.subscriptionPlanId,
          },
        });
      } catch (err) {
        console.warn('Subscription assignment during registration fallback:', err);
      }
    }

    const token = this.generateToken(user.id, user.email || user.phone || user.id, user.role);

    // Log Activity
    await this.activityLogsService.log(
      user.id,
      'REGISTER',
      `Registered new ${user.role} account (${user.name})`,
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

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Please provide email or phone number to login');
    }

    let user: any = null;
    if (dto.email) {
      user = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
        include: { shop: true },
      });
    } else if (dto.phone) {
      user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
        include: { shop: true },
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
      `Logged in ${user.role} account (${user.name})`,
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
      include: { shop: true },
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
