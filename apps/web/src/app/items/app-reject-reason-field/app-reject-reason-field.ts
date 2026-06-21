import { Component, computed, inject, input, output, signal } from '@angular/core';
import { IonChip, IonTextarea } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-reject-reason-field',
  standalone: true,
  imports: [IonChip, IonTextarea, TranslatePipe],
  templateUrl: './app-reject-reason-field.html',
})
export class RejectReasonFieldComponent {
  private readonly translate = inject(TranslateService);

  readonly value = input.required<string>();
  readonly presetKeys = input<string[]>([]);
  readonly valueChange = output<string>();

  readonly focused = signal(false);

  readonly suggestions = computed(() => {
    const current = this.value().trim();
    return this.presetKeys()
      .map(key => ({ key, label: this.translate.instant(key) }))
      .filter(({ label }) => label !== current);
  });

  onInput(value: string): void {
    this.valueChange.emit(value);
  }

  pick(label: string): void {
    this.valueChange.emit(label);
    this.focused.set(false);
  }

  onBlur(): void {
    setTimeout(() => this.focused.set(false), 150);
  }
}
