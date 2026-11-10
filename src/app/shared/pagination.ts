import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Minimal, accessible pagination control shared by the list pages.
 * It renders nothing when there is only a single page.
 */
@Component({
  selector: 'app-pagination',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (totalPages() > 1) {
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 0;">
        <button mat-icon-button [disabled]="page() <= 1" (click)="go(page() - 1)"
          aria-label="Página anterior">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span style="font-size: 0.85rem; color: var(--ws-text-muted);">
          Página {{ page() }} de {{ totalPages() }} &middot; {{ total() }} elementos
        </span>
        <button mat-icon-button [disabled]="page() >= totalPages()" (click)="go(page() + 1)"
          aria-label="Página siguiente">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    }
  `,
})
export class PaginationComponent {
  page = input(1);
  totalPages = input(1);
  total = input(0);
  pageChange = output<number>();

  go(target: number) {
    if (target < 1 || target > this.totalPages() || target === this.page()) {
      return;
    }
    this.pageChange.emit(target);
  }
}
