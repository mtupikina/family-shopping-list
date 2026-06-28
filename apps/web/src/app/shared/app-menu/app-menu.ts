import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  MenuController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline, logOutOutline } from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../auth/auth.service';
import { MemberContextService } from '../../services/member-context.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    RouterLink,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    TranslatePipe,
  ],
  templateUrl: './app-menu.html',
})
export class AppMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly memberContextService = inject(MemberContextService);
  private readonly menuController = inject(MenuController);

  readonly isAuthenticated = computed(
    () => this.auth.hasRefreshToken() || !!this.auth.accessToken,
  );

  readonly menuTitle = computed(() => {
    const ctx = this.memberContextService.memberContext();
    if (!ctx) {
      return '';
    }
    return ctx.familyName;
  });

  constructor() {
    addIcons({ homeOutline, peopleOutline, logOutOutline });
  }

  async closeMenu(): Promise<void> {
    await this.menuController.close();
  }

  async logout(): Promise<void> {
    await this.menuController.close();
    await this.auth.logout();
  }
}
