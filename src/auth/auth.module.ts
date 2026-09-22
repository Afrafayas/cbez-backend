import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { VerifiedSellerGuard } from './verified-seller.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'cbez_super_secret_jwt_key_2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy, VerifiedSellerGuard],
  exports: [AuthService, OtpService, JwtStrategy, PassportModule, VerifiedSellerGuard],
})
export class AuthModule {}
