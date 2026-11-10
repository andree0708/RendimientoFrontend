import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';

import { SessionService } from '../../services/session.service';
import { AiService } from '../../services/ai.service';
import { RecommendationService } from '../../services/recommendation.service';
import { WebSocketService } from '../../core/websocket.service';
import { WorkSession, FatigueAssessment, PerformancePrediction, Recommendation, WSEvent } from '../../models';
import { EchartsDirective } from '../../shared/echarts.directive';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressBarModule, MatChipsModule, EchartsDirective],
  template: `
    <div class="ws-fade-in">
      <!-- Greeting -->
      <div style="margin-bottom: 24px;">
        <h1 class="ws-page-title">Welcome back</h1>
        <p class="ws-page-subtitle">Here's how your workday is going so far.</p>
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
              {{ activeSession() ? 'Session in progress' : 'No active session' }}
            </div>
            <div style="font-size: 0.85rem; color: var(--ws-text-muted);">
              @if (activeSession()) {
                Started {{ sessionStarted() | date: 'shortTime' }} &middot; {{ sessionDuration() }}
              } @else {
                Start a session to begin tracking your activity
              }
            </div>
          </div>
        </div>
        <button mat-flat-button color="primary" (click)="toggleSession()"
          style="border-radius: 12px; font-weight: 500;">
          <mat-icon>{{ activeSession() ? 'stop' : 'play_arrow' }}</mat-icon>
          {{ activeSession() ? 'End session' : 'Start session' }}
        </button>
      </div>

      <!-- Stat cards row -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Active time</div>
          <div class="ws-stat-value">{{ formatTime(activeSeconds()) }}</div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Since last break</div>
          <div class="ws-stat-value">{{ formatTime(sinceBreak()) }}</div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Fatigue risk</div>
          <div class="ws-stat-value" [style.color]="riskColor(fatigueRisk())">
            {{ fatigueRisk() | titlecase }}
          </div>
        </div>
        <div class="ws-card" style="text-align: center;">
          <div class="ws-stat-label">Performance trend</div>
          <div class="ws-stat-value" [style.color]="performanceColor()">
            {{ performanceArrow() }} {{ performanceLabel() }}
          </div>
        </div>
      </div>

      <!-- Charts row -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px;">Fatigue evolution</div>
          <div class="ws-chart" [appEcharts]="fatigueChartOptions()"></div>
        </div>
        <div class="ws-card">
          <div style="font-weight: 600; margin-bottom: 16px;">Activity over time</div>
          <div class="ws-chart" [appEcharts]="activityChartOptions()"></div>
        </div>
      </div>

      <!-- Recommendations preview -->
      <div class="ws-card" style="margin-bottom: 24px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: #f59e0b;">lightbulb</mat-icon>
          Recommendations for you
        </div>
        @for (rec of recommendations(); track rec.id) {
          <div style="display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--ws-border);">
            <mat-chip [style.background]="rec.priority === 'high' ? '#fee2e2' : 'var(--ws-primary-light)'"
              [style.color]="rec.priority === 'high' ? '#b91c1c' : 'var(--ws-primary)'">
              {{ rec.category }}
            </mat-chip>
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ rec.title }}</div>
              <div style="font-size: 0.85rem; color: var(--ws-text-muted);">{{ rec.body }}</div>
            </div>
          </div>
        }
        @if (recommendations().length === 0) {
          <div style="color: var(--ws-text-muted); text-align: center; padding: 20px;">
            No recommendations yet. Keep working and the system will learn your patterns.
          </div>
        }
      </div>

      <!-- Recent sessions -->
      <div class="ws-card">
        <div style="font-weight: 600; margin-bottom: 16px;">Recent sessions</div>
        @for (s of recentSessions(); track s.id) {
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--ws-border);">
            <div>
              <div style="font-weight: 500;">{{ s.started_at | date: 'MMM d, h:mm a' }}</div>
              <div style="font-size: 0.8rem; color: var(--ws-text-muted);">
                {{ formatTime(s.total_active_seconds) }} active &middot; {{ s.pause_count }} breaks
              </div>
            </div>
            <mat-chip [style.background]="s.status === 'completed' ? '#dcfce7' : '#fef3c7'"
              [style.color]="s.status === 'completed' ? '#15803d' : '#a16207'">
              {{ s.status }}
            </mat-chip>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private sessionSvc = inject(SessionService);
  private aiSvc = inject(AiService);
  private recSvc = inject(RecommendationService);
  private ws = inject(WebSocketService);

  activeSession = signal<WorkSession | null>(null);
  sessionStarted = signal<Date>(new Date());
  activeSeconds = signal(0);
  sinceBreak = signal(0);
  fatigueRisk = signal('unknown');
  fatigueProbability = signal(0);
  performanceLabel = signal('unknown');
  performanceValue = signal(0);
  recommendations = signal<Recommendation[]>([]);
  recentSessions = signal<WorkSession[]>([]);
  fatigueHistory = signal<{ time: string; value: number }[]>([]);
  activityHistory = signal<{ time: string; active: number; idle: number }[]>([]);

  private wsUnsub: (() => void) | null = null;

  mobile = signal(window.innerWidth < 768);

  ngOnInit() {
    this.loadDashboard();

    // Listen for WebSocket events
    this.wsUnsub = this.ws.on('*', (event: WSEvent) => this.handleWSEvent(event));

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy() {
    this.wsUnsub?.();
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
        }
      },
      error: () => {}, // no active session is fine
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

    // Load recommendations
    this.recSvc.listRecommendations(1, 5, 'pending').subscribe((page) => {
      this.recommendations.set(page.items);
    });
  }

  private handleWSEvent(event: WSEvent): void {
    switch (event.event_type) {
      case 'session.started':
        this.sessionSvc.getActiveSession().subscribe((s) => this.activeSession.set(s));
        break;
      case 'session.stopped':
        this.activeSession.set(null);
        this.activeSeconds.set(0);
        this.sessionSvc.listSessions(1, 5).subscribe((page) => this.recentSessions.set(page.items));
        break;
      case 'metrics.batch_received':
        this.sessionSvc.getActiveSession().subscribe((s) => {
          if (s) this.activeSeconds.set(s.total_active_seconds);
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
      case 'performance.forecast_updated':
        this.performanceLabel.set((event.payload as any)['risk_label'] || 'unknown');
        this.performanceValue.set((event.payload as any)['predicted_variation'] || 0);
        break;
      case 'recommendation.created':
        this.recSvc.listRecommendations(1, 5, 'pending').subscribe((page) => {
          this.recommendations.set(page.items);
        });
        break;
    }
  }

  toggleSession() {
    if (this.activeSession()) {
      this.sessionSvc.stopSession(this.activeSession()!.id).subscribe(() => {
        this.activeSession.set(null);
      });
    } else {
      this.sessionSvc.startSession('Started from dashboard').subscribe((s) => {
        this.activeSession.set(s);
        this.sessionStarted.set(new Date(s.started_at));
      });
    }
  }

  sessionDuration(): string {
    if (!this.activeSession()) return '';
    const diff = Date.now() - this.sessionStarted().getTime();
    return this.formatTime(Math.floor(diff / 1000));
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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
    if (data.length === 0) {
      // Demo data for visual when no real data exists yet
      const labels = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm'];
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: ['Active', 'Idle'], bottom: 0, textStyle: { fontSize: 11 } },
        grid: { left: 40, right: 20, top: 20, bottom: 50 },
        xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11 } },
        yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [
          { name: 'Active', type: 'bar', stack: 'total', data: [45, 52, 38, 20, 35, 48, 42, 30], itemStyle: { color: '#14b8a6' } },
          { name: 'Idle', type: 'bar', stack: 'total', data: [15, 8, 22, 40, 25, 12, 18, 30], itemStyle: { color: '#fbcfe8' } },
        ],
      };
    }
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['Active', 'Idle'], bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: data.map((d) => d.time) },
      yAxis: { type: 'value' },
      series: [
        { name: 'Active', type: 'bar', stack: 'total', data: data.map((d) => d.active), itemStyle: { color: '#14b8a6' } },
        { name: 'Idle', type: 'bar', stack: 'total', data: data.map((d) => d.idle), itemStyle: { color: '#fbcfe8' } },
      ],
    };
  }
}
