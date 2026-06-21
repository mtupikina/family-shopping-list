import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ITEM_UNITS } from '../item-units';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number | null;

  @IsOptional()
  @ValidateIf((_obj, value) => value != null)
  @IsIn(ITEM_UNITS)
  unit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @IsOptional()
  @IsInt()
  baseVersion?: number;
}
