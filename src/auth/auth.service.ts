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
    const { user, last10 } = await this.otpService.verifyOtp(phone, otp, role);

    const token = this.generateToken(user.id, user.email || user.phone || user.id, user.role);

    await this.activityLogsService.log(
      user.id,
      'LOGIN',
      `Logged in via WhatsApp OTP (${user.role}) - Phone: ${user.phone || 'N/A'}`,
      ipAddress,
      userAgent,
    );

    const formattedUser = formatUserModel(user);

    return {
      user: formattedUser,
      token,
      isNewUser: Boolean(user.isNew),
      success: true,
      message: 'OTP verified successfully.',
      data: {
        user: formattedUser,
        token,
        phone: user.phone || last10,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDto, ipAddress?: string | null, userAgent?: string | null) {
    const role = dto.role || 'customer';

    let hashedPassword: string | null = null;
    if (dto.password && dto.password.trim()) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    // Only phone is strictly required for user registration
    if (!dto.phone || !dto.phone.trim()) {
      throw new BadRequestException('Phone number is required for registration');
    }

    if (role === 'seller') {
      const shopName = dto.shopName?.trim() || dto.name?.trim();
      if (!shopName) {
        throw new BadRequestException('Shop name is required for seller registration');
      }
      if (!dto.address || !dto.address.trim()) {
        throw new BadRequestException('Shop address is required for seller registration');
      }
    }

    // Check if user already exists by phone or email
    let existingUser: any = null;
    if (dto.phone) {
      const { phoneVariants } = this.otpService.sanitizePhone(dto.phone);
      existingUser = await this.prisma.user.findFirst({
        where: { phone: { in: phoneVariants } },
        include: { shop: true },
      });
    }

    if (!existingUser && dto.email) {
      existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase() },
        include: { shop: true },
      });
    }

    // Check duplicate email across other users
    if (dto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: dto.email.toLowerCase(),
          ...(existingUser ? { id: { not: existingUser.id } } : {}),
        },
      });
      if (existingEmail) {
        throw new BadRequestException('Email is already registered');
      }
    }

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

    let user: any;
    if (existingUser) {
      // UPDATE existing user (who was created during sendOtp with isNew=true)
      const updateData: any = {
        name: dto.name || dto.ownerName || dto.shopName || existingUser.name || 'User',
        email: dto.email ? dto.email.toLowerCase() : existingUser.email,
        role: role,
        isNew: false,
      };
      if (hashedPassword) {
        updateData.password = hashedPassword;
      }
      if (dto.phone) {
        updateData.phone = dto.phone.trim();
      }
      if (dto.latitude !== undefined && dto.latitude !== null && !isNaN(Number(dto.latitude))) {
        updateData.latitude = Number(dto.latitude);
      }
      if (dto.longitude !== undefined && dto.longitude !== null && !isNaN(Number(dto.longitude))) {
        updateData.longitude = Number(dto.longitude);
      }

      if (shopCreateData) {
        if (existingUser.shop) {
          updateData.shop = { update: shopCreateData };
        } else {
          updateData.shop = { create: shopCreateData };
        }
      }

      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
        include: {
          shop: {
            include: {
              subscription: { include: { plan: true } },
              _count: { select: { products: true } },
            },
          },
        },
      });
    } else {
      // Create user if not existing
      user = await this.prisma.user.create({
        data: {
          email: dto.email ? dto.email.toLowerCase() : null,
          password: hashedPassword,
          name: dto.name || dto.ownerName || dto.shopName || 'User',
          phone: dto.phone || null,
          role: role,
          isNew: false,
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
    }

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
      existingUser ? 'UPDATE_PROFILE' : 'REGISTER',
      `Registration completed for ${user.role} account (${user.name}) - Email: ${user.email || 'N/A'}, Phone: ${user.phone || 'N/A'}`,
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
      const { phoneVariants } = this.otpService.sanitizePhone(dto.phone);
      user = await this.prisma.user.findFirst({
        where: { phone: { in: phoneVariants } },
        include: { shop: shopInclude },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('No password set for this account. Please login with WhatsApp OTP.');
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
