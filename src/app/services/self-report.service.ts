import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { SelfReport, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class SelfReportService {
  private api = inject(ApiService);

  createReport(data: {
    fatigue_level: number;
    stress_level: number;
    concentration_level: number;
    task_difficulty: number;
    perceived_effort: number;
    need_for_break: number;
    sleep_hours?: number;
    sleep_quality?: number;
    rest_quality_previous_night?: number;
    notes?: string;
    session_id?: string;
  }) {
    return this.api.post<SelfReport>('/self-reports', data);
  }

  listReports(page = 1, pageSize = 20) {
    return this.api.get<Page<SelfReport>>('/self-reports', { page, page_size: pageSize });
  }
}
