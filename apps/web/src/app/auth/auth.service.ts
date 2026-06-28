import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AuthTokensResponse,
  REFRESH_TOKEN_KEY,
} from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenSignal = signal<string | null>(null);
  readonly needsOnboarding = signal(false);
  readonly onboardingKind = signal<'create' | 'join' | null>(null);

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  hasRefreshToken(): boolean {
    try {
      return !!localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return false;
    }
  }

  setSession(tokens: AuthTokensResponse): void {
    this.accessTokenSignal.set(tokens.accessToken);
    this.needsOnboarding.set(tokens.needsOnboarding);
    this.onboardingKind.set(tokens.needsOnboarding ? (tokens.onboardingKind ?? 'create') : null);

    if (tokens.refreshToken) {
      try {
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      } catch {
        // localStorage unavailable
      }
    }
  }

  clearSession(): void {
    this.accessTokenSignal.set(null);
    this.needsOnboarding.set(false);
    this.onboardingKind.set(null);

    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // localStorage unavailable
    }
  }

  async requestMagicLink(email: string, inviteToken?: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/auth/magic-link`, {
        email,
        ...(inviteToken ? { inviteToken } : {}),
      }),
    );
  }

  getOnboardingPath(): string {
    return this.onboardingKind() === 'join' ? '/onboarding/join' : '/onboarding/family';
  }

  async verifyMagicLink(token: string): Promise<AuthTokensResponse> {
    const response = await firstValueFrom(
      this.http.get<AuthTokensResponse>(
        `${environment.apiBaseUrl}/auth/magic-link/verify`,
        { params: { token } },
      ),
    );
    this.setSession(response);
    return response;
  }

  async refreshAccessToken(): Promise<boolean> {
    let refreshToken: string | null = null;

    try {
      refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return false;
    }

    if (!refreshToken) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<AuthTokensResponse>(`${environment.apiBaseUrl}/auth/refresh`, {
          refreshToken,
        }),
      );
      this.setSession(response);
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    let refreshToken: string | null = null;

    try {
      refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      // ignore
    }

    if (refreshToken) {
      try {
        await firstValueFrom(
          this.http.post(`${environment.apiBaseUrl}/auth/logout`, { refreshToken }),
        );
      } catch {
        // ignore logout errors
      }
    }

    this.clearSession();
    await this.router.navigateByUrl('/login');
  }

  async restoreSession(): Promise<'home' | 'onboarding' | 'login'> {
    if (this.accessTokenSignal()) {
      return this.needsOnboarding() ? 'onboarding' : 'home';
    }

    if (!this.hasRefreshToken()) {
      return 'login';
    }

    if (!navigator.onLine) {
      return 'home';
    }

    const refreshed = await this.refreshAccessToken();
    if (!refreshed) {
      return 'login';
    }

    return this.needsOnboarding() ? 'onboarding' : 'home';
  }
}
