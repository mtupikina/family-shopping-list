import { ItemStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ARCHIVED_ITEM_SORT_FIELDS } from '../archived-items-query';

export class ListArchivedItemsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsIn(ARCHIVED_ITEM_SORT_FIELDS)
  sortBy?: (typeof ARCHIVED_ITEM_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  store?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectReason?: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  priceMin?: string;

  @IsOptional()
  @IsString()
  priceMax?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  version?: number;

  @IsOptional()
  @IsUUID()
  createdById?: string;

  @IsOptional()
  @IsUUID()
  rejectedById?: string;

  @IsOptional()
  @IsUUID()
  completedById?: string;

  @IsOptional()
  @IsDateString()
  archivedAt?: string;

  @IsOptional()
  @IsDateString()
  archivedAtFrom?: string;

  @IsOptional()
  @IsDateString()
  archivedAtTo?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;

  @IsOptional()
  @IsDateString()
  createdAtFrom?: string;

  @IsOptional()
  @IsDateString()
  createdAtTo?: string;

  @IsOptional()
  @IsDateString()
  updatedAt?: string;

  @IsOptional()
  @IsDateString()
  updatedAtFrom?: string;

  @IsOptional()
  @IsDateString()
  updatedAtTo?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsDateString()
  completedAtFrom?: string;

  @IsOptional()
  @IsDateString()
  completedAtTo?: string;

  @IsOptional()
  @IsDateString()
  rejectedAt?: string;

  @IsOptional()
  @IsDateString()
  rejectedAtFrom?: string;

  @IsOptional()
  @IsDateString()
  rejectedAtTo?: string;
}
