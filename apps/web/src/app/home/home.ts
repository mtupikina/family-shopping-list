import { Component, OnInit, inject, signal } from '@angular/core';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MemberContextService } from '../members/member-context.service';
import { MemberContext } from '../auth/auth.types';
import { AppHeaderComponent } from '../shared/app-header/app-header';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonText,
    TranslatePipe,
    AppHeaderComponent,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  private readonly memberContextService = inject(MemberContextService);
  private readonly translate = inject(TranslateService);

  readonly context = signal<MemberContext | null>(null);
  readonly welcomeMessage = signal<string | null>(null);
  readonly loading = signal(true);
  readonly offline = signal(false);
  readonly error = signal(false);

  ngOnInit(): void {
    this.memberContextService.loadContext().subscribe({
      next: ctx => {
        this.context.set(ctx);
        this.offline.set(this.memberContextService.isUsingCachedContext(ctx));
        this.welcomeMessage.set(this.buildWelcomeMessage(ctx));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private buildWelcomeMessage(ctx: MemberContext): string {
    return this.translate.instant('HOME.WELCOME', {
      username: ctx.username,
      familyName: ctx.familyName,
    });
  }
}
