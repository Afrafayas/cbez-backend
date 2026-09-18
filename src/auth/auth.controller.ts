import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
