import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonButton,
  IonContent,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonModal,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, filterOutline } from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ArchivedFiltersForm } from '../../types/archivedFilters';
import {
  EMPTY_ARCHIVED_FILTERS,
  buildArchivedListQuery,
  countActiveFilters,
} from '../../utils/archived.util';
import { ShoppingItem } from '../../types/items';
import { AppHeaderComponent } from '../../shared/app-header/app-header';
import { ArchivedFiltersSheetComponent } from '../../shared/app-archived-filters-sheet/app-archived-filters-sheet';
import { ItemRowComponent } from '../../shared/app-item-row/app-item-row';
import { ItemsService } from '../../services/items.service';

@Component({
  selector: 'app-archived',
  standalone: true,
  imports: [
    IonContent,
    IonSpinner,
    IonList,
    IonButton,
    IonIcon,
    IonModal,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    TranslatePipe,
    AppHeaderComponent,
    ArchivedFiltersSheetComponent,
    ItemRowComponent,
  ],
  templateUrl: './archived.html',
})
export class ArchivedComponent implements OnInit {
  private readonly itemsService = inject(ItemsService);
  private readonly translate = inject(TranslateService);

  readonly items = signal<ShoppingItem[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);
  readonly hasMore = signal(false);
  readonly filters = signal<ArchivedFiltersForm>({ ...EMPTY_ARCHIVED_FILTERS });
  readonly filtersOpen = signal(false);
  readonly familyStores = this.itemsService.familyStores;
  readonly activeFilterCount = computed(() => countActiveFilters(this.filters()));

  private nextCursor: string | null = null;

  constructor() {
    addIcons({ chevronForwardOutline, filterOutline });
  }

  ngOnInit(): void {
    void this.itemsService.loadStores();
    void this.loadInitial();
  }

  translateUnit = (key: string): string => this.translate.instant(key);

  openFilters(): void {
    this.filtersOpen.set(true);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  onFilterChange(event: {
    key: keyof ArchivedFiltersForm;
    value: ArchivedFiltersForm[keyof ArchivedFiltersForm];
  }): void {
    this.filters.update(current => ({ ...current, [event.key]: event.value }));
  }

  applyFilters(): void {
    this.filtersOpen.set(false);
    void this.loadInitial();
  }

  clearFilters(): void {
    this.filters.set({ ...EMPTY_ARCHIVED_FILTERS });
    void this.loadInitial();
  }

  clearFiltersInModal(): void {
    this.filters.set({ ...EMPTY_ARCHIVED_FILTERS });
    this.filtersOpen.set(false);
    void this.loadInitial();
  }

  async loadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.loadNextPage();
    await event.target.complete();
  }

  private async loadInitial(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    this.items.set([]);
    this.nextCursor = null;
    this.hasMore.set(false);

    const page = await this.itemsService.loadArchivedPage(buildArchivedListQuery(this.filters()));
    if (!page) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.items.set(page.items);
    this.nextCursor = page.nextCursor;
    this.hasMore.set(page.nextCursor != null);
    this.loading.set(false);
  }

  private async loadNextPage(): Promise<void> {
    if (!this.hasMore() || this.loadingMore() || this.nextCursor == null) {
      return;
    }

    this.loadingMore.set(true);

    const page = await this.itemsService.loadArchivedPage({
      ...buildArchivedListQuery(this.filters()),
      cursor: this.nextCursor ?? undefined,
    });
    if (!page) {
      this.loadingMore.set(false);
      return;
    }

    this.items.update(list => [...list, ...page.items]);
    this.nextCursor = page.nextCursor;
    this.hasMore.set(page.nextCursor != null);
    this.loadingMore.set(false);
  }
}
