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
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--ws-gradient);">
      <div style="width: 100%; max-width: 440px;" class="ws-fade-in">
        <!-- Brand header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-flex; align-items: center; gap: 12px;">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #ec4899, #f9a8d4);
              display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(236, 72, 153, 0.25);">
              <mat-icon style="color: white; font-size: 28px; width: 28px; height: 28px;">spa</mat-icon>
            </div>
            <div style="text-align: left;">
              <div style="font-size: 1.5rem; font-weight: 600; color: var(--ws-text);">WorkSense AI</div>
              <div style="font-size: 0.85rem; color: var(--ws-text-muted);">Wellbeing Intelligence</div>
            </div>
          </div>
        </div>

        <div class="ws-card" style="padding: 32px;">
          <mat-tab-group [selectedIndex]="tab()" (selectedIndexChange)="tab.set($event)"
            style="--mat-tab-active-indicator-color: var(--ws-primary);">
            <!-- Login tab -->
            <mat-tab label="Sign in">
              <form [formGroup]="loginForm" (ngSubmit)="onLogin()" style="margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">mail_outline</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Password</mat-label>
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
                  @else { Sign in }
                </button>
              </form>
            </mat-tab>

            <!-- Register tab -->
            <mat-tab label="Create account">
              <form [formGroup]="registerForm" (ngSubmit)="onRegister()" style="margin-top: 20px; display: flex; flex-direction: column; gap: 16px;">
                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Full name</mat-label>
                  <input matInput formControlName="full_name" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">person_outline</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Email</mat-label>
                  <input matInput formControlName="email" type="email" required>
                  <mat-icon matPrefix style="color: var(--ws-text-muted); margin-right: 8px;">mail_outline</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Password</mat-label>
                  <input matInput formControlName="password" [type]="hidePass() ? 'password' : 'text'" required minlength="6">
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
                  @else { Create account }
                </button>
              </form>
            </mat-tab>
          </mat-tab-group>
        </div>

        <p style="text-align: center; color: var(--ws-text-muted); font-size: 0.8rem; margin-top: 24px;">
          This system does not provide medical diagnoses. It analyzes work patterns and fatigue signals.
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
    password: ['', [Validators.required, Validators.minLength(6)]],
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
        this.error.set(err.error?.detail || 'Could not sign in. Check your credentials.');
      },
    });
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
        this.error.set(err.error?.detail || 'Could not create account. Try a different email.');
      },
    });
  }
}
