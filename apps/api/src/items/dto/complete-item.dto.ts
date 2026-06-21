import { IsNumber, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CompleteItemDto {
  @IsOptional()
  @ValidateIf((_obj, value) => value != null)
  @IsNumber()
  price?: number | null;

  @IsOptional()
  @ValidateIf((_obj, value) => value != null)
  @IsString()
  @MaxLength(200)
  store?: string | null;
}
