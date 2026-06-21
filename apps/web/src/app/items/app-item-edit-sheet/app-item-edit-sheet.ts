import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonInput,
  IonList,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { CURRENCY_SYMBOL } from '../currency';
import {
  canRejectItem,
  coerceFormString,
  defaultUnitForItem,
} from '../item-display.util';
import { ItemSheetFormValues, ItemSheetMode } from '../item-sheet.types';
import { DEFAULT_ITEM_UNIT, ITEM_UNITS, unitLabelKey } from '../item-units';
import { ShoppingItem } from '../item.types';
import { RejectReasonFieldComponent } from '../app-reject-reason-field/app-reject-reason-field';
import { StoreFieldComponent } from '../app-store-field/app-store-field';

@Component({
  selector: 'app-item-edit-sheet',
  standalone: true,
  imports: [
    FormsModule,
    IonButton,
    IonInput,
    IonList,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
    RejectReasonFieldComponent,
    StoreFieldComponent,
  ],
  templateUrl: './app-item-edit-sheet.html',
})
export class ItemEditSheetComponent {
  readonly item = input<ShoppingItem | null>(null);
  readonly mode = input<ItemSheetMode>('edit');
  readonly familyStores = input<string[]>([]);

  readonly text = signal('');
  readonly quantity = signal('');
  readonly unit = signal('');
  readonly price = signal('');
  readonly store = signal('');
  readonly rejectReason = signal('');

  readonly saveClick = output<ItemSheetFormValues>();
  readonly dismissClick = output<void>();
  readonly rejectClick = output<void>();

  readonly itemUnits = ITEM_UNITS;
  readonly unitLabelKey = unitLabelKey;
  readonly currencySymbol = CURRENCY_SYMBOL;

  readonly rejectReasonKeys = [
    'ITEMS.REJECT_REASONS.TOO_EXPENSIVE',
    'ITEMS.REJECT_REASONS.OUT_OF_STOCK',
    'ITEMS.REJECT_REASONS.NOT_NEEDED',
    'ITEMS.REJECT_REASONS.GOT_ELSEWHERE',
  ];

  constructor() {
    effect(() => {
      const item = this.item();
      if (!item) {
        return;
      }

      this.text.set(item.text);
      this.quantity.set(item.quantity ?? '');
      this.unit.set(item.quantity ? defaultUnitForItem(item) : (item.unit ?? ''));
      this.price.set(item.price ?? '');
      this.store.set(item.store ?? '');
      this.rejectReason.set(item.rejectReason ?? '');
    });
  }

  canRejectItem(): boolean {
    const item = this.item();
    return item != null && canRejectItem(item);
  }

  onSave(): void {
    this.saveClick.emit({
      text: this.text(),
      quantity: coerceFormString(this.quantity()),
      unit: this.unit(),
      price: coerceFormString(this.price()),
      store: this.store(),
      rejectReason: this.rejectReason(),
    });
  }

  onQuantityChange(value: unknown): void {
    const text = coerceFormString(value);
    this.quantity.set(text);
    if (text.trim() && !this.unit()) {
      this.unit.set(DEFAULT_ITEM_UNIT);
    }
  }

  onPriceChange(value: unknown): void {
    this.price.set(coerceFormString(value));
  }
}
