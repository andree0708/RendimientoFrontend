import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { TokenResponse } from '../models';

/**
 * Tests the interceptor function directly (no HttpTestingController):
 * requests are plain Observables, so timing is fully deterministic.
 */
describe('authInterceptor', () => {
  let authStub: {
    accessToken: string | null;
    refreshTokenValue: string | null;
    refreshAccessToken: jasmine.Spy;
    setTokens: jasmine.Spy;
    logout: jasmine.Spy;
  };
  let handled: HttpRequest<unknown>[];
  let failFirst: number;
  let next: HttpHandlerFn;

  const TOKENS: TokenResponse = {
    access_token: 'a2',
    refresh_token: 'r2',
    token_type: 'bearer',
  };

  function run(req: HttpRequest<unknown>, onDone: (v: string) => void) {
    TestBed.runInInjectionContext(() => {
      authInterceptor(req, next).subscribe({
        next: () => onDone('ok'),
        error: (e: HttpErrorResponse) => onDone(`err:${e.status}`),
      });
    });
  }

  beforeEach(() => {
    authStub = {
      accessToken: 'expired-access',
      refreshTokenValue: 'r1',
      refreshAccessToken: jasmine.createSpy('refreshAccessToken'),
      setTokens: jasmine.createSpy('setTokens'),
      logout: jasmine.createSpy('logout'),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authStub }],
    });
    handled = [];
    failFirst = 0;
    next = ((req: HttpRequest<unknown>) => {
      handled.push(req);
      if (handled.length <= failFirst) {
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      }
      return of(new HttpResponse({ status: 200, body: {} }));
    }) as HttpHandlerFn;
  });

  it('shares a single refresh across concurrent 401s', () => {
    const refresh$ = new Subject<TokenResponse>();
    authStub.refreshAccessToken.and.returnValue(refresh$);
    failFirst = 2;
    const outcomes: string[] = [];

    run(new HttpRequest('GET', '/api/v1/sessions'), (v) => outcomes.push(v));
    run(new HttpRequest('GET', '/api/v1/tasks'), (v) => outcomes.push(v));

    // Both initial requests failed; only ONE refresh must have started.
    expect(handled.length).toBe(2);
    expect(authStub.refreshAccessToken).toHaveBeenCalledTimes(1);

    // Complete the shared refresh: both requests retry with the new token.
    refresh$.next(TOKENS);
    refresh$.complete();

    const retries = handled.slice(2);
    expect(retries.length).toBe(2);
    expect(retries.every((r) => r.headers.get('Authorization') === 'Bearer a2')).toBeTrue();
    expect(authStub.setTokens).toHaveBeenCalledTimes(1);
    expect(authStub.logout).not.toHaveBeenCalled();
    expect(outcomes).toEqual(['ok', 'ok']);
  });

  it('logs out once when the refresh itself is rejected', () => {
    const refresh$ = new Subject<TokenResponse>();
    authStub.refreshAccessToken.and.returnValue(refresh$);
    failFirst = 1;
    const outcomes: string[] = [];

    run(new HttpRequest('GET', '/api/v1/sessions'), (v) => outcomes.push(v));

    expect(authStub.refreshAccessToken).toHaveBeenCalledTimes(1);
    refresh$.error(new HttpErrorResponse({ status: 401 }));

    expect(handled.length).toBe(1); // no retry issued
    expect(authStub.logout).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual(['err:401']);
  });

  it('does not intercept the refresh call itself', () => {
    const refresh$ = new Subject<TokenResponse>();
    authStub.refreshAccessToken.and.returnValue(refresh$);
    failFirst = 99; // everything fails, including any nested refresh
    const outcomes: string[] = [];

    run(new HttpRequest('POST', '/api/v1/auth/refresh', {}), (v) => outcomes.push(v));

    expect(handled.length).toBe(1); // passed straight through, no recursion
    expect(authStub.refreshAccessToken).not.toHaveBeenCalled();
    expect(outcomes).toEqual(['err:401']);
  });
});
