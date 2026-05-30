import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MemberContext, MEMBER_CONTEXT_KEY } from '../auth/auth.types';

@Injectable({ providedIn: 'root' })
export class MemberContextService {
  private readonly http = inject(HttpClient);

  hasCachedContext(): boolean {
    return this.getCachedContext() != null;
  }

  loadContext(): Observable<MemberContext> {
    if (!navigator.onLine) {
      const cached = this.getCachedContext();
      if (cached) {
        return of(cached);
      }
    }

    return this.http
      .get<MemberContext>(`${environment.apiBaseUrl}/me/context`)
      .pipe(
        tap(context => this.cacheContext(context)),
        catchError(() => {
          const cached = this.getCachedContext();
          if (cached) {
            return of(cached);
          }
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
