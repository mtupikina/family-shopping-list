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

    service.clearSession();

    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
