import { vi } from 'vitest';

vi.mock('@ionic/angular/standalone', () => ({
  IonHeader: class {},
  IonToolbar: class {},
  IonTitle: class {},
  IonButtons: class {},
  IonMenuButton: class {},
  IonContent: class {},
  IonSpinner: class {},
  IonInput: class {},
  IonButton: class {},
  IonList: class {},
  IonItem: class {},
  IonLabel: class {},
  IonCheckbox: class {},
  IonChip: class {},
  IonIcon: class {},
  IonTextarea: class {},
  IonSelect: class {},
  IonSelectOption: class {},
  IonModal: class {},
  provideIonicAngular: () => [],
}));

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, firstValueFrom } from 'rxjs';
import { HomeComponent } from './home';
import { MemberContextService } from '../members/member-context.service';
import { ItemsService } from '../items/items.service';
import { provideTranslateService, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { of as rxOf } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { ShoppingItem } from '../items/item.types';

class StubLoader implements TranslateLoader {
  getTranslation() {
    return rxOf({
      APP: { TITLE: 'Family Shopping List' },
      HOME: {
        LOADING: 'Loading...',
        FALLBACK: 'Fallback',
      },
      ITEMS: {
        TEXT: 'Item',
        EMPTY: 'No items yet',
        ARCHIVE_MODE: 'Archive',
        SECTION_TO_BUY: 'To buy',
        SECTION_DONE: 'Done ({{count}})',
        SECTION_REJECTED: 'Rejected ({{count}})',
      },
    });
  }
}

const sampleItem: ShoppingItem = {
  id: 'item-1',
  familyId: 'family-1',
  text: 'Milk',
  quantity: null,
  unit: null,
  category: null,
  status: 'NEW',
  archived: false,
  archivedAt: null,
  createdBy: { id: 'member-1', username: 'Marta' },
  rejectedBy: null,
  rejectReason: null,
  rejectedAt: null,
  completedBy: null,
  price: null,
  store: null,
  completedAt: null,
  version: 0,
  createdAt: '2026-06-07T10:00:00.000Z',
  updatedAt: '2026-06-07T10:00:00.000Z',
};

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;

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
    syncStatus: signal('synced'),
    memberContext: signal({
      username: 'Marta',
      familyName: 'Smith Family',
      memberId: 'member-1',
      familyId: 'family-1',
    }),
  };

  const itemsServiceMock = {
    activeItems: signal<ShoppingItem[]>([]),
    familyStores: signal<string[]>([]),
    loading: signal(false),
    error: signal(false),
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    findDuplicate: vi.fn(),
    create: vi.fn(),
    complete: vi.fn(),
    reject: vi.fn(),
    update: vi.fn(),
    archiveMany: vi.fn(),
  };

  beforeEach(async () => {
    itemsServiceMock.activeItems.set([]);
    itemsServiceMock.loading.set(false);
    itemsServiceMock.error.set(false);
    itemsServiceMock.initialize.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideTranslateService({
          loader: { provide: TranslateLoader, useClass: StubLoader },
        }),
        { provide: MemberContextService, useValue: memberContextMock },
        { provide: ItemsService, useValue: itemsServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    const translate = TestBed.inject(TranslateService);
    await firstValueFrom(translate.use('en'));

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('initializes items after member context loads', () => {
    expect(itemsServiceMock.initialize).toHaveBeenCalled();
  });

  it('renders empty shopping list UI', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No items yet');
  });

  it('shows archive link when items exist', () => {
    itemsServiceMock.activeItems.set([sampleItem]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Archive');
  });

  it('groups new items under To buy section', () => {
    itemsServiceMock.activeItems.set([sampleItem]);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('To buy');
    expect(el.textContent).toContain('Milk');
  });

  it('opens edit sheet when openSheet is called', () => {
    component.openSheet(sampleItem, 'edit');
    fixture.detectChanges();

    expect(component.sheetOpen()).toBe(true);
    expect(component.sheetMode()).toBe('edit');
    expect(component.sheetItem()?.id).toBe('item-1');
  });
});
