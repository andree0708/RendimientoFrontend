import { Component, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../core/auth.service';
import { WebSocketService } from '../core/websocket.service';
import { NotificationService } from '../services/notification.service';
import { WSEvent } from '../models';

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatListModule, MatIconModule, MatToolbarModule,
    MatButtonModule, MatBadgeModule, MatMenuModule,
  ],
  template: `
    <mat-sidenav-container style="height: 100vh; background: var(--ws-bg);">
      <!-- Sidebar -->
      <mat-sidenav [mode]="mobile() ? 'over' : 'side'" [opened]="!mobile()"
        style="width: 260px; background: var(--ws-surface); border-right: 1px solid var(--ws-border);">
        <div style="padding: 20px 0; display: flex; flex-direction: column; height: 100%;">
          <!-- Logo -->
          <div style="padding: 0 20px 24px; display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #ec4899, #f9a8d4);
              display: flex; align-items: center; justify-content: center;">
              <mat-icon style="color: white;">spa</mat-icon>
            </div>
            <div>
              <div style="font-weight: 600; font-size: 1.05rem; color: var(--ws-text);">WorkSense</div>
              <div style="font-size: 0.75rem; color: var(--ws-text-muted);">Wellbeing Intelligence</div>
            </div>
          </div>

          <!-- Nav links -->
          <mat-nav-list style="flex: 1;">
            @for (item of navItems(); track item.link) {
              <mat-list-item
                [routerLink]="item.link"
                routerLinkActive
                #rla="routerLinkActive"
                [activated]="rla.isActive"
                (click)="mobile() && sidenav.close()"
                style="border-radius: 10px; margin: 2px 8px;">
                <mat-icon matListItemIcon [style.color]="rla.isActive ? 'var(--ws-primary)' : 'var(--ws-text-muted)'">
                  {{ item.icon }}
                </mat-icon>
                <span matListItemTitle [style.font-weight]="rla.isActive ? '600' : '400'"
                  [style.color]="rla.isActive ? 'var(--ws-primary)' : 'var(--ws-text)'">
                  {{ item.label }}
                </span>
              </mat-list-item>
            }
          </mat-nav-list>

          <!-- WS status -->
          <div style="padding: 12px 20px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%;"
              [style.background]="ws.connected() ? '#22c55e' : '#d4b8b8'"></span>
            <span style="color: var(--ws-text-muted);">
              {{ ws.connected() ? 'Connected' : 'Connecting...' }}
            </span>
          </div>
        </div>
      </mat-sidenav>

      <!-- Main content -->
      <mat-sidenav-content style="background: var(--ws-bg);">
        <!-- Top bar -->
        <mat-toolbar style="background: transparent; padding: 8px 24px; min-height: 64px;">
          <button matIconButton (click)="sidenav.toggle()" [style.display]="mobile() ? 'inline-flex' : 'none'">
            <mat-icon>menu</mat-icon>
          </button>
          <span style="flex: 1;"></span>

          <!-- Notifications -->
          <button matIconButton [matMenuTriggerFor]="notifMenu">
            <mat-icon [matBadge]="notif.unreadCount()" [matBadgeHidden]="notif.unreadCount() === 0" matBadgeColor="warn" matBadgeSize="small">
              notifications
            </mat-icon>
          </button>
          <mat-menu #notifMenu="matMenu">
            @for (n of recentNotifications(); track n.id) {
              <div style="padding: 12px 16px; max-width: 300px; border-bottom: 1px solid var(--ws-border);">
                <div style="font-weight: 500; font-size: 0.85rem;">{{ n.title }}</div>
                <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 2px;">{{ n.message }}</div>
              </div>
            }
            @if (recentNotifications().length === 0) {
              <div style="padding: 16px; color: var(--ws-text-muted); font-size: 0.85rem;">No notifications</div>
            }
          </mat-menu>

          <!-- User menu -->
          <button matIconButton [matMenuTriggerFor]="userMenu">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #f9a8d4);
              display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.85rem;">
              {{ userInitials() }}
            </div>
          </button>
          <mat-menu #userMenu="matMenu">
            <div style="padding: 8px 16px;">
              <div style="font-weight: 600;">{{ auth.currentUser()?.full_name }}</div>
              <div style="font-size: 0.8rem; color: var(--ws-text-muted);">{{ auth.currentUser()?.email }}</div>
            </div>
            <button mat-menu-item routerLink="/settings">
              <mat-icon>settings</mat-icon> Settings
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Sign out
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Routed content -->
        <div style="padding: 0 24px 24px; max-width: 1400px; margin: 0 auto;">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    mat-list-item { height: 48px !important; }
  `],
})
export class MainLayout implements OnInit, OnDestroy {
  private router = inject(Router);
  private notifSvc = inject(NotificationService);
  auth = inject(AuthService);
  ws = inject(WebSocketService);
  notif = inject(NotificationService);

  mobile = signal(false);
  recentNotifications = signal<any[]>([]);

  // Import here to avoid circular dep in template
  sidenav: any;

  ngOnInit() {
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
    this.ws.connect();

    // Listen for notifications over WebSocket
    this.ws.on('notification.created', (event: WSEvent) => {
      this.recentNotifications.update((list) => [
        { id: event.event_id, title: (event.payload as any)['title'], message: (event.payload as any)['message'] },
        ...list,
      ].slice(0, 10));
      this.notif.unreadCount.update((c) => c + 1);
    });

    // Load initial notifications
    this.notifSvc.listNotifications().subscribe((page) => {
      this.recentNotifications.set(page.items.slice(0, 10));
      this.notif.unreadCount.set(page.items.filter((n) => !n.is_read).length);
    });
  }

  ngOnDestroy() {
    this.ws.disconnect();
    window.removeEventListener('resize', this.checkMobile);
  }

  private checkMobile = () => this.mobile.set(window.innerWidth < 768);

  navItems = signal([
    { link: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { link: '/tasks', label: 'Tasks', icon: 'check_circle_outline' },
    { link: '/self-reports', label: 'Self-Reports', icon: 'favorite_border' },
    { link: '/analysis', label: 'AI Analysis', icon: 'psychology' },
    { link: '/recommendations', label: 'Recommendations', icon: 'lightbulb_outline' },
    { link: '/sessions', label: 'Sessions', icon: 'history' },
    { link: '/settings', label: 'Settings', icon: 'settings' },
  ]);

  adminItems = signal([
    { link: '/admin', label: 'Admin Panel', icon: 'admin_panel_settings' },
  ]);

  userInitials(): string {
    const name = this.auth.currentUser()?.full_name ?? '';
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  }

  logout(): void {
    this.ws.disconnect();
    this.auth.logout();
  }
}
