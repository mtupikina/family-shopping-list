import { Component, computed, input, output, signal } from '@angular/core';
import { IonChip, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-store-field',
  standalone: true,
  imports: [IonChip, IonInput, TranslatePipe],
  templateUrl: './app-store-field.html',
})
export class StoreFieldComponent {
  readonly value = input.required<string>();
  readonly stores = input<string[]>([]);
  readonly valueChange = output<string>();

  readonly focused = signal(false);

  readonly suggestions = computed(() => {
    const query = this.value().trim().toLowerCase();
    const stores = this.stores();
    const filtered = query
      ? stores.filter(store => store.toLowerCase().includes(query))
      : stores;
    return filtered.filter(store => store !== this.value()).slice(0, 8);
  });

  onInput(value: string): void {
    this.valueChange.emit(value);
  }

  pick(store: string): void {
    this.valueChange.emit(store);
    this.focused.set(false);
  }

  onBlur(): void {
    setTimeout(() => this.focused.set(false), 150);
  }
}
