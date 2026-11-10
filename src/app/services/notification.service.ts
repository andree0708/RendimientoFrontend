import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Notification, Page } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);

  /** Signal with unread count for badge display. */
  readonly unreadCount = signal(0);

  listNotifications(page = 1, pageSize = 30) {
    return this.api.get<Page<Notification>>('/notifications', { page, page_size: pageSize });
  }

  markRead(notificationId: string) {
    return this.api.post<Notification>(`/notifications/${notificationId}/read`);
  }
}
