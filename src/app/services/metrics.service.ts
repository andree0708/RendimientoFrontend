import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { ActivityMetric, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private api = inject(ApiService);

  listSessionMetrics(sessionId: string, page = 1, pageSize = 200) {
    return this.api.get<Page<ActivityMetric>>(`/metrics/session/${sessionId}`, {
      page,
      page_size: pageSize,
    });
  }

  listRecentMetrics(page = 1, pageSize = 100) {
    return this.api.get<Page<ActivityMetric>>('/metrics/recent', {
      page,
      page_size: pageSize,
    });
  }
}
