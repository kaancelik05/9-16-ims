import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { supabase } from '../../../../core/supabase/supabase-client';
import { formatDate, timeAgo } from '../../../../shared/utils/format';

const ROLE_TITLES: Record<string, string> = {
  admin: 'VP of Influencer Marketing',
  manager: 'Senior Campaign Manager',
  viewer: 'Portfolio Analyst',
};

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-primary-container/20 text-primary',
  manager: 'bg-tertiary-container/20 text-tertiary',
  viewer: 'bg-surface-highest text-outline',
};

/**
 * User profile (/settings/profile) — account identity, session facts
 * and a real password change (supabase.auth.updateUser).
 */
@Component({
  selector: 'app-user-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './profile.html',
  host: { class: 'block' },
})
export class UserProfile {
  protected readonly auth = inject(AuthService);

  protected readonly sessionInfo = signal<{ createdAt: string; lastSignIn: string } | null>(null);

  /* ── Password change ─────────────────────────────────────────── */
  protected readonly newPassword = signal('');
  protected readonly pwState = signal<'idle' | 'saving' | 'saved'>('idle');
  protected readonly pwError = signal<string | null>(null);

  protected readonly role = computed(() => this.auth.profile()?.role ?? 'viewer');
  protected readonly roleTitle = computed(() => ROLE_TITLES[this.role()] ?? 'Agency Member');
  protected readonly roleBadge = computed(
    () => ROLE_BADGES[this.role()] ?? 'bg-surface-highest text-outline',
  );

  /** Template helpers (module functions are not template-accessible). */
  protected readonly formatDate = formatDate;
  protected readonly timeAgo = timeAgo;

  constructor() {
    void this.loadSession();
  }

  private async loadSession(): Promise<void> {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    this.sessionInfo.set({
      createdAt: user.created_at ?? '',
      lastSignIn: user.last_sign_in_at ?? '',
    });
  }

  protected initials(): string {
    const name = this.auth.profile()?.full_name ?? this.auth.userEmail() ?? 'U';
    return name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }

  protected async changePassword(): Promise<void> {
    const password = this.newPassword();
    if (this.pwState() === 'saving') return;
    if (password.length < 6) {
      this.pwError.set('Password must be at least 6 characters.');
      return;
    }
    this.pwError.set(null);
    this.pwState.set('saving');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      this.pwState.set('idle');
      this.pwError.set(error.message);
      return;
    }
    this.pwState.set('saved');
    this.newPassword.set('');
    setTimeout(() => this.pwState.set('idle'), 2500);
  }
}
