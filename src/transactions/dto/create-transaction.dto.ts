import { IsNotEmpty, IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsNotEmpty({ message: 'Shop ID is required' })
  @IsString()
  shopId: string;

  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount cannot be negative' })
  amount: number;

  @IsOptional()
  @IsIn(['COMPLETED', 'PENDING', 'FAILED'], {
    message: 'Payment status must be COMPLETED, PENDING, or FAILED',
  })
  paymentStatus?: string;

  @IsOptional()
  @IsIn(['INITIAL_VERIFICATION', 'PLAN_CHANGE', 'RENEWAL', 'MANUAL'], {
    message: 'Type must be INITIAL_VERIFICATION, PLAN_CHANGE, RENEWAL, or MANUAL',
  })
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
