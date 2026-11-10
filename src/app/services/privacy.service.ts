import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface ConsentStatus {
  granted: boolean;
  scope: string;
  version: string;
  granted_at: string | null;
  withdrawn_at: string | null;
}

export interface DataDeletionResult {
  deleted: Record<string, number | boolean>;
  account_retained: boolean;
  consent_record_retained: boolean;
}

@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private api = inject(ApiService);

  getConsent() {
    return this.api.get<ConsentStatus>('/consent');
  }

  setConsent(granted: boolean, scope = 'all') {
    return this.api.post<ConsentStatus>('/consent', { granted, scope });
  }

  exportData() {
    return this.api.get<Record<string, unknown>>('/privacy/export');
  }

  deleteData() {
    return this.api.delete<DataDeletionResult>('/privacy/data');
  }
}
