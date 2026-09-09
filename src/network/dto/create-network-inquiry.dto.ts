import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateNetworkInquiryDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  gadgetNeeded: string;

  @IsNumber()
  @IsOptional()
  targetBudget?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
