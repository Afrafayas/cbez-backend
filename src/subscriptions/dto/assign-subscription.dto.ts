import { IsString, IsNotEmpty } from 'class-validator';

export class AssignSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  shopId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;
}
