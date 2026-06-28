import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { MEMBER_CONTEXT_KEY } from '../auth/auth.types';
import { MemberContextService } from './member-context.service';

describe('MemberContextService', () => {
  let service: MemberContextService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [MemberContextService, provideHttpClient()],
    });
    service = TestBed.inject(MemberContextService);
  });

  it('returns cached context when offline', () => {
    localStorage.setItem(
      MEMBER_CONTEXT_KEY,
      JSON.stringify({
        username: 'Marta',
        familyName: 'Smith Family',
        memberId: 'member-1',
        familyId: 'family-1',
      }),
    );

    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    service.loadContext().subscribe(context => {
      expect(context.username).toBe('Marta');
      expect(context.familyName).toBe('Smith Family');
      expect(service.syncStatus()).toBe('offline');
      expect(service.memberContext()).toEqual(context);
    });
  });

  it('detects cached offline usage', () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    const context = {
      username: 'Marta',
      familyName: 'Smith Family',
      memberId: 'member-1',
      familyId: 'family-1',
    };

    expect(service.isUsingCachedContext(context)).toBe(true);
  });
});
