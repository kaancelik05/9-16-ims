import { Routes } from '@angular/router';

import { CampaignAnalytics } from './pages/campaign-analytics/campaign-analytics';

export const ANALYTICS_ROUTES: Routes = [
  {
    path: '',
    component: CampaignAnalytics,
    title: 'Campaign Analytics · 9-16 IMP',
    data: { title: 'Campaign Analytics' },
  },
];
