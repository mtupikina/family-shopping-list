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
    loadComponent: () => import('./pages/login/login').then(m => m.LoginComponent),
  },
  {
    path: 'auth/verify',
    loadComponent: () => import('./pages/auth-verify/auth-verify').then(m => m.AuthVerifyComponent),
  },
  {
    path: 'join',
    loadComponent: () => import('./pages/join/join').then(m => m.JoinComponent),
  },
  {
    path: 'onboarding/family',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./pages/onboarding-family/onboarding-family').then(m => m.OnboardingFamilyComponent),
  },
  {
    path: 'onboarding/join',
    canActivate: [joinOnboardingGuard],
    loadComponent: () =>
      import('./pages/onboarding-join/onboarding-join').then(m => m.OnboardingJoinComponent),
  },
  {
    path: 'family',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/family/family').then(m => m.FamilyComponent),
  },
  {
    path: 'archived',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/archived/archived').then(m => m.ArchivedComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then(m => m.HomeComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
