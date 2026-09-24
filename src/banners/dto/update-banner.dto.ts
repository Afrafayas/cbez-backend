import { IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

export class UpdateBannerDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsIn(['ads', 'banner'], { message: 'Type must be either "ads" or "banner"' })
  type?: 'ads' | 'banner';

  @IsOptional()
  @IsString()
  shopId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
