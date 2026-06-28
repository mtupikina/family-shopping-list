import { BadRequestException } from '@nestjs/common';
import { ItemStatus, Prisma } from '@prisma/client';
import { ListArchivedItemsQueryDto } from './dto/list-archived-items.dto';

export const ARCHIVED_ITEM_SORT_FIELDS = [
  'archivedAt',
  'createdAt',
  'updatedAt',
  'completedAt',
  'rejectedAt',
  'text',
  'status',
  'store',
  'category',
  'unit',
  'quantity',
  'price',
  'rejectReason',
  'version',
] as const;

export type ArchivedItemSortField = (typeof ARCHIVED_ITEM_SORT_FIELDS)[number];

export interface ArchivedListCursor {
  sortBy: ArchivedItemSortField;
  sortValue: string | null;
  id: string;
}

type ItemWithSortFields = {
  id: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  rejectedAt: Date | null;
  text: string;
  status: ItemStatus;
  store: string | null;
  category: string | null;
  unit: string | null;
  quantity: Prisma.Decimal | null;
  price: Prisma.Decimal | null;
  rejectReason: string | null;
  version: number;
};

const DATE_SORT_FIELDS = new Set<ArchivedItemSortField>([
  'archivedAt',
  'createdAt',
  'updatedAt',
  'completedAt',
  'rejectedAt',
]);

const STRING_SORT_FIELDS = new Set<ArchivedItemSortField>([
  'text',
  'status',
  'store',
  'category',
  'unit',
  'rejectReason',
]);

const DECIMAL_SORT_FIELDS = new Set<ArchivedItemSortField>(['quantity', 'price']);

export function buildArchivedItemsWhere(
  familyId: string,
  query: ListArchivedItemsQueryDto,
  cursor?: ArchivedListCursor,
): Prisma.ShoppingItemWhereInput {
  const filters: Prisma.ShoppingItemWhereInput[] = [
    { familyId, archived: true, archivedAt: { not: null } },
  ];

  if (query.status) {
    filters.push({ status: query.status });
  }

  if (query.text?.trim()) {
    filters.push({ text: { contains: query.text.trim(), mode: 'insensitive' } });
  }

  if (query.store?.trim()) {
    filters.push({ store: { equals: query.store.trim(), mode: 'insensitive' } });
  }

  if (query.category?.trim()) {
    filters.push({ category: { contains: query.category.trim(), mode: 'insensitive' } });
  }

  if (query.unit?.trim()) {
    filters.push({ unit: query.unit.trim() });
  }

  if (query.rejectReason?.trim()) {
    filters.push({ rejectReason: { equals: query.rejectReason.trim(), mode: 'insensitive' } });
  }

  if (query.quantity?.trim()) {
    filters.push({ quantity: query.quantity.trim() });
  }

  appendPriceFilter(filters, query.priceMin, query.priceMax);

  if (query.version != null) {
    filters.push({ version: query.version });
  }

  if (query.createdById) {
    filters.push({ createdById: query.createdById });
  }

  if (query.rejectedById) {
    filters.push({ rejectedById: query.rejectedById });
  }

  if (query.completedById) {
    filters.push({ completedById: query.completedById });
  }

  appendDateFilter(filters, 'archivedAt', query.archivedAt, query.archivedAtFrom, query.archivedAtTo);
  appendDateFilter(filters, 'createdAt', query.createdAt, query.createdAtFrom, query.createdAtTo);
  appendDateFilter(filters, 'updatedAt', query.updatedAt, query.updatedAtFrom, query.updatedAtTo);
  appendDateFilter(filters, 'completedAt', query.completedAt, query.completedAtFrom, query.completedAtTo);
  appendDateFilter(filters, 'rejectedAt', query.rejectedAt, query.rejectedAtFrom, query.rejectedAtTo);

  if (cursor) {
    filters.push(buildArchivedCursorFilter(cursor, query.sortOrder ?? 'desc'));
  }

  return filters.length === 1 ? filters[0] : { AND: filters };
}

