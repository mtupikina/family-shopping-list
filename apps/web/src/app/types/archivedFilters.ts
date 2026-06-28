import { ItemStatus } from './items';

export interface ArchivedFiltersForm {
  status: ItemStatus | '';
  text: string;
  store: string;
  rejectReason: string;
  priceMin: string;
  priceMax: string;
  createdAtFrom: string;
  createdAtTo: string;
  completedAtFrom: string;
  completedAtTo: string;
  rejectedAtFrom: string;
  rejectedAtTo: string;
}
