import { Component, computed, input, output } from '@angular/core';
import { IonButton, IonCheckbox, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle, closeCircle, ellipseOutline, ellipsisHorizontal } from 'ionicons/icons';

import {
  canCompleteItem,
  itemMeta,
  itemStatusClass,
  itemTitle,
} from '../../utils/item-display.util';
import { ShoppingItem } from '../../types/items';

@Component({
  selector: 'app-item-row',
  standalone: true,
  imports: [IonItem, IonLabel, IonButton, IonIcon, IonCheckbox],
  templateUrl: './app-item-row.html',
})
export class ItemRowComponent {
  readonly item = input.required<ShoppingItem>();
  readonly archiveMode = input(false);
  readonly selected = input(false);
  readonly translateUnit = input.required<(key: string) => string>();

  readonly rowClick = output<void>();
  readonly completeClick = output<void>();
  readonly editClick = output<void>();
  readonly selectionChange = output<boolean>();

  readonly title = computed(() => itemTitle(this.item(), this.translateUnit()));
  readonly meta = computed(() => itemMeta(this.item()));
  readonly titleClass = computed(() => itemStatusClass(this.item()));
  readonly canComplete = computed(() => canCompleteItem(this.item()));

  constructor() {
    addIcons({ checkmarkCircle, closeCircle, ellipseOutline, ellipsisHorizontal });
  }

  statusIcon(): string {
    const item = this.item();
    if (item.status === 'COMPLETED') {
      return 'checkmark-circle';
    }
    if (item.status === 'REJECTED') {
      return 'close-circle';
    }
    return 'ellipse-outline';
  }

  statusIconClass(): string {
    const item = this.item();
    const base = 'text-[1.375rem]';
    if (item.status === 'COMPLETED') {
      return `${base} text-green-500`;
    }
    if (item.status === 'REJECTED') {
      return `${base} text-red-400`;
    }
    return `${base} text-gray-300`;
  }

  onRowClick(): void {
    if (!this.archiveMode()) {
      this.rowClick.emit();
    }
  }

  onComplete(event: Event): void {
    event.stopPropagation();
    if (this.canComplete()) {
      this.completeClick.emit();
    }
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.editClick.emit();
  }

  onSelect(checked: boolean): void {
    this.selectionChange.emit(checked);
  }
}
