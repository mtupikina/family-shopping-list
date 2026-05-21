import { vi } from 'vitest';

vi.mock('@ionic/angular/standalone', () => ({
  IonHeader: class {},
  IonToolbar: class {},
  IonTitle: class {},
  IonContent: class {},
  IonCard: class {},
  IonCardContent: class {},
  IonSpinner: class {},
  provideIonicAngular: () => [],
}));

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { HomeComponent } from './home';
import { WelcomeService } from '../services/welcome.service';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of as rxOf } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

class StubLoader implements TranslateLoader {
  getTranslation() {
    return rxOf({
      APP: { TITLE: 'Family Shopping List' },
      HOME: { LOADING: 'Loading...', FALLBACK: 'Fallback' },
    });
  }
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  const welcomeMock = {
    getMessage: vi.fn().mockReturnValue(of('Test message')),
  };

  beforeEach(async () => {
    welcomeMock.getMessage.mockReturnValue(of('Test message'));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideHttpClient(),
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: StubLoader },
        }),
        { provide: WelcomeService, useValue: welcomeMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('displays the message returned by WelcomeService', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Test message');
  });
});
