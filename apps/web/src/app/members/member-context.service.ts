import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MemberContext, MEMBER_CONTEXT_KEY } from '../auth/auth.types';

export type SyncStatus = 'unknown' | 'synced' | 'syncing' | 'offline' | 'pending';

@Injectable({ providedIn: 'root' })
export class MemberContextService {
  private readonly http = inject(HttpClient);

  readonly syncStatus = signal<SyncStatus>('unknown');
  readonly memberContext = signal<MemberContext | null>(null);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => {
      const status = this.syncStatus();
      if (status === 'offline' || status === 'pending') {
        this.loadContext().subscribe();
      }
    });
  }

  hasCachedContext(): boolean {
    return this.getCachedContext() != null;
  }

  loadContext(): Observable<MemberContext> {
    if (!navigator.onLine) {
      const cached = this.getCachedContext();
      if (cached) {
        this.memberContext.set(cached);
        this.syncStatus.set('offline');
        return of(cached);
      }

      this.syncStatus.set('offline');
      return throwError(() => new Error('Unable to load member context'));
    }

    this.syncStatus.set('syncing');

    return this.http
      .get<MemberContext>(`${environment.apiBaseUrl}/me/context`)
      .pipe(
        tap(context => {
          this.cacheContext(context);
          this.memberContext.set(context);
          this.syncStatus.set('synced');
        }),
        catchError(() => {
          const cached = this.getCachedContext();
          if (cached) {
            this.memberContext.set(cached);
            this.syncStatus.set('pending');
            return of(cached);
          }

          this.syncStatus.set('pending');
          return throwError(() => new Error('Unable to load member context'));
        }),
      );
  }

  getCachedContext(): MemberContext | null {
    try {
      const raw = localStorage.getItem(MEMBER_CONTEXT_KEY);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as MemberContext;
    } catch {
      return null;
    }
  }

  isUsingCachedContext(context: MemberContext | null): boolean {
    return !navigator.onLine && context != null;
  }

  private cacheContext(context: MemberContext): void {
    try {
      localStorage.setItem(
        MEMBER_CONTEXT_KEY,
        JSON.stringify({ ...context, cachedAt: new Date().toISOString() }),
      );
    } catch {
      // localStorage unavailable
    }
  }
}
