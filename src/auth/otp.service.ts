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
    // Periodic cleanup of expired OTPs every 2 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.otpStore.entries()) {
        if (record.expiresAt < now) {
          this.otpStore.delete(key);
        }
      }
    }, 2 * 60 * 1000);
  }

  sanitizePhone(phone: string): { last10: string; receiverId: string; phoneVariants: string[] } {
    const rawClean = (phone || '').trim();
    const digitsOnly = rawClean.replace(/\D/g, '');

    let receiverId = digitsOnly;
    // If it's a 10-digit number without country code, default to India (+91)
    if (digitsOnly.length === 10 && !rawClean.startsWith('+') && !rawClean.startsWith('00')) {
      receiverId = `91${digitsOnly}`;
    }

    const last10 = digitsOnly.slice(-10);
    const last9 = digitsOnly.slice(-9);

    const phoneVariants = Array.from(new Set([
      digitsOnly,
      receiverId,
      `+${receiverId}`,
      `+${digitsOnly}`,
      rawClean,
      last10,
      `+91${last10}`,
      `+91 ${last10}`,
      `+971${last9}`,
      `+971 ${last9}`,
      last9
    ])).filter(Boolean);

    return { last10: receiverId, receiverId, phoneVariants };
  }

  async sendWhatsAppMessage(receiverId: string, message: string): Promise<boolean> {
    const url = `${this.whatsappApiUrl}?action=send&senderId=${this.senderId}&authToken=${this.authToken}&receiverId=${receiverId}&messageText=${encodeURIComponent(message)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || data.success === false) {
        this.logger.error(`WhatsApp API error: ${JSON.stringify(data)}`);
        return false;
      }
      this.logger.log(`WhatsApp message queued for ${receiverId}: ${JSON.stringify(data)}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send WhatsApp message to ${receiverId}: ${err.message}`);
      return false;
    }
  }

  async sendOtp(phone: string, role = 'customer'): Promise<{ success: boolean; message: string; isExistingUser: boolean; phone: string; role: string; devOtp?: string }> {
    if (!phone || !phone.trim()) {
      throw new BadRequestException('Phone number is required');
    }

    const { last10, receiverId, phoneVariants } = this.sanitizePhone(phone);
    if (last10.length < 10) {
      throw new BadRequestException('Please provide a valid 10-digit mobile number');
    }

    // Check if user already exists with this phone
    let existingUser = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants }
      }
    });

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Save in in-memory store for fallback
    this.otpStore.set(last10, {
      phone: last10,
      code: otpCode,
      role: existingUser ? existingUser.role : role,
      expiresAt: expiresAt.getTime()
    });
    this.otpStore.set(receiverId, {
      phone: receiverId,
      code: otpCode,
      role: existingUser ? existingUser.role : role,
      expiresAt: expiresAt.getTime()
    });
    this.logger.log(`Generated OTP for ${receiverId} (${last10}): ${otpCode}`);

    // Upsert user by phone (phone is @unique in schema).
    // NOTE: Do NOT set email here — MongoDB unique index treats null as a real value,
    // meaning only ONE document can have email=null. Omitting email avoids the conflict.
    existingUser = await this.prisma.user.upsert({
      where: { phone: receiverId },
      create: {
        phone: receiverId,
        role: role || 'customer',
        token: otpCode,
        tokenExpiry: expiresAt,
        isNew: true,
        name: 'User',
      },
      update: {
        token: otpCode,
        tokenExpiry: expiresAt,
      },
    });
    this.logger.log(`Upserted user for ${receiverId} (id: ${existingUser.id})`);

    const message = `Your MLX DIRECT verification OTP is: ${otpCode}. Valid for 5 minutes. Please do not share this OTP with anyone.`;
    const sent = await this.sendWhatsAppMessage(receiverId, message);

    if (!sent) {
      this.logger.warn(`WhatsApp send failed for ${receiverId}, OTP stored in DB & session.`);
    }

    return {
      success: true,
      message: sent ? 'OTP sent successfully to your WhatsApp number' : 'OTP generated (WhatsApp delivery in progress)',
      isExistingUser: !existingUser.isNew,
      phone: receiverId,
      role: existingUser.role,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {})
    };
  }

  async verifyOtp(phone: string, otp: string, role = 'customer'): Promise<{ isValid: boolean; user: any; last10: string; phoneVariants: string[] }> {
    if (!phone || !otp) {
      throw new BadRequestException('Phone number and OTP are required');
    }

    const { last10, receiverId, phoneVariants } = this.sanitizePhone(phone);
    const digitsOnly = (phone || '').replace(/\D/g, '');

    // Check user in database by phone number variants
    const user = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
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

    const cleanOtp = otp.trim();

    // Verify OTP against database token or in-memory fallback
    const dbTokenValid = user.token && user.token === cleanOtp;
    const memoryRecord = this.otpStore.get(receiverId) || this.otpStore.get(digitsOnly) || this.otpStore.get(digitsOnly.slice(-10));
    const memoryValid = memoryRecord && memoryRecord.code === cleanOtp && memoryRecord.expiresAt > Date.now();

    if (!dbTokenValid && !memoryValid) {
      throw new BadRequestException('Invalid OTP entered. Please check and try again.');
    }

    // Check expiry
    if (user.tokenExpiry && new Date() > user.tokenExpiry) {
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    // OTP verified successfully: clear OTP token from database and memory
    const updatedUser = await this.prisma.user.update({
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

    this.otpStore.delete(receiverId);
    this.otpStore.delete(last10);
    this.otpStore.delete(digitsOnly);

    return {
      isValid: true,
      user: updatedUser,
      last10,
      phoneVariants
    };
  }
}
