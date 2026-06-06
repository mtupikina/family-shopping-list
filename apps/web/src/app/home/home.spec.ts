import { vi } from 'vitest';

vi.mock('@ionic/angular/standalone', () => ({
  IonHeader: class {},
  IonToolbar: class {},
  IonTitle: class {},
  IonButtons: class {},
  IonButton: class {},
  IonContent: class {},
  IonCard: class {},
  IonCardContent: class {},
  IonSpinner: class {},
  IonText: class {},
  provideIonicAngular: () => [],
}));

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, firstValueFrom } from 'rxjs';
import { HomeComponent } from './home';
import { MemberContextService } from '../members/member-context.service';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { of as rxOf } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';

class StubLoader implements TranslateLoader {
  getTranslation() {
    return rxOf({
      APP: { TITLE: 'Family Shopping List' },
      HOME: {
        LOADING: 'Loading...',
        FALLBACK: 'Fallback',
        WELCOME: '{{username}} is welcoming you to the {{familyName}} shopping list',
        OFFLINE: 'Offline',
      },
    });
  }
}

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  const memberContextMock = {
    loadContext: vi.fn().mockReturnValue(
      of({
        username: 'Marta',
        familyName: 'Smith Family',
        memberId: 'member-1',
        familyId: 'family-1',
      }),
    ),
    isUsingCachedContext: vi.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    memberContextMock.loadContext.mockReturnValue(
      of({
        username: 'Marta',
        familyName: 'Smith Family',
        memberId: 'member-1',
        familyId: 'family-1',
      }),
    );
    memberContextMock.isUsingCachedContext.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: StubLoader },
        }),
        { provide: MemberContextService, useValue: memberContextMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('en'));

    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('displays username and family name from member context', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Marta');
    expect(el.textContent).toContain('Smith Family');
  });
});
