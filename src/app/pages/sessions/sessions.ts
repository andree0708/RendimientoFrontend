import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { SessionService } from '../../services/session.service';
import { WorkSession } from '../../models';

@Component({
  selector: 'app-sessions',
  imports: [CommonModule, MatChipsModule, MatIconModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Work sessions</h1>
      <p class="ws-page-subtitle">Your complete history of tracked work sessions.</p>

      <div class="ws-card">
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
                &middot; {{ formatTime(s.total_active_seconds) }} active
                &middot; {{ s.pause_count }} breaks
              </div>
            </div>
            <mat-chip [style.background]="s.status === 'active' ? '#dcfce7' : s.status === 'completed' ? '#e0e7ff' : '#fef3c7'"
              [style.color]="s.status === 'active' ? '#15803d' : s.status === 'completed' ? '#4338ca' : '#a16207'">
              {{ s.status | titlecase }}
            </mat-chip>
          </div>
        }
        @if (sessions().length === 0) {
          <div style="text-align: center; padding: 40px; color: var(--ws-text-muted);">
            <mat-icon style="font-size: 48px; width: 48px; height: 48px; opacity: 0.3;">schedule</mat-icon>
            <p style="margin-top: 12px;">No sessions yet. Start one from the dashboard.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class SessionsComponent implements OnInit {
  private sessionSvc = inject(SessionService);
  sessions = signal<WorkSession[]>([]);

  ngOnInit() {
    this.sessionSvc.listSessions(1, 50).subscribe((page) => {
      this.sessions.set(page.items);
    });
  }

  formatTime(seconds: number): string {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
