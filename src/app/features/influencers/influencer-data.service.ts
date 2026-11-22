import { Injectable } from '@angular/core';

import { supabase } from '../../core/supabase/supabase-client';
import {
  Campaign,
  Deliverable,
  Influencer,
  InfluencerTier,
  PlatformMetric,
  SafetyAudit,
} from '../../shared/models/domain.models';

/** Directory row: influencer with embedded relations for the bento cards. */
export interface DirectoryRow extends Influencer {
  influencer_platform_metrics: PlatformMetric[];
  deliverables: {
    asana_task_label: string | null;
    approval_status: string | null;
    campaigns: { name: string } | null;
  }[];
  safety_audits: { score: number | null; status: string; created_at: string }[];
}

/** Profile dossier bundle (Module 3). */
export interface ProfileBundle {
  influencer: Influencer;
  metrics: PlatformMetric[];
  audit: SafetyAudit | null;
  deliverables: (Deliverable & { campaigns: Campaign | null })[];
}

/** Payload for the Module 2 registration modal. */
export interface CreateInfluencerInput {
  name: string;
  location: string;
  email: string;
  niche: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  snapchat: string;
  tierLabel: string;
  campaign: string;
  audit: boolean;
  /** Optional profile photo — uploaded to the public ims-avatars bucket. */
  avatarFile?: File | null;
  /** Internal note from the registering agent. */
  internalNotes?: string;
}

const TIER_BY_LABEL: Record<string, InfluencerTier> = {
  'Exclusive Tier 1 (Key Opinion Leader)': 'tier1_kol',
  'Tier 2 • High Velocity Mid-Tier': 'mid_tier',
  'Micro / UGC Specialist Pool': 'nano',
  'Guest Collaborator (Single Campaign)': 'mid_tier',
};

/**
 * Influencer data access (Faz 2) — real Supabase queries for the
 * Directory / Profile / Add-Influencer flows. Components keep their
 * demo rosters as the offline fallback; every method returns `null`
 * on failure so callers can decide to stay on demo data.
 */
@Injectable({ providedIn: 'root' })
export class InfluencerDataService {
  /** Full roster with metrics, campaign links and audit scores. */
  async loadDirectory(): Promise<DirectoryRow[] | null> {
    const { data, error } = await supabase
      .from('influencers')
      .select(
        '*, influencer_platform_metrics(*), ' +
          'deliverables(asana_task_label, approval_status, campaigns(name)), ' +
          'safety_audits(score, status, created_at)',
      )
      .order('created_at', { ascending: false });
    if (error || !data) return null;
    return data as unknown as DirectoryRow[];
  }

  /** Single-creator dossier; null when the uuid does not exist. */
  async loadProfile(id: string): Promise<ProfileBundle | null> {
    const { data, error } = await supabase
      .from('influencers')
      .select(
        '*, influencer_platform_metrics(*), safety_audits(*), ' +
          'deliverables(*, campaigns(*))',
      )
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;

    const row = data as unknown as Influencer & {
      influencer_platform_metrics: PlatformMetric[];
      safety_audits: SafetyAudit[];
      deliverables: (Deliverable & { campaigns: Campaign | null })[];
    };
    const audits = [...(row.safety_audits ?? [])].sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );
    const deliverables = [...(row.deliverables ?? [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    return {
      influencer: row,
      metrics: row.influencer_platform_metrics ?? [],
      audit: audits[0] ?? null,
      deliverables,
    };
  }

  /**
   * Persists a Module 2 registration: the influencer row, one
   * platform-metric row per provided handle (source = manual until the
   * metrics ingestion lands), and an in-progress safety audit when the
   * instant-audit toggle was on. Returns the created row for the card.
   */
  async create(input: CreateInfluencerInput): Promise<DirectoryRow | null> {
    const handleBase =
      input.instagram || input.tiktok || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
    const assigned = input.campaign !== 'None - General Creator Roster';
    const category = input.niche.split(/ [&•] /)[0]!;

    const { data: userData } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from('influencers')
      .insert({
        full_name: input.name,
        primary_handle: handleBase || null,
        email: input.email || null,
        region: input.location || null,
        niche: input.niche,
        category,
        tier: TIER_BY_LABEL[input.tierLabel] ?? 'mid_tier',
        status: assigned ? 'assigned' : 'prospect',
        tags: [input.niche, 'New Addition'],
        internal_notes: input.internalNotes?.trim() || null,
        created_by: userData.user?.id ?? null,
      })
      .select('*')
      .single();
    if (error || !created) return null;
    let row = created as unknown as Influencer;

    // Profile photo → public ims-avatars bucket → avatar_url.
    if (input.avatarFile) {
      const ext = (input.avatarFile.name.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `avatars/${row.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('ims-avatars')
        .upload(path, input.avatarFile, { contentType: input.avatarFile.type });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from('ims-avatars').getPublicUrl(path);
        await supabase
          .from('influencers')
          .update({ avatar_url: pub.publicUrl })
          .eq('id', row.id);
        row = { ...row, avatar_url: pub.publicUrl };
      }
    }

    const handleMap: [PlatformMetric['platform'], string][] = [
      ['instagram', input.instagram],
      ['tiktok', input.tiktok],
      ['youtube', input.youtube],
      ['snapchat', input.snapchat],
    ];
    const metricRows = handleMap
      .filter(([, handle]) => handle.length > 0)
      .map(([platform, handle]) => ({
        influencer_id: row.id,
        platform,
        handle,
        source: 'manual' as const,
      }));
    if (metricRows.length > 0) {
      await supabase.from('influencer_platform_metrics').insert(metricRows);
    }
    if (input.audit) {
      await supabase.from('safety_audits').insert({
        influencer_id: row.id,
        status: 'in_progress',
        months_covered: 36,
      });
    }

    return {
      ...row,
      influencer_platform_metrics: [],
      deliverables: [],
      safety_audits: input.audit
        ? [{ score: null, status: 'in_progress', created_at: new Date().toISOString() }]
        : [],
    };
  }
}
