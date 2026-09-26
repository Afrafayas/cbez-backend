import { IsOptional, IsString, IsNumber, IsIn, Min } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount cannot be negative' })
  amount?: number;

  @IsOptional()
  @IsIn(['COMPLETED', 'PENDING', 'FAILED'])
  paymentStatus?: string;

  @IsOptional()
  @IsIn(['INITIAL_VERIFICATION', 'PLAN_CHANGE', 'RENEWAL', 'MANUAL'])
  type?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
