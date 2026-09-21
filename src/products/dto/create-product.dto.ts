import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UsedDeviceConditionDto } from './used-device-condition.dto';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  specs?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => UsedDeviceConditionDto)
  conditionInfo?: UsedDeviceConditionDto;

  @IsOptional()
  images?: string[];

  @IsOptional()
  @IsString()
  shopId?: string;
}
