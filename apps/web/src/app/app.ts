import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AppMenuComponent } from './shared/app-menu/app-menu';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, AppMenuComponent],
  template: `
    <ion-app>
      <app-menu />
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </ion-app>
  `,
})
export class App {}
