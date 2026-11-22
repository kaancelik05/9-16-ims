import { Injectable, OnDestroy, computed, signal } from '@angular/core';

import { supabase } from '../supabase/supabase-client';
import { AsanaSyncLog, SyncHealth } from '../../shared/models/domain.models';

const TICKER_LIMIT = 50;

/**
 * Inbound sync telemetry — subscribes to Postgres changes on
 * `asana_sync_log` (event ticker) and `deliverables` (Kanban refresh),
 * both written by the `asana-webhook` Edge Function.
 */
@Injectable({ providedIn: 'root' })
export class AsanaSyncService implements OnDestroy {
  private readonly _events = signal<AsanaSyncLog[]>([]);
  private readonly _connection = signal<string>('closed');
  private readonly _deliverableVersion = signal(0);
  private readonly _lastSyncAt = signal<string | null>(null);
  private readonly _health = signal<SyncHealth>({
    connected: false,
    syncedTasks: 0,
    totalTasks: 0,
    conflicts: 0,
    latencyMs: 0,
    lastSyncAt: null,
  });

  /** Newest-first stream of sync events for the WebSocket ticker. */
  readonly events = this._events.asReadonly();
  readonly connection = this._connection.asReadonly();
  readonly connected = computed(() => this._connection() === 'subscribed');
  readonly health = this._health.asReadonly();
  readonly lastSyncAt = this._lastSyncAt.asReadonly();

  /** Bumped on every deliverable change so feature pages can re-query. */
  readonly deliverableVersion = this._deliverableVersion.asReadonly();

  private channel = supabase
    .channel('asana-sync-telemetry')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'asana_sync_log' },
      (payload) => this.pushEvent(payload.new as AsanaSyncLog),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deliverables' },
      () => this._deliverableVersion.update((v) => v + 1),
    )
    .on('broadcast', { event: 'sync-health' }, ({ payload }) =>
      this._health.set({ ...this._health(), ...(payload as Partial<SyncHealth>) }),
    )
    .subscribe((status) => this._connection.set(status));

  /** Seed the ticker + health snapshot when a page mounts. */
  async loadInitialData(): Promise<void> {
    try {
      const { data } = await supabase
        .from('asana_sync_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(TICKER_LIMIT);
      if (data) this._events.set(data);

      const { data: stats } = await supabase
        .from('deliverables')
        .select('id, asana_task_gid, approval_status');
      if (stats) {
        const synced = stats.filter((d) => d.asana_task_gid !== null).length;
        this._health.set({
          connected: this.connected(),
          syncedTasks: synced,
          totalTasks: stats.length,
          conflicts: 0,
          latencyMs: this._health().latencyMs,
          lastSyncAt: this._lastSyncAt(),
        });
      }
    } catch {
      // Backend unreachable (e.g. pre-link dev) — telemetry stays at defaults.
    }
  }

  /** Recompute the health snapshot after local mutations. */
  refreshHealth(): void {
    void this.loadInitialData();
  }

  private pushEvent(log: AsanaSyncLog): void {
    this._events.update((list) => [log, ...list].slice(0, TICKER_LIMIT));
    this._lastSyncAt.set(log.created_at);
    this._health.update((h) => ({
      ...h,
      lastSyncAt: log.created_at,
      latencyMs: log.latency_ms ?? h.latencyMs,
      conflicts: log.status === 'conflict' ? h.conflicts + 1 : h.conflicts,
    }));
  }

  ngOnDestroy(): void {
    if (this.channel) {
      void supabase.removeChannel(this.channel);
    }
  }
}
