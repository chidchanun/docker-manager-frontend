import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/login/login').then(
        (component) => component.LoginComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then(
        (component) => component.DashboardComponent,
      ),
  },
  {
    path: 'containers/:id/logs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/container-logs/container-logs').then(
        (component) => component.ContainerLogsComponent,
      ),
  },
  {
    path: 'containers/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/container-detail/container-detail').then(
      (component) => component.ContainerDetailComponent,
    ),
  },
  { path: 'audit', canActivate: [authGuard], loadComponent: () => import('./pages/audit/audit').then(c => c.AuditComponent) },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
