import { Component, computed, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonModal,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  archiveOutline,
  checkmarkCircle,
  chevronDownOutline,
  chevronUpOutline,
  closeCircle,
  ellipseOutline,
  ellipsisHorizontal,
} from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { MemberContextService } from '../../services/member-context.service';
import { MemberContext } from '../../auth/auth.types';
import { AppHeaderComponent } from '../../shared/app-header/app-header';
import { ItemsService } from '../../services/items.service';
import { ShoppingItem } from '../../types/items';
import { groupActiveItems, parseOptionalNumber } from '../../utils/item-display.util';
import { ItemEditSheetComponent } from '../../shared/app-item-edit-sheet/app-item-edit-sheet';
import { ItemSectionComponent } from '../../shared/app-item-section/app-item-section';
import { NewItemInputComponent } from '../../shared/app-new-item-input/app-new-item-input';
import { ItemSheetFormValues, ItemSheetMode } from '../../types/itemSheet';
import { DEFAULT_ITEM_UNIT } from '../../types/units';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonSpinner,
    IonButton,
    IonIcon,
    IonModal,
    TranslatePipe,
    AppHeaderComponent,
    ItemSectionComponent,
    ItemEditSheetComponent,
    NewItemInputComponent,
  ],
  templateUrl: './home.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly memberContextService = inject(MemberContextService);
  private readonly itemsService = inject(ItemsService);
  private readonly translate = inject(TranslateService);

  readonly context = signal<MemberContext | null>(null);
  readonly contextLoading = signal(true);
  readonly contextError = signal(false);

  readonly items = this.itemsService.activeItems;
  readonly familyStores = this.itemsService.familyStores;
  readonly itemsLoading = this.itemsService.loading;
  readonly itemsError = this.itemsService.error;

  readonly groupedItems = computed(() => groupActiveItems(this.items()));
  readonly pageLoading = computed(() => this.contextLoading() || this.itemsLoading());
  readonly pageError = computed(() => this.contextError() || this.itemsError());
  readonly hasItems = computed(() => this.items().length > 0);

  readonly newText = signal('');
  readonly duplicateWarning = signal<string | null>(null);

  readonly sheetOpen = signal(false);
  readonly sheetMode = signal<ItemSheetMode>('edit');
  readonly sheetItem = signal<ShoppingItem | null>(null);

  readonly archiveMode = signal(false);
  readonly selectedArchiveIds = signal<Set<string>>(new Set());
  readonly showDoneSection = signal(true);
  readonly showRejectedSection = signal(false);

  constructor() {
    addIcons({
      addOutline,
      archiveOutline,
      checkmarkCircle,
      closeCircle,
      ellipseOutline,
      ellipsisHorizontal,
      chevronDownOutline,
      chevronUpOutline,
    });
  }

  ngOnInit(): void {
    this.memberContextService.loadContext().subscribe({
      next: ctx => {
        this.context.set(ctx);
        this.contextLoading.set(false);
        void this.itemsService.initialize();
      },
      error: () => {
        this.contextError.set(true);
        this.contextLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.itemsService.destroy();
  }

  translateUnit = (key: string): string => this.translate.instant(key);

  onNewTextChange(value: string): void {
    this.newText.set(value);
    const duplicate = this.itemsService.findDuplicate(value);
    this.duplicateWarning.set(duplicate ? duplicate.text : null);
  }

  async addItem(): Promise<void> {
    const text = this.newText().trim();
    if (!text) {
      return;
    }

    const created = await this.itemsService.create({ text });
    if (!created) {
      return;
    }

    this.newText.set('');
    this.duplicateWarning.set(null);
  }

  openSheet(item: ShoppingItem, mode: ItemSheetMode): void {
    this.sheetItem.set(item);
    this.sheetMode.set(mode);
    this.sheetOpen.set(true);
  }

  openEditSheet(item: ShoppingItem): void {
    this.openSheet(item, 'edit');
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
    this.sheetItem.set(null);
  }

  async completeItem(item: ShoppingItem): Promise<void> {
    if (item.status !== 'NEW') {
      return;
    }

    const completed = await this.itemsService.complete(item.id);
    if (!completed) {
      return;
    }

    const updated = this.items().find(i => i.id === item.id) ?? { ...item, status: 'COMPLETED' as const };
    this.openSheet(updated, 'complete');
  }

  async saveSheet(form: ItemSheetFormValues): Promise<void> {
    const item = this.sheetItem();
    if (!item) {
      return;
    }

    switch (this.sheetMode()) {
      case 'edit':
        await this.saveEditSheet(item, form);
        break;
      case 'complete':
        await this.saveCompleteSheet(item, form);
        break;
      case 'reject':
        await this.saveRejectSheet(item, form);
        break;
    }
  }

  private async saveEditSheet(item: ShoppingItem, form: ItemSheetFormValues): Promise<void> {
    const text = form.text.trim();
    if (!text) {
      return;
    }

    const quantity = parseOptionalNumber(form.quantity);
    const unit = quantity != null ? form.unit || DEFAULT_ITEM_UNIT : null;

    const updated = await this.itemsService.update(item.id, {
      text,
      quantity: quantity ?? null,
      unit,
      baseVersion: item.version,
    });
    if (!updated) {
      return;
    }

    if (item.status === 'REJECTED') {
      const rejected = await this.itemsService.reject(item.id, {
        rejectReason: form.rejectReason.trim() || null,
      });
      if (!rejected) {
        return;
      }
    }

    if (item.status === 'COMPLETED') {
      const saved = await this.saveCompletionDetails(item, form.price, form.store);
      if (!saved) {
        return;
      }
    }

    this.closeSheet();
  }

  private async saveCompleteSheet(item: ShoppingItem, form: ItemSheetFormValues): Promise<void> {
    const saved = await this.saveCompletionDetails(item, form.price, form.store);
    if (!saved) {
      return;
    }

    this.closeSheet();
  }

  private async saveRejectSheet(item: ShoppingItem, form: ItemSheetFormValues): Promise<void> {
    const rejected = await this.itemsService.reject(item.id, {
      rejectReason: form.rejectReason.trim() || null,
    });
    if (!rejected) {
      return;
    }

    this.closeSheet();
  }

  async rejectFromSheet(): Promise<void> {
    const item = this.sheetItem();
    if (!item || item.status !== 'NEW') {
      return;
    }

    const rejected = await this.itemsService.reject(item.id);
    if (!rejected) {
      return;
    }

    const updated = this.items().find(i => i.id === item.id) ?? { ...item, status: 'REJECTED' as const };
    this.sheetItem.set(updated);
    this.sheetMode.set('reject');
  }

  private async saveCompletionDetails(
    item: ShoppingItem,
    priceValue: string,
    storeValue: string,
  ): Promise<boolean> {
    const priceStr = priceValue.trim();
    const store = storeValue.trim();

    const completed = await this.itemsService.complete(item.id, {
      price: priceStr === '' ? null : (parseOptionalNumber(priceStr) ?? null),
      store: store || null,
    });
    return completed != null;
  }

  toggleArchiveMode(): void {
    const next = !this.archiveMode();
    this.archiveMode.set(next);
    if (!next) {
      this.selectedArchiveIds.set(new Set());
    }
  }

  toggleArchiveSelection(id: string, checked: boolean): void {
    const next = new Set(this.selectedArchiveIds());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedArchiveIds.set(next);
  }

  onArchiveSelection(event: { id: string; selected: boolean }): void {
    this.toggleArchiveSelection(event.id, event.selected);
  }

  async archiveSelected(): Promise<void> {
    const ids = [...this.selectedArchiveIds()];
    if (ids.length === 0) {
      return;
    }

    const archived = await this.itemsService.archiveMany(ids);
    if (archived.length === 0) {
      return;
    }

    this.selectedArchiveIds.set(new Set());
    this.archiveMode.set(false);
  }

  toggleDoneSection(): void {
    this.showDoneSection.update(v => !v);
  }

  toggleRejectedSection(): void {
    this.showRejectedSection.update(v => !v);
  }
}
