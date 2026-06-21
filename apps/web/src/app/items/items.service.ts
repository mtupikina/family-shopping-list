import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { ConnectivityService } from '../shared/connectivity.service';
import {
  CompleteItemPayload,
  CreateItemPayload,
  ITEMS_CACHE_KEY,
  ITEMS_LAST_UPDATED_KEY,
  ITEMS_QUEUE_KEY,
  QueuedItemAction,
  RejectItemPayload,
  ShoppingItem,
  UpdateItemPayload,
} from './item.types';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly connectivity = inject(ConnectivityService);

  readonly items = signal<ShoppingItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly mutationError = signal(false);
  readonly syncStatus = signal<'unknown' | 'synced' | 'syncing' | 'offline' | 'pending'>('unknown');

  readonly activeItems = computed(() =>
    this.items()
      .filter(item => !item.archived)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );

  readonly archivedItems = computed(() =>
    this.items()
      .filter(item => item.archived)
      .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
  );

  readonly familyStores = signal<string[]>([]);

  private sseAbort: AbortController | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private initialized = false;
  private lastUpdatedAt: string | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => {
      if (this.initialized) {
        void this.onReconnect();
      }
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.loading.set(true);
    this.error.set(false);

    const cached = this.getCachedItems();
    if (cached.length > 0) {
      this.items.set(cached);
    }

    this.lastUpdatedAt = this.getLastUpdatedAt();

    if (!this.connectivity.online()) {
      this.familyStores.set(this.storesFromItems(cached.length > 0 ? cached : this.items()));
      this.syncStatus.set('offline');
      this.loading.set(false);
      return;
    }

    try {
      await this.syncFromServer();
      await this.loadStores();
      this.startRealtime();
    } catch {
      if (cached.length > 0) {
        this.syncStatus.set('pending');
      } else {
        this.error.set(true);
        this.syncStatus.set('pending');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async create(payload: CreateItemPayload): Promise<ShoppingItem | null> {
    if (!this.connectivity.online()) {
      this.clearMutationError();
      const tempItem = this.createOptimisticItem(payload);
      this.mergeItem(tempItem);
      this.enqueue({ type: 'create', tempId: tempItem.id, payload });
      this.syncStatus.set('offline');
      return tempItem;
    }

    try {
      this.clearMutationError();
      const item = await firstValueFrom(
        this.http.post<ShoppingItem>(`${environment.apiBaseUrl}/items`, payload),
      );
      this.mergeItem(item);
      this.touchLastUpdated(item.updatedAt);
      return item;
    } catch {
      return this.failMutation(null);
    }
  }

  async update(id: string, payload: UpdateItemPayload): Promise<ShoppingItem | null> {
    const existing = this.items().find(item => item.id === id);
    const payloadWithVersion = {
      ...payload,
      baseVersion: payload.baseVersion ?? existing?.version,
    };

    if (!this.connectivity.online()) {
      this.clearMutationError();
      if (existing) {
        this.mergeItem(this.applyLocalUpdate(existing, payloadWithVersion));
      }
      this.enqueue({ type: 'update', id, payload: payloadWithVersion });
      this.syncStatus.set('offline');
      return this.items().find(item => item.id === id) ?? null;
    }

    try {
      this.clearMutationError();
      const item = await firstValueFrom(
        this.http.patch<ShoppingItem>(`${environment.apiBaseUrl}/items/${id}`, payloadWithVersion),
      );
      this.mergeItem(item);
      this.touchLastUpdated(item.updatedAt);
      return item;
    } catch {
      return this.failMutation(null);
    }
  }

  async reject(id: string, payload: RejectItemPayload = {}): Promise<ShoppingItem | null> {
    if (!this.connectivity.online()) {
      this.clearMutationError();
      this.applyLocalReject(id, payload);
      this.enqueue({ type: 'reject', id, payload });
      this.syncStatus.set('offline');
      return this.items().find(item => item.id === id) ?? null;
    }

    try {
      this.clearMutationError();
      const item = await firstValueFrom(
        this.http.post<ShoppingItem>(`${environment.apiBaseUrl}/items/${id}/reject`, payload),
      );
      this.mergeItem(item);
      this.touchLastUpdated(item.updatedAt);
      return item;
    } catch {
      return this.failMutation(null);
    }
  }

  async complete(id: string, payload: CompleteItemPayload = {}): Promise<ShoppingItem | null> {
    if (!this.connectivity.online()) {
      this.clearMutationError();
      this.applyLocalComplete(id, payload);
      this.enqueue({ type: 'complete', id, payload });
      this.syncStatus.set('offline');
      return this.items().find(item => item.id === id) ?? null;
    }

    try {
      this.clearMutationError();
      const item = await firstValueFrom(
        this.http.post<ShoppingItem>(`${environment.apiBaseUrl}/items/${id}/complete`, payload),
      );
      this.mergeItem(item);
      this.touchLastUpdated(item.updatedAt);
      return item;
    } catch {
      return this.failMutation(null);
    }
  }

  async archive(id: string): Promise<ShoppingItem | null> {
    const items = await this.archiveMany([id]);
    return items[0] ?? null;
  }

  async archiveMany(ids: string[]): Promise<ShoppingItem[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }

    if (!this.connectivity.online()) {
      this.clearMutationError();
      for (const id of uniqueIds) {
        this.applyLocalArchive(id);
      }
      this.enqueue({ type: 'archiveMany', ids: uniqueIds });
      this.syncStatus.set('offline');
      return uniqueIds
        .map(id => this.items().find(item => item.id === id))
        .filter((item): item is ShoppingItem => item != null);
    }

    try {
      this.clearMutationError();
      const items = await firstValueFrom(
        this.http.post<ShoppingItem[]>(`${environment.apiBaseUrl}/items/archive`, {
          ids: uniqueIds,
        }),
      );
      for (const item of items) {
        this.mergeItem(item);
        this.touchLastUpdated(item.updatedAt);
      }
      return items;
    } catch {
      return this.failMutation([]);
    }
  }

  async unarchive(id: string): Promise<ShoppingItem | null> {
    if (!this.connectivity.online()) {
      this.clearMutationError();
      this.applyLocalUnarchive(id);
      this.enqueue({ type: 'unarchive', id });
      this.syncStatus.set('offline');
      return this.items().find(item => item.id === id) ?? null;
    }

    try {
      this.clearMutationError();
      const item = await firstValueFrom(
        this.http.post<ShoppingItem>(`${environment.apiBaseUrl}/items/${id}/unarchive`, {}),
      );
      this.mergeItem(item);
      this.touchLastUpdated(item.updatedAt);
      return item;
    } catch {
      return this.failMutation(null);
    }
  }

  findDuplicate(text: string): ShoppingItem | undefined {
    const normalized = text.trim().toLowerCase();
    return this.activeItems().find(
      item => item.status === 'NEW' && item.text.trim().toLowerCase() === normalized,
    );
  }

  mergeItem(item: ShoppingItem): void {
    this.items.update(list => {
      const index = list.findIndex(existing => existing.id === item.id);
      if (index === -1) {
        return [item, ...list];
      }
      const next = [...list];
      next[index] = item;
      return next;
    });
    this.cacheItems(this.items());
    if (item.store) {
      this.addStoreToList(item.store);
    }
    if (this.lastUpdatedAt == null || item.updatedAt > this.lastUpdatedAt) {
      this.touchLastUpdated(item.updatedAt);
    }
  }

  async loadStores(): Promise<void> {
    if (!this.connectivity.online()) {
      this.familyStores.set(this.storesFromItems(this.items()));
      return;
    }

    try {
      const stores = await firstValueFrom(
        this.http.get<string[]>(`${environment.apiBaseUrl}/items/stores`),
      );
      this.familyStores.set(stores);
    } catch {
      this.familyStores.set(this.storesFromItems(this.items()));
    }
  }

  private addStoreToList(store: string): void {
    const trimmed = store.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (this.familyStores().some(existing => existing.toLowerCase() === key)) {
      return;
    }
    this.familyStores.update(stores => [trimmed, ...stores]);
  }

  private storesFromItems(items: ShoppingItem[]): string[] {
    const seen = new Set<string>();
    const stores: string[] = [];
    const sorted = [...items]
      .filter(item => item.store)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

    for (const item of sorted) {
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

  destroy(): void {
    this.stopRealtime();
    this.initialized = false;
  }

  private async onReconnect(): Promise<void> {
    this.syncStatus.set('syncing');
    try {
      await this.flushQueue();
      await this.syncFromServer(true);
      await this.loadStores();
      this.startRealtime();
      this.syncStatus.set('synced');
    } catch {
      this.syncStatus.set('pending');
      this.startPollingFallback();
    }
  }

  private async syncFromServer(delta = false): Promise<void> {
    this.syncStatus.set('syncing');

    const params: Record<string, string> = { includeArchived: 'true' };
    if (delta && this.lastUpdatedAt) {
      params['updatedSince'] = this.lastUpdatedAt;
    }

    const fetched = await firstValueFrom(
      this.http.get<ShoppingItem[]>(`${environment.apiBaseUrl}/items`, { params }),
    );

    if (delta && this.lastUpdatedAt) {
      for (const item of fetched) {
        this.mergeItem(item);
      }
    } else {
      this.items.set(fetched);
      this.cacheItems(fetched);
      const latest = fetched.reduce<string | null>(
        (max, item) => (max == null || item.updatedAt > max ? item.updatedAt : max),
        null,
      );
      if (latest) {
        this.touchLastUpdated(latest);
      }
    }

    this.syncStatus.set('synced');
  }

  private async flushQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) {
      return;
    }

    const remaining: QueuedItemAction[] = [];
    const idMap = new Map<string, string>();

    for (const action of queue) {
      const remapped = this.remapQueuedAction(action, idMap);

      try {
        if (remapped.type === 'create') {
          const item = await firstValueFrom(
            this.http.post<ShoppingItem>(`${environment.apiBaseUrl}/items`, remapped.payload),
          );
          idMap.set(remapped.tempId, item.id);
          this.items.update(list => list.filter(existing => existing.id !== remapped.tempId));
          this.mergeItem(item);
        } else if (remapped.type === 'update') {
          const item = await firstValueFrom(
            this.http.patch<ShoppingItem>(
              `${environment.apiBaseUrl}/items/${remapped.id}`,
              remapped.payload,
            ),
          );
          this.mergeItem(item);
        } else if (remapped.type === 'reject') {
          const item = await firstValueFrom(
            this.http.post<ShoppingItem>(
              `${environment.apiBaseUrl}/items/${remapped.id}/reject`,
              remapped.payload,
            ),
          );
          this.mergeItem(item);
        } else if (remapped.type === 'complete') {
          const item = await firstValueFrom(
            this.http.post<ShoppingItem>(
              `${environment.apiBaseUrl}/items/${remapped.id}/complete`,
              remapped.payload,
            ),
          );
          this.mergeItem(item);
        } else if (remapped.type === 'archive') {
          // Legacy queue entries from before batch archive.
          const items = await firstValueFrom(
            this.http.post<ShoppingItem[]>(`${environment.apiBaseUrl}/items/archive`, {
              ids: [remapped.id],
            }),
          );
          for (const item of items) {
            this.mergeItem(item);
          }
        } else if (remapped.type === 'archiveMany') {
          const items = await firstValueFrom(
            this.http.post<ShoppingItem[]>(`${environment.apiBaseUrl}/items/archive`, {
              ids: remapped.ids,
            }),
          );
          for (const item of items) {
            this.mergeItem(item);
          }
        } else if (remapped.type === 'unarchive') {
          const item = await firstValueFrom(
            this.http.post<ShoppingItem>(
              `${environment.apiBaseUrl}/items/${remapped.id}/unarchive`,
              {},
            ),
          );
          this.mergeItem(item);
        }
      } catch {
        remaining.push(remapped);
      }
    }

    this.saveQueue(remaining);
  }

  private remapQueuedAction(
    action: QueuedItemAction,
    idMap: Map<string, string>,
  ): QueuedItemAction {
    const remap = (id: string) => idMap.get(id) ?? id;

    switch (action.type) {
      case 'create':
        return action;
      case 'update':
        return { ...action, id: remap(action.id) };
      case 'reject':
      case 'complete':
      case 'unarchive':
        return { ...action, id: remap(action.id) };
      case 'archive':
        return { ...action, id: remap(action.id) };
      case 'archiveMany':
        return { ...action, ids: action.ids.map(remap) };
    }
  }

  private clearMutationError(): void {
    this.mutationError.set(false);
  }

  private failMutation<T>(value: T): T {
    this.mutationError.set(true);
    this.syncStatus.set('pending');
    return value;
  }

  private startRealtime(): void {
    this.stopPollingFallback();
    void this.connectSse();
  }

  private stopRealtime(): void {
    this.sseAbort?.abort();
    this.sseAbort = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPollingFallback();
  }

  private async connectSse(): Promise<void> {
    const token = this.auth.accessToken;
    if (!token || !this.connectivity.online()) {
      this.startPollingFallback();
      return;
    }

    this.sseAbort?.abort();
    const abort = new AbortController();
    this.sseAbort = abort;

    try {
      if (this.lastUpdatedAt) {
        await this.syncFromServer(true);
      }

      const response = await fetch(`${environment.apiBaseUrl}/items/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('SSE connection failed');
      }

      this.reconnectAttempt = 0;
      this.syncStatus.set('synced');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const item = this.parseSseChunk(chunk);
          if (item) {
            this.mergeItem(item);
          }
        }
      }

      if (!abort.signal.aborted) {
        this.scheduleReconnect();
      }
    } catch {
      if (!abort.signal.aborted) {
        this.startPollingFallback();
        this.scheduleReconnect();
      }
    }
  }

  private parseSseChunk(chunk: string): ShoppingItem | null {
    const lines = chunk.split('\n');
    let dataLine = '';

    for (const line of lines) {
      if (line.startsWith('data:')) {
        dataLine += line.slice(5).trim();
      }
    }

    if (!dataLine) {
      return null;
    }

    try {
      return JSON.parse(dataLine) as ShoppingItem;
    } catch {
      return null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectSse();
    }, delay);
  }

  private startPollingFallback(): void {
    if (this.pollTimer) {
      return;
    }

    this.pollTimer = setInterval(() => {
      if (this.connectivity.online()) {
        void this.syncFromServer(true).catch(() => this.syncStatus.set('pending'));
      }
    }, 12_000);
  }

  private stopPollingFallback(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private enqueue(action: QueuedItemAction): void {
    const queue = this.getQueue();
    queue.push(action);
    this.saveQueue(queue);
    this.cacheItems(this.items());
  }

  private getQueue(): QueuedItemAction[] {
    try {
      const raw = localStorage.getItem(ITEMS_QUEUE_KEY);
      return raw ? (JSON.parse(raw) as QueuedItemAction[]) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedItemAction[]): void {
    try {
      localStorage.setItem(ITEMS_QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // localStorage unavailable
    }
  }

  private getCachedItems(): ShoppingItem[] {
    try {
      const raw = localStorage.getItem(ITEMS_CACHE_KEY);
      return raw ? (JSON.parse(raw) as ShoppingItem[]) : [];
    } catch {
      return [];
    }
  }

  private cacheItems(items: ShoppingItem[]): void {
    try {
      localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(items));
    } catch {
      // localStorage unavailable
    }
  }

  private getLastUpdatedAt(): string | null {
    try {
      return localStorage.getItem(ITEMS_LAST_UPDATED_KEY);
    } catch {
      return null;
    }
  }

  private touchLastUpdated(updatedAt: string): void {
    this.lastUpdatedAt = updatedAt;
    try {
      localStorage.setItem(ITEMS_LAST_UPDATED_KEY, updatedAt);
    } catch {
      // localStorage unavailable
    }
  }

  private createOptimisticItem(payload: CreateItemPayload): ShoppingItem {
    const now = new Date().toISOString();
    return {
      id: `temp-${crypto.randomUUID()}`,
      familyId: '',
      text: payload.text.trim(),
      quantity: payload.quantity?.toString() ?? null,
      unit: payload.unit?.trim() ?? null,
      category: payload.category?.trim() ?? null,
      status: 'NEW',
      archived: false,
      archivedAt: null,
      createdBy: { id: 'local', username: 'You' },
      rejectedBy: null,
      rejectReason: null,
      rejectedAt: null,
      completedBy: null,
      price: null,
      store: null,
      completedAt: null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  private applyLocalUpdate(existing: ShoppingItem, payload: UpdateItemPayload): ShoppingItem {
    const now = new Date().toISOString();
    const quantity =
      payload.quantity === undefined
        ? existing.quantity
        : payload.quantity == null
          ? null
          : String(payload.quantity);

    let unit = payload.unit === undefined ? existing.unit : payload.unit;
    if (quantity == null) {
      unit = null;
    }

    return {
      ...existing,
      text: payload.text?.trim() ?? existing.text,
      quantity,
      unit,
      category: payload.category === undefined ? existing.category : payload.category,
      version: existing.version + 1,
      updatedAt: now,
    };
  }

  private applyLocalReject(id: string, payload: RejectItemPayload): void {
    const existing = this.items().find(item => item.id === id);
    if (!existing || existing.rejectedAt) {
      return;
    }

    const now = new Date().toISOString();
    this.mergeItem({
      ...existing,
      status: 'REJECTED',
      rejectedBy: { id: 'local', username: 'You' },
      rejectReason: payload.rejectReason?.trim() ?? null,
      rejectedAt: now,
      version: existing.version + 1,
      updatedAt: now,
    });
  }

  private applyLocalComplete(id: string, payload: CompleteItemPayload): void {
    const existing = this.items().find(item => item.id === id);
    if (!existing || existing.completedAt) {
      return;
    }

    const now = new Date().toISOString();
    this.mergeItem({
      ...existing,
      status: 'COMPLETED',
      completedBy: { id: 'local', username: 'You' },
      price: payload.price?.toString() ?? null,
      store: payload.store?.trim() ?? null,
      completedAt: now,
      version: existing.version + 1,
      updatedAt: now,
    });
  }

  private applyLocalArchive(id: string): void {
    const existing = this.items().find(item => item.id === id);
    if (!existing || existing.archived) {
      return;
    }

    const now = new Date().toISOString();
    this.mergeItem({
      ...existing,
      archived: true,
      archivedAt: now,
      version: existing.version + 1,
      updatedAt: now,
    });
  }

  private applyLocalUnarchive(id: string): void {
    const existing = this.items().find(item => item.id === id);
    if (!existing || !existing.archived) {
      return;
    }

    const now = new Date().toISOString();
    this.mergeItem({
      ...existing,
      archived: false,
      archivedAt: null,
      version: existing.version + 1,
      updatedAt: now,
    });
  }
}
