import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone, dto.role);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Request() req: any) {
    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;
    return this.authService.verifyOtpAndLogin(dto.phone, dto.otp, dto.role, ipAddress, userAgent);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Request() req: any) {
    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;
    return this.authService.register(dto, ipAddress, userAgent);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Request() req: any) {
    const ipAddress =
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      null;
    const userAgent = (req.headers?.['user-agent'] as string) || null;
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
