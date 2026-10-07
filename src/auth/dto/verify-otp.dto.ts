import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  otp: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsIn(['customer', 'seller', 'admin'], { message: 'Role must be customer, seller, or admin' })
  role?: string;
}

