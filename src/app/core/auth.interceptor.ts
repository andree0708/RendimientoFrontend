import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, from, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { TokenResponse } from '../models';

/**
 * Single-flight refresh: concurrent 401s share ONE refresh request.
 *
 * Without this, N simultaneous 401s would each spend the same single-use
 * refresh token — only the first wins and the rest get 401, logging the
 * user out spuriously.
 */
let refreshInFlight: Observable<TokenResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Skip auth header for login/register/refresh endpoints.
  // Refresh must skip interception: otherwise a rejected refresh would
  // recursively trigger another refresh instead of logging out once.
  if (
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh')
  ) {
    return next(req);
  }

  const token = auth.accessToken;
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401, try to refresh the token and retry (shared single flight).
      if (error.status === 401 && auth.refreshTokenValue) {
        if (!refreshInFlight) {
          refreshInFlight = from(auth.refreshAccessToken()).pipe(
            tap((resp) => {
              auth.setTokens({
                access_token: resp.access_token,
                refresh_token: resp.refresh_token || auth.refreshTokenValue!,
                token_type: 'bearer',
              });
            }),
            shareReplay(1),
            finalize(() => {
              refreshInFlight = null;
            }),
            catchError((refreshError) => {
              // Refresh rejected (revoked/expired): log out once.
              auth.logout();
              return throwError(() => refreshError);
            }),
          );
        }
        return refreshInFlight.pipe(
          switchMap((resp) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${resp.access_token}` },
            });
            return next(retryReq);
          }),
          // If the shared refresh failed, propagate the ORIGINAL error.
          catchError(() => throwError(() => error)),
        );
      }
      return throwError(() => error);
    }),
  );
};
