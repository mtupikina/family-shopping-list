import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IonContent,
  IonButton,
  IonText,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AppHeaderComponent } from '../shared/app-header/app-header';

interface InvitePreview {
  familyName: string;
  email: string;
}

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [
    RouterLink,
    IonContent,
    IonButton,
    IonText,
    IonSpinner,
    TranslatePipe,
    AppHeaderComponent,
  ],
  templateUrl: './join.html',
})
export class JoinComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal<string | null>(null);
  readonly preview = signal<InvitePreview | null>(null);

  private inviteToken: string | null = null;

  ngOnInit(): void {
    this.inviteToken = this.route.snapshot.queryParamMap.get('token');

    if (!this.inviteToken) {
      this.loading.set(false);
      this.error.set('JOIN.ERROR_INVALID');
      return;
    }

    void this.loadPreview(this.inviteToken);
  }

  async sendMagicLink(): Promise<void> {
    const preview = this.preview();
    if (!preview || !this.inviteToken) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    try {
      await this.auth.requestMagicLink(preview.email, this.inviteToken);
      this.submitted.set(true);
    } catch {
      this.error.set('JOIN.ERROR_SEND');
    } finally {
      this.submitting.set(false);
    }
  }

  private async loadPreview(token: string): Promise<void> {
    try {
      const preview = await firstValueFrom(
        this.http.get<InvitePreview>(`${environment.apiBaseUrl}/invites/preview`, {
          params: { token },
        }),
      );
      this.preview.set(preview);
    } catch {
      this.error.set('JOIN.ERROR_INVALID');
    } finally {
      this.loading.set(false);
    }
  }
}
