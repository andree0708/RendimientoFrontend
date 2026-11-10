import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { SessionService } from '../../services/session.service';
import { WorkSession } from '../../models';
import { PaginationComponent } from '../../shared/pagination';

@Component({
  selector: 'app-sessions',
  imports: [CommonModule, MatButtonModule, MatChipsModule, MatIconModule, MatProgressBarModule, PaginationComponent],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Sesiones de trabajo</h1>
      <p class="ws-page-subtitle">Tu historial completo de sesiones de trabajo registradas.</p>

      <div class="ws-card">
        @if (loading()) {
          <mat-progress-bar mode="indeterminate" style="margin-bottom: 12px;" />
        }

        @if (error()) {
          <div style="text-align: center; padding: 32px; color: var(--ws-text-muted);">
            <mat-icon style="font-size: 40px; width: 40px; height: 40px; color: #b91c1c;">error_outline</mat-icon>
            <p style="margin: 12px 0;">{{ error() }}</p>
            <button mat-stroked-button (click)="loadPage(page())" style="border-radius: 10px;">
              <mat-icon>refresh</mat-icon> Reintentar
            </button>
          </div>
        } @else {
          @for (s of sessions(); track s.id) {
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--ws-border);">
              <div style="width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;"
                [style.background]="s.status === 'active' ? '#dcfce7' : 'var(--ws-surface-2)'">
                <mat-icon [style.color]="s.status === 'active' ? '#15803d' : 'var(--ws-text-muted)'">
                  {{ s.status === 'active' ? 'play_circle' : 'history' }}
                </mat-icon>
              </div>
              <div style="flex: 1;">
                <div style="font-weight: 500;">
                  {{ s.started_at | date: 'EEE, MMM d, y' }}
                </div>
                <div style="font-size: 0.85rem; color: var(--ws-text-muted);">
                  {{ s.started_at | date: 'h:mm a' }}
                  @if (s.ended_at) { - {{ s.ended_at | date: 'h:mm a' }} }
                  &middot; {{ formatTime(s.total_active_seconds) }} activo
                  &middot; {{ s.pause_count }} pausas
                </div>
              </div>
              <mat-chip [style.background]="s.status === 'active' ? '#dcfce7' : s.status === 'completed' ? '#e0e7ff' : '#fef3c7'"
                [style.color]="s.status === 'active' ? '#15803d' : s.status === 'completed' ? '#4338ca' : '#a16207'">
                {{ sessionStatusEs(s.status) }}
              </mat-chip>
            </div>
          }
          @if (sessions().length === 0 && !loading()) {
            <div style="text-align: center; padding: 40px; color: var(--ws-text-muted);">
              <mat-icon style="font-size: 48px; width: 48px; height: 48px; opacity: 0.3;">schedule</mat-icon>
              <p style="margin-top: 12px;">Aún no hay sesiones. Inicia una desde el panel principal.</p>
            </div>
          }

          <app-pagination
            [page]="page()"
            [totalPages]="totalPages()"
            [total]="total()"
            (pageChange)="loadPage($event)" />
        }
      </div>
    </div>
  `,
})
export class SessionsComponent implements OnInit {
  private sessionSvc = inject(SessionService);
  sessions = signal<WorkSession[]>([]);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  loading = signal(false);
  error = signal('');

  ngOnInit() {
    this.loadPage(1);
  }

  loadPage(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.sessionSvc.listSessions(page, 20).subscribe({
      next: (result) => {
        this.sessions.set(result.items);
        this.page.set(result.meta.page);
        this.totalPages.set(result.meta.total_pages);
        this.total.set(result.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar tus sesiones. Revisa tu conexión e inténtalo de nuevo.');
      },
    });
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0 min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} h ${m} min`;
    return `${m} min`;
  }

  /** Los valores del backend se quedan en inglés; se muestran traducidos. */
  sessionStatusEs(status: string): string {
    const map: Record<string, string> = {
      active: 'Activa',
      completed: 'Completada',
    };
    return map[status] ?? status;
  }
}
