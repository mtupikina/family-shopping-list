import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ItemsService } from './items.service';
import { AuthService } from '../auth/auth.service';
import { ConnectivityService } from './connectivity.service';
import { ShoppingItem, ITEMS_CACHE_KEY, ITEMS_QUEUE_KEY } from '../types/items';

const sampleItem: ShoppingItem = {
  id: 'item-1',
  familyId: 'family-1',
  text: 'Milk',
  quantity: null,
  unit: null,
  category: null,
  status: 'NEW',
  archived: false,
  archivedAt: null,
  createdBy: { id: 'member-1', username: 'Marta' },
  rejectedBy: null,
  rejectReason: null,
  rejectedAt: null,
  completedBy: null,
  price: null,
  store: null,
  completedAt: null,
  version: 0,
  createdAt: '2026-06-07T10:00:00.000Z',
  updatedAt: '2026-06-07T10:00:00.000Z',
};

describe('ItemsService', () => {
  let service: ItemsService;
  const httpMock = { get: vi.fn(), post: vi.fn(), patch: vi.fn() };
  const authMock = { accessToken: 'token-1' };
  const connectivityMock = { online: vi.fn().mockReturnValue(true) };

  beforeEach(() => {
    vi.clearAllMocks();
    connectivityMock.online.mockReturnValue(true);
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ItemsService,
        { provide: HttpClient, useValue: httpMock },
        { provide: AuthService, useValue: authMock },
        { provide: ConnectivityService, useValue: connectivityMock },
      ],
    });

    service = TestBed.inject(ItemsService);
    httpMock.get.mockReturnValue(of([sampleItem]));
  });

  it('merges items by id', () => {
    service.mergeItem(sampleItem);
    service.mergeItem({ ...sampleItem, text: 'Bread', version: 1 });

    expect(service.items()).toHaveLength(1);
    expect(service.items()[0].text).toBe('Bread');
  });

  it('detects duplicate active items', () => {
    service.mergeItem(sampleItem);

    expect(service.findDuplicate('milk')?.text).toBe('Milk');
    expect(service.findDuplicate('Bread')).toBeUndefined();
  });

  it('suggests item texts from cache when offline', async () => {
    connectivityMock.online.mockReturnValue(false);
    service.mergeItem(sampleItem);
    service.mergeItem({
      ...sampleItem,
      id: 'item-2',
      text: 'Almond milk',
      createdAt: '2026-06-07T11:00:00.000Z',
    });

    await expect(service.suggestItemTexts('mil')).resolves.toEqual(['Almond milk', 'Milk']);
    expect(httpMock.get).not.toHaveBeenCalled();
  });

  it('loads item text suggestions from API when online', async () => {
    httpMock.get.mockReturnValue(of(['Whole milk', 'Milk']));

    await expect(service.suggestItemTexts('mil')).resolves.toEqual(['Whole milk', 'Milk']);
    expect(httpMock.get).toHaveBeenCalledWith(
      expect.stringContaining('/items/suggestions'),
      expect.objectContaining({ params: { q: 'mil' } }),
    );
  });

  it('excludes archived items from activeItems', () => {
    service.mergeItem(sampleItem);
    service.mergeItem({ ...sampleItem, id: 'item-2', text: 'Bread', archived: true });

    expect(service.activeItems()).toHaveLength(1);
    expect(service.archivedItems()).toHaveLength(1);
  });

  it('loads items from API on initialize', async () => {
    await service.initialize();

    expect(httpMock.get).toHaveBeenCalled();
    expect(service.items()).toHaveLength(1);
    expect(service.loading()).toBe(false);
  });

  it('archives multiple items in one request', async () => {
    service.mergeItem(sampleItem);
    service.mergeItem({ ...sampleItem, id: 'item-2', text: 'Bread' });
    httpMock.post.mockReturnValue(
      of([
        { ...sampleItem, archived: true, archivedAt: '2026-06-07T12:00:00.000Z', version: 1 },
        {
          ...sampleItem,
          id: 'item-2',
          text: 'Bread',
          archived: true,
          archivedAt: '2026-06-07T12:00:00.000Z',
          version: 1,
        },
      ]),
    );

    const result = await service.archiveMany(['item-1', 'item-2']);

    expect(httpMock.post).toHaveBeenCalledTimes(1);
    expect(httpMock.post).toHaveBeenCalledWith(
      expect.stringContaining('/items/archive'),
      { ids: ['item-1', 'item-2'] },
    );
    expect(result).toHaveLength(2);
    expect(service.activeItems()).toHaveLength(0);
  });

  it('loads store suggestions from cache when offline on initialize', async () => {
    localStorage.setItem(
      ITEMS_CACHE_KEY,
      JSON.stringify([
        {
          ...sampleItem,
          status: 'COMPLETED',
          store: 'Biedronka',
          completedAt: '2026-06-07T12:00:00.000Z',
        },
      ]),
    );
    connectivityMock.online.mockReturnValue(false);

    await service.initialize();

    expect(service.familyStores()).toContain('Biedronka');
    expect(httpMock.get).not.toHaveBeenCalled();
  });

  it('clears unit when quantity is removed offline', async () => {
    service.mergeItem({ ...sampleItem, quantity: '2', unit: 'kg' });
    connectivityMock.online.mockReturnValue(false);

    await service.update('item-1', { quantity: null, unit: null, baseVersion: 0 });

    expect(service.items()[0].quantity).toBeNull();
    expect(service.items()[0].unit).toBeNull();
  });

  it('sets mutationError when online create fails', async () => {
    httpMock.post.mockReturnValue(throwError(() => new Error('network error')));

    const result = await service.create({ text: 'Bread' });

    expect(result).toBeNull();
    expect(service.mutationError()).toBe(true);
  });

  it('remaps temp ids when flushing offline queue', async () => {
    connectivityMock.online.mockReturnValue(false);
    const created = await service.create({ text: 'Eggs' });
    const tempId = created!.id;
    await service.update(tempId, { text: 'Free-range eggs', baseVersion: 0 });

    const serverItem = {
      ...sampleItem,
      id: 'item-real',
      text: 'Free-range eggs',
      version: 1,
    };
    httpMock.post.mockImplementation((url: string) => {
      if (url.endsWith('/items')) {
        return of({ ...sampleItem, id: 'item-real', text: 'Eggs', version: 0 });
      }
      return of(serverItem);
    });
    httpMock.patch.mockReturnValue(of(serverItem));

    await (
      service as unknown as { flushQueue: () => Promise<void> }
    ).flushQueue();

    expect(httpMock.patch).toHaveBeenCalledWith(
      expect.stringContaining('/items/item-real'),
      expect.objectContaining({ text: 'Free-range eggs' }),
    );
    expect(localStorage.getItem(ITEMS_QUEUE_KEY)).toBe('[]');
  });
});
