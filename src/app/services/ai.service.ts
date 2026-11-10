import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { FatigueAssessment, PerformancePrediction, ModelVersion, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class AiService {
  private api = inject(ApiService);

  trainModel(modelType: string, useDemoData = true, userId?: string) {
    return this.api.post<{ success: boolean; model_version_id: string; message: string; metrics: Record<string, unknown> }>('/ai/train', {
      model_type: modelType,
      use_demo_data: useDemoData,
      user_id: userId,
    });
  }

  listModels() {
    return this.api.get<ModelVersion[]>('/ai/models');
  }

  assessFatigue(sessionId?: string) {
    return this.api.post<FatigueAssessment>('/ai/predict/fatigue', undefined, );
  }

  predictPerformance(sessionId?: string) {
    return this.api.post<PerformancePrediction>('/ai/predict/performance');
  }

  fatigueHistory(page = 1, pageSize = 20) {
    return this.api.get<Page<FatigueAssessment>>('/ai/fatigue/history', { page, page_size: pageSize });
  }

  performanceHistory(page = 1, pageSize = 20) {
    return this.api.get<Page<PerformancePrediction>>('/ai/performance/history', { page, page_size: pageSize });
  }

  detectAnomalies() {
    return this.api.get<{ anomaly_count: number; is_anomalous: boolean; anomaly_score: number }>('/ai/anomalies');
  }
}
