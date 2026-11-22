import { Routes } from '@angular/router';

import { InfluencerDirectory } from './pages/influencer-directory/influencer-directory';
import { InfluencerProfile } from './pages/influencer-profile/influencer-profile';

export const INFLUENCER_ROUTES: Routes = [
  {
    path: '',
    component: InfluencerDirectory,
    title: 'Influencer Directory · 9-16 IMP',
    data: { title: 'Influencer Directory' },
  },
  {
    path: ':id',
    component: InfluencerProfile,
    title: 'Influencer Profile · 9-16 IMP',
    data: { title: 'Profile' },
  },
];
