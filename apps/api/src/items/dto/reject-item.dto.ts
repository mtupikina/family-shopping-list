import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class RejectItemDto {
  @IsOptional()
  @ValidateIf((_obj, value) => value != null)
  @IsString()
  @MaxLength(500)
  rejectReason?: string | null;
}
