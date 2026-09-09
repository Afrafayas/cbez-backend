import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
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
      if (!dto.email) {
        throw new BadRequestException('Email address is required for registration');
      }
      if (!dto.shopName && !dto.name) {
        throw new BadRequestException('Shop business name is required for registration');
      }
      if (!dto.ownerName) {
        throw new BadRequestException('Owner name is required for registration');
      }
      if (!dto.phone) {
        throw new BadRequestException('Phone number is required for registration');
      }
      if (!dto.whatsapp) {
        throw new BadRequestException('WhatsApp number is required for registration');
      }
      if (!dto.address) {
        throw new BadRequestException('Business physical address is required for registration');
      }
      if (!dto.city) {
        throw new BadRequestException('City is required for registration');
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
        address: dto.address || 'Market Location',
        city: dto.city || 'Kochi',
        category: dto.category || 'Mobiles & Tablets',
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

    if (!dto.password) {
      throw new BadRequestException('Please provide password');
    }

    let user: any = null;
    if (dto.email) {
      user = await this.prisma.user.findUnique({
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

    if (user.password) {
      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const token = this.generateToken(user.id, user.email || user.phone || user.id, user.role);

    // Log Activity
    await this.activityLogsService.log(
      user.id,
      'LOGIN',
      `User ${user.name} logged in successfully`,
    );

    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      message: 'Login successful',
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
      throw new UnauthorizedException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return {
      success: true,
      message: 'User profile fetched successfully',
      data: {
        user: userWithoutPassword,
      },
      ...userWithoutPassword,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
