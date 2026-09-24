import { IsNotEmpty, IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';

export class CreateBannerDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  details?: string;

  @IsNotEmpty({ message: 'Image URL is required' })
  @IsString()
  image: string;

  @IsNotEmpty({ message: 'Type is required' })
  @IsIn(['ads', 'banner'], { message: 'Type must be either "ads" or "banner"' })
  type: 'ads' | 'banner';

  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
