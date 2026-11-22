import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import { supabase } from '../../../../core/supabase/supabase-client';
import { timeAgo } from '../../../../shared/utils/format';

interface TeamRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'viewer';
  created_at: string;
}

interface ConnectionRow {
  project_name: string | null;
  project_gid: string;
  webhook_id: string | null;
  status: string;
  last_sync_at: string | null;
}

/**
 * Settings (/settings) — account, team roles (admin-managed; RLS and
 * the self-change guard are enforced server-side), the live Asana
 * connection and the consent-first metric provenance summary.
 */
@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './settings.html',
  host: { class: 'block' },
})
export class Settings {
  protected readonly auth = inject(AuthService);

  protected readonly team = signal<TeamRow[]>([]);
  protected readonly connection = signal<ConnectionRow | null>(null);
  protected readonly sourceCounts = signal<Record<string, number>>({});
  protected readonly savingId = signal<string | null>(null);
  protected readonly note = signal<string | null>(null);

  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly selfId = computed(() => this.auth.profile()?.id ?? null);

  /** Template helpers (module functions are not template-accessible). */
  protected readonly timeAgo = timeAgo;

  /** Row count for a metric source (avoids NG8102 in the template). */
  protected sourceCount(source: 'api' | 'declared' | 'manual'): number {
    return this.sourceCounts()[source] ?? 0;
  }

  constructor() {
    void this.loadAll();
  }

  private async loadAll(): Promise<void> {
    const [team, conn, sources] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase
        .from('asana_connections')
        .select('project_name, project_gid, webhook_id, status, last_sync_at')
        .limit(1)
        .maybeSingle(),
      supabase.from('influencer_platform_metrics').select('source'),
    ]);
    if (team.data) this.team.set(team.data as unknown as TeamRow[]);
    if (conn.data) this.connection.set(conn.data as unknown as ConnectionRow);
    if (sources.data) {
      const counts: Record<string, number> = {};
      for (const row of sources.data as { source: string }[]) {
        counts[row.source] = (counts[row.source] ?? 0) + 1;
      }
      this.sourceCounts.set(counts);
    }
  }

  /** Admin-only role change (server blocks self-changes via trigger). */
  protected async changeRole(row: TeamRow, value: string): Promise<void> {
    const role = value as TeamRow['role'];
    if (role === row.role || this.savingId() !== null) return;
    if (!this.isAdmin()) {
      this.note.set('Only admins can change team roles.');
      return;
    }
    if (row.id === this.selfId()) {
      this.note.set('You cannot change your own role.');
      return;
    }
    this.savingId.set(row.id);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', row.id);
    this.savingId.set(null);
    if (error) {
      this.note.set(error.message);
      return;
    }
    this.note.set(`${row.full_name ?? row.email} is now ${role}.`);
    await this.loadAll();
    setTimeout(() => this.note.set(null), 4000);
  }

  protected initials(name: string | null, email: string): string {
    return (name ?? email)
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }
}
