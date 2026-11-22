import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/**
 * Blocks navigation until the session is restored, then redirects
 * unauthenticated visitors to /login with a returnUrl.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for the initial session restore (single async tick at most).
  let waited = 0;
  while (auth.session() === null && waited < 50) {
    await new Promise((r) => setTimeout(r, 10));
    waited++;
  }

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
