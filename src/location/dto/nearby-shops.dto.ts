import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyShopsDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  lng: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  radiusKm?: number = 10;

  @IsString()
  @IsOptional()
  category?: string;
}
