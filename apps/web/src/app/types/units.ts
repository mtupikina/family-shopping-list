export const ITEM_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'pack', 'bottle', 'can'] as const;

export type ItemUnit = (typeof ITEM_UNITS)[number];

export const DEFAULT_ITEM_UNIT: ItemUnit = 'pcs';

export function isItemUnit(value: string | null | undefined): value is ItemUnit {
  return value != null && (ITEM_UNITS as readonly string[]).includes(value);
}

export function unitLabelKey(unit: ItemUnit): string {
  return `ITEMS.UNITS.${unit}`;
}
