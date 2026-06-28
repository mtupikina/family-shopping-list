import { describe, expect, it } from 'vitest';
import {
  canCompleteItem,
  canRejectItem,
  groupActiveItems,
  itemMeta,
  itemStatusClass,
  itemTitle,
  parseOptionalNumber,
} from './item-display.util';
import { ShoppingItem } from '../types/items';

const baseItem: ShoppingItem = {
  id: 'item-1',
  familyId: 'family-1',
  text: 'Milk',
  quantity: '2',
  unit: 'l',
  category: null,
  status: 'NEW',
  archived: false,
  archivedAt: null,
  createdBy: { id: 'm1', username: 'Marta' },
  rejectedBy: null,
  rejectReason: null,
  rejectedAt: null,
  completedBy: null,
  price: null,
  store: null,
  completedAt: null,
  version: 0,
  createdAt: '2026-06-07T10:00:00.000Z',
  updatedAt: '2026-06-07T10:00:00.000Z',
};

describe('item-display.util', () => {
  it('formats item title with quantity and unit', () => {
    const title = itemTitle(baseItem, key => (key === 'ITEMS.UNITS.l' ? 'L' : key));
    expect(title).toBe('2 L Milk');
  });

  it('returns plain text when no quantity', () => {
    expect(itemTitle({ ...baseItem, quantity: null, unit: null }, () => '')).toBe('Milk');
  });

  it('shows price and store meta for completed items', () => {
    expect(
      itemMeta({ ...baseItem, status: 'COMPLETED', price: '12.50', store: 'Biedronka' }),
    ).toBe('12.50 zł · Biedronka');
  });

  it('shows reject reason meta', () => {
    expect(
      itemMeta({ ...baseItem, status: 'REJECTED', rejectReason: 'Too expensive' }),
    ).toBe('Too expensive');
  });

  it('applies status classes', () => {
    expect(itemStatusClass({ ...baseItem, status: 'NEW' })).toContain('text-gray-800');
    expect(itemStatusClass({ ...baseItem, status: 'COMPLETED' })).toContain('line-through');
    expect(itemStatusClass({ ...baseItem, status: 'REJECTED' })).toContain('text-red-400');
  });

  it('guards complete and reject actions', () => {
    expect(canCompleteItem(baseItem)).toBe(true);
    expect(canRejectItem(baseItem)).toBe(true);
    expect(canCompleteItem({ ...baseItem, status: 'COMPLETED' })).toBe(false);
    expect(canRejectItem({ ...baseItem, status: 'REJECTED' })).toBe(false);
  });

  it('parses optional numbers', () => {
    expect(parseOptionalNumber('')).toBeUndefined();
    expect(parseOptionalNumber('3.5')).toBe(3.5);
    expect(parseOptionalNumber(3.5)).toBe(3.5);
    expect(parseOptionalNumber('abc')).toBeUndefined();
  });

  it('groups items by status', () => {
    const items: ShoppingItem[] = [
      baseItem,
      { ...baseItem, id: '2', status: 'COMPLETED' },
      { ...baseItem, id: '3', status: 'REJECTED' },
    ];

    const groups = groupActiveItems(items);
    expect(groups.newItems).toHaveLength(1);
    expect(groups.completedItems).toHaveLength(1);
    expect(groups.rejectedItems).toHaveLength(1);
  });
});
