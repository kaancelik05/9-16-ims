import { Routes } from '@angular/router';

import { CampaignWorkflow } from './pages/campaign-workflow/campaign-workflow';

export const CAMPAIGN_ROUTES: Routes = [
  {
    path: '',
    component: CampaignWorkflow,
    title: 'Campaign Workflow · 9-16 IMP',
    data: { title: 'Campaign Workflow' },
  },
];
