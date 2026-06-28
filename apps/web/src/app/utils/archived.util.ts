import { ArchivedFiltersForm } from '../types/archivedFilters';
import { ItemStatus, ListArchivedItemsQuery } from '../types/items';

export const EMPTY_ARCHIVED_FILTERS: ArchivedFiltersForm = {
  status: '',
  text: '',
  store: '',
  rejectReason: '',
  priceMin: '',
  priceMax: '',
  createdAtFrom: '',
  createdAtTo: '',
  completedAtFrom: '',
  completedAtTo: '',
  rejectedAtFrom: '',
  rejectedAtTo: '',
};

export const ARCHIVED_REJECT_REASON_KEYS = [
  'ITEMS.REJECT_REASONS.TOO_EXPENSIVE',
  'ITEMS.REJECT_REASONS.OUT_OF_STOCK',
  'ITEMS.REJECT_REASONS.NOT_NEEDED',
  'ITEMS.REJECT_REASONS.GOT_ELSEWHERE',
] as const;

export const ARCHIVED_STATUS_OPTIONS: ItemStatus[] = ['NEW', 'COMPLETED', 'REJECTED'];

export function countActiveFilters(filters: ArchivedFiltersForm): number {
  return Object.entries(filters).filter(([, value]) => String(value).trim() !== '').length;
}

export function buildArchivedListQuery(filters: ArchivedFiltersForm): ListArchivedItemsQuery {
  const query: ListArchivedItemsQuery = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.text.trim()) {
    query.text = filters.text.trim();
  }

  if (filters.store) {
    query.store = filters.store;
  }

  if (filters.rejectReason) {
    query.rejectReason = filters.rejectReason;
  }

  if (filters.priceMin.trim()) {
    query.priceMin = filters.priceMin.trim();
  }

  if (filters.priceMax.trim()) {
    query.priceMax = filters.priceMax.trim();
  }

  appendDateRange(query, 'createdAt', filters.createdAtFrom, filters.createdAtTo);
  appendDateRange(query, 'completedAt', filters.completedAtFrom, filters.completedAtTo);
  appendDateRange(query, 'rejectedAt', filters.rejectedAtFrom, filters.rejectedAtTo);

  return query;
}

function appendDateRange(
  query: ListArchivedItemsQuery,
  field: 'createdAt' | 'completedAt' | 'rejectedAt',
  from: string,
  to: string,
): void {
  if (from) {
    query[`${field}From`] = toStartOfDayIso(from);
  }

  if (to) {
    query[`${field}To`] = toEndOfDayIso(to);
  }
}

function toStartOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toEndOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}
