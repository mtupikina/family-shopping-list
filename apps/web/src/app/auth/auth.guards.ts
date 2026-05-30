import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { MemberContextService } from '../members/member-context.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const memberContext = inject(MemberContextService);

  const destination = await auth.restoreSession();

  if (
    destination === 'login' &&
    !navigator.onLine &&
    auth.hasRefreshToken() &&
    memberContext.hasCachedContext()
  ) {
    return true;
  }

  if (destination === 'login') {
    return router.createUrlTree(['/login']);
  }

  if (destination === 'onboarding') {
    return router.createUrlTree(['/onboarding/family']);
  }

  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const destination = await auth.restoreSession();

  if (destination === 'home') {
    return router.createUrlTree(['/']);
  }

  if (destination === 'onboarding') {
    return router.createUrlTree(['/onboarding/family']);
  }

  return true;
};

export const onboardingGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.accessToken && auth.hasRefreshToken() && navigator.onLine) {
    await auth.refreshAccessToken();
  }

  if (!auth.accessToken) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.needsOnboarding()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
