import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Recommendation, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private api = inject(ApiService);

  listRecommendations(page = 1, pageSize = 20, status?: string) {
    return this.api.get<Page<Recommendation>>('/recommendations', {
      page, page_size: pageSize, ...(status ? { status } : {}),
    });
  }

  updateRecommendation(recId: string, status: string) {
    return this.api.patch<Recommendation>(`/recommendations/${recId}`, { status });
  }
}
