import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AuthTokensResponse } from '../auth/auth.types';

@Component({
  selector: 'app-onboarding-family',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    TranslatePipe,
  ],
  templateUrl: './onboarding-family.html',
  styleUrl: './onboarding-family.scss',
})
export class OnboardingFamilyComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    familyName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [Validators.required, Validators.minLength(2)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<AuthTokensResponse>(`${environment.apiBaseUrl}/onboarding/family`, {
          familyName: this.form.controls.familyName.value,
          username: this.form.controls.username.value,
        }),
      );
      this.auth.setSession(response);
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('ONBOARDING.ERROR');
    } finally {
      this.loading.set(false);
    }
  }
}
