import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SessionService } from '../../services/session.service';
import { AiService } from '../../services/ai.service';
import { MetricsService } from '../../services/metrics.service';
import { RecommendationService } from '../../services/recommendation.service';
import { WebSocketService } from '../../core/websocket.service';
import { WorkSession, Recommendation, WSEvent, ActivityMetric } from '../../models';
import { EchartsDirective } from '../../shared/echarts.directive';
import { riskEs as translateRisk } from '../../shared/risk-labels';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressBarModule, MatChipsModule, EchartsDirective],
  template: `
    <div class="ws-fade-in">
      <!-- Greeting -->
      <div style="margin-bottom: 24px;">
        <h1 class="ws-page-title">Hola de nuevo</h1>
        <p class="ws-page-subtitle">Así va tu jornada hasta ahora.</p>
      </div>

      <!-- Session control banner -->
      <div class="ws-card" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;"
            [style.background]="activeSession() ? '#dcfce7' : 'var(--ws-primary-light)'">
            <mat-icon [style.color]="activeSession() ? '#15803d' : 'var(--ws-primary)'">
              {{ activeSession() ? 'play_circle' : 'pause_circle' }}
            </mat-icon>
          </div>
          <div>
            <div style="font-weight: 600; font-size: 1.05rem;">
              {{ activeSession() ? 'Sesión en curso' : 'Sin sesión activa' }}
            </div>
            <div style="font-size: 0.85rem; color: var(--ws-text-muted);">
              @if (activeSession()) {
                Iniciada {{ sessionStarted() | date: 'shortTime' }} &middot; {{ sessionDuration() }}
              } @else {
                Inicia una sesión para empezar a registrar tu actividad
              }
            </div>
          </div>
        </div>
        <button mat-flat-button color="primary" (click)="toggleSession()"
          style="border-radius: 12px; font-weight: 500;">
          <mat-icon>{{ activeSession() ? 'stop' : 'play_arrow' }}</mat-icon>
          {{ activeSession() ? 'Terminar sesión' : 'Iniciar sesión' }}
        </button>
      </div>

      <!-- Stat cards row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="ws-card ws-kpi" style="text-align: center; --ws-kpi-glow: rgba(20, 184, 166, 0.12);">
          <span class="ws-kpi-icon" style="background: linear-gradient(135deg, #14b8a6, #0d9488);">
            <mat-icon>timer</mat-icon>
          </span>
          <div class="ws-stat-label" style="margin-top: 10px;">Tiempo activo</div>
          <div class="ws-stat-value">{{ formatTime(activeSeconds()) }}</div>
          @if (activeSession() && !hasMetrics()) {
            <div style="font-size: 0.75rem; color: var(--ws-text-muted); margin-top: 6px;">
              Sin métricas todavía: conecta el agente o espera la primera ingesta.
            </div>
          }
        </div>
        <div class="ws-card ws-kpi" style="text-align: center; --ws-kpi-glow: rgba(139, 92, 246, 0.12);">
          <span class="ws-kpi-icon" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9);">
            <mat-icon>bolt</mat-icon>
          </span>
          <div class="ws-stat-label" style="margin-top: 10px;">Trabajo continuo</div>
          <div class="ws-stat-value">{{ hasMetrics() || showingRecentActivity() ? formatTime(continuousWork()) : '—' }}</div>
          @if (!hasMetrics() && showingRecentActivity()) {
            <div style="font-size: 0.75rem; color: var(--ws-text-muted); margin-top: 6px;">
              Mejor racha del último registro
            </div>
          }
        </div>
        <div class="ws-card ws-kpi" style="text-align: center; --ws-kpi-glow: rgba(236, 72, 153, 0.12);">
          <span class="ws-kpi-icon" style="background: linear-gradient(135deg, #ec4899, #be185d);">
            <mat-icon>favorite</mat-icon>
          </span>
          <div class="ws-stat-label" style="margin-top: 10px;">Riesgo de fatiga</div>
          <div class="ws-stat-value" [style.color]="riskColor(fatigueRisk())">
            {{ riskLabelEs() }}
          </div>
        </div>
        <div class="ws-card ws-kpi" style="text-align: center; --ws-kpi-glow: rgba(245, 158, 11, 0.14);">
          <span class="ws-kpi-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
            <mat-icon>trending_up</mat-icon>
          </span>
          <div class="ws-stat-label" style="margin-top: 10px;">Pronóstico de rendimiento</div>
          <div class="ws-stat-value" [style.color]="performanceColor()"
            style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            @if (performanceLabel() !== 'unknown') {
              <mat-icon style="font-size: 20px; width: 20px; height: 20px;">{{ performanceArrow() }}</mat-icon>
            }
            {{ performanceLabelEs() }}
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px;">Evolución de la fatiga</div>
          @if (fatigueHistory().length > 0) {
            <div class="ws-chart" [appEcharts]="fatigueChartOptions()"></div>
          } @else {
            <div style="color: var(--ws-text-muted); text-align: center; padding: 40px 20px;">
              Sin evaluaciones de fatiga registradas todavía.
            </div>
          }
        </div>
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
            Actividad en el tiempo
            @if (showingRecentActivity()) {
              <mat-chip style="background: var(--ws-primary-light); color: var(--ws-primary); font-size: 0.72rem;">
                Última actividad registrada
              </mat-chip>
            }
          </div>
          @if (showingRecentActivity()) {
            <div style="font-size: 0.8rem; color: var(--ws-text-muted); margin-bottom: 12px;">
              Esta sesión aún no tiene métricas; se muestra tu actividad más reciente.
            </div>
          }
          @if (activityHistory().length > 0) {
            <div class="ws-chart" [appEcharts]="activityChartOptions()"></div>
          } @else {
            <div style="color: var(--ws-text-muted); text-align: center; padding: 40px 20px;">
              @if (activeSession()) {
                Todavía no hay métricas de actividad para esta sesión.
              } @else {
                Inicia una sesión para registrar métricas de actividad.
              }
            </div>
          }
        </div>
      </div>

      <!-- Recommendations preview -->
      <div class="ws-card" style="margin-bottom: 24px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: #f59e0b;">lightbulb</mat-icon>
          Recomendaciones para ti
        </div>
        @for (rec of recommendations(); track rec.id) {
          <div style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ws-border);">
            <mat-chip [style.background]="rec.priority === 'high' ? '#fee2e2' : 'var(--ws-primary-light)'"
              [style.color]="rec.priority === 'high' ? '#b91c1c' : 'var(--ws-primary)'">
              {{ recCategoryEs(rec.category) }}
            </mat-chip>
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ rec.title }}</div>
              <div style="font-size: 0.85rem; color: var(--ws-text-muted);">{{ rec.body }}</div>
            </div>
          </div>
        }
        @if (recommendations().length === 0) {
          <div style="color: var(--ws-text-muted); text-align: center; padding: 20px;">
            Aún no hay recomendaciones. Sigue trabajando y el sistema aprenderá tus patrones.
          </div>
        }
      </div>

      <!-- Recent sessions -->
      <div class="ws-card">
        <div style="font-weight: 600; margin-bottom: 16px;">Sesiones recientes</div>
        @for (s of recentSessions(); track s.id) {
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--ws-border);">
            <div>
              <div style="font-weight: 500;">{{ s.started_at | date: 'MMM d, h:mm a' }}</div>
              <div style="font-size: 0.8rem; color: var(--ws-text-muted);">
                {{ formatTime(s.total_active_seconds) }} activo &middot; {{ s.pause_count }} pausas
              </div>
            </div>
            <mat-chip [style.background]="s.status === 'completed' ? '#dcfce7' : '#fef3c7'"
              [style.color]="s.status === 'completed' ? '#15803d' : '#a16207'">
              {{ sessionStatusEs(s.status) }}
            </mat-chip>
          </div>
        }
        @if (recentSessions().length === 0) {
          <div style="color: var(--ws-text-muted); text-align: center; padding: 20px;">
            Todavía no hay sesiones registradas.
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private sessionSvc = inject(SessionService);
  private aiSvc = inject(AiService);
  private metricsSvc = inject(MetricsService);
  private recSvc = inject(RecommendationService);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);

  activeSession = signal<WorkSession | null>(null);
  sessionStarted = signal<Date>(new Date());
  activeSeconds = signal(0);
  continuousWork = signal(0);
  hasMetrics = signal(false);
  /** True when the chart shows recent cross-session activity (labeled fallback). */
  showingRecentActivity = signal(false);
  fatigueRisk = signal('unknown');
  fatigueProbability = signal(0);
  performanceLabel = signal('unknown');
  performanceValue = signal(0);
  recommendations = signal<Recommendation[]>([]);
  recentSessions = signal<WorkSession[]>([]);
  fatigueHistory = signal<{ time: string; value: number }[]>([]);
  activityHistory = signal<{ time: string; active: number; idle: number }[]>([]);

  private wsUnsub: (() => void) | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;

  mobile = signal(window.innerWidth < 768);

  ngOnInit() {
    this.loadDashboard();

    // Listen for WebSocket events
    this.wsUnsub = this.ws.on('*', (event: WSEvent) => this.handleWSEvent(event));

    // Keep the elapsed-session label live without polling the backend.
    this.durationTimer = setInterval(() => this.sessionDuration(), 1000);

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy() {
    this.wsUnsub?.();
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.mobile.set(window.innerWidth < 768);

  loadDashboard() {
    // Load active session
    this.sessionSvc.getActiveSession().subscribe({
      next: (s) => {
        this.activeSession.set(s);
        if (s) {
          this.sessionStarted.set(new Date(s.started_at));
          this.activeSeconds.set(s.total_active_seconds);
          this.loadActivity(s.id);
        } else {
          this.clearActivity();
        }
      },
      error: () => {
        this.activeSession.set(null);
        this.clearActivity();
      },
    });

    // Load recent sessions
    this.sessionSvc.listSessions(1, 5).subscribe((page) => {
      this.recentSessions.set(page.items);
    });

    // Load latest fatigue assessment
    this.aiSvc.fatigueHistory(1, 10).subscribe((page) => {
      if (page.items.length > 0) {
        const latest = page.items[0];
        this.fatigueRisk.set(latest.risk_category);
        this.fatigueProbability.set(latest.risk_probability);
        this.fatigueHistory.set(page.items.reverse().map((a) => ({
          time: new Date(a.assessed_at).toLocaleTimeString(),
          value: Math.round(a.risk_probability * 100),
        })));
      }
    });

    // Load latest performance prediction
    this.aiSvc.performanceHistory(1, 1).subscribe((page) => {
      if (page.items.length > 0) {
        const latest = page.items[0];
        this.performanceLabel.set(latest.risk_label.replace(/_/g, ' '));
        this.performanceValue.set(latest.predicted_variation);
      } else {
        this.performanceLabel.set('unknown');
        this.performanceValue.set(0);
      }
    });

    // Load recommendations
    this.recSvc.listRecommendations(1, 5, 'pending').subscribe((page) => {
      this.recommendations.set(page.items);
    });
  }

  private loadActivity(sessionId: string) {
    this.metricsSvc.listSessionMetrics(sessionId, 1, 100).subscribe({
      next: (page) => {
        if (page.items.length > 0) {
          this.setActivityFromMetrics(page.items);
          this.showingRecentActivity.set(false);
          return;
        }
        // Active session has no metrics yet: fall back to the user's most
        // recent activity (explicitly labeled) instead of an empty chart.
        // KPIs stay session-scoped: hasMetrics/continuousWork are untouched.
        this.metricsSvc.listRecentMetrics(1, 100).subscribe({
          next: (recent) => {
            const metrics = [...recent.items].sort(
              (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
            );
            this.activityHistory.set(metrics.slice(-100).map((m) => ({
              time: new Date(m.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              active: Math.round(m.active_seconds / 60),
              idle: Math.round(m.idle_seconds / 60),
            })));
            this.continuousWork.set(metrics.reduce(
              (peak, m) => Math.max(peak, m.continuous_work_seconds || 0), 0,
            ));
            this.showingRecentActivity.set(metrics.length > 0);
          },
          error: () => this.clearActivity(),
        });
      },
      error: () => this.clearActivity(),
    });
  }

  private setActivityFromMetrics(metrics: ActivityMetric[]) {
    const sorted = [...metrics].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
    );
    this.activityHistory.set(sorted.map((m) => ({
      time: new Date(m.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active: Math.round(m.active_seconds / 60),
      idle: Math.round(m.idle_seconds / 60),
    })));
    const latest = sorted[sorted.length - 1];
    this.hasMetrics.set(sorted.length > 0);
    this.continuousWork.set(latest?.continuous_work_seconds ?? 0);
  }

  private clearActivity() {
    this.activityHistory.set([]);
    this.hasMetrics.set(false);
    this.continuousWork.set(0);
    this.showingRecentActivity.set(false);
  }

  private handleWSEvent(event: WSEvent): void {
    switch (event.event_type) {
      case 'session.started':
        this.sessionSvc.getActiveSession().subscribe((s) => {
          this.activeSession.set(s);
          if (s) {
            this.sessionStarted.set(new Date(s.started_at));
            this.activeSeconds.set(s.total_active_seconds);
            this.loadActivity(s.id);
          }
        });
        break;
      case 'session.stopped':
        this.activeSession.set(null);
        this.activeSeconds.set(0);
        this.clearActivity();
        this.sessionSvc.listSessions(1, 5).subscribe((page) => this.recentSessions.set(page.items));
        break;
      case 'metrics.batch_received':
        this.sessionSvc.getActiveSession().subscribe((s) => {
          if (s) {
            this.activeSeconds.set(s.total_active_seconds);
            this.loadActivity(s.id);
          }
        });
        break;
      case 'fatigue.risk_updated':
        this.fatigueRisk.set((event.payload as any)['risk_category'] || 'unknown');
        this.fatigueProbability.set((event.payload as any)['risk_probability'] || 0);
        // Refresh history
        this.aiSvc.fatigueHistory(1, 10).subscribe((page) => {
          this.fatigueHistory.set(page.items.reverse().map((a) => ({
            time: new Date(a.assessed_at).toLocaleTimeString(),
            value: Math.round(a.risk_probability * 100),
          })));
        });
        break;
      case 'performance.forecast_updated': {
        const riskLabel = String((event.payload as any)['risk_label'] || 'unknown');
        this.performanceLabel.set(riskLabel.replace(/_/g, ' '));
        this.performanceValue.set(Number((event.payload as any)['predicted_variation']) || 0);
        break;
      }
      case 'recommendation.created':
        this.recSvc.listRecommendations(1, 5, 'pending').subscribe((page) => {
          this.recommendations.set(page.items);
        });
        break;
    }
  }

  toggleSession() {
    if (this.activeSession()) {
      this.sessionSvc.stopSession(this.activeSession()!.id).subscribe({
        next: () => {
          this.activeSession.set(null);
          this.activeSeconds.set(0);
          this.clearActivity();
          this.sessionSvc.listSessions(1, 5).subscribe((page) => this.recentSessions.set(page.items));
        },
        error: (err) => {
          // 409 = already ended (e.g. stopped elsewhere): sync state instead of erroring.
          if (err?.status === 409) {
            this.activeSession.set(null);
            this.activeSeconds.set(0);
            this.clearActivity();
            this.sessionSvc.getActiveSession().subscribe((s) => {
              this.activeSession.set(s);
              if (s) {
                this.sessionStarted.set(new Date(s.started_at));
                this.activeSeconds.set(s.total_active_seconds);
                this.loadActivity(s.id);
              }
            });
            this.snackBar.open('La sesión ya había terminado.', 'Cerrar', { duration: 2500 });
            return;
          }
          this.snackBar.open('No se pudo terminar la sesión. Inténtalo de nuevo.', 'Cerrar', { duration: 3000 });
        },
      });
    } else {
      this.sessionSvc.startSession('Started from dashboard').subscribe({
        next: (s) => {
          this.activeSession.set(s);
          this.sessionStarted.set(new Date(s.started_at));
          this.activeSeconds.set(s.total_active_seconds);
          this.loadActivity(s.id);
        },
        error: (err) => {
          // A session may already be active (e.g. started by the local agent).
          if (err?.status === 409) {
            this.sessionSvc.getActiveSession().subscribe((s) => {
              this.activeSession.set(s);
              if (s) {
                this.sessionStarted.set(new Date(s.started_at));
                this.activeSeconds.set(s.total_active_seconds);
                this.loadActivity(s.id);
              }
            });
            return;
          }
          this.snackBar.open('No se pudo iniciar la sesión. Inténtalo de nuevo.', 'Cerrar', { duration: 3000 });
        },
      });
    }
  }

  sessionDuration(): string {
    if (!this.activeSession()) return '';
    const diff = Date.now() - this.sessionStarted().getTime();
    // Clamp: clock skew or a future-dated start must never show negatives.
    return this.formatTime(Math.max(0, Math.floor(diff / 1000)));
  }

  formatTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds || 0));
    if (!total) return '0 min';
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
  }

  /** Backend values stay in English; shared helper renders them in Spanish. */
  riskLabelEs(): string {
    return translateRisk(this.fatigueRisk());
  }

  performanceLabelEs(): string {
    return translateRisk(this.performanceLabel());
  }

  sessionStatusEs(status: string): string {
    const map: Record<string, string> = {
      active: 'Activa', completed: 'Completada',
    };
    return map[status] ?? status;
  }

  recCategoryEs(category: string): string {
    const map: Record<string, string> = {
      break: 'Pausa', task_management: 'Tareas', schedule: 'Horario',
      workload: 'Carga de trabajo', general: 'General',
    };
    return map[category] ?? category.replace(/_/g, ' ');
  }

  riskColor(risk: string): string {
    if (risk === 'low') return '#15803d';
    if (risk === 'moderate') return '#a16207';
    if (risk === 'high') return '#b91c1c';
    return 'var(--ws-text-muted)';
  }

  performanceColor(): string {
    const v = this.performanceValue();
    if (v > 0) return '#15803d';
    if (v < -0.1) return '#b91c1c';
    return '#a16207';
  }

  performanceArrow(): string {
    const v = this.performanceValue();
    if (v > 0.05) return 'trending_up';
    if (v < -0.05) return 'trending_down';
    return 'trending_flat';
  }

  // ---- Chart options ----
  fatigueChartOptions() {
    const data = this.fatigueHistory();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: data.map((d) => d.time), axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', max: 100, axisLabel: { fontSize: 11, formatter: '{value}%' } },
      series: [{
        type: 'line',
        smooth: true,
        data: data.map((d) => d.value),
        areaStyle: { color: 'rgba(236, 72, 153, 0.15)' },
        lineStyle: { color: '#ec4899', width: 2 },
        itemStyle: { color: '#ec4899' },
      }],
    };
  }

  activityChartOptions() {
    const data = this.activityHistory();
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Activa', 'Inactiva'], bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.map((d) => d.time) },
      yAxis: { type: 'value' },
      series: [
        { name: 'Activa', type: 'bar', stack: 'total', data: data.map((d) => d.active), itemStyle: { color: '#14b8a6' } },
        { name: 'Inactiva', type: 'bar', stack: 'total', data: data.map((d) => d.idle), itemStyle: { color: '#fbcfe8' } },
      ],
    };
  }
}
