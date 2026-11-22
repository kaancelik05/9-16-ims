import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Service-role client for admin operations inside Edge Functions.
 * Bypasses RLS — never expose these tokens to the browser.
 */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );
}
