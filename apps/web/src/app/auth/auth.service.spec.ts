import { vi } from 'vitest';

import { AuthService } from './auth.service';
import { REFRESH_TOKEN_KEY } from './auth.types';

describe('AuthService storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores refresh token in localStorage', () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as unknown as { accessTokenSignal: { set: (v: string | null) => void } }).accessTokenSignal = {
      set: () => undefined,
    };
    (service as unknown as { needsOnboarding: { set: (v: boolean) => void } }).needsOnboarding = {
      set: () => undefined,
    };
    (service as unknown as { onboardingKind: { set: (v: 'create' | 'join' | null) => void } }).onboardingKind = {
      set: () => undefined,
    };

    service.setSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      needsOnboarding: false,
    });

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('refresh');
  });

  it('clears refresh token on session clear', () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh');
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as unknown as { accessTokenSignal: { set: (v: string | null) => void } }).accessTokenSignal = {
      set: () => undefined,
    };
    (service as unknown as { needsOnboarding: { set: (v: boolean) => void } }).needsOnboarding = {
      set: () => undefined,
    };
    (service as unknown as { onboardingKind: { set: (v: 'create' | 'join' | null) => void } }).onboardingKind = {
      set: () => undefined,
    };

    service.clearSession();

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('sets onboarding kind from session response', () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    const onboardingKind = { value: null as 'create' | 'join' | null };
    (service as unknown as { accessTokenSignal: { set: (v: string | null) => void } }).accessTokenSignal = {
      set: () => undefined,
    };
    (service as unknown as { needsOnboarding: { set: (v: boolean) => void } }).needsOnboarding = {
      set: () => undefined,
    };
    (service as unknown as { onboardingKind: { set: (v: 'create' | 'join' | null) => void } }).onboardingKind = {
      set: (v: 'create' | 'join' | null) => {
        onboardingKind.value = v;
      },
    };

    service.setSession({
      accessToken: 'access',
      needsOnboarding: true,
      onboardingKind: 'join',
    });

    expect(onboardingKind.value).toBe('join');
  });

  it('returns join onboarding path when kind is join', () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as unknown as { onboardingKind: () => 'create' | 'join' | null }).onboardingKind = vi
      .fn()
      .mockReturnValue('join');

    expect(service.getOnboardingPath()).toBe('/onboarding/join');
  });

  it('returns create onboarding path by default', () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as unknown as { onboardingKind: () => 'create' | 'join' | null }).onboardingKind = vi
      .fn()
      .mockReturnValue('create');

    expect(service.getOnboardingPath()).toBe('/onboarding/family');
  });
});
