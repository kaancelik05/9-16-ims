import { Database } from '../../core/supabase/database.types';

/* ── Convenience row aliases ───────────────────────────────────────── */

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Influencer = Database['public']['Tables']['influencers']['Row'];
export type InfluencerInsert = Database['public']['Tables']['influencers']['Insert'];
export type PlatformMetric =
  Database['public']['Tables']['influencer_platform_metrics']['Row'];
export type SafetyAudit = Database['public']['Tables']['safety_audits']['Row'];
export type Campaign = Database['public']['Tables']['campaigns']['Row'];
export type Deliverable = Database['public']['Tables']['deliverables']['Row'];
export type AssetMetric = Database['public']['Tables']['asset_metrics']['Row'];
export type AsanaConnection =
  Database['public']['Tables']['asana_connections']['Row'];
export type AsanaSyncLog = Database['public']['Tables']['asana_sync_log']['Row'];
export type ConsentToken = Database['public']['Tables']['consent_tokens']['Row'];
export type CreatorConsent =
  Database['public']['Tables']['creator_consents']['Row'];

/* ── 0004 — integration layer (consent-first data model) ─────────── */

export type PlatformConnection =
  Database['public']['Tables']['platform_connections']['Row'];
export type MetricSnapshot =
  Database['public']['Tables']['metric_snapshots']['Row'];
export type AuditLog = Database['public']['Tables']['audit_log']['Row'];
export type MetricSyncRun =
  Database['public']['Tables']['metric_sync_runs']['Row'];

/* ── Display label maps (EN) ───────────────────────────────────────── */

export type PlatformType = Database['public']['Enums']['platform_type'];
export type CampaignStage = Database['public']['Enums']['campaign_stage'];
export type ApprovalStatus = Database['public']['Enums']['approval_status'];
export type AuditStatus = Database['public']['Enums']['audit_status'];
export type InfluencerTier = Database['public']['Enums']['influencer_tier'];
export type InfluencerStatus = Database['public']['Enums']['influencer_status'];
export type MetricSource = Database['public']['Enums']['metric_source'];

export const PLATFORM_LABELS: Record<PlatformType, string> = {
  instagram: 'Instagram 9:16',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
  snapchat: 'Snapchat Spotlight',
};

export const PLATFORM_SHORT: Record<PlatformType, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  youtube: 'YT',
  snapchat: 'SC',
};

export const CAMPAIGN_STAGES: { value: CampaignStage; label: string; index: number }[] = [
  { value: 'selection_pitching', label: 'Selection & Pitching', index: 1 },
  { value: 'briefing_contract', label: 'Briefing & Contract', index: 2 },
  { value: 'content_creation', label: 'Content Creation & Draft Approval', index: 3 },
  { value: 'scheduled_live', label: 'Scheduled / Live', index: 4 },
  { value: 'performance_reporting', label: 'Performance Reporting', index: 5 },
];

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  revision: 'Revision',
  rejected: 'Rejected',
};

export const TIER_LABELS: Record<InfluencerTier, string> = {
  tier1_kol: 'Tier 1 KOL',
  mid_tier: 'Mid-tier',
  nano: 'Nano',
};

export const INFLUENCER_STATUS_LABELS: Record<InfluencerStatus, string> = {
  prospect: 'Prospect',
  open: 'Open',
  assigned: 'Assigned',
};

/* ── Aggregate view models ─────────────────────────────────────────── */

/** Influencer joined with its cross-platform telemetry (Directory bento card). */
export interface InfluencerWithMetrics extends Influencer {
  platform_metrics: PlatformMetric[];
}

/** Deliverable enriched for Kanban cards and analytics tables. */
export interface DeliverableView extends Deliverable {
  influencer?: Pick<Influencer, 'id' | 'full_name' | 'primary_handle'> | null;
  campaign?: Pick<Campaign, 'id' | 'name' | 'client_name'> | null;
  metrics?: AssetMetric | null;
}

/** Health snapshot rendered by the sync telemetry banner. */
export interface SyncHealth {
  connected: boolean;
  syncedTasks: number;
  totalTasks: number;
  conflicts: number;
  latencyMs: number;
  lastSyncAt: string | null;
}
