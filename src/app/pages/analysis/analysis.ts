import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AiService } from '../../services/ai.service';
import { EchartsDirective } from '../../shared/echarts.directive';
import { FatigueAssessment, PerformancePrediction } from '../../models';

@Component({
  selector: 'app-analysis',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule, EchartsDirective],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">AI Analysis</h1>
      <p class="ws-page-subtitle">Real predictions and assessments powered by your work patterns.</p>

      <!-- Action buttons -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <button mat-flat-button color="primary" (click)="runFatigue()" [disabled]="loading()" style="border-radius: 12px;">
          <mat-icon>psychology</mat-icon> Assess fatigue
        </button>
        <button mat-flat-button (click)="runPerformance()" [disabled]="loading()" style="border-radius: 12px;">
          <mat-icon>trending_up</mat-icon> Predict performance
        </button>
        <button mat-stroked-button (click)="runAnomalies()" [disabled]="loading()" style="border-radius: 12px;">
          <mat-icon>detector</mat-icon> Detect anomalies
        </button>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" style="margin-bottom: 16px; border-radius: 4px;" />
      }

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <!-- Fatigue assessment -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: #f59e0b;">battery_alert</mat-icon>
            Fatigue assessment
          </div>
          @if (latestFatigue()) {
            <div style="text-align: center; padding: 20px 0;">
              <div class="ws-stat-value" [style.color]="riskColor(latestFatigue()!.risk_category)">
                {{ latestFatigue()!.risk_category | titlecase }}
              </div>
              <div style="color: var(--ws-text-muted); margin-top: 8px;">
                {{ (latestFatigue()!.risk_probability * 100 | number:'1.0-0') }}% probability
              </div>
              <div style="margin-top: 12px;">
                Confidence: {{ (latestFatigue()?.confidence ?? 0) * 100 | number:'1.0-0' }}%
              </div>
            </div>
            @if (topFatigueFeatures().length > 0) {
              <div style="margin-top: 16px;">
                <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Key factors</div>
                @for (f of topFatigueFeatures(); track f.name) {
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div style="flex: 1; font-size: 0.82rem; color: var(--ws-text-muted);">{{ f.name }}</div>
                    <div style="width: 60px; height: 6px; border-radius: 3px; background: var(--ws-primary-light); overflow: hidden;">
                      <div [style.width.%]="f.importance * 100" style="height: 100%; background: var(--ws-primary); border-radius: 3px;"></div>
                    </div>
                  </div>
                }
              </div>
            }
            <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 12px;">
              {{ latestFatigue()!.comparison_to_baseline }}
            </div>
          } @else {
            <div style="text-align: center; padding: 30px; color: var(--ws-text-muted);">
              Run an assessment to see your fatigue estimation.
            </div>
          }
        </div>

        <!-- Performance prediction -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: var(--ws-accent);">trending_up</mat-icon>
            Performance forecast
          </div>
          @if (latestPrediction()) {
            <div style="text-align: center; padding: 20px 0;">
              <div class="ws-stat-value" [style.color]="riskColor(latestPrediction()!.risk_label)">
                {{ latestPrediction()!.risk_label | titlecase }}
              </div>
              <div style="color: var(--ws-text-muted); margin-top: 8px;">
                Next {{ latestPrediction()!.horizon_minutes }} minutes
              </div>
              <div style="margin-top: 12px;">
                Variation: {{ latestPrediction()!.predicted_variation | number:'1.2-2' }}
              </div>
            </div>
            @if (topPerfFeatures().length > 0) {
              <div style="margin-top: 16px;">
                <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Key factors</div>
                @for (f of topPerfFeatures(); track f.name) {
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <div style="flex: 1; font-size: 0.82rem; color: var(--ws-text-muted);">{{ f.name }}</div>
                    <div style="width: 60px; height: 6px; border-radius: 3px; background: var(--ws-accent-light); overflow: hidden;">
                      <div [style.width.%]="f.importance * 100" style="height: 100%; background: var(--ws-accent); border-radius: 3px;"></div>
                    </div>
                  </div>
                }
              </div>
            }
          } @else {
            <div style="text-align: center; padding: 30px; color: var(--ws-text-muted);">
              Run a prediction to forecast your performance.
            </div>
          }
        </div>
      </div>

      <!-- Anomaly detection -->
      @if (anomalyResult()) {
        <div class="ws-card" style="margin-top: 16px;">
          <div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: #8b5cf6;">radar</mat-icon>
            Anomaly detection
          </div>
          <div style="display: flex; gap: 24px; flex-wrap: wrap;">
            <div>Anomalies found: <strong>{{ anomalyResult()?.anomaly_count }}</strong></div>
            <div>Pattern: <strong>{{ anomalyResult()?.is_anomalous ? 'Unusual activity detected' : 'Within normal range' }}</strong></div>
            <div>Score: <strong>{{ anomalyResult()?.anomaly_score | number:'1.2-2' }}</strong></div>
          </div>
        </div>
      }

      <!-- Fatigue history chart -->
      <div class="ws-card" style="margin-top: 16px;">
        <div style="font-weight: 600; margin-bottom: 16px;">Fatigue risk history</div>
        <div class="ws-chart" [appEcharts]="historyChart()"></div>
      </div>

      @if (unreliable()) {
        <div style="margin-top: 16px; padding: 12px 16px; background: #fef3c7; border-radius: 10px; font-size: 0.85rem; color: #92400e;">
          <mat-icon style="vertical-align: middle; margin-right: 4px;">info</mat-icon>
          Predictions may not be reliable yet — the system needs more data to learn your patterns. Keep using the agent and submitting self-reports.
        </div>
      }
    </div>
  `,
})
export class AnalysisComponent implements OnInit {
  private aiSvc = inject(AiService);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  latestFatigue = signal<FatigueAssessment | null>(null);
  latestPrediction = signal<PerformancePrediction | null>(null);
  topFatigueFeatures = signal<{ name: string; importance: number }[]>([]);
  topPerfFeatures = signal<{ name: string; importance: number }[]>([]);
  anomalyResult = signal<{ anomaly_count: number; is_anomalous: boolean; anomaly_score: number } | null>(null);
  fatigueHistory = signal<FatigueAssessment[]>([]);
  unreliable = signal(false);
  mobile = signal(window.innerWidth < 768);

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.aiSvc.fatigueHistory(1, 20).subscribe((page) => {
      this.fatigueHistory.set(page.items);
      if (page.items.length > 0) {
        this.latestFatigue.set(page.items[0]);
        this.parseFatigueFeatures();
        this.unreliable.set(page.items[0].risk_category === 'unknown');
      }
    });
    this.aiSvc.performanceHistory(1, 5).subscribe((page) => {
      if (page.items.length > 0) {
        this.latestPrediction.set(page.items[0]);
        this.parsePerfFeatures();
      }
    });
  }

  runFatigue() {
    this.loading.set(true);
    this.aiSvc.assessFatigue().subscribe((result) => {
      this.latestFatigue.set(result);
      this.parseFatigueFeatures();
      this.unreliable.set(result.risk_category === 'unknown');
      this.loading.set(false);
      this.loadHistory();
      this.snackBar.open('Fatigue assessment complete', 'Close', { duration: 2500 });
    });
  }

  runPerformance() {
    this.loading.set(true);
    this.aiSvc.predictPerformance().subscribe((result) => {
      this.latestPrediction.set(result);
      this.parsePerfFeatures();
      this.loading.set(false);
      this.snackBar.open('Performance forecast ready', 'Close', { duration: 2500 });
    });
  }

  runAnomalies() {
    this.loading.set(true);
    this.aiSvc.detectAnomalies().subscribe((result) => {
      this.anomalyResult.set(result);
      this.loading.set(false);
    });
  }

  private parseFatigueFeatures() {
    const f = this.latestFatigue()?.top_features;
    if (f) {
      try {
        const parsed = JSON.parse(f);
        this.topFatigueFeatures.set(Object.entries(parsed).slice(0, 5).map(([name, val]) => ({
          name: name.replace(/_/g, ' '),
          importance: Math.abs(val as number),
        })));
      } catch {}
    }
  }

  private parsePerfFeatures() {
    const f = this.latestPrediction()?.top_features;
    if (f) {
      try {
        const parsed = JSON.parse(f);
        this.topPerfFeatures.set(Object.entries(parsed).slice(0, 5).map(([name, val]) => ({
          name: name.replace(/_/g, ' '),
          importance: Math.abs(val as number),
        })));
      } catch {}
    }
  }

  riskColor(risk: string): string {
    const r = risk.toLowerCase();
    if (r.includes('low')) return '#15803d';
    if (r.includes('moderate')) return '#a16207';
    if (r.includes('high')) return '#b91c1c';
    return 'var(--ws-text-muted)';
  }

  historyChart() {
    const data = this.fatigueHistory().slice().reverse();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: data.map((a) => new Date(a.assessed_at).toLocaleDateString()) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'line', smooth: true,
        data: data.map((a) => Math.round(a.risk_probability * 100)),
        areaStyle: { color: 'rgba(245, 158, 11, 0.15)' },
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
      }],
    };
  }
}
