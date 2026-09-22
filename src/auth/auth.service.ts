import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { formatUserModel } from '../shops/shop-profile.helper';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private activityLogsService: ActivityLogsService,
    private otpService: OtpService,
  ) { }

  async sendOtp(phone: string, role = 'customer') {
    return this.otpService.sendOtp(phone, role);
  }

  async verifyOtpAndLogin(phone: string, otp: string, role = 'customer', ipAddress?: string | null, userAgent?: string | null) {
    const { last10, phoneVariants } = await this.otpService.verifyOtp(phone, otp, role);

    const shopInclude = {
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { products: true } },
      },
    };

    // Find existing user by phone variants
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
      include: {
        shop: shopInclude,
      },
    });

    if (existingUser) {
      // Existing user: generate token and log in directly
      const token = this.generateToken(existingUser.id, existingUser.email || existingUser.phone || existingUser.id, existingUser.role);

      await this.activityLogsService.log(
        existingUser.id,
        'LOGIN',
        `Logged in via WhatsApp OTP (${existingUser.role}) - Phone: ${existingUser.phone || 'N/A'}`,
        ipAddress,
        userAgent,
      );

      return {
        success: true,
        message: 'OTP verified. Logged in successfully.',
        isNewUser: false,
        data: {
          user: formatUserModel(existingUser),
          token,
        },
      };
    }

    // New user: return phone and role so frontend can collect details
    return {
      success: true,
      message: 'OTP verified. Please complete your registration details.',
      isNewUser: true,
      data: {
        phone: last10,
        role: role || 'customer',
      },
    };
  }

  async register(dto: RegisterDto, ipAddress?: string | null, userAgent?: string | null) {
    const role = dto.role || 'customer';

    // Password is optional for OTP-based registration
    let hashedPassword: string | null = null;
    if (dto.password && dto.password.trim()) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
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

    // hashedPassword already computed above

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
        latitude: dto.latitude !== undefined && dto.latitude !== null && !isNaN(Number(dto.latitude)) ? Number(dto.latitude) : null,
        longitude: dto.longitude !== undefined && dto.longitude !== null && !isNaN(Number(dto.longitude)) ? Number(dto.longitude) : null,
        ...(shopCreateData ? { shop: { create: shopCreateData } } : {}),
      },
      include: {
        shop: {
          include: {
            subscription: { include: { plan: true } },
            _count: { select: { products: true } },
          },
        },
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

    const formattedUser = formatUserModel(user);
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: formattedUser,
        token,
      },
      // user: formattedUser,
      // token,
    };
  }

  async login(dto: LoginDto, ipAddress?: string | null, userAgent?: string | null) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Please provide email or phone number to login');
    }

    const shopInclude = {
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { products: true } },
      },
    };

    let user: any = null;
    if (dto.email) {
      user = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
        include: { shop: shopInclude },
      });
    } else if (dto.phone) {
      user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
        include: { shop: shopInclude },
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

    const formattedUser = formatUserModel(user);
    return {
      success: true,
      message: 'Logged in successfully',
      data: {
        user: formattedUser,
        token,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        shop: {
          include: {
            subscription: { include: { plan: true } },
            _count: { select: { products: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User profile not found');
    }
    const formattedUser = formatUserModel(user);
    return {
      success: true,
      message: 'User profile fetched successfully',
      data: {
        user: formattedUser,
      },
    };
  }

  private generateToken(userId: string, identifier: string, role: string): string {
    return this.jwtService.sign(
      { sub: userId, identifier, role },
      { expiresIn: '7d' },
    );
  }
}
