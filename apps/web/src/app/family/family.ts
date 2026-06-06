import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { AppHeaderComponent } from '../shared/app-header/app-header';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    TranslatePipe,
    AppHeaderComponent,
  ],
  templateUrl: './family.html',
})
export class FamilyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly successEmail = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value;
    this.loading.set(true);
    this.error.set(null);
    this.successEmail.set(null);

    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/family/invites`, { email }),
      );
      this.successEmail.set(email);
      this.form.reset();
    } catch (err) {
      this.error.set(this.mapError(err));
    } finally {
      this.loading.set(false);
    }
  }

  private mapError(err: unknown): string {
    if (!(err instanceof HttpErrorResponse)) {
      return 'FAMILY.ERROR_GENERIC';
    }

    const message = typeof err.error?.message === 'string' ? err.error.message : '';

    if (message.includes('already a member')) {
      return 'FAMILY.ERROR_ALREADY_MEMBER';
    }

    if (message.includes('active invite')) {
      return 'FAMILY.ERROR_PENDING_INVITE';
    }

    return 'FAMILY.ERROR_GENERIC';
  }
}
