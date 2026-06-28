export type ItemStatus = 'NEW' | 'REJECTED' | 'COMPLETED';

export interface MemberSummary {
  id: string;
  username: string;
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  text: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  status: ItemStatus;
  archived: boolean;
  archivedAt: string | null;
  createdBy: MemberSummary;
  rejectedBy: MemberSummary | null;
  rejectReason: string | null;
  rejectedAt: string | null;
  completedBy: MemberSummary | null;
  price: string | null;
  store: string | null;
  completedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemPayload {
  text: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

export interface UpdateItemPayload {
  text?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  baseVersion?: number;
}

export interface RejectItemPayload {
  rejectReason?: string | null;
}

export interface CompleteItemPayload {
  price?: number | null;
  store?: string | null;
}

export type QueuedItemAction =
  | { type: 'create'; tempId: string; payload: CreateItemPayload }
  | { type: 'update'; id: string; payload: UpdateItemPayload }
  | { type: 'reject'; id: string; payload: RejectItemPayload }
  | { type: 'complete'; id: string; payload: CompleteItemPayload }
  | { type: 'archive'; id: string }
  | { type: 'archiveMany'; ids: string[] }
  | { type: 'unarchive'; id: string };

export const ITEMS_CACHE_KEY = 'fsl_items_cache';
export const ITEMS_QUEUE_KEY = 'fsl_items_queue';
export const ITEMS_LAST_UPDATED_KEY = 'fsl_items_last_updated';

export interface ArchivedItemsPage {
  items: ShoppingItem[];
  nextCursor: string | null;
}

export const ARCHIVED_ITEMS_PAGE_SIZE = 30;

export type ArchivedItemSortField =
  | 'archivedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'completedAt'
  | 'rejectedAt'
  | 'text'
  | 'status'
  | 'store'
  | 'category'
  | 'unit'
  | 'quantity'
  | 'price'
  | 'rejectReason'
  | 'version';

export interface ListArchivedItemsQuery {
  limit?: number;
  cursor?: string;
  sortBy?: ArchivedItemSortField;
  sortOrder?: 'asc' | 'desc';
  status?: ItemStatus;
  text?: string;
  store?: string;
  category?: string;
  unit?: string;
  rejectReason?: string;
  quantity?: string;
  priceMin?: string;
  priceMax?: string;
  version?: number;
  createdById?: string;
  rejectedById?: string;
  completedById?: string;
  archivedAt?: string;
  archivedAtFrom?: string;
  archivedAtTo?: string;
  createdAt?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAt?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  completedAt?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  rejectedAt?: string;
  rejectedAtFrom?: string;
  rejectedAtTo?: string;
}

export const DEFAULT_ARCHIVED_ITEMS_QUERY: ListArchivedItemsQuery = {
  sortBy: 'archivedAt',
  sortOrder: 'desc',
};
