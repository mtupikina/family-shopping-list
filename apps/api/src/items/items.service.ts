import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ItemStatus, Prisma, ShoppingItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ItemEventsService } from './item-events.service';
import { CompleteItemDto } from './dto/complete-item.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { ListArchivedItemsQueryDto } from './dto/list-archived-items.dto';
import { RejectItemDto } from './dto/reject-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import {
  ArchivedItemSortField,
  buildArchivedItemsOrderBy,
  buildArchivedItemsWhere,
  decodeArchivedListCursor,
  encodeArchivedListCursor,
  getArchivedSortValue,
} from './archived-items-query';
import {
  ArchivedItemsPageResponse,
  ListItemsQuery,
  ShoppingItemResponse,
} from './items.types';

type ItemWithMembers = ShoppingItem & {
  createdBy: { id: string; username: string };
  rejectedBy: { id: string; username: string } | null;
  completedBy: { id: string; username: string } | null;
};

const itemInclude = {
  createdBy: { select: { id: true, username: true } },
  rejectedBy: { select: { id: true, username: true } },
  completedBy: { select: { id: true, username: true } },
} satisfies Prisma.ShoppingItemInclude;

@Injectable()
export class ItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemEvents: ItemEventsService,
  ) {}

  async list(familyId: string, query: ListItemsQuery = {}): Promise<ShoppingItemResponse[]> {
    const where: Prisma.ShoppingItemWhereInput = { familyId };

    if (!query.includeArchived) {
      where.archived = false;
    }

    if (query.updatedSince) {
      where.updatedAt = { gte: query.updatedSince };
    }

    const items = await this.prisma.shoppingItem.findMany({
      where,
      include: itemInclude,
      orderBy: { createdAt: 'desc' },
    });

    return items.map(item => this.toResponse(item));
  }

  async listArchived(
    familyId: string,
    query: ListArchivedItemsQueryDto = {},
  ): Promise<ArchivedItemsPageResponse> {
    const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);
    const sortBy: ArchivedItemSortField = query.sortBy ?? 'archivedAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const cursor = query.cursor ? decodeArchivedListCursor(query.cursor, sortBy) : undefined;

    const items = await this.prisma.shoppingItem.findMany({
      where: buildArchivedItemsWhere(familyId, query, cursor),
      include: itemInclude,
      orderBy: buildArchivedItemsOrderBy(sortBy, sortOrder),
      take: limit + 1,
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    const last = page.at(-1);

    return {
      items: page.map(item => this.toResponse(item)),
      nextCursor:
        hasMore && last
          ? encodeArchivedListCursor({
              sortBy,
              sortValue: getArchivedSortValue(last, sortBy),
              id: last.id,
            })
          : null,
    };
  }

  async listStores(familyId: string): Promise<string[]> {
    const items = await this.prisma.shoppingItem.findMany({
      where: { familyId, store: { not: null } },
      select: { store: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
    });

    const seen = new Set<string>();
    const stores: string[] = [];

    for (const item of items) {
      const store = item.store?.trim();
      if (!store) {
        continue;
      }
      const key = store.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      stores.push(store);
    }

    return stores;
  }

  async create(
    familyId: string,
    memberId: string,
    dto: CreateItemDto,
  ): Promise<ShoppingItemResponse> {
    const item = await this.prisma.shoppingItem.create({
      data: {
        familyId,
        text: dto.text.trim(),
        quantity: dto.quantity ?? null,
        unit: dto.unit?.trim() ?? null,
        category: dto.category?.trim() ?? null,
        createdById: memberId,
      },
      include: itemInclude,
    });

    const response = this.toResponse(item);
    this.itemEvents.publish({ familyId, type: 'created', item: response });
    return response;
  }

  async update(
    familyId: string,
    itemId: string,
    dto: UpdateItemDto,
  ): Promise<ShoppingItemResponse> {
    const existing = await this.findFamilyItem(familyId, itemId);
    this.assertActiveItem(existing);

    if (dto.baseVersion != null && dto.baseVersion < existing.version) {
      return this.toResponse(existing);
    }

    const data = this.buildUpdateData(dto);
    if (Object.keys(data).length === 0) {
      return this.toResponse(existing);
    }

    data.version = { increment: 1 };

    if (dto.baseVersion == null) {
      return this.applyDirectUpdate(familyId, itemId, data);
    }

    return this.applyVersionedUpdate(familyId, itemId, dto.baseVersion, data);
  }

  async reject(
    familyId: string,
    memberId: string,
    itemId: string,
    dto: RejectItemDto,
  ): Promise<ShoppingItemResponse> {
    const existing = await this.findFamilyItem(familyId, itemId);
    this.assertActiveItem(existing);

    if (existing.status === ItemStatus.COMPLETED) {
      throw new BadRequestException('Cannot reject a completed item');
    }

    if (existing.rejectedAt != null) {
      return this.enrichRejectReason(familyId, itemId, existing, dto);
    }

    return this.markRejected(familyId, memberId, itemId, dto);
  }

  async complete(
    familyId: string,
    memberId: string,
    itemId: string,
    dto: CompleteItemDto,
  ): Promise<ShoppingItemResponse> {
    const existing = await this.findFamilyItem(familyId, itemId);
    this.assertActiveItem(existing);

    if (existing.status === ItemStatus.REJECTED) {
      throw new BadRequestException('Cannot complete a rejected item');
    }

    if (existing.completedAt != null) {
      return this.enrichCompletion(familyId, itemId, existing, dto);
    }

    return this.markCompleted(familyId, memberId, itemId, dto);
  }

  async archive(familyId: string, itemId: string): Promise<ShoppingItemResponse> {
    const [item] = await this.archiveMany(familyId, [itemId]);
    return item;
  }

  async archiveMany(familyId: string, ids: string[]): Promise<ShoppingItemResponse[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    const existing = await this.prisma.shoppingItem.findMany({
      where: { familyId, id: { in: uniqueIds } },
      select: { id: true, archived: true },
    });

    if (existing.length !== uniqueIds.length) {
      throw new NotFoundException('One or more items not found');
    }

    const toArchiveIds = existing.filter(item => !item.archived).map(item => item.id);
    if (toArchiveIds.length === 0) {
      return this.fetchResponses(familyId, uniqueIds);
    }

    const now = new Date();
    await this.prisma.shoppingItem.updateMany({
      where: { familyId, id: { in: toArchiveIds }, archived: false },
      data: {
        archived: true,
        archivedAt: now,
        updatedAt: now,
        version: { increment: 1 },
      },
    });

    const responses = await this.fetchResponses(familyId, uniqueIds);
    const archivedIdSet = new Set(toArchiveIds);

    for (const response of responses) {
      if (!archivedIdSet.has(response.id)) {
        continue;
      }
      this.itemEvents.publish({ familyId, type: 'updated', item: response });
    }

    return responses;
  }

  async unarchive(familyId: string, itemId: string): Promise<ShoppingItemResponse> {
    const existing = await this.findFamilyItem(familyId, itemId);

    if (!existing.archived) {
      return this.toResponse(existing);
    }

    const item = await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        archived: false,
        archivedAt: null,
        version: { increment: 1 },
      },
      include: itemInclude,
    });

    return this.publishUpdate(familyId, item);
  }

  private async applyDirectUpdate(
    familyId: string,
    itemId: string,
    data: Prisma.ShoppingItemUpdateInput,
  ): Promise<ShoppingItemResponse> {
    const item = await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data,
      include: itemInclude,
    });

    return this.publishUpdate(familyId, item);
  }

  private async applyVersionedUpdate(
    familyId: string,
    itemId: string,
    baseVersion: number,
    data: Prisma.ShoppingItemUpdateInput,
  ): Promise<ShoppingItemResponse> {
    const { count } = await this.prisma.shoppingItem.updateMany({
      where: { id: itemId, familyId, archived: false, version: baseVersion },
      data,
    });

    const item = await this.findFamilyItem(familyId, itemId);
    if (count === 0) {
      return this.toResponse(item);
    }

    return this.publishUpdate(familyId, item);
  }

  private async enrichRejectReason(
    familyId: string,
    itemId: string,
    existing: ItemWithMembers,
    dto: RejectItemDto,
  ): Promise<ShoppingItemResponse> {
    if (dto.rejectReason === undefined) {
      return this.toResponse(existing);
    }

    const item = await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        rejectReason: dto.rejectReason.trim() || null,
        version: { increment: 1 },
      },
      include: itemInclude,
    });

    return this.publishUpdate(familyId, item);
  }

  private async markRejected(
    familyId: string,
    memberId: string,
    itemId: string,
    dto: RejectItemDto,
  ): Promise<ShoppingItemResponse> {
    const rejectedAt = new Date();
    const { count } = await this.prisma.shoppingItem.updateMany({
      where: {
        id: itemId,
        familyId,
        archived: false,
        rejectedAt: null,
        status: { not: ItemStatus.COMPLETED },
      },
      data: {
        status: ItemStatus.REJECTED,
        rejectedById: memberId,
        rejectReason: dto.rejectReason?.trim() ?? null,
        rejectedAt,
        version: { increment: 1 },
      },
    });

    if (count > 0) {
      return this.publishUpdate(familyId, await this.findFamilyItem(familyId, itemId));
    }

    return this.handleRejectRace(familyId, itemId, dto);
  }

  private async handleRejectRace(
    familyId: string,
    itemId: string,
    dto: RejectItemDto,
  ): Promise<ShoppingItemResponse> {
    const current = await this.findFamilyItem(familyId, itemId);
    if (current.rejectedAt == null) {
      return this.toResponse(current);
    }

    return this.enrichRejectReason(familyId, itemId, current, dto);
  }

  private async enrichCompletion(
    familyId: string,
    itemId: string,
    existing: ItemWithMembers,
    dto: CompleteItemDto,
  ): Promise<ShoppingItemResponse> {
    if (dto.price === undefined && dto.store === undefined) {
      return this.toResponse(existing);
    }

    const data = this.buildCompletionEnrichmentData(dto);
    const item = await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data,
      include: itemInclude,
    });

    return this.publishUpdate(familyId, item);
  }

  private async markCompleted(
    familyId: string,
    memberId: string,
    itemId: string,
    dto: CompleteItemDto,
  ): Promise<ShoppingItemResponse> {
    const completedAt = new Date();
    const { count } = await this.prisma.shoppingItem.updateMany({
      where: {
        id: itemId,
        familyId,
        archived: false,
        completedAt: null,
        status: { not: ItemStatus.REJECTED },
      },
      data: {
        status: ItemStatus.COMPLETED,
        completedById: memberId,
        price: dto.price ?? null,
        store: dto.store?.trim() ?? null,
        completedAt,
        version: { increment: 1 },
      },
    });

    if (count > 0) {
      return this.publishUpdate(familyId, await this.findFamilyItem(familyId, itemId));
    }

    return this.handleCompleteRace(familyId, itemId, dto);
  }

  private async handleCompleteRace(
    familyId: string,
    itemId: string,
    dto: CompleteItemDto,
  ): Promise<ShoppingItemResponse> {
    const current = await this.findFamilyItem(familyId, itemId);
    if (current.completedAt == null) {
      return this.toResponse(current);
    }

    return this.enrichCompletion(familyId, itemId, current, dto);
  }

  private buildCompletionEnrichmentData(dto: CompleteItemDto): Prisma.ShoppingItemUpdateInput {
    const data: Prisma.ShoppingItemUpdateInput = { version: { increment: 1 } };

    if (dto.price !== undefined) {
      data.price = dto.price;
    }
    if (dto.store !== undefined) {
      data.store = dto.store?.trim() || null;
    }

    return data;
  }

  private buildUpdateData(dto: UpdateItemDto): Prisma.ShoppingItemUpdateInput {
    const data: Prisma.ShoppingItemUpdateInput = {};

    if (dto.text !== undefined) {
      data.text = dto.text.trim();
    }
    if (dto.quantity !== undefined) {
      data.quantity = dto.quantity;
    }
    if (dto.quantity === null && dto.unit === undefined) {
      data.unit = null;
    }
    if (dto.unit !== undefined) {
      data.unit = dto.unit?.trim() ?? null;
    }
    if (dto.category !== undefined) {
      data.category = dto.category?.trim() ?? null;
    }

    return data;
  }

  private async fetchResponses(
    familyId: string,
    ids: string[],
  ): Promise<ShoppingItemResponse[]> {
    const items = await this.prisma.shoppingItem.findMany({
      where: { familyId, id: { in: ids } },
      include: itemInclude,
    });

    return items.map(item => this.toResponse(item));
  }

  private assertActiveItem(item: ItemWithMembers): void {
    if (item.archived) {
      throw new BadRequestException('Cannot modify an archived item');
    }
  }

  private publishUpdate(familyId: string, item: ItemWithMembers): ShoppingItemResponse {
    const response = this.toResponse(item);
    this.itemEvents.publish({ familyId, type: 'updated', item: response });
    return response;
  }

  private async findFamilyItem(familyId: string, itemId: string): Promise<ItemWithMembers> {
    const item = await this.prisma.shoppingItem.findFirst({
      where: { id: itemId, familyId },
      include: itemInclude,
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  private toResponse(item: ItemWithMembers): ShoppingItemResponse {
    return {
      id: item.id,
      familyId: item.familyId,
      text: item.text,
      quantity: item.quantity?.toString() ?? null,
      unit: item.unit,
      category: item.category,
      status: item.status,
      archived: item.archived,
      archivedAt: item.archivedAt?.toISOString() ?? null,
      createdBy: item.createdBy,
      rejectedBy: item.rejectedBy,
      rejectReason: item.rejectReason,
      rejectedAt: item.rejectedAt?.toISOString() ?? null,
      completedBy: item.completedBy,
      price: item.price?.toString() ?? null,
      store: item.store,
      completedAt: item.completedAt?.toISOString() ?? null,
      version: item.version,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
