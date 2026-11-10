import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';

import { RecommendationService } from '../../services/recommendation.service';
import { Recommendation } from '../../models';
import { PaginationComponent } from '../../shared/pagination';

@Component({
  selector: 'app-recommendations',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressBarModule, PaginationComponent],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Recomendaciones</h1>
      <p class="ws-page-subtitle">Sugerencias personalizadas basadas en tus patrones de trabajo. No es consejo médico.</p>

      <!-- Filter chips -->
      <div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
        @for (s of statusFilters; track s.value) {
          <mat-chip (click)="setFilter(s.value)"
            [style.background]="filter() === s.value ? 'var(--ws-primary)' : 'var(--ws-primary-light)'"
            [style.color]="filter() === s.value ? 'white' : 'var(--ws-primary)'"
            style="cursor: pointer;">
            {{ s.label }}
          </mat-chip>
        }
      </div>

      @for (rec of recommendations(); track rec.id) {
        <div class="ws-card" style="margin-bottom: 16px; border-left: 4px solid {{ priorityColor(rec.priority) }};">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <mat-icon [style.color]="categoryIconColor(rec.category)">{{ categoryIcon(rec.category) }}</mat-icon>
                <span style="font-weight: 600;">{{ rec.title }}</span>
                @if (rec.priority === 'high') {
                  <mat-chip style="background: #fee2e2; color: #b91c1c; font-size: 0.75rem;">Prioridad alta</mat-chip>
                }
              </div>
              <p style="color: var(--ws-text); margin: 4px 0 12px; line-height: 1.5;">{{ rec.body }}</p>
              @if (rec.reason) {
                <div style="font-size: 0.85rem; color: var(--ws-text-muted); background: var(--ws-surface-2); padding: 10px 14px; border-radius: 8px;">
                  <mat-icon style="font-size: 16px; vertical-align: middle; margin-right: 4px;">info</mat-icon>
                  {{ rec.reason }}
                </div>
              }
              <div style="display: flex; gap: 12px; margin-top: 12px;">
                @if (rec.status === 'pending') {
                  <button mat-stroked-button (click)="updateStatus(rec, 'accepted')" style="border-radius: 10px;">
                    <mat-icon>check</mat-icon> Aceptar
                  </button>
                  <button mat-stroked-button (click)="updateStatus(rec, 'dismissed')" style="border-radius: 10px;">
                    <mat-icon>close</mat-icon> Descartar
                  </button>
                }
                @if (rec.status === 'accepted') {
                  <button mat-flat-button color="primary" (click)="updateStatus(rec, 'completed')" style="border-radius: 10px;">
                    <mat-icon>task_alt</mat-icon> Marcar como hecho
                  </button>
                }
                <mat-chip [style.background]="statusBg(rec.status)" [style.color]="statusText(rec.status)">
                  {{ recStatusEs(rec.status) }}
                </mat-chip>
              </div>
              <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 8px;">
                {{ rec.generated_at | date: 'MMM d, h:mm a' }}
              </div>
            </div>
          </div>
        </div>
      }

      @if (loading()) {
        <mat-progress-bar mode="indeterminate" style="margin-bottom: 16px;" />
      }

      @if (error()) {
        <div class="ws-card" style="text-align: center; padding: 40px;">
          <mat-icon style="font-size: 48px; width: 48px; height: 48px; color: #b91c1c;">error_outline</mat-icon>
          <p style="color: var(--ws-text-muted); margin: 12px 0;">{{ error() }}</p>
          <button mat-stroked-button (click)="loadRecommendations(page())" style="border-radius: 10px;">
            <mat-icon>refresh</mat-icon> Reintentar
          </button>
        </div>
      } @else if (recommendations().length === 0 && !loading()) {
        <div class="ws-card" style="text-align: center; padding: 48px;">
          <mat-icon style="font-size: 56px; width: 56px; height: 56px; color: var(--ws-primary-light);">lightbulb_outline</mat-icon>
          <p style="color: var(--ws-text-muted); margin-top: 16px; font-size: 0.95rem;">
            @if (filter()) {
              No hay recomendaciones con este estado.
            } @else {
              No hay recomendaciones ahora mismo. Sigue trabajando y el sistema generará sugerencias personalizadas.
            }
          </p>
        </div>
      }

      <app-pagination
        [page]="page()"
        [totalPages]="totalPages()"
        [total]="total()"
        (pageChange)="loadRecommendations($event)" />
    </div>
  `,
})
export class RecommendationsComponent implements OnInit {
  private recSvc = inject(RecommendationService);
  private snackBar = inject(MatSnackBar);

  recommendations = signal<Recommendation[]>([]);
  filter = signal('');
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  loading = signal(false);
  error = signal('');

  statusFilters = [
    { value: '', label: 'Todas' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'accepted', label: 'Aceptada' },
    { value: 'completed', label: 'Completada' },
    { value: 'dismissed', label: 'Descartada' },
  ];

  ngOnInit() {
    this.loadRecommendations(1);
  }

  setFilter(status: string) {
    this.filter.set(status);
    this.loadRecommendations(1);
  }

  loadRecommendations(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.recSvc.listRecommendations(page, 20, this.filter() || undefined).subscribe({
      next: (result) => {
        this.recommendations.set(result.items);
        this.page.set(result.meta.page);
        this.totalPages.set(result.meta.total_pages);
        this.total.set(result.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las recomendaciones. Revisa tu conexión e inténtalo de nuevo.');
      },
    });
  }

  updateStatus(rec: Recommendation, status: string) {
    this.recSvc.updateRecommendation(rec.id, status).subscribe({
      next: () => this.loadRecommendations(this.page()),
      error: () => {
        this.snackBar.open('No se pudo actualizar la recomendación', 'Cerrar', { duration: 3000 });
      },
    });
  }

  priorityColor(priority: string): string {
    if (priority === 'high') return '#b91c1c';
    if (priority === 'normal') return 'var(--ws-primary)';
    return '#a1a1aa';
  }

  categoryIcon(category: string): string {
    switch (category) {
      case 'break': return 'self_improvement';
      case 'task_management': return 'task_alt';
      case 'schedule': return 'schedule';
      case 'workload': return 'work_outline';
      default: return 'tips_and_updates';
    }
  }

  categoryIconColor(category: string): string {
    switch (category) {
      case 'break': return '#f59e0b';
      case 'task_management': return '#14b8a6';
      case 'schedule': return '#8b5cf6';
      case 'workload': return '#ec4899';
      default: return '#6b7280';
    }
  }

  statusBg(status: string): string {
    switch (status) {
      case 'accepted': return '#dbeafe';
      case 'completed': return '#dcfce7';
      case 'dismissed': return '#fee2e2';
      default: return 'var(--ws-primary-light)';
    }
  }

  statusText(status: string): string {
    switch (status) {
      case 'accepted': return '#1d4ed8';
      case 'completed': return '#15803d';
      case 'dismissed': return '#b91c1c';
      default: return 'var(--ws-primary)';
    }
  }

  /** Los valores del backend se quedan en inglés; se muestran traducidos. */
  recStatusEs(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      accepted: 'Aceptada',
      completed: 'Completada',
      dismissed: 'Descartada',
    };
    return map[status] ?? status;
  }
}
