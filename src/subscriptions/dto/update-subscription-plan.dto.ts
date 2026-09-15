import { IsString, IsOptional, IsInt, Min, IsIn, IsNumber } from 'class-validator';

export class UpdateSubscriptionPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  productLimit?: number;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;
}
