import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-auth-verify',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonText,
    TranslatePipe,
  ],
  templateUrl: './auth-verify.html',
  styleUrl: './auth-verify.scss',
})
export class AuthVerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.loading.set(false);
      this.error.set('VERIFY.ERROR');
      return;
    }

    void this.verify(token);
  }

  private async verify(token: string): Promise<void> {
    try {
      const response = await this.auth.verifyMagicLink(token);
      await this.router.navigateByUrl(response.needsOnboarding ? this.auth.getOnboardingPath() : '/');
    } catch {
      this.loading.set(false);
      this.error.set('VERIFY.ERROR');
    }
  }
}
