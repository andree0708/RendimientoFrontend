import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';
import { MainLayout } from './layout/main-layout';

/**
 * Every page is lazy-loaded so the initial bundle only contains the app shell.
 * This keeps first paint fast even though Angular Material and ECharts are
 * used across the authenticated area.
 */
export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/tasks/tasks').then((m) => m.TasksComponent),
      },
      {
        path: 'self-reports',
        loadComponent: () => import('./pages/self-reports/self-reports').then((m) => m.SelfReportsComponent),
      },
      {
        path: 'analysis',
        loadComponent: () => import('./pages/analysis/analysis').then((m) => m.AnalysisComponent),
      },
      {
        path: 'recommendations',
        loadComponent: () => import('./pages/recommendations/recommendations').then((m) => m.RecommendationsComponent),
      },
      {
        path: 'sessions',
        loadComponent: () => import('./pages/sessions/sessions').then((m) => m.SessionsComponent),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsComponent),
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminComponent),
        canActivate: [adminGuard],
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
