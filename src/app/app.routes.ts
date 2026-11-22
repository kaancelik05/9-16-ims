import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { Shell } from './core/layout/shell';
import { Login } from './features/auth/login/login';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign In · 9-16 IMP' },

  // Module 6 — creator consent portal lives outside the agency shell.
  {
    path: 'consent',
    loadChildren: () =>
      import('./features/consent/consent.routes').then((m) => m.CONSENT_ROUTES),
  },

  // Authenticated agency workspace.
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'influencers',
        loadChildren: () =>
          import('./features/influencers/influencers.routes').then(
            (m) => m.INFLUENCER_ROUTES,
          ),
      },
      {
        path: 'campaigns',
        loadChildren: () =>
          import('./features/campaigns/campaigns.routes').then(
            (m) => m.CAMPAIGN_ROUTES,
          ),
      },
      {
        path: 'analytics',
        loadChildren: () =>
          import('./features/analytics/analytics.routes').then(
            (m) => m.ANALYTICS_ROUTES,
          ),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(
            (m) => m.SETTINGS_ROUTES,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'dashboard' },
];
