import { vi } from 'vitest';

vi.mock('@ionic/angular/standalone', () => ({
  IonApp: class {},
  IonRouterOutlet: class {},
  IonMenu: class {},
  IonHeader: class {},
  IonToolbar: class {},
  IonTitle: class {},
  IonContent: class {},
  IonList: class {},
  IonItem: class {},
  IonLabel: class {},
  IonIcon: class {},
  MenuController: class {
    close() {
      return Promise.resolve();
    }
  },
  provideIonicAngular: () => [],
}));

import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: MenuController, useValue: { close: () => Promise.resolve() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
