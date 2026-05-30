import { Routes } from '@angular/router';
import { authGuard, guestGuard, onboardingGuard } from './auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./login/login').then(m => m.LoginComponent),
  },
  {
    path: 'auth/verify',
    loadComponent: () => import('./auth-verify/auth-verify').then(m => m.AuthVerifyComponent),
  },
  {
    path: 'onboarding/family',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./onboarding-family/onboarding-family').then(m => m.OnboardingFamilyComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home').then(m => m.HomeComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
