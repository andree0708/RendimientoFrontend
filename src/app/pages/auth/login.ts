import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../core/auth.service';
import { WebSocketService } from '../../core/websocket.service';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressBarModule, MatTabsModule,
  ],
  template: `
    <div style="min-height: 100vh; display: flex;" class="ws-fade-in">
      <!-- Hero panel (desktop) -->
      <div style="flex: 1.1; display: none; position: relative; overflow: hidden; background: var(--ws-hero-gradient); color: #fff; padding: 56px;" class="ws-login-hero">
        <div style="position: absolute; width: 420px; height: 420px; border-radius: 50%; background: rgba(255,255,255,0.12); top: -120px; right: -120px;"></div>
        <div style="position: absolute; width: 280px; height: 280px; border-radius: 50%; background: rgba(255,255,255,0.1); bottom: -80px; left: 12%;"></div>
        <div style="position: absolute; width: 140px; height: 140px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); top: 38%; left: 62%;"></div>
        <div style="position: relative; height: 100%; display: flex; flex-direction: column; max-width: 520px; margin-left: auto;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="logo.svg" alt="WorkSense AI logo" style="width: 48px; height: 48px; border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); background: #fff; padding: 4px;" />
            <div>
              <div style="font-size: 1.4rem; font-weight: 700;">WorkSense AI</div>
              <div style="font-size: 0.85rem; opacity: 0.85;">Inteligencia y bienestar</div>
            </div>
          </div>
          <div style="margin: auto 0; padding: 24px 0;">
            <div style="font-size: 2.2rem; font-weight: 700; line-height: 1.2; letter-spacing: -0.02em;">
              Comprende tu<br/>energía de trabajo.
            </div>
            <p style="opacity: 0.88; margin: 16px 0 28px; font-size: 1rem; line-height: 1.6;">
              Análisis que priorizan tu privacidad sobre fatiga y rendimiento — solo metadatos agregados, nunca teclas ni contenido.
            </p>
            <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.93rem;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <mat-icon>timer</mat-icon><span>Sesiones de trabajo con actividad real</span>
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <mat-icon>psychology</mat-icon><span>IA honesta: predice solo si el modelo supera el umbral</span>
              </div>
              <div style="display: flex; gap: 12px; align-items: center;">
                <mat-icon>shield</mat-icon><span>Consentimiento con alcance; exporta y borra tus datos cuando quieras</span>
              </div>
            </div>
          </div>
          <div style="font-size: 0.78rem; opacity: 0.75;">
            No es un diagnóstico médico. Analiza patrones de trabajo y señales de fatiga.
          </div>
        </div>
      </div>

      <!-- Form panel -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--ws-gradient);">
        <div style="width: 100%; max-width: 440px;">
          <div style="text-align: center; margin-bottom: 28px;" class="ws-login-brand">
            <img src="logo.svg" alt="WorkSense AI logo" style="width: 60px; height: 60px; border-radius: 18px; box-shadow: 0 10px 28px rgba(139, 92, 246, 0.35);" />
            <div style="font-size: 1.5rem; font-weight: 700; margin-top: 12px;">WorkSense AI</div>
            <div style="font-size: 0.85rem; color: var(--ws-text-muted);">Inteligencia y bienestar</div>
          </div>

          <div class="ws-card" style="padding: 32px;">
            <button mat-stroked-button type="button" (click)="useDemoAccount()" [disabled]="loading()"
              style="width: 100%; height: 48px; border-radius: 12px; font-weight: 600; margin-bottom: 8px; border-color: var(--ws-violet); color: var(--ws-violet);">
              <mat-icon>bolt</mat-icon> Probar la cuenta demo
            </button>
            <div style="font-size: 0.78rem; color: var(--ws-text-muted); text-align: center; margin-bottom: 16px;">
              demo&#64;worksense.ai &middot; Demo1234
            </div>
            <mat-tab-group [selectedIndex]="tab()" (selectedIndexChange)="tab.set($event)"
              style="--mat-tab-active-indicator-color: var(--ws-primary);">
            <!-- Login tab -->
            <mat-tab label="Iniciar sesión">
              <form [formGroup]="loginForm" (ngSubmit)="onLogin()" style="margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Correo electrónico</mat-label>
                  <input matInput formControlName="email" type="email" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">mail_outline</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Contraseña</mat-label>
                  <input matInput formControlName="password" [type]="hidePass() ? 'password' : 'text'" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">lock_outline</mat-icon>
                  <button matIconButton matSuffix type="button" (click)="hidePass.set(!hidePass())">
                    <mat-icon>{{ hidePass() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </mat-form-field>

                @if (error()) {
                  <div style="color: #dc2626; font-size: 0.85rem; padding: 8px 12px; background: #fef2f2; border-radius: 8px;">
                    {{ error() }}
                  </div>
                }

                <button mat-flat-button type="submit" color="primary"
                  [disabled]="loading()"
                  style="height: 48px; border-radius: 12px; font-weight: 500; font-size: 0.95rem;">
                  @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
                  @else { Iniciar sesión }
                </button>
              </form>
            </mat-tab>

            <!-- Register tab -->
            <mat-tab label="Crear cuenta">
              <form [formGroup]="registerForm" (ngSubmit)="onRegister()" style="margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Nombre completo</mat-label>
                  <input matInput formControlName="full_name" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">person_outline</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Correo electrónico</mat-label>
                  <input matInput formControlName="email" type="email" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">mail_outline</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Contraseña</mat-label>
                  <input matInput formControlName="password" [type]="hidePass() ? 'password' : 'text'" required minlength="8">
                  <mat-hint>Mínimo 8 caracteres, con al menos una letra y un número.</mat-hint>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">lock_outline</mat-icon>
                  <button matIconButton matSuffix type="button" (click)="hidePass.set(!hidePass())">
                    <mat-icon>{{ hidePass() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  </button>
                </mat-form-field>

                @if (error()) {
                  <div style="color: #dc2626; font-size: 0.85rem; padding: 8px 12px; background: #fef2f2; border-radius: 8px;">
                    {{ error() }}
                  </div>
                }

                <button mat-flat-button type="submit" color="primary"
                  [disabled]="loading()"
                  style="height: 48px; border-radius: 12px; font-weight: 500; font-size: 0.95rem;">
                  @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
                  @else { Crear cuenta }
                </button>
              </form>
            </mat-tab>
          </mat-tab-group>
        </div>

        <p style="text-align: center; color: var(--ws-text-muted); font-size: 0.8rem; margin-top: 24px;">
          Este sistema no emite diagnósticos médicos. Analiza patrones de trabajo y señales de fatiga.
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private ws = inject(WebSocketService);
  private router = inject(Router);

  tab = signal(0);
  loading = signal(false);
  error = signal('');
  hidePass = signal(true);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  registerForm = this.fb.group({
    full_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.loginForm.value;
    this.auth.login(email!, password!).subscribe({
      next: (tokens) => {
        this.auth.setTokens(tokens);
        this.auth.loadCurrentUser().subscribe((user) => {
          this.auth.setCurrentUser(user);
          this.ws.connect();
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.friendlyError(err, 'No se pudo iniciar sesión. Revisa tus credenciales.'));
      },
    });
  }

  /** Fill the demo credentials and sign in (see login template hint). */
  useDemoAccount(): void {
    if (this.loading()) return;
    this.tab.set(0);
    this.loginForm.setValue({ email: 'demo@worksense.ai', password: 'Demo1234' });
    this.onLogin();
  }

  /** Distinguish "backend offline" (status 0, not CORS) from bad credentials. */
  private friendlyError(err: any, fallback: string): string {
    if (err?.status === 0) {
      return 'No se puede contactar el servidor. Arranca primero el backend (uvicorn app.main:app --reload en el puerto 8000) e inténtalo de nuevo.';
    }
    if (typeof err.error?.detail === 'string' && err.error.detail) {
      return err.error.detail;
    }
    return fallback;
  }

  onRegister(): void {
    if (this.registerForm.invalid) return;
    this.loading.set(true);
    this.error.set('');

    const { email, password, full_name } = this.registerForm.value;
    this.auth.register(email!, password!, full_name!).subscribe({
      next: (tokens) => {
        this.auth.setTokens(tokens);
        this.auth.loadCurrentUser().subscribe((user) => {
          this.auth.setCurrentUser(user);
          this.ws.connect();
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.friendlyError(err, 'No se pudo crear la cuenta. Prueba con otro correo.'));
      },
    });
  }
}
