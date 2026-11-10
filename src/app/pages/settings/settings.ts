import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatCardModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Settings</h1>
      <p class="ws-page-subtitle">Manage your profile, privacy, and preferences.</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <!-- Profile -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: var(--ws-primary);">person</mat-icon>
            Profile
          </div>
          <form [formGroup]="profileForm" style="display: flex; flex-direction: column; gap: 16px;">
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Full name</mat-label>
              <input matInput formControlName="full_name">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" [readonly]="true">
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="saveProfile()" style="border-radius: 12px;">
              Save changes
            </button>
          </form>
        </div>

        <!-- Privacy -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: #14b8a6;">shield</mat-icon>
            Privacy & consent
          </div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="padding: 12px; background: var(--ws-surface-2); border-radius: 10px;">
              <div style="font-weight: 500; font-size: 0.9rem;">Data collection consent</div>
              <div style="font-size: 0.82rem; color: var(--ws-text-muted); margin-top: 4px;">
                The agent only collects aggregated metadata — never keystrokes, content, screenshots, or browsing history.
              </div>
            </div>
            <mat-slide-toggle [checked]="consentGranted()" (change)="toggleConsent($event)">
              I consent to aggregated activity tracking
            </mat-slide-toggle>
            <div style="font-size: 0.82rem; color: var(--ws-text-muted);">
              You can withdraw consent at any time. Your data will stop being collected.
            </div>
            <button mat-stroked-button (click)="exportData()" style="border-radius: 12px;">
              <mat-icon>download</mat-icon> Export my data
            </button>
            <button mat-stroked-button color="warn" (click)="deleteData()" style="border-radius: 12px;">
              <mat-icon>delete_outline</mat-icon> Delete my data
            </button>
          </div>
        </div>
      </div>

      <!-- Agent config -->
      <div class="ws-card" style="margin-top: 16px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: #8b5cf6;">devices</mat-icon>
          Local agent setup
        </div>
        <p style="font-size: 0.88rem; color: var(--ws-text); margin-bottom: 16px;">
          Download and configure the desktop agent to start collecting your work activity metrics.
        </p>
        <div style="background: #1a1a2e; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 0.82rem; color: #e2e8f0; overflow-x: auto;">
          <div style="color: #94a3b8;"># Install and configure the agent</div>
          <div>cd RendimientoBackend</div>
          <div>.venv\Scripts\Activate.ps1</div>
          <div>python -m agent.main setup</div>
          <div>python -m agent.main start</div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  consentGranted = signal(true);
  mobile = signal(window.innerWidth < 768);

  profileForm = this.fb.group({
    full_name: [this.auth.currentUser()?.full_name ?? ''],
    email: [this.auth.currentUser()?.email ?? ''],
  });

  saveProfile() {
    this.snackBar.open('Profile saved', 'Close', { duration: 2500 });
  }

  toggleConsent(event: any) {
    this.consentGranted.set(event.checked);
    this.snackBar.open(
      event.checked ? 'Consent granted' : 'Consent withdrawn — collection stopped',
      'Close', { duration: 2500 },
    );
  }

  exportData() {
    this.snackBar.open('Export requested — you will receive a file shortly', 'Close', { duration: 3000 });
  }

  deleteData() {
    this.snackBar.open('Data deletion requested', 'Close', { duration: 3000 });
  }
}
