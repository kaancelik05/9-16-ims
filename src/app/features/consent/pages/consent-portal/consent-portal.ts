import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { supabase } from '../../../../core/supabase/supabase-client';
import { BrandLogo, type BrandPlatform } from '../../../../shared/ui/brand-logo';
import { Logo } from '../../../../shared/ui/logo';

interface ConsentContext {
  ok: boolean;
  name: string;
  handle: string;
}

/**
 * Module 6 — Influencer Data Permission & Consent Screen.
 *
 * Shell-less creator portal reached via a single-use tokenized link
 * (/consent?token=…). Renders the authorization card: read-only
 * analytics permission, terms acceptance, notification opt-in and
 * the Approve & Connect handshake.
 *
 * Faz 2: with a token, the context loads from `get_consent_context`
 * and Approve records the grant through the `grant_consent` RPC
 * (single-use, server-side scope whitelist). Invalid / expired / used
 * links surface an explicit error state. Without a token the demo
 * card stays for the design flight.
 */
@Component({
  selector: 'app-consent-portal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandLogo, Logo],
  templateUrl: './consent-portal.html',
  host: { class: 'block' },
})
export class ConsentPortal {
  /** Bound from ?token= via withComponentInputBinding. */
  readonly token = input<string | null>(null);

  protected readonly context = signal<ConsentContext>({
    ok: true,
    name: 'Maya Lin',
    handle: '@maya.lifestyle',
  });

  /** Set when the token is invalid, expired or already used. */
  protected readonly tokenError = signal<string | null>(null);
  /** Set when the grant RPC itself fails after validation. */
  protected readonly grantError = signal<string | null>(null);

  /* ── Permission state ────────────────────────────────────────── */
  protected readonly analyticsOn = signal(true);
  protected readonly termsAccepted = signal(true);
  protected readonly notificationsOn = signal(true);
  protected readonly grantState = signal<'idle' | 'authorizing' | 'connected'>('idle');

  /** Brand logos for the connected-channel chips. */
  protected readonly platforms: BrandPlatform[] = ['instagram', 'tiktok', 'youtube'];

  constructor() {
    const token = this.token();
    if (token) {
      void this.loadContext(token);
    }
  }

  private async loadContext(token: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('get_consent_context', { p_token: token });
      if (error) throw error;
      const ctx = data as unknown as {
        ok: boolean;
        name?: string;
        influencer_name?: string;
        handle?: string | null;
      };
      if (ctx?.ok) {
        this.context.set({
          ok: true,
          name: ctx.name ?? ctx.influencer_name ?? 'Creator',
          handle: ctx.handle ?? '—',
        });
      } else {
        this.tokenError.set(
          'This consent link is invalid, expired or has already been used. Ask the agency for a fresh link.',
        );
      }
    } catch {
      // Backend unreachable — demo context stays; the approve call will
      // surface a proper error if it also fails.
    }
  }

  protected approve(): void {
    if (this.grantState() !== 'idle') return;

    if (!this.termsAccepted()) {
      document.getElementById('terms-conditions')?.focus();
      return;
    }

    const token = this.token();
    if (!token) {
      // Design flight without a link — keep the simulated handshake.
      this.grantState.set('authorizing');
      setTimeout(() => this.grantState.set('connected'), 1200);
      return;
    }

    this.grantError.set(null);
    this.grantState.set('authorizing');
    void this.submitGrant(token);
  }

  private async submitGrant(token: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('grant_consent', {
        p_token: token,
        p_terms_accepted: this.termsAccepted(),
        p_whatsapp_notify: this.notificationsOn(),
        p_email_notify: this.notificationsOn(),
      });
      if (error) throw error;
      const result = data as unknown as { ok: boolean; error?: string; message?: string };
      if (result?.ok) {
        this.grantState.set('connected');
        return;
      }
      this.grantState.set('idle');
      if (result?.error === 'invalid_token') {
        this.tokenError.set(
          'This consent link is invalid, expired or has already been used. Ask the agency for a fresh link.',
        );
      } else {
        this.grantError.set(result?.message ?? 'The grant could not be recorded. Please try again.');
      }
    } catch {
      this.grantState.set('idle');
      this.grantError.set('Connection to the agency backend failed. Please try again.');
    }
  }

  protected initials(): string {
    return this.context()
      .name.split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }
}