export function buildArchivedItemsOrderBy(
  sortBy: ArchivedItemSortField = 'archivedAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): Prisma.ShoppingItemOrderByWithRelationInput[] {
  return [{ [sortBy]: sortOrder }, { id: sortOrder }];
}

export function getArchivedSortValue(
  item: ItemWithSortFields,
  sortBy: ArchivedItemSortField,
): string | null {
  switch (sortBy) {
    case 'archivedAt':
      return item.archivedAt?.toISOString() ?? null;
    case 'createdAt':
      return item.createdAt.toISOString();
    case 'updatedAt':
      return item.updatedAt.toISOString();
    case 'completedAt':
      return item.completedAt?.toISOString() ?? null;
    case 'rejectedAt':
      return item.rejectedAt?.toISOString() ?? null;
    case 'text':
      return item.text;
    case 'status':
      return item.status;
    case 'store':
      return item.store;
    case 'category':
      return item.category;
    case 'unit':
      return item.unit;
    case 'quantity':
      return item.quantity?.toString() ?? null;
    case 'price':
      return item.price?.toString() ?? null;
    case 'rejectReason':
      return item.rejectReason;
    case 'version':
      return String(item.version);
  }
}

export function encodeArchivedListCursor(cursor: ArchivedListCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeArchivedListCursor(
  cursor: string,
  sortBy: ArchivedItemSortField,
): ArchivedListCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      sortBy?: ArchivedItemSortField;
      sortValue?: string | null;
      id?: string;
    };

    if (!parsed.id || parsed.sortBy !== sortBy) {
      throw new Error('Invalid cursor');
    }

    return {
      sortBy,
      sortValue: parsed.sortValue ?? null,
      id: parsed.id,
    };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

function appendPriceFilter(
  filters: Prisma.ShoppingItemWhereInput[],
  priceMin?: string,
  priceMax?: string,
): void {
  const range: { gte?: string; lte?: string } = {};
  const min = priceMin?.trim();
  const max = priceMax?.trim();

  if (min) {
    range.gte = min;
  }
  if (max) {
    range.lte = max;
  }

  if (Object.keys(range).length > 0) {
    filters.push({ price: range });
  }
}

function appendDateFilter(
  filters: Prisma.ShoppingItemWhereInput[],
  field:
    | 'archivedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'completedAt'
    | 'rejectedAt',
  exact?: string,
  from?: string,
  to?: string,
): void {
  if (exact) {
    filters.push({ [field]: new Date(exact) });
    return;
  }

  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    range.gte = new Date(from);
  }
  if (to) {
    range.lte = new Date(to);
  }

  if (Object.keys(range).length > 0) {
    filters.push({ [field]: range });
  }
}

function buildArchivedCursorFilter(
  cursor: ArchivedListCursor,
  sortOrder: 'asc' | 'desc',
): Prisma.ShoppingItemWhereInput {
  const sortBy = cursor.sortBy;
  const comparison = sortOrder === 'desc' ? 'lt' : 'gt';
  const parsedValue = parseArchivedSortValue(sortBy, cursor.sortValue);

  if (parsedValue === null) {
    return {
      OR: [{ [sortBy]: { not: null } }, { [sortBy]: null, id: { [comparison]: cursor.id } }],
    };
  }

  return {
    OR: [
      { [sortBy]: { [comparison]: parsedValue } },
      { [sortBy]: parsedValue, id: { [comparison]: cursor.id } },
    ],
  };
}

function parseArchivedSortValue(
  sortBy: ArchivedItemSortField,
  sortValue: string | null,
): string | number | Date | ItemStatus | null {
  if (sortValue === null) {
    return null;
  }

  if (DATE_SORT_FIELDS.has(sortBy)) {
    return new Date(sortValue);
  }

  if (sortBy === 'version') {
    return Number(sortValue);
  }

  if (DECIMAL_SORT_FIELDS.has(sortBy)) {
    return sortValue;
  }

  if (STRING_SORT_FIELDS.has(sortBy)) {
    return sortValue;
  }

  return sortValue;
}
