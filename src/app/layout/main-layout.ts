import {
  Component, inject, signal, OnInit, OnDestroy, ViewChild,
} from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
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

interface NavItem { link: string; label: string; icon: string; }
interface NotifItem { id: string; title: string; message: string; }

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatListModule, MatIconModule, MatToolbarModule,
    MatButtonModule, MatBadgeModule, MatMenuModule,
  ],
  template: `
    <mat-sidenav-container style="height: 100vh; background: var(--ws-bg);">

      <!-- ── Sidebar ── -->
      <mat-sidenav #sidenav
        [mode]="mobile() ? 'over' : 'side'"
        [opened]="!mobile()"
        style="width: 260px; background: var(--ws-surface); border-right: 1px solid var(--ws-border);">

        <div style="display: flex; flex-direction: column; height: 100%; padding: 20px 0;">

          <!-- Logo -->
          <div style="padding: 0 20px 24px; display: flex; align-items: center; gap: 12px;">
            <img src="logo.svg" alt="WorkSense AI logo"
              style="width: 40px; height: 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);" />
            <div>
              <div style="font-weight: 700; font-size: 1.05rem; color: var(--ws-text);">WorkSense</div>
              <div style="font-size: 0.75rem; color: var(--ws-text-muted);">Inteligencia y bienestar</div>
            </div>
          </div>

          <!-- Nav links -->
          <mat-nav-list style="flex: 1;">
            @for (item of navItems; track item.link) {
              <mat-list-item
                [routerLink]="item.link"
                routerLinkActive #rla="routerLinkActive"
                [activated]="rla.isActive"
                (click)="mobile() && sidenav.close()"
                style="border-radius: 10px; margin: 2px 8px;">
                <mat-icon matListItemIcon
                  [style.color]="rla.isActive ? 'var(--ws-primary)' : 'var(--ws-text-muted)'">
                  {{ item.icon }}
                </mat-icon>
                <span matListItemTitle
                  [style.font-weight]="rla.isActive ? '600' : '400'"
                  [style.color]="rla.isActive ? 'var(--ws-primary)' : 'var(--ws-text)'">
                  {{ item.label }}
                </span>
              </mat-list-item>
            }
          </mat-nav-list>

          <!-- WS connection status -->
          <div style="padding: 12px 20px; display: flex; align-items: center; gap: 8px; font-size: 0.8rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%;"
              [style.background]="ws.connected() ? '#22c55e' : '#d4b8b8'">
            </span>
            <span style="color: var(--ws-text-muted);">
              {{ ws.connected() ? 'En vivo' : 'Conectando…' }}
            </span>
          </div>
        </div>
      </mat-sidenav>

      <!-- ── Main content ── -->
      <mat-sidenav-content style="background: var(--ws-bg);">

        <!-- Top bar -->
        <mat-toolbar style="background: transparent; padding: 8px 24px; min-height: 64px;">
          @if (mobile()) {
            <button mat-icon-button (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
          }

          <span style="flex: 1;"></span>

          <!-- Notifications bell -->
          <button mat-icon-button [matMenuTriggerFor]="notifMenu">
            <mat-icon
              [matBadge]="notif.unreadCount() || null"
              [matBadgeHidden]="notif.unreadCount() === 0"
              matBadgeColor="warn"
              matBadgeSize="small">notifications</mat-icon>
          </button>
          <mat-menu #notifMenu="matMenu">
            @for (n of recentNotifications(); track n.id) {
              <div style="padding: 12px 16px; max-width: 300px; border-bottom: 1px solid var(--ws-border);">
                <div style="font-weight: 500; font-size: 0.85rem;">{{ n.title }}</div>
                <div style="font-size: 0.78rem; color: var(--ws-text-muted); margin-top: 2px;">
                  {{ n.message }}
                </div>
              </div>
            }
            @if (recentNotifications().length === 0) {
              <div style="padding: 16px; color: var(--ws-text-muted); font-size: 0.85rem;">
                Sin notificaciones todavía
              </div>
            }
          </mat-menu>

          <!-- User avatar menu -->
          <button mat-icon-button [matMenuTriggerFor]="userMenu" style="margin-left: 4px;">
            <div style="width: 36px; height: 36px; border-radius: 50%;
              background: linear-gradient(135deg, #ec4899, #f9a8d4);
              display: flex; align-items: center; justify-content: center;
              color: white; font-weight: 600; font-size: 0.85rem;">
              {{ userInitials() }}
            </div>
          </button>
          <mat-menu #userMenu="matMenu">
            <div style="padding: 8px 16px; min-width: 180px;">
              <div style="font-weight: 600; font-size: 0.9rem;">{{ auth.currentUser()?.full_name }}</div>
              <div style="font-size: 0.78rem; color: var(--ws-text-muted);">{{ auth.currentUser()?.email }}</div>
            </div>
            <button mat-menu-item routerLink="/settings">
              <mat-icon>settings</mat-icon> Ajustes
            </button>
            @if (auth.isAdmin()) {
              <button mat-menu-item routerLink="/admin">
                <mat-icon>admin_panel_settings</mat-icon> Administración
              </button>
            }
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon> Cerrar sesión
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- Page content -->
        <div style="padding: 0 24px 24px; max-width: 1400px; margin: 0 auto;">
          <router-outlet />
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`:host { display: block; height: 100vh; }`],
})
export class MainLayout implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenavRef!: MatSidenav;

  auth = inject(AuthService);
  ws = inject(WebSocketService);
  notif = inject(NotificationService);
  private router = inject(Router);

  mobile = signal(window.innerWidth < 768);
  recentNotifications = signal<NotifItem[]>([]);

  navItems: NavItem[] = [
    { link: '/dashboard',       label: 'Panel principal', icon: 'dashboard' },
    { link: '/tasks',           label: 'Tareas',          icon: 'check_circle_outline' },
    { link: '/self-reports',    label: 'Autorreportes',   icon: 'favorite_border' },
    { link: '/analysis',        label: 'Análisis IA',     icon: 'psychology' },
    { link: '/recommendations', label: 'Recomendaciones', icon: 'lightbulb_outline' },
    { link: '/sessions',        label: 'Sesiones',        icon: 'history' },
    { link: '/settings',        label: 'Ajustes',         icon: 'settings' },
  ];

  ngOnInit() {
    window.addEventListener('resize', this.onResize);
    this.ws.connect();

    // Reload current user to get fresh data (e.g. is_superuser)
    this.auth.loadCurrentUser().subscribe({
      next: (u) => this.auth.setCurrentUser(u),
      error: () => {},
    });

    // Listen for new notifications via WebSocket
    this.ws.on('notification.created', (event: WSEvent) => {
      const p = event.payload as any;
      this.recentNotifications.update((list) => [
        { id: event.event_id, title: p['title'] ?? 'Nueva notificación', message: p['message'] ?? '' },
        ...list,
      ].slice(0, 10));
      this.notif.unreadCount.update((c) => c + 1);
    });

    // Load unread count on startup
    this.notif.listNotifications(1, 30).subscribe({
      next: (page) => {
        const unread = page.items.filter((n) => !n.is_read);
        this.notif.unreadCount.set(unread.length);
        this.recentNotifications.set(
          page.items.slice(0, 10).map((n) => ({
            id: n.id, title: n.title, message: n.message,
          }))
        );
      },
      error: () => {},
    });
  }

  ngOnDestroy() {
    this.ws.disconnect();
    window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.mobile.set(window.innerWidth < 768);

  userInitials(): string {
    const name = this.auth.currentUser()?.full_name ?? '';
    return name
      .split(' ')
      .map((w) => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?';
  }

  logout(): void {
    this.ws.disconnect();
    this.auth.logout();
  }
}
