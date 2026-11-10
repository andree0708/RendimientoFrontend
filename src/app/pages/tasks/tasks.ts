import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { TaskService } from '../../services/task.service';
import { Task } from '../../models';

@Component({
  selector: 'app-tasks',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule],
  template: `
    <div class="ws-fade-in">
      <h1 class="ws-page-title">Tasks</h1>
      <p class="ws-page-subtitle">Track what you're working on, with estimated and actual times.</p>

      <!-- New task form -->
      <div class="ws-card" style="margin-bottom: 24px;">
        <div style="font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="color: var(--ws-primary);">add_task</mat-icon>
          New task
        </div>
        <form [formGroup]="taskForm" (ngSubmit)="createTask()" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" [style.grid-template-columns]="mobile() ? '1fr' : '1fr 1fr'">
          <mat-form-field appearance="outline" style="grid-column: 1 / -1;">
            <mat-label>Task title</mat-label>
            <input matInput formControlName="title" placeholder="What are you working on?">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description</mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>

          <div style="display: flex; gap: 16px;">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Estimate (min)</mat-label>
              <input matInput type="number" formControlName="estimated_minutes" min="0">
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Difficulty</mat-label>
              <mat-select formControlName="complexity">
                @for (level of [1,2,3,4,5]; track level) {
                  <mat-option [value]="level">{{ level }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <div style="grid-column: 1 / -1;">
            <button mat-flat-button color="primary" type="submit" style="border-radius: 12px;">
              <mat-icon>add</mat-icon> Add task
            </button>
          </div>
        </form>
      </div>

      <!-- Task list -->
      <div class="ws-card">
        <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
          @for (s of statusFilters; track s.value) {
            <mat-chip (click)="filterStatus.set(s.value)"
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
                Difficulty: {{ task.complexity }}/5 &middot;
                Estimate: {{ task.estimated_seconds ? (task.estimated_seconds / 60 | number:'1.0-0') + 'min' : '-' }}
                @if (task.actual_seconds) { &middot; Actual: {{ (task.actual_seconds / 60 | number:'1.0-0') + 'min' }} }
              </div>
            </div>
            <mat-chip [style.background]="statusColor(task.status)" [style.color]="statusTextColor(task.status)">
              {{ task.status }}
            </mat-chip>
            @if (task.status === 'pending' || task.status === 'in_progress') {
              <button matIconButton (click)="completeTask(task)">
                <mat-icon style="color: #15803d;">check_circle</mat-icon>
              </button>
            }
          </div>
        }
        @if (tasks().length === 0) {
          <div style="text-align: center; color: var(--ws-text-muted); padding: 40px 20px;">
            <mat-icon style="font-size: 48px; width: 48px; height: 48px; opacity: 0.3;">task_alt</mat-icon>
            <p style="margin-top: 12px;">No tasks yet. Create one above to get started.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class TasksComponent implements OnInit {
  private taskSvc = inject(TaskService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  tasks = signal<Task[]>([]);
  filterStatus = signal('');
  mobile = signal(window.innerWidth < 768);

  statusFilters = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'completed', label: 'Completed' },
  ];

  taskForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    estimated_minutes: [0],
    complexity: [3],
  });

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.taskSvc.listTasks(1, 50, this.filterStatus() || undefined).subscribe((page) => {
      this.tasks.set(page.items);
    });
  }

  createTask() {
    if (this.taskForm.invalid) return;
    const v = this.taskForm.value;
    this.taskSvc.createTask({
      title: v.title!,
      description: v.description || undefined,
      estimated_seconds: (v.estimated_minutes || 0) * 60,
      complexity: v.complexity || 3,
    }).subscribe(() => {
      this.taskForm.reset({ complexity: 3, estimated_minutes: 0 });
      this.loadTasks();
      this.snackBar.open('Task created', 'Close', { duration: 2500 });
    });
  }

  completeTask(task: Task) {
    this.taskSvc.updateTask(task.id, { status: 'completed' }).subscribe(() => {
      this.loadTasks();
      this.snackBar.open('Task completed', 'Close', { duration: 2500 });
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
}
