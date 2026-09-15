import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';

export class UsedDeviceConditionDto {
  @IsString()
  @IsNotEmpty()
  condition: string; // e.g., "Grade A+ Like New", "Spotless Mint", "Good", "Fair"

  @IsOptional()
  @IsString()
  batteryHealth?: string; // e.g., "94%"

  @IsOptional()
  @IsString()
  warrantyStatus?: string; // e.g., "6 Months Store Warranty", "Brand Warranty"

  @IsOptional()
  @IsNumber()
  purchaseYear?: number; // e.g., 2024

  @IsOptional()
  @IsString()
  usageDuration?: string; // e.g., "6 Months"

  @IsOptional()
  @IsString()
  repairHistory?: string; // e.g., "Never Opened / Original Parts", "Screen Replaced"

  @IsOptional()
  @IsString()
  replacedParts?: string;

  @IsOptional()
  @IsBoolean()
  originalBox?: boolean;

  @IsOptional()
  @IsBoolean()
  originalInvoice?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includedAccessories?: string[]; // e.g. ["Charger", "Cable", "Case"]

  @IsOptional()
  @IsString()
  defects?: string; // e.g. "Minor scratch on bottom corner"

  @IsOptional()
  @IsString()
  sellerNotes?: string;
}
