import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    TranslatePipe,
  ],
  templateUrl: './app-header.html',
})
export class AppHeaderComponent {
  readonly titleKey = input('APP.TITLE');
  readonly showFamilyLink = input(false);
}
