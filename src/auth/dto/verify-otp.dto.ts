import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  otp: string;

  @IsOptional()
  @IsIn(['customer', 'seller', 'admin'], { message: 'Role must be customer, seller, or admin' })
  role?: string;
}
