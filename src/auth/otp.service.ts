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
    const digitsOnly = (phone || '').replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);
    const receiverId = last10.length === 10 ? `91${last10}` : digitsOnly;
    const phoneVariants = [
      last10,
      `+91${last10}`,
      `+91 ${last10}`,
      `91${last10}`,
      `0${last10}`,
      phone.trim()
    ];
    return { last10, receiverId, phoneVariants };
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
    } catch (err) {
      this.logger.error(`Failed to send WhatsApp message to ${receiverId}: ${err.message}`);
      return false;
    }
  }

  async sendOtp(phone: string, role = 'customer'): Promise<{ success: boolean; message: string; isExistingUser: boolean; phone: string; role: string }> {
    if (!phone || !phone.trim()) {
      throw new BadRequestException('Phone number is required');
    }

    const { last10, receiverId, phoneVariants } = this.sanitizePhone(phone);
    if (last10.length < 10) {
      throw new BadRequestException('Please provide a valid 10-digit mobile number');
    }

    // Check if user already exists with this phone
    const existingUser = await this.prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants }
      }
    });

    // Generate 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

    this.otpStore.set(last10, {
      phone: last10,
      code: otpCode,
      role,
      expiresAt
    });
    this.logger.log(`Generated OTP for ${receiverId} (${last10}): ${otpCode}`);

    const message = `Your MLX DIRECT verification OTP is: ${otpCode}. Valid for 5 minutes. Please do not share this OTP with anyone.`;
    const sent = await this.sendWhatsAppMessage(receiverId, message);

    if (!sent) {
      this.logger.warn(`WhatsApp send failed for ${receiverId}, OTP ${otpCode} stored in session.`);
    }

    return {
      success: true,
      message: sent ? 'OTP sent successfully to your WhatsApp number' : 'OTP generated (WhatsApp delivery in progress)',
      isExistingUser: Boolean(existingUser),
      phone: last10,
      role: existingUser ? existingUser.role : role,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otpCode } : {})
    };
  }

  async verifyOtp(phone: string, otp: string, role = 'customer'): Promise<{ isValid: boolean; last10: string; phoneVariants: string[] }> {
    if (!phone || !otp) {
      throw new BadRequestException('Phone number and OTP are required');
    }

    const { last10, phoneVariants } = this.sanitizePhone(phone);
    const stored = this.otpStore.get(last10);

    if (!stored) {
      throw new BadRequestException('OTP expired or not found. Please request a new OTP.');
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(last10);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (stored.code !== otp.trim()) {
      throw new BadRequestException('Invalid OTP entered. Please check and try again.');
    }

    // OTP verified successfully - consume it
    this.otpStore.delete(last10);

    return {
      isValid: true,
      last10,
      phoneVariants
    };
  }
}
