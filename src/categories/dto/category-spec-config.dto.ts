import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export class CategorySpecFieldDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsIn(['text', 'number', 'select', 'multi-select', 'boolean', 'textarea'])
  type: string;

  @IsBoolean()
  @IsOptional()
  required?: boolean = false;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @IsBoolean()
  @IsOptional()
  searchable?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCustomValue?: boolean;

  // Form metadata; clients compare values case-insensitively when requested.
  @IsOptional()
  visibleWhen?: { field: string; values: string[]; caseInsensitive: boolean };

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  placeholder?: string;

  @IsBoolean()
  @IsOptional()
  filterable?: boolean = true;
}
