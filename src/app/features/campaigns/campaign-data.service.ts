import { Injectable } from '@angular/core';

import { supabase } from '../../core/supabase/supabase-client';
import {
  AssetMetric,
  Campaign,
  Deliverable,
} from '../../shared/models/domain.models';

/** Kanban card row: deliverable + campaign/creator/asset embeds. */
export interface BoardDeliverable extends Deliverable {
  campaigns: { name: string } | null;
  influencers: {
    full_name: string;
    primary_handle: string | null;
    avatar_url: string | null;
  } | null;
  asset_metrics: AssetMetric[];
}

/** Telemetry banner snapshot (Module 4 header). */
export interface SyncTelemetry {
  projectLabel: string;
  projectGid: string | null;
  webhookId: string | null;
  syncedTasks: number;
  totalTasks: number;
  conflicts: number;
  latencyMs: number | null;
}

/** A campaign linked to a real Asana project (outbound actions target it). */
export interface LinkedCampaign {
  campaignId: string;
  projectGid: string;
  name: string;
}

/** Analytics table row: asset metric + deliverable/creator embeds. */
export interface AssetRowData extends AssetMetric {
  deliverables: {
    title: string;
    content_format: string | null;
    asana_task_label: string | null;
    fee: number | null;
    campaigns: { id: string; name: string } | null;
    influencers: {
      full_name: string;
      primary_handle: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
}

/**
 * Campaign data access (Faz 2) — the Kanban board, sync telemetry and
 * analytics asset rows. Returns null on failure so components can stay
 * on their design-flight demo data.
 */
@Injectable({ providedIn: 'root' })
export class CampaignDataService {
  async loadBoard(): Promise<BoardDeliverable[] | null> {
    const { data, error } = await supabase
      .from('deliverables')
      .select(
        '*, campaigns(name), influencers(full_name, primary_handle, avatar_url), asset_metrics(*)',
      )
      .order('sort_order');
    if (error || !data) return null;
    return data as unknown as BoardDeliverable[];
  }

  async loadTelemetry(): Promise<SyncTelemetry | null> {
    const [connections, deliverables, logs] = await Promise.all([
      supabase
        .from('asana_connections')
        .select('project_gid, project_name, status, last_sync_at, webhook_id')
        .eq('status', 'connected')
        .limit(1),
      supabase.from('deliverables').select('id, asana_task_gid'),
      supabase
        .from('asana_sync_log')
        .select('status, latency_ms, created_at')
        .order('created_at', { ascending: false })
        .limit(25),
    ]);
    if (connections.error || deliverables.error) return null;

    const rows = deliverables.data ?? [];
    const synced = rows.filter((d) => d.asana_task_gid).length;
    const recent = (logs.data ?? []).filter(
      (l) => !l.created_at || Date.now() - new Date(l.created_at).getTime() < 24 * 3600e3,
    );
    const conflicts = recent.filter((l) => l.status !== 'success').length;
    const latencies = recent
      .map((l) => l.latency_ms)
      .filter((v): v is number => typeof v === 'number');
    const connection = connections.data?.[0];

    return {
      projectLabel: connection?.project_name
        ? `#${connection.project_name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18)}`
        : '#ASANA-LINK',
      projectGid: connection?.project_gid ?? null,
      webhookId:
        (connection as { webhook_id?: string | null } | undefined)?.webhook_id ?? null,
      syncedTasks: synced,
      totalTasks: rows.length,
      conflicts,
      latencyMs:
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null,
    };
  }

  /** First campaign carrying a real Asana project gid, if any. */
  async loadLinkedCampaign(): Promise<LinkedCampaign | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, asana_project_gid')
      .not('asana_project_gid', 'is', null)
      .order('spend', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data?.asana_project_gid) return null;
    return {
      campaignId: (data as { id: string }).id,
      projectGid: (data as { asana_project_gid: string }).asana_project_gid,
      name: (data as { name: string }).name,
    };
  }

  async loadAssetRows(): Promise<AssetRowData[] | null> {
    const { data, error } = await supabase
      .from('asset_metrics')
      .select(
        '*, deliverables(title, content_format, asana_task_label, fee, campaigns(id, name), influencers(full_name, primary_handle, avatar_url))',
      )
      .order('captured_at', { ascending: false });
    if (error || !data) return null;
    return data as unknown as AssetRowData[];
  }

  /** Campaign roster for analytics/dashboard selectors. */
  async loadCampaigns(): Promise<Campaign[] | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('spend', { ascending: false });
    if (error || !data) return null;
    return data as unknown as Campaign[];
  }
}
