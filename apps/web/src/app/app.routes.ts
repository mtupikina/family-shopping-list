import { Routes } from '@angular/router';
import {
  authGuard,
  guestGuard,
  joinOnboardingGuard,
  onboardingGuard,
} from './auth/auth.guards';

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
    path: 'join',
    loadComponent: () => import('./join/join').then(m => m.JoinComponent),
  },
  {
    path: 'onboarding/family',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./onboarding-family/onboarding-family').then(m => m.OnboardingFamilyComponent),
  },
  {
    path: 'onboarding/join',
    canActivate: [joinOnboardingGuard],
    loadComponent: () =>
      import('./onboarding-join/onboarding-join').then(m => m.OnboardingJoinComponent),
  },
  {
    path: 'family',
    canActivate: [authGuard],
    loadComponent: () => import('./family/family').then(m => m.FamilyComponent),
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
