import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AiService } from '../../services/ai.service';
import { ApiService } from '../../services/api.service';
import { ModelVersion } from '../../models';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Admin Panel</h1>
      <p class="ws-page-subtitle">Manage AI models and view aggregated, anonymized statistics.</p>

      <!-- Stats -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Active users</div>
          <div class="ws-stat-value">{{ stats()?.total_active_users ?? '-' }}</div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Total sessions</div>
          <div class="ws-stat-value">{{ stats()?.total_sessions ?? '-' }}</div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Active now</div>
          <div class="ws-stat-value">{{ stats()?.active_sessions_now ?? '-' }}</div>
        </div>
      </div>

      <!-- Model training -->
      <div class="ws-card" style="margin-bottom: 24px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: var(--ws-primary);">model_training</mat-icon>
          Model training
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button mat-flat-button color="primary" (click)="train('fatigue_classification')" [disabled]="training()" style="border-radius: 12px;">
            <mat-icon>psychology</mat-icon> Train fatigue model
          </button>
          <button mat-flat-button (click)="train('performance_regression')" [disabled]="training()" style="border-radius: 12px;">
            <mat-icon>trending_up</mat-icon> Train performance model
          </button>
          <button mat-stroked-button (click)="train('anomaly_detection')" [disabled]="training()" style="border-radius: 12px;">
            <mat-icon>radar</mat-icon> Train anomaly model
          </button>
        </div>
        @if (trainingResult()) {
          <div style="margin-top: 16px; padding: 12px; background: var(--ws-surface-2); border-radius: 10px; font-size: 0.85rem;">
            {{ trainingResult() }}
          </div>
        }
      </div>

      <!-- Model versions -->
      <div class="ws-card">
        <div style="font-weight: 600; margin-bottom: 16px;">Registered models</div>
        @for (m of models(); track m.id) {
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--ws-border);">
            <div>
              <div style="font-weight: 500;">{{ m.name }} ({{ m.algorithm }})</div>
              <div style="font-size: 0.82rem; color: var(--ws-text-muted);">
                {{ m.model_type }} &middot; v{{ m.version_tag }} &middot; {{ m.samples_used }} samples &middot; {{ m.notes }}
              </div>
              @if (m.evaluations.length > 0) {
                <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 4px;">
                  @for (e of m.evaluations; track e.id) {
                    @if (e.precision) { Precision: {{ e.precision | number:'1.2-2' }} }
                    @if (e.recall) { Recall: {{ e.recall | number:'1.2-2' }} }
                    @if (e.f1_score) { F1: {{ e.f1_score | number:'1.2-2' }} }
                    @if (e.mae) { MAE: {{ e.mae | number:'1.3-3' }} }
                    @if (e.rmse) { RMSE: {{ e.rmse | number:'1.3-3' }} }
                    @if (e.r2) { R2: {{ e.r2 | number:'1.3-3' }} }
                  }
                </div>
              }
            </div>
            @if (m.is_active) {
              <span style="padding: 4px 12px; border-radius: 20px; background: #dcfce7; color: #15803d; font-size: 0.78rem; font-weight: 500;">
                Active
              </span>
            }
          </div>
        }
        @if (models().length === 0) {
          <div style="text-align: center; padding: 30px; color: var(--ws-text-muted);">
            No models trained yet. Use the buttons above to train with demo data.
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
  training = signal(false);
  trainingResult = signal('');

  ngOnInit() {
    this.loadStats();
    this.loadModels();
  }

  loadStats() {
    this.api.get<any>('/admin/stats').subscribe((s) => this.stats.set(s));
  }

  loadModels() {
    this.aiSvc.listModels().subscribe((m) => this.models.set(m));
  }

  train(modelType: string) {
    this.training.set(true);
    this.trainingResult.set('Training in progress...');
    this.aiSvc.trainModel(modelType, true).subscribe((result) => {
      this.training.set(false);
      if (result.success) {
        this.trainingResult.set(`Model trained: ${result.message}`);
        this.loadModels();
        this.snackBar.open('Model trained successfully', 'Close', { duration: 3000 });
      } else {
        this.trainingResult.set(`Training failed: ${result.message}`);
      }
    });
  }
}
