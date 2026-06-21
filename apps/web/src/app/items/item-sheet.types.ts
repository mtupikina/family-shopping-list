export type ItemSheetMode = 'edit' | 'complete' | 'reject';

export interface ItemSheetFormValues {
  text: string;
  quantity: string;
  unit: string;
  price: string;
  store: string;
  rejectReason: string;
}
