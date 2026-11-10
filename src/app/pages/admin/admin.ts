import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AiService } from '../../services/ai.service';
import { ApiService } from '../../services/api.service';
import { ModelVersion } from '../../models';

interface AuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  resource_type: string | null;
  resource_id: string | null;
  detail: string | null;
  created_at: string | null;
}

@Component({
  selector: 'app-admin',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Panel de administración</h1>
      <p class="ws-page-subtitle">Gestiona los modelos de IA y consulta estadísticas agregadas y anonimizadas.</p>

      <!-- Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Usuarios activos</div>
          <div class="ws-stat-value">{{ stats()?.total_active_users ?? '-' }}</div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Sesiones totales</div>
          <div class="ws-stat-value">{{ stats()?.total_sessions ?? '-' }}</div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Activos ahora</div>
          <div class="ws-stat-value">{{ stats()?.active_sessions_now ?? '-' }}</div>
        </div>
      </div>

      <!-- Model training -->
      <div class="ws-card" style="margin-bottom: 24px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: var(--ws-primary);">model_training</mat-icon>
          Entrenamiento de modelos
        </div>
        <div style="font-size: 0.85rem; color: var(--ws-text-muted); margin-bottom: 12px;">
          El entrenamiento usa datos reales cuando hay suficientes muestras y recurre a
          datos sintéticos de demostración en caso contrario. Un modelo solo se activa cuando se
          entrenó con datos reales y supera el umbral de calidad con validación cruzada;
          los modelos entrenados con datos de demostración se conservan solo para evaluación.
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button mat-flat-button color="primary" (click)="train('fatigue_classification')" [disabled]="training()" style="border-radius: 12px;">
            <mat-icon>psychology</mat-icon> Entrenar modelo de fatiga
          </button>
          <button mat-flat-button (click)="train('performance_regression')" [disabled]="training()" style="border-radius: 12px;">
            <mat-icon>trending_up</mat-icon> Entrenar modelo de rendimiento
          </button>
          <button mat-stroked-button (click)="train('anomaly_detection')" [disabled]="training()" style="border-radius: 12px;">
            <mat-icon>radar</mat-icon> Entrenar modelo de anomalías
          </button>
        </div>
        @if (trainingResult()) {
          <div style="margin-top: 16px; padding: 12px; border-radius: 10px; font-size: 0.85rem;"
            [style.background]="trainingRejected() ? '#fef3c7' : 'var(--ws-surface-2)'"
            [style.color]="trainingRejected() ? '#92400e' : 'inherit'">
            {{ trainingResult() }}
          </div>
        }
      </div>

      <!-- Model versions -->
      <div class="ws-card">
        <div style="font-weight: 600; margin-bottom: 16px;">Modelos registrados</div>
        @for (m of models(); track m.id) {
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--ws-border);">
            <div>
              <div style="font-weight: 500;">{{ m.name }} ({{ m.algorithm }})</div>
              <div style="font-size: 0.82rem; color: var(--ws-text-muted);">
                {{ m.model_type }} &middot; v{{ m.version_tag }} &middot; {{ m.samples_used }} muestras &middot; {{ m.notes }}
              </div>
              @if (m.evaluations.length > 0) {
                <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 4px;">
                  @for (e of m.evaluations; track e.id) {
                    @if (e.precision !== null) { Precision: {{ e.precision | number:'1.2-2' }} }
                    @if (e.recall !== null) { Recall: {{ e.recall | number:'1.2-2' }} }
                    @if (e.f1_score !== null) { F1: {{ e.f1_score | number:'1.2-2' }} }
                    @if (e.roc_auc !== null) { ROC-AUC: {{ e.roc_auc | number:'1.2-2' }} }
                    @if (e.mae !== null) { MAE: {{ e.mae | number:'1.3-3' }} }
                    @if (e.rmse !== null) { RMSE: {{ e.rmse | number:'1.3-3' }} }
                    @if (e.r2 !== null) { R2: {{ e.r2 | number:'1.3-3' }} }
                  }
                </div>
              }
            </div>
            @if (m.is_active) {
              <span style="padding: 4px 12px; border-radius: 20px; background: #dcfce7; color: #15803d; font-size: 0.78rem; font-weight: 500;">
                Activo
              </span>
            } @else if (isDemoModel(m)) {
              <span style="padding: 4px 12px; border-radius: 20px; background: var(--ws-surface-2); color: var(--ws-text-muted); font-size: 0.78rem; font-weight: 500;">
                Inactivo — datos de demostración
              </span>
            } @else {
              <span style="padding: 4px 12px; border-radius: 20px; background: #fef3c7; color: #92400e; font-size: 0.78rem; font-weight: 500;">
                Inactivo — control de calidad
              </span>
            }
          </div>
        }
        @if (models().length === 0) {
          <div style="text-align: center; padding: 30px; color: var(--ws-text-muted);">
            Aún no hay modelos entrenados. Usa los botones de arriba para entrenar con datos de demostración.
          </div>
        }
      </div>

      <!-- Audit log -->
      <div class="ws-card" style="margin-top: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <div style="font-weight: 600; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: var(--ws-text-muted);">receipt_long</mat-icon>
            Actividad reciente de privacidad y consentimiento
          </div>
          <button mat-icon-button (click)="loadAuditLogs()" aria-label="Actualizar registro de auditoría">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
        @for (entry of auditLogs(); track entry.id) {
          <div style="display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--ws-border); font-size: 0.85rem;">
            <span style="min-width: 130px; font-weight: 500;">{{ entry.action }}</span>
            <span style="flex: 1; color: var(--ws-text-muted);">
              {{ entry.actor_email || 'actor desconocido' }}
              @if (entry.detail) { &middot; {{ entry.detail }} }
            </span>
            <span style="color: var(--ws-text-muted); white-space: nowrap;">
              {{ entry.created_at | date: 'MMM d, h:mm a' }}
            </span>
          </div>
        }
        @if (auditLogs().length === 0) {
          <div style="text-align: center; padding: 24px; color: var(--ws-text-muted);">
            Aún no hay acciones auditadas.
          </div>
        }
      </div>
    </div>
  `,
})
export class AdminComponent implements OnInit {
  private aiSvc = inject(AiService);
  private api = inject(ApiService);
  private snackBar = inject(MatSnackBar);

  stats = signal<any>(null);
  models = signal<ModelVersion[]>([]);
  auditLogs = signal<AuditEntry[]>([]);
  training = signal(false);
  trainingResult = signal('');
  trainingRejected = signal(false);

  ngOnInit() {
    this.loadStats();
    this.loadModels();
    this.loadAuditLogs();
  }

  loadStats() {
    this.api.get<any>('/admin/stats').subscribe((s) => this.stats.set(s));
  }

  loadModels() {
    this.aiSvc.listModels().subscribe((m) => this.models.set(m));
  }

  loadAuditLogs() {
    this.api.get<AuditEntry[]>('/admin/audit-logs', { skip: 0, limit: 50 }).subscribe({
      next: (entries) => this.auditLogs.set(entries),
      error: () => this.auditLogs.set([]),
    });
  }

  isDemoModel(model: ModelVersion): boolean {
    return (model.notes ?? '').includes('DEMO data: True');
  }

  train(modelType: string) {
    this.training.set(true);
    this.trainingRejected.set(false);
    this.trainingResult.set('Entrenamiento en curso...');
    this.aiSvc.trainModel(modelType, true).subscribe({
      next: (result) => {
        this.training.set(false);
        if (result.success) {
          const rejected = result.message.includes('NOT activated');
          this.trainingRejected.set(rejected);
          this.trainingResult.set(result.message);
          this.loadModels();
          this.snackBar.open(
            rejected ? 'Entrenamiento terminado — modelo no activado' : 'Entrenamiento terminado',
            'Cerrar',
            { duration: 3500 },
          );
        } else {
          this.trainingRejected.set(true);
          this.trainingResult.set(`Error en el entrenamiento: ${result.message}`);
        }
      },
      error: () => {
        this.training.set(false);
        this.trainingRejected.set(true);
        this.trainingResult.set('Error en el entrenamiento: el servidor rechazó la solicitud.');
      },
    });
  }
}
