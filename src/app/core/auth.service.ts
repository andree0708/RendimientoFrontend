import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { User, TokenResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _currentUser = signal<User | null>(null);
  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._accessToken() !== null);
  readonly isAdmin = computed(() => this._currentUser()?.is_superuser ?? false);

  constructor() {
    this.restoreSession();
  }

  /** Restore tokens and user from localStorage on app start. */
  private restoreSession(): void {
    const access = localStorage.getItem('ws_access_token');
    const refresh = localStorage.getItem('ws_refresh_token');
    const userJson = localStorage.getItem('ws_user');

    if (access && refresh) {
      this._accessToken.set(access);
      this._refreshToken.set(refresh);
      if (userJson) {
        try {
          this._currentUser.set(JSON.parse(userJson));
        } catch {
          // ignore parse error
        }
      }
    }
  }

  get accessToken(): string | null {
    return this._accessToken();
  }

  get refreshTokenValue(): string | null {
    return this._refreshToken();
  }

  register(email: string, password: string, fullName: string) {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/register`, {
      email,
      password,
      full_name: fullName,
    });
  
  }

  login(email: string, password: string) {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, {
      email,
      password,
    });
  
  }

  /** Called by the interceptor after a successful login. */
  setTokens(tokens: TokenResponse): void {
    this._accessToken.set(tokens.access_token);
    this._refreshToken.set(tokens.refresh_token);
    localStorage.setItem('ws_access_token', tokens.access_token);
    localStorage.setItem('ws_refresh_token', tokens.refresh_token);
  }

  loadCurrentUser() {
    return this.http.get<User>(`${environment.apiUrl}/auth/me`);
  
  }

  updateProfile(data: { full_name?: string; avatar_url?: string | null; preferred_scale_max?: number }) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me`, data);
  }

  setCurrentUser(user: User): void {
    this._currentUser.set(user);
    localStorage.setItem('ws_user', JSON.stringify(user));
  }

  refreshAccessToken() {
    const refresh = this._refreshToken();
    if (!refresh) {
      this.logout();
      throw new Error('No refresh token');
    }
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
      refresh_token: refresh,
    });
  }

  logout(): void {
    this._currentUser.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    localStorage.removeItem('ws_access_token');
    localStorage.removeItem('ws_refresh_token');
    localStorage.removeItem('ws_user');
    this.router.navigate(['/login']);
  }
}
