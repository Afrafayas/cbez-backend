import { IsNotEmpty, IsBoolean } from 'class-validator';

export class ToggleBannerStatusDto {
  @IsNotEmpty({ message: 'isActive status is required' })
  @IsBoolean({ message: 'isActive must be a boolean (true or false)' })
  isActive: boolean;
}
