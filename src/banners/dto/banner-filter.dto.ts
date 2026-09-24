import { IsOptional, IsIn, IsString } from 'class-validator';

export class BannerFilterDto {
  @IsOptional()
  @IsIn(['ads', 'banner'], { message: 'type must be either ads or banner' })
  type?: 'ads' | 'banner';

  @IsOptional()
  @IsString()
  isActive?: string;
}
