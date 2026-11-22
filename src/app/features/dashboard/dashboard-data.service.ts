import { Injectable } from '@angular/core';

import { supabase } from '../../core/supabase/supabase-client';

/** Latest audit joined with its creator (AI safety radar). */
export interface RadarRow {
  influencer_id: string;
  score: number | null;
  status: string;
  sentiment_positive: number | null;
  mentions_scanned: number | null;
  completed_at: string | null;
  influencers: {
    full_name: string;
    primary_handle: string | null;
    avatar_url: string | null;
  } | null;
}

/** Asana sync feed entry (task stream). */
export interface FeedRow {
  id: string;
  direction: 'inbound' | 'outbound';
  entity_id: string | null;
  status: 'success' | 'conflict' | 'failed';
  message: string | null;
  created_at: string;
}

/**
 * Dashboard data access (Faz 2B) — campaign aggregates, sync feed,
 * safety radar and consent overview. Returns null on failure so the
 * screen keeps its design-flight demo data.
 */
@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  async loadSyncFeed(limit = 4): Promise<FeedRow[] | null> {
    const { data, error } = await supabase
      .from('asana_sync_log')
      .select('id, direction, entity_id, status, message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return null;
    return data as unknown as FeedRow[];
  }

  async loadSafetyRadar(limit = 6): Promise<RadarRow[] | null> {
    const { data, error } = await supabase
      .from('safety_audits')
      .select(
        'influencer_id, score, status, sentiment_positive, mentions_scanned, completed_at, ' +
          'influencers(full_name, primary_handle, avatar_url)',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return null;
    return data as unknown as RadarRow[];
  }

  /** Creators with a pending consent link (Awaiting Countersignature). */
  async loadConsentPending(): Promise<{ id: string; handle: string }[] | null> {
    const { data, error } = await supabase
      .from('influencers')
      .select('id, primary_handle')
      .eq('last_consent_state', 'pending')
      .limit(5);
    if (error) return null;
    return (data ?? []).map((r) => {
      const row = r as { id: string; primary_handle: string | null };
      return { id: row.id, handle: row.primary_handle ? `@${row.primary_handle}` : '—' };
    });
  }

  /** Creators without an active grant — Batch Send Digital Releases targets. */
  async loadConsentTargets(limit = 5): Promise<{ id: string; handle: string }[] | null> {
    const { data, error } = await supabase
      .from('influencers')
      .select('id, primary_handle')
      .neq('last_consent_state', 'granted')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return null;
    return (data ?? []).map((r) => {
      const row = r as { id: string; primary_handle: string | null };
      return { id: row.id, handle: row.primary_handle ? `@${row.primary_handle}` : '—' };
    });
  }
}
