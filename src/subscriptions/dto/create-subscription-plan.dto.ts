import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsIn, IsNumber } from 'class-validator';

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  productLimit: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationDays?: number = 30;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string = 'ACTIVE';

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number = 0;
}
