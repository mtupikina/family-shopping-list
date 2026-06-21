import { Component, input, output } from '@angular/core';
import { IonIcon, IonList } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';
import { ItemRowComponent } from '../app-item-row/app-item-row';
import { ShoppingItem } from '../item.types';

@Component({
  selector: 'app-item-section',
  standalone: true,
  imports: [IonIcon, IonList, TranslatePipe, ItemRowComponent],
  templateUrl: './app-item-section.html',
})
export class ItemSectionComponent {
  readonly items = input.required<ShoppingItem[]>();
  readonly titleKey = input.required<string>();
  readonly titleParams = input<Record<string, string | number>>({});
  readonly collapsible = input(false);
  readonly expanded = input(true);
  readonly archiveMode = input(false);
  readonly selectedIds = input<Set<string>>(new Set());
  readonly translateUnit = input.required<(key: string) => string>();

  readonly sectionToggle = output<void>();
  readonly completeClick = output<ShoppingItem>();
  readonly editClick = output<ShoppingItem>();
  readonly selectionChange = output<{ id: string; selected: boolean }>();

  constructor() {
    addIcons({ chevronDownOutline, chevronUpOutline });
  }
}
