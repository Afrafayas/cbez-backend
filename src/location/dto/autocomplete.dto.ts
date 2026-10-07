import { IsOptional, IsString } from 'class-validator';

export class AutocompleteDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  input?: string;
}
