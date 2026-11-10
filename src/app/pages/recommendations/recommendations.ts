import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { RecommendationService } from '../../services/recommendation.service';
import { Recommendation } from '../../models';

@Component({
  selector: 'app-recommendations',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Recommendations</h1>
      <p class="ws-page-subtitle">Personalized suggestions based on your work patterns. Not medical advice.</p>

      <!-- Filter chips -->
      <div style="display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;">
        @for (s of statusFilters; track s.value) {
          <mat-chip (click)="filter.set(s.value)"
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
                  <mat-chip style="background: #fee2e2; color: #b91c1c; font-size: 0.75rem;">High priority</mat-chip>
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
                    <mat-icon>check</mat-icon> Accept
                  </button>
                  <button mat-stroked-button (click)="updateStatus(rec, 'dismissed')" style="border-radius: 10px;">
                    <mat-icon>close</mat-icon> Dismiss
                  </button>
                }
                @if (rec.status === 'accepted') {
                  <button mat-flat-button color="primary" (click)="updateStatus(rec, 'completed')" style="border-radius: 10px;">
                    <mat-icon>task_alt</mat-icon> Mark as done
                  </button>
                }
                <mat-chip [style.background]="statusBg(rec.status)" [style.color]="statusText(rec.status)">
                  {{ rec.status | titlecase }}
                </mat-chip>
              </div>
              <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 8px;">
                {{ rec.generated_at | date: 'MMM d, h:mm a' }}
              </div>
            </div>
          </div>
        </div>
      }

      @if (recommendations().length === 0) {
        <div class="ws-card" style="text-align: center; padding: 48px;">
          <mat-icon style="font-size: 56px; width: 56px; height: 56px; color: var(--ws-primary-light);">lightbulb_outline</mat-icon>
          <p style="color: var(--ws-text-muted); margin-top: 16px; font-size: 0.95rem;">
            No recommendations right now. Keep working and the system will generate personalized suggestions.
          </p>
        </div>
      }
    </div>
  `,
})
export class RecommendationsComponent implements OnInit {
  private recSvc = inject(RecommendationService);

  recommendations = signal<Recommendation[]>([]);
  filter = signal('');

  statusFilters = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'completed', label: 'Completed' },
    { value: 'dismissed', label: 'Dismissed' },
  ];

  ngOnInit() {
    this.loadRecommendations();
  }

  loadRecommendations() {
    this.recSvc.listRecommendations(1, 50, this.filter() || undefined).subscribe((page) => {
      this.recommendations.set(page.items);
    });
  }

  updateStatus(rec: Recommendation, status: string) {
    this.recSvc.updateRecommendation(rec.id, status).subscribe(() => {
      this.loadRecommendations();
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
}
