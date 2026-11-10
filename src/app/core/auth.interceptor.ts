import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // Skip auth header for login/register endpoints
  if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
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
      // If 401, try to refresh the token and retry
      if (error.status === 401 && auth.refreshTokenValue) {
        return from(auth.refreshAccessToken()).pipe(
          switchMap((resp) => {
            auth.setTokens({
              access_token: resp.access_token,
              refresh_token: resp.refresh_token || auth.refreshTokenValue!,
              token_type: 'bearer',
            });
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${resp.access_token}` },
            });
            return next(retryReq);
          }),
          catchError(() => {
            auth.logout();
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
