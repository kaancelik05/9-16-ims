import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import { supabase } from '../supabase/supabase-client';
import { Profile } from '../../shared/models/domain.models';

const DEMO_SESSION_KEY = 'ims_demo_session';

/**
 * Session state as signals — zoneless-friendly.
 * `session()` is null until the initial session is restored.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _session = signal<Session | null>(null);
  private readonly _profile = signal<Profile | null>(null);

  readonly session = this._session.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly userEmail = computed(() => this._session()?.user?.email ?? null);

  constructor() {
    if (environment.demoMode) {
      // Demo mode: restore the in-progress mock session across reloads
      // (ng serve pushes full page reloads on every design iteration).
      const email = localStorage.getItem(DEMO_SESSION_KEY);
      if (email) this.applyDemoSession(email);
      return;
    }

    // Restore the persisted session, then keep signals in sync.
    supabase.auth
      .getSession()
      .then(({ data }) => this._session.set(data.session))
      .then(() => this.loadProfile())
      .catch(() => void 0);

    supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      void this.loadProfile();
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    if (environment.demoMode) {
      this.applyDemoSession(email);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    this._profile.set(null);
    if (environment.demoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      this._session.set(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /** Agency role check for conditional UI (e.g. admin-only actions). */
  hasRole(...roles: Profile['role'][]): boolean {
    const role = this._profile()?.role;
    return role != null && roles.includes(role);
  }

  /**
   * Dev-only mock session (environment.demoMode) — lets the workspace be
   * browsed before a Supabase project is linked. Never active in prod.
   */
  private applyDemoSession(email: string): void {
    localStorage.setItem(DEMO_SESSION_KEY, email);
    const now = new Date().toISOString();
    this._session.set({
      access_token: 'demo-session',
      user: { id: 'demo-user', email },
    } as unknown as Session);
    this._profile.set({
      id: 'demo-user',
      email,
      full_name: 'Elena Rostova',
      role: 'admin',
      avatar_url: null,
      created_at: now,
      updated_at: now,
    });
  }

  private async loadProfile(): Promise<void> {
    const userId = this._session()?.user?.id;
    if (!userId) {
      this._profile.set(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) this._profile.set(data);
  }
}
