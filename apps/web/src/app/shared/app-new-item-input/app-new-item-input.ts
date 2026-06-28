import { Component, inject, input, OnDestroy, output, signal } from '@angular/core';
import { IonChip, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ItemsService } from '../../services/items.service';

@Component({
  selector: 'app-new-item-input',
  standalone: true,
  imports: [IonChip, IonInput, TranslatePipe],
  templateUrl: './app-new-item-input.html',
})
export class NewItemInputComponent implements OnDestroy {
  private readonly itemsService = inject(ItemsService);

  readonly value = input.required<string>();
  readonly valueChange = output<string>();
  readonly enter = output<void>();

  readonly focused = signal(false);
  readonly suggestions = signal<string[]>([]);

  private suggestTimer: ReturnType<typeof setTimeout> | null = null;
  private suggestRequestId = 0;

  ngOnDestroy(): void {
    if (this.suggestTimer) {
      clearTimeout(this.suggestTimer);
    }
  }

  onInput(value: string): void {
    this.valueChange.emit(value);
    this.scheduleSuggestions(value);
  }

  pick(text: string): void {
    this.valueChange.emit(text);
    this.suggestions.set([]);
    this.focused.set(false);
  }

  onBlur(): void {
    setTimeout(() => {
      this.focused.set(false);
      this.suggestions.set([]);
    }, 150);
  }

  private scheduleSuggestions(value: string): void {
    if (this.suggestTimer) {
      clearTimeout(this.suggestTimer);
    }

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      this.suggestions.set([]);
      return;
    }

    this.suggestTimer = setTimeout(() => {
      void this.loadSuggestions(trimmed);
    }, 200);
  }

  private async loadSuggestions(query: string): Promise<void> {
    const requestId = ++this.suggestRequestId;
    const results = await this.itemsService.suggestItemTexts(query);

    if (requestId !== this.suggestRequestId || query !== this.value().trim()) {
      return;
    }

    this.suggestions.set(results);
  }
}
