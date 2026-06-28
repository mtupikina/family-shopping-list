import { ItemStatus } from '@prisma/client';

export interface MemberSummary {
  id: string;
  username: string;
}

export interface ShoppingItemResponse {
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

export interface ListItemsQuery {
  updatedSince?: Date;
  includeArchived?: boolean;
}

export interface ArchivedItemsPageResponse {
  items: ShoppingItemResponse[];
  nextCursor: string | null;
}
