/** Shared domain models matching the backend schemas. */

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  avatar_url: string | null;
  preferred_scale_max: number;
  organization_id: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface WorkSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  total_active_seconds: number;
  total_idle_seconds: number;
  total_pause_seconds: number;
  pause_count: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface ActivityMetric {
  id: string;
  session_id: string;
  user_id: string;
  recorded_at: string;
  interval_seconds: number;
  active_seconds: number;
  idle_seconds: number;
  continuous_work_seconds: number;
  pause_count: number;
  pause_total_seconds: number;
  app_switch_count: number;
  interruptions_count: number;
  app_category_seconds: number;
  tasks_started: number;
  tasks_completed: number;
  errors_reported: number;
}

export interface Task {
  id: string;
  user_id: string;
  session_id: string | null;
  title: string;
  description: string | null;
  estimated_seconds: number;
  actual_seconds: number;
  complexity: number;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  results: TaskResult[];
}

export interface TaskResult {
  id: string;
  task_id: string;
  outcome: string;
  errors_count: number;
  quality_rating: number | null;
  notes: string | null;
  deviation_seconds: number;
  created_at: string;
}

export interface SelfReport {
  id: string;
  user_id: string;
  session_id: string | null;
  reported_at: string;
  fatigue_level: number;
  stress_level: number;
  concentration_level: number;
  task_difficulty: number;
  perceived_effort: number;
  need_for_break: number;
  sleep_hours: number | null;
  sleep_quality: number | null;
  rest_quality_previous_night: number | null;
  notes: string | null;
  created_at: string;
}

export interface FatigueAssessment {
  id: string;
  user_id: string;
  session_id: string | null;
  assessed_at: string;
  risk_category: string;
  risk_probability: number;
  confidence: number | null;
  top_features: string | null;
  comparison_to_baseline: string | null;
  created_at: string;
}

export interface PerformancePrediction {
  id: string;
  user_id: string;
  session_id: string | null;
  predicted_at: string;
  target_time: string;
  predicted_variation: number;
  risk_label: string;
  horizon_minutes: number;
  confidence: number | null;
  top_features: string | null;
  created_at: string;
}

export interface LLMFactor {
  name: string;
  weight: number;
}

export interface LLMFatigue {
  risk_category: string;
  risk_probability: number;
  confidence: number;
  summary: string;
  factors: LLMFactor[];
}

export interface LLMPerformance {
  trend: string;
  risk_label: string;
  variation: number;
  confidence: number;
  summary: string;
}

export interface LLMAnomaly {
  description: string;
  severity: string;
}

export interface LLMAnalysis {
  success: boolean;
  message: string;
  data_basis: string;
  generated_by: string | null;
  model: string | null;
  assessment_id: string | null;
  prediction_id: string | null;
  fatigue: LLMFatigue | null;
  performance: LLMPerformance | null;
  anomalies: LLMAnomaly[];
  recommendations_created: number;
}

export interface Recommendation {
  id: string;
  user_id: string;
  session_id: string | null;
  generated_at: string;
  category: string;
  title: string;
  body: string;
  reason: string | null;
  status: string;
  priority: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  payload: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ModelVersion {
  id: string;
  name: string;
  model_type: string;
  algorithm: string;
  version_tag: string;
  file_path: string;
  is_active: boolean;
  trained_on: string;
  samples_used: number;
  notes: string | null;
  created_at: string;
  evaluations: ModelEvaluation[];
}

export interface ModelEvaluation {
  id: string;
  model_version_id: string;
  precision: number | null;
  recall: number | null;
  f1_score: number | null;
  roc_auc: number | null;
  mae: number | null;
  rmse: number | null;
  r2: number | null;
  confusion_matrix: string | null;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

/** WebSocket event structure (matches backend WSEvent). */
export interface WSEvent {
  event_id: string;
  event_type: string;
  version: string;
  timestamp: string;
  user_id: string | null;
  session_id: string | null;
  payload: Record<string, unknown>;
}

export interface WSEnvelope {
  type: string;
  data: WSEvent;
}
