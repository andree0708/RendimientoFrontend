import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/auth.guard';
import { MainLayout } from './layout/main-layout';
import { LoginComponent } from './pages/auth/login';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { TasksComponent } from './pages/tasks/tasks';
import { SelfReportsComponent } from './pages/self-reports/self-reports';
import { AnalysisComponent } from './pages/analysis/analysis';
import { RecommendationsComponent } from './pages/recommendations/recommendations';
import { SessionsComponent } from './pages/sessions/sessions';
import { SettingsComponent } from './pages/settings/settings';
import { AdminComponent } from './pages/admin/admin';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'self-reports', component: SelfReportsComponent },
      { path: 'analysis', component: AnalysisComponent },
      { path: 'recommendations', component: RecommendationsComponent },
      { path: 'sessions', component: SessionsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
