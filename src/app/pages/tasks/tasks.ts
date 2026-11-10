import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, of, switchMap } from 'rxjs';

import { TaskService } from '../../services/task.service';
import { SessionService } from '../../services/session.service';
import { Task } from '../../models';
import { PaginationComponent } from '../../shared/pagination';

@Component({
  selector: 'app-tasks',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatProgressBarModule, PaginationComponent],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Tareas</h1>
      <p class="ws-page-subtitle">Sigue en qué estás trabajando, con tiempos estimados y reales.</p>

      <!-- New task form -->
      <div class="ws-card" style="margin-bottom: 24px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: var(--ws-primary);">add_task</mat-icon>
          Nueva tarea
        </div>
        <form [formGroup]="taskForm" (ngSubmit)="createTask()" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
          <mat-form-field appearance="outline" style="grid-column: 1 / -1;">
            <mat-label>Título de la tarea</mat-label>
            <input matInput formControlName="title" placeholder="¿En qué estás trabajando?">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descripción</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>

          <div style="display: flex; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Estimación (min)</mat-label>
              <input matInput type="number" formControlName="estimated_minutes" min="0">
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Dificultad</mat-label>
              <mat-select formControlName="complexity">
                @for (level of [1,2,3,4,5]; track level) {
                  <mat-option [value]="level">{{ level }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div style="grid-column: 1 / -1;">
            <button mat-flat-button color="primary" type="submit" style="border-radius: 12px;">
              <mat-icon>add</mat-icon> Añadir tarea
            </button>
          </div>
        </form>
      </div>

      <!-- Task list -->
      <div class="ws-card">
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          @for (s of statusFilters; track s.value) {
            <mat-chip (click)="setFilter(s.value)"
              [style.background]="filterStatus() === s.value ? 'var(--ws-primary)' : 'var(--ws-primary-light)'"
              [style.color]="filterStatus() === s.value ? 'white' : 'var(--ws-primary)'"
              style="cursor: pointer;">
              {{ s.label }}
            </mat-chip>
          }
        </div>

        @for (task of tasks(); track task.id) {
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--ws-border);">
            <div style="flex: 1;">
              <div style="font-weight: 500;">{{ task.title }}</div>
              @if (task.description) {
                <div style="font-size: 0.85rem; color: var(--ws-text-muted);">{{ task.description }}</div>
              }
              <div style="font-size: 0.8rem; color: var(--ws-text-muted); margin-top: 4px;">
                Dificultad: {{ task.complexity }}/5 &middot;
                Estimación: {{ task.estimated_seconds ? (task.estimated_seconds / 60 | number:'1.0-0') + 'min' : '-' }}
                @if (task.actual_seconds) { &middot; Real: {{ (task.actual_seconds / 60 | number:'1.0-0') + 'min' }} }
              </div>
            </div>
            <mat-chip [style.background]="statusColor(task.status)" [style.color]="statusTextColor(task.status)">
              {{ taskStatusEs(task.status) }}
            </mat-chip>
            @if (task.status === 'pending' || task.status === 'in_progress') {
              <button matIconButton (click)="completeTask(task)">
                <mat-icon style="color: #15803d;">check_circle</mat-icon>
              </button>
            }
          </div>
        }

        @if (loading()) {
          <mat-progress-bar mode="indeterminate" style="margin-top: 12px;" />
        }

        @if (error()) {
          <div style="text-align: center; color: var(--ws-text-muted); padding: 32px 20px;">
            <mat-icon style="font-size: 40px; width: 40px; height: 40px; color: #b91c1c;">error_outline</mat-icon>
            <p style="margin: 12px 0;">{{ error() }}</p>
            <button mat-stroked-button (click)="loadTasks(page())" style="border-radius: 10px;">
              <mat-icon>refresh</mat-icon> Reintentar
            </button>
          </div>
        } @else if (tasks().length === 0 && !loading()) {
          <div style="text-align: center; color: var(--ws-text-muted); padding: 40px 20px;">
            <mat-icon style="font-size: 48px; width: 48px; height: 48px; opacity: 0.3;">task_alt</mat-icon>
            <p style="margin-top: 12px;">
              {{ filterStatus() ? 'No hay tareas con este estado.' : 'Aún no hay tareas. Crea una arriba para empezar.' }}
            </p>
          </div>
        }

        <app-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          [total]="total()"
          (pageChange)="loadTasks($event)" />
      </div>
    </div>
  `,
})
export class TasksComponent implements OnInit {
  private taskSvc = inject(TaskService);
  private sessionSvc = inject(SessionService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  tasks = signal<Task[]>([]);
  filterStatus = signal('');
  mobile = signal(window.innerWidth < 768);
  page = signal(1);
  totalPages = signal(1);
  total = signal(0);
  loading = signal(false);
  error = signal('');

  statusFilters = [
    { value: '', label: 'Todas' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En curso' },
    { value: 'completed', label: 'Completada' },
  ];

  taskForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    estimated_minutes: [0],
    complexity: [3],
  });

  ngOnInit() {
    this.loadTasks(1);
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
    this.loadTasks(1);
  }

  loadTasks(page: number) {
    this.loading.set(true);
    this.error.set('');
    this.taskSvc.listTasks(page, 20, this.filterStatus() || undefined).subscribe({
      next: (result) => {
        this.tasks.set(result.items);
        this.page.set(result.meta.page);
        this.totalPages.set(result.meta.total_pages);
        this.total.set(result.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar tus tareas. Revisa tu conexión e inténtalo de nuevo.');
      },
    });
  }

  createTask() {
    if (this.taskForm.invalid) return;
    const v = this.taskForm.value;

    // Attach the task to the active session when one exists.
    this.sessionSvc.getActiveSession().pipe(
      catchError(() => of(null)),
      switchMap((session) => this.taskSvc.createTask({
        title: v.title!,
        description: v.description || undefined,
        estimated_seconds: (v.estimated_minutes || 0) * 60,
        complexity: v.complexity || 3,
        session_id: session?.id,
      })),
    ).subscribe({
      next: () => {
        this.taskForm.reset({ complexity: 3, estimated_minutes: 0 });
        this.loadTasks(1);
        this.snackBar.open('Tarea creada', 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('No se pudo crear la tarea', 'Cerrar', { duration: 3000 });
      },
    });
  }

  completeTask(task: Task) {
    this.taskSvc.updateTask(task.id, { status: 'completed' }).subscribe({
      next: () => {
        this.loadTasks(this.page());
        this.snackBar.open('Tarea completada', 'Cerrar', { duration: 2500 });
      },
      error: () => {
        this.snackBar.open('No se pudo completar la tarea', 'Cerrar', { duration: 3000 });
      },
    });
  }

  statusColor(status: string): string {
    switch (status) {
      case 'completed': return '#dcfce7';
      case 'in_progress': return '#fef3c7';
      case 'cancelled': return '#fee2e2';
      default: return 'var(--ws-primary-light)';
    }
  }

  statusTextColor(status: string): string {
    switch (status) {
      case 'completed': return '#15803d';
      case 'in_progress': return '#a16207';
      case 'cancelled': return '#b91c1c';
      default: return 'var(--ws-primary)';
    }
  }

  /** Los valores del backend se quedan en inglés; se muestran traducidos. */
  taskStatusEs(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return map[status] ?? status;
  }
}
