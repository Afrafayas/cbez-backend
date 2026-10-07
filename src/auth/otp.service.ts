import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface OtpRecord {
  phone: string;
  code: string;
  role: string;
  expiresAt: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore = new Map<string, OtpRecord>();

  private readonly whatsappApiUrl = process.env.WHATSAPP_API_URL || 'https://whatsapp.busytax.in/api/v1';
  private readonly senderId = process.env.WHATSAPP_SENDER_ID || '917025297999';
  private readonly authToken = process.env.WHATSAPP_AUTH_TOKEN || '1a033b70c1a495905ba920bed7dc4246';

  constructor(private prisma: PrismaService) {
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.otpStore.entries()) {
        if (record.expiresAt < now) {
          this.otpStore.delete(key);
        }
      }
    }, 2 * 60 * 1000);
  }

  sanitizePhone(phone: string): { rawClean: string; digitsOnly: string; phoneVariants: string[] } {
    const rawClean = (phone || '').trim();
    const digitsOnly = rawClean.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);
    const last9 = digitsOnly.slice(-9);

    // Variants used to match existing users in MongoDB across various historical formats
    const phoneVariants = Array.from(
      new Set([
        rawClean,
        digitsOnly,
        last10,
        `91${last10}`,
        `+91${last10}`,
        `+91 ${last10}`,
        `+${digitsOnly}`,
        `+971${last9}`,
        `+971 ${last9}`,
        last9,
      ]),
    ).filter(Boolean);

    return { rawClean, digitsOnly, phoneVariants };
  }

  async sendWhatsAppMessage(receiverId: string, message: string): Promise<boolean> {
    const rawDigits = (receiverId || '').replace(/\D/g, '');
    if (!rawDigits) return false;
    let formattedReceiver = rawDigits;
    if (formattedReceiver.length === 10) {
      formattedReceiver = `91${formattedReceiver}`;
    }
    const url = `${this.whatsappApiUrl}?action=send&senderId=${this.senderId}&authToken=${this.authToken}&receiverId=${formattedReceiver}&messageText=${encodeURIComponent(message)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        this.logger.error(`WhatsApp API error for ${formattedReceiver}: ${JSON.stringify(data)}`);
        return false;
      }
      this.logger.log(`WhatsApp message queued for ${formattedReceiver}: ${JSON.stringify(data)}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message to ${formattedReceiver}: ${err.message}`);
      return false;
    }
  }

  async sendOtp(phone: string, role = 'customer'): Promise<{
    success: boolean;
    message: string;
    isExistingUser: boolean;
    isNewUser: boolean;
    requiresRegistration: boolean;
    phone: string;
    role: string;
    user?: any;
    devOtp?: string;
  }> {
    if (!phone || !phone.trim()) {
      throw new BadRequestException('Phone number is required');
    }

    const { rawClean, digitsOnly, phoneVariants } = this.sanitizePhone(phone);
    if (digitsOnly.length < 10) {
      throw new BadRequestException('Please provide a valid 10-digit mobile number');
    }

    const targetRole = (role || 'customer').toLowerCase().trim();
    if (!['customer', 'seller', 'admin'].includes(targetRole)) {
      throw new BadRequestException('Role must be customer, seller, or admin');
    }

    // 1. Check if user already exists in the database
    let existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: rawClean },
          { phone: { in: phoneVariants } },
        ],
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

    const isExistingUser = Boolean(existingUser);
    const isNewUser = !isExistingUser;

    const isTestNumber = digitsOnly.endsWith('9961624063');
    const otpCode = isTestNumber ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // If number exists: match the role provided in the request and in the database
    if (existingUser) {
      const existingRole = (existingUser.role || 'customer').toLowerCase().trim();
      if (existingRole !== targetRole) {
        throw new BadRequestException(
          `This mobile number is registered as a ${existingUser.role}.`,
        );
      }

      // Role and mobile number match: update OTP token, expiry
      const updateData: any = {
        token: otpCode,
        tokenExpiry: expiresAt,
      };

      // Keep DB phone synced to user input without forcing 91
      if (existingUser.phone !== rawClean) {
        const conflict = await this.prisma.user.findFirst({
          where: { phone: rawClean, id: { not: existingUser.id } },
        });
        if (!conflict) {
          updateData.phone = rawClean;
        }
      }

      existingUser = await this.prisma.user.update({
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

      // If seller exists but doesn't have a shop, create it now!
      if (targetRole === 'seller' && !existingUser.shop) {
        const newShop = await this.prisma.shop.create({
          data: {
            name: 'New Shop',
            ownerName: existingUser.name || 'Seller',
            phone: existingUser.phone || rawClean,
            whatsapp: existingUser.phone || rawClean,
            address: '',
            city: 'Ernakulam',
            district: 'Ernakulam',
            country: 'India',
            category: 'Mobiles & Tablets',
            verified: false,
            ownerId: existingUser.id,
          },
          include: {
            subscription: { include: { plan: true } },
            _count: { select: { products: true } },
          },
        });
        existingUser.shop = newShop;
      }

      this.logger.log(`Updated OTP token for existing ${existingUser.role} user: ${rawClean} (id: ${existingUser.id})`);
    } else {
      // User does not exist: create user and associated shop if seller, or user for customer
      if (targetRole === 'seller') {
        existingUser = await this.prisma.user.create({
          data: {
            phone: rawClean,
            name: 'Seller',
            role: 'seller',
            token: otpCode,
            tokenExpiry: expiresAt,
            isNew: true,
            shop: {
              create: {
                name: 'New Shop',
                ownerName: 'Seller',
                phone: rawClean,
                whatsapp: rawClean,
                address: '',
                city: 'Ernakulam',
                district: 'Ernakulam',
                country: 'India',
                category: 'Mobiles & Tablets',
                verified: false,
              },
            },
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
        this.logger.log(`Created new seller user and shop during Send OTP: ${rawClean} (user id: ${existingUser.id}, shop id: ${existingUser.shop?.id})`);
      } else {
        // Customer
        existingUser = await this.prisma.user.create({
          data: {
            phone: rawClean,
            name: 'Customer',
            role: 'customer',
            token: otpCode,
            tokenExpiry: expiresAt,
            isNew: true,
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
        this.logger.log(`Created new customer user during Send OTP: ${rawClean} (id: ${existingUser.id})`);
      }
    }

    // In-memory store for resilience
    const otpRecord: OtpRecord = {
      phone: rawClean,
      code: otpCode,
      role: existingUser.role,
      expiresAt: expiresAt.getTime(),
    };
    this.otpStore.set(rawClean, otpRecord);
    this.otpStore.set(digitsOnly, otpRecord);
    this.logger.log(`Generated OTP for ${rawClean}: ${otpCode}`);

    // Deliver OTP via WhatsApp
    // External WhatsApp API requires country code for routing (Indian 10-digit -> prepend 91)
    let whatsappReceiverId = digitsOnly;
    if (digitsOnly.length === 10 && !rawClean.startsWith('+') && !rawClean.startsWith('00')) {
      whatsappReceiverId = `91${digitsOnly}`;
    }

    const message = `Your MLX DIRECT verification OTP is: ${otpCode}. Valid for 5 minutes. Please do not share this OTP with anyone.`;
    const sent = await this.sendWhatsAppMessage(whatsappReceiverId, message);

    if (!sent) {
      this.logger.warn(`WhatsApp send failed for ${whatsappReceiverId}, OTP stored in DB & memory.`);
    }

    const requiresReg = Boolean(existingUser.isNew);

    return {
      success: true,
      message: sent ? 'OTP sent successfully to your WhatsApp number' : 'OTP generated (WhatsApp delivery in progress)',
      isExistingUser,
      isNewUser: requiresReg,
      requiresRegistration: requiresReg,
      phone: existingUser.phone || rawClean,
      role: existingUser.role,
      user: {
        id: existingUser.id,
        name: existingUser.name,
        phone: existingUser.phone,
        role: existingUser.role,
        isNew: existingUser.isNew,
        ...(existingUser.shop ? { shopId: existingUser.shop.id, shop: existingUser.shop } : {}),
      },
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {}),
    };
  }

  async verifyOtp(phone: string, otp: string, role?: string): Promise<{ isValid: boolean; user: any; phone: string }> {
    if (!phone || !phone.trim() || !otp || !otp.trim()) {
      throw new BadRequestException('Phone number and OTP are required');
    }
    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();
    const { rawClean, digitsOnly, phoneVariants } = this.sanitizePhone(cleanPhone);

    // 1. Find the user using the mobile number
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: rawClean },
          { phone: { in: phoneVariants } },
        ],
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

    if (!user) {
      throw new BadRequestException('User with this mobile number does not exist. Please request an OTP first.');
    }

    // 2. Validate role if provided
    if (role && role.trim()) {
      const targetRole = role.toLowerCase().trim();
      const userRole = (user.role || 'customer').toLowerCase().trim();
      if (userRole !== targetRole) {
        throw new BadRequestException(`This mobile number is registered as a ${user.role}.`);
      }
    }

    // 3. Validate OTP code and expiry
    if (!user.token || user.token !== cleanOtp) {
      throw new BadRequestException('Invalid OTP entered. Please check and try again.');
    }

    if (!user.tokenExpiry || new Date() > new Date(user.tokenExpiry)) {
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    // 4. Clear token & expiry
    user = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        token: null,
        tokenExpiry: null,
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

    this.otpStore.delete(rawClean);
    this.otpStore.delete(digitsOnly);

    return { isValid: true, user, phone: user.phone || rawClean };
  }
}
