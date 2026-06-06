import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
import { AuthService } from '../auth/auth.service';
import { AuthTokensResponse } from '../auth/auth.types';
import { AppHeaderComponent } from '../shared/app-header/app-header';

@Component({
  selector: 'app-onboarding-join',
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
  templateUrl: './onboarding-join.html',
})
export class OnboardingJoinComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
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
        this.http.post<AuthTokensResponse>(`${environment.apiBaseUrl}/onboarding/join`, {
          username: this.form.controls.username.value,
        }),
      );
      this.auth.setSession(response);
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('ONBOARDING_JOIN.ERROR');
    } finally {
      this.loading.set(false);
    }
  }
}
