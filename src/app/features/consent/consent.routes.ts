import { Routes } from '@angular/router';

import { ConsentPortal } from './pages/consent-portal/consent-portal';

export const CONSENT_ROUTES: Routes = [
  {
    path: '',
    component: ConsentPortal,
    title: 'Data Permission & Consent · 9-16 IMP',
  },
];
