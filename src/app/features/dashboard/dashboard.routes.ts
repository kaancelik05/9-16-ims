import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: Dashboard,
    title: 'Dashboard · 9-16 IMP',
    data: { title: 'Dashboard' },
  },
];
