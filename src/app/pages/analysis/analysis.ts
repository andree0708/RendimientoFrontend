import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AiService } from '../../services/ai.service';
import { EchartsDirective } from '../../shared/echarts.directive';
import { FatigueAssessment, LLMAnalysis, PerformancePrediction } from '../../models';

@Component({
  selector: 'app-analysis',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule, EchartsDirective],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Análisis IA</h1>
      <p class="ws-page-subtitle">Predicciones y evaluaciones reales basadas en tus patrones de trabajo.</p>

      <!-- Action buttons -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <button mat-flat-button color="primary" (click)="runLLMAnalysis()" [disabled]="loading()"
          style="border-radius: 12px;" class="ws-btn-brand">
          <mat-icon>auto_awesome</mat-icon> Analizar con IA
        </button>
        <button mat-stroked-button (click)="runFatigue()" [disabled]="loading()" style="border-radius: 12px;">
          <mat-icon>psychology</mat-icon> Evaluar fatiga (modelo)
        </button>
        <button mat-stroked-button (click)="runPerformance()" [disabled]="loading()" style="border-radius: 12px;">
          <mat-icon>trending_up</mat-icon> Predecir rendimiento (modelo)
        </button>
        <button mat-stroked-button (click)="runAnomalies()" [disabled]="loading()" style="border-radius: 12px;">
          <mat-icon>detector</mat-icon> Detectar anomalías
        </button>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" style="margin-bottom: 16px; border-radius: 4px;" />
      }

      <!-- LLM result -->
      @if (llmResult()) {
        <div class="ws-card" style="margin-bottom: 24px; border-left: 4px solid var(--ws-violet);">
          <div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <mat-icon style="color: var(--ws-violet);">auto_awesome</mat-icon>
            Análisis generado por IA
            <mat-chip style="background: #ede9fe; color: #6d28d9; font-size: 0.75rem;">
              {{ llmResult()!.generated_by === 'groq' ? ('Groq · ' + llmModelShort()) : 'No disponible' }}
            </mat-chip>
            @if (llmResult()!.success) {
              <mat-chip [style.background]="llmResult()!.data_basis === 'real' ? '#dcfce7' : '#fef3c7'"
                [style.color]="llmResult()!.data_basis === 'real' ? '#15803d' : '#92400e'"
                style="font-size: 0.75rem;">
                {{ llmResult()!.data_basis === 'real' ? 'Datos reales' : llmResult()!.data_basis === 'demo' ? 'Datos de demostración' : 'Datos mixtos' }}
              </mat-chip>
            }
          </div>
          @if (llmResult()!.success) {
            @if (llmResult()!.fatigue; as f) {
              <div style="margin-bottom: 10px;">
                <strong>Fatiga: {{ riskEs(f.risk_category) }}</strong>
                <span style="color: var(--ws-text-muted);"> ({{ (f.risk_probability * 100) | number:'1.0-0' }}% · confianza {{ (f.confidence * 100) | number:'1.0-0' }}%)</span>
              </div>
              <p style="color: var(--ws-text); margin: 0 0 8px; line-height: 1.5;">{{ f.summary }}</p>
              @if (f.factors.length > 0) {
                <div style="font-size: 0.82rem; color: var(--ws-text-muted); margin-bottom: 10px;">
                  Factores: {{ factorNames(f) }}
                </div>
              }
            }
            @if (llmResult()!.performance; as p) {
              <div style="margin-bottom: 10px;">
                <strong>Rendimiento: {{ perfTrendEs(p.trend) }}</strong>
                <span style="color: var(--ws-text-muted);"> (variación {{ p.variation | number:'1.2-2' }})</span>
              </div>
              <p style="color: var(--ws-text); margin: 0 0 8px; line-height: 1.5;">{{ p.summary }}</p>
            }
            @if (llmResult()!.anomalies.length > 0) {
              <div style="font-weight: 600; font-size: 0.85rem; margin: 8px 0 4px;">Observaciones</div>
              @for (a of llmResult()!.anomalies; track a.description) {
                <div style="font-size: 0.85rem; color: var(--ws-text); margin-bottom: 4px;">
                  &middot; {{ a.description }}
                </div>
              }
            }
            @if (llmResult()!.recommendations_created > 0) {
              <div style="font-size: 0.82rem; color: var(--ws-text-muted); margin-top: 8px;">
                Se {{ llmResult()!.recommendations_created === 1 ? 'creó 1 recomendación' : 'crearon ' + llmResult()!.recommendations_created + ' recomendaciones' }} en la pestaña Recomendaciones.
              </div>
            }
          } @else {
            <p style="color: var(--ws-text-muted); margin: 0;">{{ llmResult()!.message }}</p>
          }
        </div>
      }

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <!-- Fatigue assessment -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: #f59e0b;">battery_alert</mat-icon>
            Evaluación de fatiga
          </div>
          @if (latestFatigue()) {
            <div style="text-align: center; padding: 20px 0;">
              <div class="ws-stat-value" [style.color]="riskColor(latestFatigue()!.risk_category)">
                {{ riskEs(latestFatigue()!.risk_category) }}
              </div>
              <div style="color: var(--ws-text-muted); margin-top: 8px;">
                {{ (latestFatigue()!.risk_probability * 100 | number:'1.0-0') }}% de probabilidad
              </div>
              <div style="margin-top: 12px;">
                Confianza: {{ (latestFatigue()?.confidence ?? 0) * 100 | number:'1.0-0' }}%
              </div>
            </div>
            @if (topFatigueFeatures().length > 0) {
              <div style="margin-top: 16px;">
                <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Factores clave</div>
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
              Ejecuta una evaluación para ver tu estimación de fatiga.
            </div>
          }
        </div>

        <!-- Performance prediction -->
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: var(--ws-accent);">trending_up</mat-icon>
            Pronóstico de rendimiento
          </div>
          @if (latestPrediction()) {
            <div style="text-align: center; padding: 20px 0;">
              <div class="ws-stat-value" [style.color]="riskColor(latestPrediction()!.risk_label)">
                {{ riskEs(latestPrediction()!.risk_label) }}
              </div>
              <div style="color: var(--ws-text-muted); margin-top: 8px;">
                Próximos {{ latestPrediction()!.horizon_minutes }} minutos
              </div>
              <div style="margin-top: 12px;">
                Variación: {{ latestPrediction()!.predicted_variation | number:'1.2-2' }}
              </div>
            </div>
            @if (topPerfFeatures().length > 0) {
              <div style="margin-top: 16px;">
                <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;">Factores clave</div>
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
              Ejecuta una predicción para pronosticar tu rendimiento.
            </div>
          }
        </div>
      </div>

      <!-- Anomaly detection -->
      @if (anomalyResult()) {
        <div class="ws-card" style="margin-top: 16px;">
          <div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <mat-icon style="color: #8b5cf6;">radar</mat-icon>
            Detección de anomalías
          </div>
          <div style="display: flex; gap: 24px; flex-wrap: wrap;">
            <div>Anomalías encontradas: <strong>{{ anomalyResult()?.anomaly_count }}</strong></div>
            <div>Patrón: <strong>{{ anomalyResult()?.is_anomalous ? 'Actividad inusual detectada' : 'Dentro del rango normal' }}</strong></div>
            <div>Puntuación: <strong>{{ anomalyResult()?.anomaly_score | number:'1.2-2' }}</strong></div>
          </div>
        </div>
      }

      <!-- Fatigue history chart -->
      <div class="ws-card" style="margin-top: 16px;">
        <div style="font-weight: 600; margin-bottom: 16px;">Historial de riesgo de fatiga</div>
        @if (fatigueHistory().length > 0) {
          <div class="ws-chart" [appEcharts]="historyChart()"></div>
        } @else {
          <div style="text-align: center; padding: 30px; color: var(--ws-text-muted);">
            Aún no hay evaluaciones registradas.
          </div>
        }
      </div>

      @if (unreliable()) {
        <div style="margin-top: 16px; padding: 12px 16px; background: #fef3c7; border-radius: 10px; font-size: 0.85rem; color: #92400e;">
          <mat-icon style="vertical-align: middle; margin-right: 4px;">info</mat-icon>
          Ningún modelo activo ha superado el control de calidad para esta predicción, por lo que el resultado se marca
          <strong>desconocido</strong>. No se basa en un modelo validado.
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
  llmResult = signal<LLMAnalysis | null>(null);
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
    this.aiSvc.assessFatigue().subscribe({
      next: (result) => {
        this.latestFatigue.set(result);
        this.parseFatigueFeatures();
        this.unreliable.set(result.risk_category === 'unknown');
        this.loading.set(false);
        this.loadHistory();
        this.snackBar.open('Evaluación de fatiga completada', 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No hay ningún modelo activo disponible para esta evaluación', 'Cerrar', { duration: 3500 });
      },
    });
  }

  runPerformance() {
    this.loading.set(true);
    this.aiSvc.predictPerformance().subscribe({
      next: (result) => {
        this.latestPrediction.set(result);
        this.parsePerfFeatures();
        this.unreliable.set(result.risk_label === 'unknown');
        this.loading.set(false);
        this.snackBar.open('Pronóstico de rendimiento listo', 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('No hay ningún modelo activo disponible para este pronóstico', 'Cerrar', { duration: 3500 });
      },
    });
  }

  runAnomalies() {
    this.loading.set(true);
    this.aiSvc.detectAnomalies().subscribe({
      next: (result) => {
        this.anomalyResult.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('La detección de anomalías no está disponible', 'Cerrar', { duration: 3000 });
      },
    });
  }

  runLLMAnalysis() {
    this.loading.set(true);
    this.aiSvc.analyzeWithLLM().subscribe({
      next: (result) => {
        this.llmResult.set(result);
        this.loading.set(false);
        if (result.success) {
          this.loadHistory();
          this.snackBar.open(result.message || 'Análisis completado', 'Cerrar', { duration: 3000 });
        } else {
          this.snackBar.open(result.message || 'Análisis no disponible', 'Cerrar', { duration: 4000 });
        }
      },
      error: () => {
        this.loading.set(false);
        this.llmResult.set(null);
        this.snackBar.open('No se pudo contactar el servicio de análisis', 'Cerrar', { duration: 3000 });
      },
    });
  }

  llmModelShort(): string {
    const m = this.llmResult()?.model ?? '';
    const known: Record<string, string> = {
      'openai/gpt-oss-20b': 'GPT-OSS 20B',
      'openai/gpt-oss-120b': 'GPT-OSS 120B',
      'llama-3.3-70b-versatile': 'Llama 3.3 70B',
      'qwen/qwen3.8-27b': 'Qwen3 27B',
    };
    if (known[m]) return known[m];
    return m.replace('llama-', 'Llama ').replace(/[-_]/g, ' ');
  }

  factorNames(f: { factors: { name: string }[] }): string {
    return f.factors.map((x) => x.name).join(', ');
  }

  perfTrendEs(trend: string): string {
    const map: Record<string, string> = {
      improving: 'Mejorando', stable: 'Estable', declining: 'Empeorando',
    };
    return map[trend] ?? trend;
  }

  private parseFatigueFeatures() {
    const f = this.latestFatigue()?.top_features;
    if (f) {
      try {
        const parsed = JSON.parse(f);
        // Skip internal meta keys (e.g. _source, _model from the LLM layer).
        this.topFatigueFeatures.set(Object.entries(parsed).filter(([name]) => !name.startsWith('_')).slice(0, 5).map(([name, val]) => ({
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
        // Skip internal meta keys (e.g. _source, _model from the LLM layer).
        this.topPerfFeatures.set(Object.entries(parsed).filter(([name]) => !name.startsWith('_')).slice(0, 5).map(([name, val]) => ({
          name: name.replace(/_/g, ' '),
          importance: Math.abs(val as number),
        })));
      } catch {}
    }
  }

  /** Los valores del backend se quedan en inglés; se muestran traducidos. */
  riskEs(risk: string): string {
    const r = risk.toLowerCase().replace(/_/g, ' ');
    const map: Record<string, string> = {
      low: 'Bajo',
      moderate: 'Moderado',
      high: 'Alto',
      unknown: 'Desconocido',
    };
    return map[r] ?? risk;
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
