/**
 * Shared caller verification for JWT-protected Edge Functions.
 *
 * The platform gateway accepts publishable (anon-level) keys as valid
 * `verify_jwt` credentials — gateway checks alone do NOT prove the caller
 * is agency staff. Functions that act with privileged secrets (Asana PAT,
 * consent tokens) must additionally resolve the caller's profiles row.
 */

import { serviceClient } from './supabase.ts';

export interface AgencyProfile {
  id: string;
  role: string;
}

/** Resolve the Authorization header to a real profiles row. */
export async function requireAgencyMember(
  authHeader: string | null,
): Promise<AgencyProfile> {
  if (!authHeader) throw new Error('Missing authorization header');
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const supabase = serviceClient();
  const { data: claims, error } = await supabase.auth.getUser(token);
  if (error || !claims.user) throw new Error('Invalid session');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', claims.user.id)
    .maybeSingle();

  if (!profile) throw new Error('No agency profile for this user');
  return profile as AgencyProfile;
}

/** Gate mutating actions to admin/manager roles. */
export function requireWriteRole(profile: AgencyProfile): void {
  if (!['admin', 'manager'].includes(profile.role)) {
    throw new Error('Only admin/manager roles can perform this action');
  }
}
