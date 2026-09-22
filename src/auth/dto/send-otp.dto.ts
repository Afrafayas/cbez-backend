import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phone: string;

  @IsOptional()
  @IsIn(['customer', 'seller', 'admin'], { message: 'Role must be customer, seller, or admin' })
  role?: string;
}
