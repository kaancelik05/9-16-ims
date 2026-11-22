/**
 * Production environment configuration.
 *
 * Values come from the linked Supabase project:
 * Project Settings → API → Project URL / publishable (anon) key
 */
export const environment = {
  production: true,
  demoMode: false, // demo auth bypass is dev-only; never enable in prod
  supabase: {
    url: 'https://gccipoiophqivifwjkgj.supabase.co',
    anonKey: 'sb_publishable_8ncQT5JMcxKSVzIOSxbWSg_T-m6dIq3',
  },
};
