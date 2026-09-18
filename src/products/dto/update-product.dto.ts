import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UsedDeviceConditionDto } from './used-device-condition.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  specs?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => UsedDeviceConditionDto)
  conditionInfo?: UsedDeviceConditionDto;

  @IsOptional()
  images?: string[];
}
