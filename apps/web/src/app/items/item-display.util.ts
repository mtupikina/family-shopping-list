import { formatPrice } from './currency';
import { DEFAULT_ITEM_UNIT, isItemUnit, unitLabelKey } from './item-units';
import { ShoppingItem } from './item.types';

export function canCompleteItem(item: ShoppingItem): boolean {
  return item.status === 'NEW';
}

export function canRejectItem(item: ShoppingItem): boolean {
  return item.status === 'NEW';
}

export function itemTitle(
  item: ShoppingItem,
  translateUnit: (key: string) => string,
): string {
  if (item.quantity) {
    const unit =
      item.unit && isItemUnit(item.unit) ? translateUnit(unitLabelKey(item.unit)) : item.unit ?? '';
    const suffix = unit ? ` ${unit}` : '';
    return `${item.quantity}${suffix} ${item.text}`;
  }
  return item.text;
}

export function itemMeta(item: ShoppingItem): string | null {
  if (item.status === 'COMPLETED') {
    const parts: string[] = [];
    if (item.price) {
      parts.push(formatPrice(item.price));
    }
    if (item.store) {
      parts.push(item.store);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  if (item.status === 'REJECTED' && item.rejectReason) {
    return item.rejectReason;
  }

  return null;
}

export function itemStatusClass(item: ShoppingItem): string {
  const base = 'text-[0.9375rem] leading-[1.35]';
  if (item.status === 'COMPLETED') {
    return `${base} text-gray-400 line-through`;
  }
  if (item.status === 'REJECTED') {
    return `${base} text-red-400 line-through`;
  }
  return `${base} text-gray-800`;
}

export function defaultUnitForItem(item: ShoppingItem): string {
  return item.unit && isItemUnit(item.unit) ? item.unit : DEFAULT_ITEM_UNIT;
}

export function coerceFormString(value: unknown): string {
  if (value == null) {
    return '';
  }
  return String(value);
}

export function parseOptionalNumber(value: string | number | null | undefined): number | undefined {
  const trimmed = coerceFormString(value).trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function groupActiveItems(items: ShoppingItem[]): {
  newItems: ShoppingItem[];
  completedItems: ShoppingItem[];
  rejectedItems: ShoppingItem[];
} {
  return {
    newItems: items.filter(item => item.status === 'NEW'),
    completedItems: items.filter(item => item.status === 'COMPLETED'),
    rejectedItems: items.filter(item => item.status === 'REJECTED'),
  };
}
