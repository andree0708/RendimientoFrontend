import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { WorkSession, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private api = inject(ApiService);

  startSession(notes?: string) {
    return this.api.post<WorkSession>('/sessions', { notes });
  }

  stopSession(sessionId: string) {
    return this.api.post<WorkSession>(`/sessions/${sessionId}/stop`);
  }

  getActiveSession() {
    return this.api.get<WorkSession | null>('/sessions/active/current');
  }

  listSessions(page = 1, pageSize = 20) {
    return this.api.get<Page<WorkSession>>('/sessions', { page, page_size: pageSize });
  }

  getSession(sessionId: string) {
    return this.api.get<WorkSession>(`/sessions/${sessionId}`);
  }
}
