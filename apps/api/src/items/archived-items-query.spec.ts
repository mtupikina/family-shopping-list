import { ItemStatus } from '@prisma/client';
import {
  buildArchivedItemsOrderBy,
  buildArchivedItemsWhere,
  decodeArchivedListCursor,
  encodeArchivedListCursor,
} from './archived-items-query';

describe('archived-items-query', () => {
  it('builds text and status filters', () => {
    const where = buildArchivedItemsWhere('family-1', {
      text: 'cheese',
      status: ItemStatus.COMPLETED,
      store: 'lidl',
    });

    expect(where).toEqual({
      AND: [
        { familyId: 'family-1', archived: true, archivedAt: { not: null } },
        { status: ItemStatus.COMPLETED },
        { text: { contains: 'cheese', mode: 'insensitive' } },
        { store: { contains: 'lidl', mode: 'insensitive' } },
      ],
    });
  });

  it('builds date range filters', () => {
    const where = buildArchivedItemsWhere('family-1', {
      archivedAtFrom: '2026-06-01T00:00:00.000Z',
      archivedAtTo: '2026-06-30T23:59:59.999Z',
    });

    expect(where).toEqual({
      AND: [
        { familyId: 'family-1', archived: true, archivedAt: { not: null } },
        {
          archivedAt: {
            gte: new Date('2026-06-01T00:00:00.000Z'),
            lte: new Date('2026-06-30T23:59:59.999Z'),
          },
        },
      ],
    });
  });

  it('builds custom sort order', () => {
    expect(buildArchivedItemsOrderBy('text', 'asc')).toEqual([{ text: 'asc' }, { id: 'asc' }]);
  });

  it('encodes and decodes cursor for active sort field', () => {
    const encoded = encodeArchivedListCursor({
      sortBy: 'archivedAt',
      sortValue: '2026-06-07T12:00:00.000Z',
      id: 'item-1',
    });

    expect(decodeArchivedListCursor(encoded, 'archivedAt')).toEqual({
      sortBy: 'archivedAt',
      sortValue: '2026-06-07T12:00:00.000Z',
      id: 'item-1',
    });
  });
});
