/**
 * Development environment configuration.
 *
 * Values come from the linked Supabase project:
 * Project Settings → API → Project URL / publishable (anon) key
 *
 * `demoMode: true` bypasses Supabase Auth locally — any email/password
 * combination signs in with a mock admin profile. The project is now
 * linked (Faz 0 complete), so real auth is live; re-enable only when
 * working fully offline.
 */
export const environment = {
  production: false,
  demoMode: false,
  supabase: {
    url: 'https://gccipoiophqivifwjkgj.supabase.co',
    anonKey: 'sb_publishable_8ncQT5JMcxKSVzIOSxbWSg_T-m6dIq3',
  },
};
