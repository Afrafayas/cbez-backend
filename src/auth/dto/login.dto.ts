import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsIn(['customer', 'seller', 'admin'], { message: 'Role must be customer, seller, or admin' })
  role?: string;
}

