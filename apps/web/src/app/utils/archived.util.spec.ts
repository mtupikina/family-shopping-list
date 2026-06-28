import { describe, expect, it } from 'vitest';
import { buildArchivedListQuery, countActiveFilters, EMPTY_ARCHIVED_FILTERS } from './archived.util';

describe('archived query', () => {
  it('counts active filters', () => {
    expect(countActiveFilters(EMPTY_ARCHIVED_FILTERS)).toBe(0);
    expect(countActiveFilters({ ...EMPTY_ARCHIVED_FILTERS, text: 'cheese', status: 'NEW' })).toBe(2);
  });

  it('maps filters to API query params', () => {
    expect(
      buildArchivedListQuery({
        ...EMPTY_ARCHIVED_FILTERS,
        status: 'COMPLETED',
        text: 'cheese',
        store: 'Lidl',
        rejectReason: 'Too expensive',
        priceMin: '10',
        priceMax: '50',
        createdAtFrom: '2026-06-01',
        createdAtTo: '2026-06-30',
      }),
    ).toEqual({
      status: 'COMPLETED',
      text: 'cheese',
      store: 'Lidl',
      rejectReason: 'Too expensive',
      priceMin: '10',
      priceMax: '50',
      createdAtFrom: '2026-06-01T00:00:00.000Z',
      createdAtTo: '2026-06-30T23:59:59.999Z',
    });
  });
});
