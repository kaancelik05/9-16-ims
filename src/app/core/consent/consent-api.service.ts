import { Injectable, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { supabase } from '../supabase/supabase-client';

type ConsentResponse<T> = { data: T | null; error: string | null };

/**
 * Agency-side consent link management (Module 6 / Faz 3) — wraps the
 * `consent-api` Edge Function: single-use, expiring invite links that
 * authorize the anon-callable consent RPCs. The full token only ever
 * appears in the create-link response (list responses are masked).
 */
@Injectable({ providedIn: 'root' })
export class ConsentApiService {
  private readonly auth = inject(AuthService);

  /** Mints a single-use consent link for a creator (admin/manager). */
  async createLink(influencerId: string, ttlHours = 72): Promise<string> {
    if (!this.auth.isAuthenticated()) {
      throw new Error('Consent links require an authenticated session.');
    }
    const { data, error } = await supabase.functions.invoke<ConsentResponse<{ token: string; url: string }>>(
      'consent-api',
      { body: { action: 'create-link', influencerId, ttlHours } },
    );
    const message = error ?? data?.error;
    if (message) throw new Error(message);
    if (!data?.data?.url) throw new Error('Consent API returned no link.');
    return data.data.url;
  }
}
