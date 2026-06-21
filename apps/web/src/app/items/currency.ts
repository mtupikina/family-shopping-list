export const CURRENCY_SYMBOL = 'zł';

export function formatPrice(price: string | null | undefined): string {
  if (price == null || price === '') {
    return '';
  }
  return `${price} ${CURRENCY_SYMBOL}`;
}
