import { Component, OnInit, computed, inject, input } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudDoneOutline,
  cloudOfflineOutline,
  syncOutline,
} from 'ionicons/icons';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { MemberContextService } from '../../members/member-context.service';
import { ConnectivityService } from '../connectivity.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonMenuButton,
    TranslatePipe,
  ],
  templateUrl: './app-header.html',
})
export class AppHeaderComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly memberContextService = inject(MemberContextService);

  readonly titleKey = input('APP.TITLE');
  readonly syncStatus = this.memberContextService.syncStatus;

  readonly isAuthenticated = computed(
    () => this.auth.hasRefreshToken() || !!this.auth.accessToken,
  );

  readonly connectivityIcon = computed(() =>
    this.connectivity.online() ? 'cloud-done-outline' : 'cloud-offline-outline',
  );

  readonly connectivityColor = computed(() =>
    this.connectivity.online() ? 'success' : 'warning',
  );

  readonly connectivityLabel = computed(() =>
    this.connectivity.online() ? 'HEADER.STATUS.ONLINE' : 'HEADER.STATUS.OFFLINE',
  );

  readonly syncLabel = computed(() => {
    switch (this.syncStatus()) {
      case 'synced':
        return 'HEADER.STATUS.SYNCED';
      case 'syncing':
        return 'HEADER.STATUS.SYNCING';
      case 'pending':
        return 'HEADER.STATUS.PENDING';
      case 'offline':
        return 'HEADER.STATUS.OFFLINE';
      default:
        return 'HEADER.STATUS.SYNCING';
    }
  });

  readonly syncSpinning = computed(() => this.syncStatus() === 'syncing');

  constructor() {
    addIcons({
      cloudDoneOutline,
      cloudOfflineOutline,
      syncOutline,
    });
  }

  ngOnInit(): void {
    if (this.isAuthenticated() && !this.memberContextService.memberContext()) {
      this.memberContextService.loadContext().subscribe();
    }
  }
}
