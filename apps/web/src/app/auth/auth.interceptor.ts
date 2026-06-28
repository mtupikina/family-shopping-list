import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (!isApiRequest) {
    return next(req);
  }

  const accessToken = auth.accessToken;
  const authReq =
    accessToken != null
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authReq).pipe(
    catchError(error => {
      if (error.status !== 401 || !auth.hasRefreshToken() || req.url.includes('/auth/refresh')) {
        return throwError(() => error);
      }

      return from(auth.refreshAccessToken()).pipe(
        switchMap(refreshed => {
          if (!refreshed || !auth.accessToken) {
            return throwError(() => error);
          }

          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${auth.accessToken}` },
          });
          return next(retryReq);
        }),
      );
    }),
  );
};
