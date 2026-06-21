import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemStatus } from '@prisma/client';
import { ItemsService } from './items.service';
import { ItemEventsService } from './item-events.service';
import { PrismaService } from '../prisma/prisma.service';

const baseItem = {
  id: 'item-1',
  familyId: 'family-1',
  text: 'Milk',
  quantity: null,
  unit: null,
  category: null,
  status: ItemStatus.NEW,
  archived: false,
  archivedAt: null,
  createdById: 'member-1',
  rejectedById: null,
  rejectReason: null,
  rejectedAt: null,
  completedById: null,
  price: null,
  store: null,
  completedAt: null,
  version: 0,
  createdAt: new Date('2026-06-07T10:00:00.000Z'),
  updatedAt: new Date('2026-06-07T10:00:00.000Z'),
  createdBy: { id: 'member-1', username: 'Marta' },
  rejectedBy: null,
  completedBy: null,
};

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: {
    shoppingItem: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let itemEvents: { publish: jest.Mock };

  beforeEach(() => {
    prisma = {
      shoppingItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    itemEvents = { publish: jest.fn() };

    service = new ItemsService(
      prisma as unknown as PrismaService,
      itemEvents as unknown as ItemEventsService,
    );
  });

  it('lists family items', async () => {
    prisma.shoppingItem.findMany.mockResolvedValue([baseItem]);

    const result = await service.list('family-1');

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Milk');
    expect(prisma.shoppingItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { familyId: 'family-1', archived: false },
      }),
    );
  });

  it('lists distinct family stores by recent use', async () => {
    prisma.shoppingItem.findMany.mockResolvedValue([
      { store: 'Lidl', completedAt: new Date('2026-06-07T12:00:00.000Z') },
      { store: 'lidl', completedAt: new Date('2026-06-07T11:00:00.000Z') },
      { store: 'Biedronka', completedAt: new Date('2026-06-07T10:00:00.000Z') },
    ]);

    await expect(service.listStores('family-1')).resolves.toEqual(['Lidl', 'Biedronka']);
  });

  it('creates an item and publishes event', async () => {
    prisma.shoppingItem.create.mockResolvedValue(baseItem);

    const result = await service.create('family-1', 'member-1', { text: 'Milk' });

    expect(result.text).toBe('Milk');
    expect(itemEvents.publish).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: 'family-1', type: 'created' }),
    );
  });

  it('skips stale updates when baseVersion is older', async () => {
    prisma.shoppingItem.findFirst.mockResolvedValue({ ...baseItem, version: 3 });

    const result = await service.update('family-1', 'item-1', {
      text: 'Stale',
      baseVersion: 1,
    });

    expect(result.version).toBe(3);
    expect(prisma.shoppingItem.update).not.toHaveBeenCalled();
    expect(prisma.shoppingItem.updateMany).not.toHaveBeenCalled();
  });

  it('applies update when baseVersion matches (compare-and-swap)', async () => {
    const updated = { ...baseItem, text: 'Fresh', version: 1 };
    prisma.shoppingItem.findFirst
      .mockResolvedValueOnce(baseItem)
      .mockResolvedValueOnce(updated);
    prisma.shoppingItem.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.update('family-1', 'item-1', {
      text: 'Fresh',
      baseVersion: 0,
    });

    expect(result.text).toBe('Fresh');
    expect(prisma.shoppingItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ version: 0, archived: false }),
      }),
    );
  });

  it('returns current item when baseVersion is stale at write time', async () => {
    prisma.shoppingItem.findFirst
      .mockResolvedValueOnce(baseItem)
      .mockResolvedValueOnce({ ...baseItem, version: 2 });
    prisma.shoppingItem.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.update('family-1', 'item-1', {
      text: 'Fresh',
      baseVersion: 0,
    });

    expect(result.version).toBe(2);
    expect(prisma.shoppingItem.update).not.toHaveBeenCalled();
  });

  it('clears unit when quantity is set to null', async () => {
    const withUnit = { ...baseItem, quantity: { toString: () => '2' }, unit: 'kg', version: 0 };
    const cleared = { ...withUnit, quantity: null, unit: null, version: 1 };
    prisma.shoppingItem.findFirst.mockResolvedValue(withUnit);
    prisma.shoppingItem.update.mockResolvedValue(cleared);

    await service.update('family-1', 'item-1', { quantity: null });

    expect(prisma.shoppingItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ quantity: null, unit: null }),
      }),
    );
  });

  it('rejects updating an archived item', async () => {
    prisma.shoppingItem.findFirst.mockResolvedValue({
      ...baseItem,
      archived: true,
      archivedAt: new Date('2026-06-07T12:00:00.000Z'),
    });

    await expect(
      service.update('family-1', 'item-1', { text: 'Nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects only the first completion (first-write-wins)', async () => {
    const completed = {
      ...baseItem,
      status: ItemStatus.COMPLETED,
      completedById: 'member-1',
      completedBy: { id: 'member-1', username: 'Marta' },
      completedAt: new Date('2026-06-07T11:00:00.000Z'),
      version: 1,
    };

    prisma.shoppingItem.findFirst.mockResolvedValue(completed);

    const result = await service.complete('family-1', 'member-2', 'item-1', {});

    expect(result.completedBy?.id).toBe('member-1');
    expect(prisma.shoppingItem.update).not.toHaveBeenCalled();
  });

  it('allows enriching completion details after first complete', async () => {
    const completed = {
      ...baseItem,
      status: ItemStatus.COMPLETED,
      completedById: 'member-1',
      completedBy: { id: 'member-1', username: 'Marta' },
      completedAt: new Date('2026-06-07T11:00:00.000Z'),
      version: 1,
    };
    const enriched = {
      ...completed,
      price: { toString: () => '3.50' },
      store: 'Lidl',
      version: 2,
    };

    prisma.shoppingItem.findFirst.mockResolvedValue(completed);
    prisma.shoppingItem.update.mockResolvedValue(enriched);

    const result = await service.complete('family-1', 'member-2', 'item-1', {
      price: 3.5,
      store: 'Lidl',
    });

    expect(result.store).toBe('Lidl');
    expect(prisma.shoppingItem.update).toHaveBeenCalled();
    expect(itemEvents.publish).toHaveBeenCalled();
  });

  it('rejects completing a rejected item', async () => {
    prisma.shoppingItem.findFirst.mockResolvedValue({
      ...baseItem,
      status: ItemStatus.REJECTED,
      rejectedAt: new Date('2026-06-07T11:00:00.000Z'),
    });

    await expect(
      service.complete('family-1', 'member-1', 'item-1', { price: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects rejecting a completed item', async () => {
    prisma.shoppingItem.findFirst.mockResolvedValue({
      ...baseItem,
      status: ItemStatus.COMPLETED,
      completedAt: new Date('2026-06-07T11:00:00.000Z'),
    });

    await expect(
      service.reject('family-1', 'member-1', 'item-1', { rejectReason: 'Nope' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates reject reason on already rejected item', async () => {
    const rejected = {
      ...baseItem,
      status: ItemStatus.REJECTED,
      rejectedById: 'member-1',
      rejectedBy: { id: 'member-1', username: 'Marta' },
      rejectReason: 'Too expensive',
      rejectedAt: new Date('2026-06-07T11:00:00.000Z'),
      version: 1,
    };
    const updated = { ...rejected, rejectReason: 'Out of stock', version: 2 };

    prisma.shoppingItem.findFirst.mockResolvedValue(rejected);
    prisma.shoppingItem.update.mockResolvedValue(updated);

    const result = await service.reject('family-1', 'member-2', 'item-1', {
      rejectReason: 'Out of stock',
    });

    expect(result.rejectReason).toBe('Out of stock');
    expect(prisma.shoppingItem.update).toHaveBeenCalled();
  });

  it('archives an item', async () => {
    const archived = {
      ...baseItem,
      archived: true,
      archivedAt: new Date('2026-06-07T12:00:00.000Z'),
      version: 1,
    };

    prisma.shoppingItem.findMany
      .mockResolvedValueOnce([{ id: 'item-1', archived: false }])
      .mockResolvedValueOnce([archived]);
    prisma.shoppingItem.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.archive('family-1', 'item-1');

    expect(result.archived).toBe(true);
    expect(prisma.shoppingItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          updatedAt: expect.any(Date),
          archivedAt: expect.any(Date),
        }),
      }),
    );
    expect(itemEvents.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'updated' }),
    );
  });

  it('archives multiple items in one operation', async () => {
    const item2 = { ...baseItem, id: 'item-2', text: 'Bread' };
    const archived1 = {
      ...baseItem,
      archived: true,
      archivedAt: new Date('2026-06-07T12:00:00.000Z'),
      version: 1,
    };
    const archived2 = {
      ...item2,
      archived: true,
      archivedAt: new Date('2026-06-07T12:00:00.000Z'),
      version: 1,
    };

    prisma.shoppingItem.findMany
      .mockResolvedValueOnce([
        { id: 'item-1', archived: false },
        { id: 'item-2', archived: false },
      ])
      .mockResolvedValueOnce([archived1, archived2]);
    prisma.shoppingItem.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.archiveMany('family-1', ['item-1', 'item-2']);

    expect(result).toHaveLength(2);
    expect(result.every(item => item.archived)).toBe(true);
    expect(prisma.shoppingItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['item-1', 'item-2'] } }),
      }),
    );
    expect(itemEvents.publish).toHaveBeenCalledTimes(2);
  });

  it('throws when item is not in family', async () => {
    prisma.shoppingItem.findMany.mockResolvedValue([]);

    await expect(service.archive('family-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
