import { Routes } from '@angular/router';

import { Settings } from './pages/settings/settings';
import { UserProfile } from './pages/profile/profile';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    component: Settings,
    title: 'Settings · 9-16 IMP',
    data: { title: 'Settings' },
  },
  {
    path: 'profile',
    component: UserProfile,
    title: 'Profile · 9-16 IMP',
    data: { title: 'Profile' },
  },
];
