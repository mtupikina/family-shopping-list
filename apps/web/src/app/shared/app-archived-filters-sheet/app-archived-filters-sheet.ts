import { Component, inject, input, output } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ArchivedFiltersForm } from '../../types/archivedFilters';
import { ARCHIVED_REJECT_REASON_KEYS, ARCHIVED_STATUS_OPTIONS } from '../../utils/archived.util';
import { ItemStatus } from '../../types/items';

@Component({
  selector: 'app-archived-filters-sheet',
  standalone: true,
  host: { class: 'block h-full' },
  imports: [IonButton, IonContent, IonIcon, IonInput, IonSelect, IonSelectOption, TranslatePipe],
  templateUrl: './app-archived-filters-sheet.html',
})
export class ArchivedFiltersSheetComponent {
  private readonly translate = inject(TranslateService);

  readonly filters = input.required<ArchivedFiltersForm>();
  readonly familyStores = input<string[]>([]);

  readonly filterChange = output<{ key: keyof ArchivedFiltersForm; value: ArchivedFiltersForm[keyof ArchivedFiltersForm] }>();
  readonly applyClick = output<void>();
  readonly clearClick = output<void>();
  readonly dismissClick = output<void>();

  readonly statusOptions = ARCHIVED_STATUS_OPTIONS;
  readonly rejectReasonKeys = ARCHIVED_REJECT_REASON_KEYS;

  constructor() {
    addIcons({ closeOutline });
  }

  rejectReasonLabel(key: string): string {
    return this.translate.instant(key);
  }

  statusLabel(status: ItemStatus): string {
    switch (status) {
      case 'NEW':
        return this.translate.instant('ARCHIVED.FILTERS.STATUS_NEW');
      case 'COMPLETED':
        return this.translate.instant('ARCHIVED.FILTERS.STATUS_COMPLETED');
      case 'REJECTED':
        return this.translate.instant('ARCHIVED.FILTERS.STATUS_REJECTED');
    }
  }

  updateFilter<K extends keyof ArchivedFiltersForm>(key: K, value: ArchivedFiltersForm[K]): void {
    this.filterChange.emit({ key, value });
  }
}
