import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const CACHE_KEY = 'fsl_welcome_message';
const FALLBACK_MESSAGE = 'welcome to the family shopping list';

@Injectable({ providedIn: 'root' })
export class WelcomeService {
  private readonly http = inject(HttpClient);

  getMessage(): Observable<string> {
    return this.http
      .get<{ message: string }>(`${environment.apiBaseUrl}/api/get-welcome-message`)
      .pipe(
        map(response => response.message),
        tap(message => {
          try {
            localStorage.setItem(CACHE_KEY, message);
          } catch {
            // localStorage unavailable; skip caching
          }
        }),
        catchError(() => of(this.getCachedOrFallback())),
      );
  }

  private getCachedOrFallback(): string {
    try {
      return localStorage.getItem(CACHE_KEY) ?? FALLBACK_MESSAGE;
    } catch {
      return FALLBACK_MESSAGE;
    }
  }
}
