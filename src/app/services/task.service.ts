import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Task, TaskResult, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private api = inject(ApiService);

  createTask(data: {
    title: string;
    description?: string;
    estimated_seconds?: number;
    complexity?: number;
    session_id?: string;
  }) {
    return this.api.post<Task>('/tasks', data);
  }

  listTasks(page = 1, pageSize = 20, status?: string) {
    return this.api.get<Page<Task>>('/tasks', { page, page_size: pageSize, ...(status ? { status } : {}) });
  }

  getTask(taskId: string) {
    return this.api.get<Task>(`/tasks/${taskId}`);
  }

  updateTask(taskId: string, data: Partial<Task>) {
    return this.api.patch<Task>(`/tasks/${taskId}`, data);
  }

  addResult(taskId: string, data: { outcome?: string; errors_count?: number; quality_rating?: number; notes?: string }) {
    return this.api.post<TaskResult>(`/tasks/${taskId}/results`, data);
  }
}
