import { createClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import { Database } from './database.types';

/**
 * Singleton Supabase client (anon key, protected by Row Level Security).
 *
 * The anon key is safe to expose in the browser — every table in
 * `supabase/migrations/002_rls.sql` enforces policies server-side.
 * Server-only operations (Asana PAT usage, token issuing) run in
 * Edge Functions with the service role key.
 */
export const supabase = createClient<Database>(
  environment.supabase.url,
  environment.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  },
);
