export const ITEM_UNITS = ['pcs', 'kg', 'g', 'l', 'ml', 'pack', 'bottle', 'can'] as const;

export type ItemUnit = (typeof ITEM_UNITS)[number];

export function isItemUnit(value: string): value is ItemUnit {
  return (ITEM_UNITS as readonly string[]).includes(value);
}
