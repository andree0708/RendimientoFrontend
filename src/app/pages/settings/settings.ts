import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../core/auth.service';
import { PrivacyService } from '../../services/privacy.service';

const CONSENT_SCOPES = [
  { value: 'all', label: 'Completo', hint: 'Tiempos, pausas, uso de apps y producción de trabajo.' },
  { value: 'activity_only', label: 'Solo actividad', hint: 'Tiempos sin seguimiento de aplicaciones.' },
  { value: 'app_usage_only', label: 'Solo uso de apps', hint: 'Tiempos y apps, sin conteos de tareas/errores.' },
  { value: 'minimal', label: 'Mínimo', hint: 'Solo tiempos activo/inactivo.' },
];

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatSelectModule, MatCardModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Ajustes</h1>
      <p class="ws-page-subtitle">Gestiona tu perfil, privacidad y preferencias.</p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <!-- Profile -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: var(--ws-primary);">person</mat-icon>
            Perfil
          </div>
          <form [formGroup]="profileForm" style="display: flex; flex-direction: column; gap: 16px;">
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Nombre completo</mat-label>
              <input matInput formControlName="full_name">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Correo electrónico</mat-label>
              <input matInput formControlName="email" [readonly]="true">
            </mat-form-field>
            <button mat-flat-button color="primary" (click)="saveProfile()"
              [disabled]="profileForm.invalid || profileSaving()" style="border-radius: 12px;">
              {{ profileSaving() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </form>
        </div>

        <!-- Privacy -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: #14b8a6;">shield</mat-icon>
            Privacidad y consentimiento
          </div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="padding: 12px; background: var(--ws-surface-2); border-radius: 10px;">
              <div style="font-weight: 500; font-size: 0.9rem;">Consentimiento de recolección de datos</div>
              <div style="font-size: 0.82rem; color: var(--ws-text-muted); margin-top: 4px;">
                El agente solo recoge metadatos agregados — nunca teclas, contenido, capturas ni historial de navegación.
              </div>
            </div>
            @if (consentLoaded()) {
              <mat-slide-toggle [checked]="consentGranted()" [disabled]="consentSaving()"
                (change)="toggleConsent($event)">
                Acepto el seguimiento agregado de actividad
              </mat-slide-toggle>
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Alcance de la recolección</mat-label>
                <mat-select [value]="consentScope()" (valueChange)="changeScope($event)"
                  [disabled]="consentSaving() || !consentGranted()">
                  @for (s of scopes; track s.value) {
                    <mat-option [value]="s.value">{{ s.label }} — {{ s.hint }}</mat-option>
                  }
                </mat-select>
                <mat-hint>Los campos fuera del alcance nunca se almacenan.</mat-hint>
              </mat-form-field>
              <div style="font-size: 0.82rem; color: var(--ws-text-muted);">
                Puedes retirar el consentimiento cuando quieras. Al retirarlo se detiene la ingesta de métricas.
              </div>
            } @else {
              <div style="font-size: 0.85rem; color: var(--ws-text-muted);">
                El estado del consentimiento no está disponible ahora mismo. Recarga la página.
              </div>
            }
            <button mat-stroked-button (click)="exportData()" [disabled]="exporting()" style="border-radius: 12px;">
              <mat-icon>download</mat-icon> {{ exporting() ? 'Preparando exportación…' : 'Exportar mis datos' }}
            </button>
            <button mat-stroked-button color="warn" (click)="deleteData()" [disabled]="deleting()" style="border-radius: 12px;">
              <mat-icon>delete_outline</mat-icon> {{ deleting() ? 'Eliminando…' : 'Eliminar mis datos' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Agent config -->
      <div class="ws-card" style="margin-top: 16px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: #8b5cf6;">devices</mat-icon>
          Agente local
        </div>
        <p style="font-size: 0.88rem; color: var(--ws-text); margin-bottom: 16px;">
          Descarga y configura el agente de escritorio para empezar a recoger tus métricas de actividad laboral.
        </p>
        <div style="background: #1a1a2e; border-radius: 10px; padding: 16px; font-family: monospace; font-size: 0.82rem; color: #e2e8f0; overflow-x: auto;">
          <div style="color: #94a3b8;"># Instala y configura el agente</div>
          <div>cd RendimientoBackend</div>
          <div>.venv\Scripts\Activate.ps1</div>
          <div>python -m agent.main setup</div>
          <div>python -m agent.main start</div>
        </div>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private privacySvc = inject(PrivacyService);
  private snackBar = inject(MatSnackBar);

  consentGranted = signal(false);
  consentScope = signal('all');
  consentLoaded = signal(false);
  consentSaving = signal(false);
  scopes = CONSENT_SCOPES;
  profileSaving = signal(false);
  exporting = signal(false);
  deleting = signal(false);
  mobile = signal(window.innerWidth < 768);

  profileForm = this.fb.group({
    full_name: [this.auth.currentUser()?.full_name ?? ''],
    email: [this.auth.currentUser()?.email ?? ''],
  });

  ngOnInit() {
    this.loadConsent();
  }

  private loadConsent() {
    this.privacySvc.getConsent().subscribe({
      next: (consent) => {
        this.consentGranted.set(consent.granted);
        this.consentScope.set(consent.scope || 'all');
        this.consentLoaded.set(true);
      },
      error: () => this.consentLoaded.set(false),
    });
  }

  saveProfile() {
    if (this.profileForm.invalid || this.profileSaving()) return;
    this.profileSaving.set(true);
    this.auth.updateProfile({ full_name: this.profileForm.value.full_name ?? '' }).subscribe({
      next: (user) => {
        this.auth.setCurrentUser(user);
        this.profileSaving.set(false);
        this.snackBar.open('Perfil guardado', 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.profileSaving.set(false);
        this.snackBar.open('No se pudo guardar el perfil', 'Cerrar', { duration: 3000 });
      },
    });
  }

  toggleConsent(event: any) {
    const previous = this.consentGranted();
    const granted = !!event.checked;
    this.consentSaving.set(true);
    this.privacySvc.setConsent(granted, this.consentScope()).subscribe({
      next: (consent) => {
        this.consentGranted.set(consent.granted);
        this.consentScope.set(consent.scope || 'all');
        this.consentSaving.set(false);
        this.snackBar.open(
          consent.granted ? 'Consentimiento otorgado' : 'Consentimiento retirado',
          'Cerrar',
          { duration: 2500 },
        );
      },
      error: () => {
        this.consentGranted.set(previous);
        this.consentSaving.set(false);
        this.snackBar.open('No se pudo actualizar el consentimiento', 'Cerrar', { duration: 3000 });
      },
    });
  }

  changeScope(scope: string) {
    if (!this.consentGranted()) return;
    this.consentSaving.set(true);
    this.privacySvc.setConsent(true, scope).subscribe({
      next: (consent) => {
        this.consentScope.set(consent.scope || 'all');
        this.consentSaving.set(false);
        this.snackBar.open('Alcance de recolección actualizado', 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.consentSaving.set(false);
        this.snackBar.open('No se pudo actualizar el alcance', 'Cerrar', { duration: 3000 });
      },
    });
  }

  exportData() {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.privacySvc.exportData().subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `worksense-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open('No se pudieron exportar los datos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  deleteData() {
    if (this.deleting()) return;
    const confirmed = window.confirm(
      '¿Eliminar todos los datos de actividad, autorreportes, tareas y resultados de IA? Tu cuenta se conservará.',
    );
    if (!confirmed) return;

    this.deleting.set(true);
    this.privacySvc.deleteData().subscribe({
      next: (result) => {
        this.deleting.set(false);
        this.consentGranted.set(false);
        const deleted = result.deleted;
        const total = ['sessions', 'activity_metrics', 'self_reports', 'tasks', 'task_results']
          .reduce((sum, key) => sum + (Number(deleted[key]) || 0), 0);
        this.snackBar.open(`Eliminados ${total} registros`, 'Cerrar', { duration: 4000 });
      },
      error: () => {
        this.deleting.set(false);
        this.snackBar.open('No se pudieron eliminar los datos', 'Cerrar', { duration: 3000 });
      },
    });
  }
}
