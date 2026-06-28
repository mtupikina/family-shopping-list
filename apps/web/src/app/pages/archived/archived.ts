import { Component, OnInit, inject, signal } from '@angular/core';
import {
  InfiniteScrollCustomEvent,
  IonContent,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppHeaderComponent } from '../../shared/app-header/app-header';
import { ItemRowComponent } from '../../shared/app-item-row/app-item-row';
import { ItemsService } from '../../services/items.service';
import { ShoppingItem } from '../../types/items';

@Component({
  selector: 'app-archived',
  standalone: true,
  imports: [
    IonContent,
    IonSpinner,
    IonList,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    TranslatePipe,
    AppHeaderComponent,
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

  private nextCursor: string | null = null;

  ngOnInit(): void {
    void this.loadInitial();
  }

  translateUnit = (key: string): string => this.translate.instant(key);

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

    const page = await this.itemsService.loadArchivedPage();
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
