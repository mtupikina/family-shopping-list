import { IsIn, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ITEM_UNITS } from '../item-units';

export class CreateItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsIn(ITEM_UNITS)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
