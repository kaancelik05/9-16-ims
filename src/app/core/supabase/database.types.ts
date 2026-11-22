/**
 * Typed database schema for 9-16 IMP.
 *
 * These types mirror `supabase/migrations/*.sql` 1:1.
 * After changing a migration, keep this file in sync (or regenerate with
 * `supabase gen types typescript` once a live project is linked).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ── Enums ─────────────────────────────────────────────────────────── */

export type UserRole = 'admin' | 'manager' | 'viewer';

export type PlatformType = 'instagram' | 'tiktok' | 'youtube' | 'snapchat';

export type InfluencerTier = 'tier1_kol' | 'mid_tier' | 'nano';

export type InfluencerStatus = 'prospect' | 'open' | 'assigned';

/** 5-stage campaign pipeline (Kanban columns). */
export type CampaignStage =
  | 'selection_pitching'
  | 'briefing_contract'
  | 'content_creation'
  | 'scheduled_live'
  | 'performance_reporting';

export type ApprovalStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'revision'
  | 'rejected';

export type AuditStatus = 'in_progress' | 'green_flag' | 'red_flag';

export type SyncDirection = 'inbound' | 'outbound';

export type SyncStatus = 'success' | 'conflict' | 'failed';

/** Where a metric value came from — consent-first provenance (0004). */
export type MetricSource = 'api' | 'declared' | 'manual';

/* ── Row shapes ────────────────────────────────────────────────────── */

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export type InfluencerRow = {
  id: string;
  full_name: string;
  primary_handle: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  niche: string | null;
  category: string | null;
  tier: InfluencerTier;
  status: InfluencerStatus;
  verified: boolean;
  agent_name: string | null;
  agent_contact: string | null;
  rate_card: number | null;
  currency: string;
  timezone: string | null;
  exclusivity_notes: string | null;
  tags: string[];
  asana_gid: string | null;
  internal_notes: string | null;
  avatar_url: string | null;
  bio: string | null;
  languages: string[];
  audience_summary: Json;
  last_consent_state: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InfluencerPlatformMetricRow = {
  id: string;
  influencer_id: string;
  platform: PlatformType;
  handle: string | null;
  followers: number;
  engagement_rate: number;
  avg_views: number | null;
  viral_index: number | null;
  story_reach: number | null;
  reel_retention: number | null;
  metrics: Json;
  source: MetricSource;
  declared_at: string | null;
  updated_at: string;
}

export type SafetyAuditRow = {
  id: string;
  influencer_id: string;
  status: AuditStatus;
  score: number | null;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  ftc_compliant: boolean | null;
  toxicity_score: number | null;
  mentions_scanned: number | null;
  months_covered: number;
  report: Json;
  triggered_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export type CampaignRow = {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  budget: number;
  spend: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  asana_project_gid: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliverableRow = {
  id: string;
  campaign_id: string;
  influencer_id: string | null;
  stage: CampaignStage;
  title: string;
  content_format: string | null;
  fee: number | null;
  due_date: string | null;
  approval_status: ApprovalStatus;
  asana_task_gid: string | null;
  asana_task_label: string | null;
  asset_url: string | null;
  asset_filename: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type AssetMetricRow = {
  id: string;
  deliverable_id: string;
  platform: PlatformType | null;
  reach: number;
  impressions: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  swipe_ups: number;
  saves: number;
  watch_time_seconds: number | null;
  vcr: number | null;
  sentiment_pct: number | null;
  cpe: number | null;
  emv: number | null;
  source: MetricSource;
  captured_at: string;
}

export type AsanaConnectionRow = {
  id: string;
  workspace_gid: string | null;
  project_gid: string;
  project_name: string | null;
  webhook_id: string | null;
  webhook_secret: string | null;
  status: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AsanaSyncLogRow = {
  id: string;
  direction: SyncDirection;
  entity_type: string;
  entity_id: string | null;
  event: string | null;
  status: SyncStatus;
  latency_ms: number | null;
  message: string | null;
  payload: Json;
  created_at: string;
}

export type ConsentTokenRow = {
  id: string;
  influencer_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

export type CreatorConsentRow = {
  id: string;
  influencer_id: string;
  token_id: string | null;
  scopes: Json;
  terms_accepted: boolean;
  terms_version: string | null;
  whatsapp_notify: boolean;
  email_notify: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/* ── 0004 — integration layer (consent-first data model) ─────────── */

export type PlatformConnectionRow = {
  id: string;
  influencer_id: string;
  platform: PlatformType;
  provider: string;
  external_user_id: string | null;
  scopes: string[];
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  status: string;
  connected_via_consent: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MetricSnapshotRow = {
  id: string;
  influencer_id: string;
  platform: PlatformType;
  followers: number | null;
  engagement_rate: number | null;
  extra: Json;
  source: MetricSource;
  captured_at: string;
}

export type AuditLogRow = {
  id: string;
  actor: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  diff: Json;
  created_at: string;
}

export type MetricSyncRunRow = {
  id: string;
  platform: PlatformType | null;
  status: SyncStatus;
  creators_scanned: number;
  metrics_written: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

/* ── Supabase Database interface (generator-shaped) ──────────────────
 * NOTE: concrete Insert/Update per table, exactly like `supabase gen
 * types` output — shared generic aliases (e.g. TableDef<Row>) break
 * postgrest-js from()/rpc() type resolution.                            */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      influencers: {
        Row: InfluencerRow;
        Insert: {
          id?: string;
          full_name: string;
          primary_handle?: string | null;
          email?: string | null;
          phone?: string | null;
          region?: string | null;
          niche?: string | null;
          category?: string | null;
          tier?: InfluencerTier;
          status?: InfluencerStatus;
          verified?: boolean;
          agent_name?: string | null;
          agent_contact?: string | null;
          rate_card?: number | null;
          currency?: string;
          timezone?: string | null;
          exclusivity_notes?: string | null;
          tags?: string[];
          asana_gid?: string | null;
          internal_notes?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          languages?: string[];
          audience_summary?: Json;
          last_consent_state?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          primary_handle?: string | null;
          email?: string | null;
          phone?: string | null;
          region?: string | null;
          niche?: string | null;
          category?: string | null;
          tier?: InfluencerTier;
          status?: InfluencerStatus;
          verified?: boolean;
          agent_name?: string | null;
          agent_contact?: string | null;
          rate_card?: number | null;
          currency?: string;
          timezone?: string | null;
          exclusivity_notes?: string | null;
          tags?: string[];
          asana_gid?: string | null;
          internal_notes?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          languages?: string[];
          audience_summary?: Json;
          last_consent_state?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      influencer_platform_metrics: {
        Row: InfluencerPlatformMetricRow;
        Insert: {
          id?: string;
          influencer_id: string;
          platform: PlatformType;
          handle?: string | null;
          followers?: number;
          engagement_rate?: number;
          avg_views?: number | null;
          viral_index?: number | null;
          story_reach?: number | null;
          reel_retention?: number | null;
          metrics?: Json;
          source?: MetricSource;
          declared_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          platform?: PlatformType;
          handle?: string | null;
          followers?: number;
          engagement_rate?: number;
          avg_views?: number | null;
          viral_index?: number | null;
          story_reach?: number | null;
          reel_retention?: number | null;
          metrics?: Json;
          source?: MetricSource;
          declared_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      safety_audits: {
        Row: SafetyAuditRow;
        Insert: {
          id?: string;
          influencer_id: string;
          status?: AuditStatus;
          score?: number | null;
          sentiment_positive?: number | null;
          sentiment_neutral?: number | null;
          sentiment_negative?: number | null;
          ftc_compliant?: boolean | null;
          toxicity_score?: number | null;
          mentions_scanned?: number | null;
          months_covered?: number;
          report?: Json;
          triggered_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          status?: AuditStatus;
          score?: number | null;
          sentiment_positive?: number | null;
          sentiment_neutral?: number | null;
          sentiment_negative?: number | null;
          ftc_compliant?: boolean | null;
          toxicity_score?: number | null;
          mentions_scanned?: number | null;
          months_covered?: number;
          report?: Json;
          triggered_by?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      campaigns: {
        Row: CampaignRow;
        Insert: {
          id?: string;
          name: string;
          client_name?: string | null;
          status?: string;
          budget?: number;
          spend?: number;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          asana_project_gid?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          client_name?: string | null;
          status?: string;
          budget?: number;
          spend?: number;
          currency?: string;
          start_date?: string | null;
          end_date?: string | null;
          asana_project_gid?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deliverables: {
        Row: DeliverableRow;
        Insert: {
          id?: string;
          campaign_id: string;
          influencer_id?: string | null;
          stage?: CampaignStage;
          title: string;
          content_format?: string | null;
          fee?: number | null;
          due_date?: string | null;
          approval_status?: ApprovalStatus;
          asana_task_gid?: string | null;
          asana_task_label?: string | null;
          asset_url?: string | null;
          asset_filename?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          influencer_id?: string | null;
          stage?: CampaignStage;
          title?: string;
          content_format?: string | null;
          fee?: number | null;
          due_date?: string | null;
          approval_status?: ApprovalStatus;
          asana_task_gid?: string | null;
          asana_task_label?: string | null;
          asset_url?: string | null;
          asset_filename?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      asset_metrics: {
        Row: AssetMetricRow;
        Insert: {
          id?: string;
          deliverable_id: string;
          platform?: PlatformType | null;
          reach?: number;
          impressions?: number;
          views?: number;
          likes?: number;
          comments?: number;
          shares?: number;
          swipe_ups?: number;
          saves?: number;
          watch_time_seconds?: number | null;
          vcr?: number | null;
          sentiment_pct?: number | null;
          cpe?: number | null;
          emv?: number | null;
          source?: MetricSource;
          captured_at?: string;
        };
        Update: {
          id?: string;
          deliverable_id?: string;
          platform?: PlatformType | null;
          reach?: number;
          impressions?: number;
          views?: number;
          likes?: number;
          comments?: number;
          shares?: number;
          swipe_ups?: number;
          saves?: number;
          watch_time_seconds?: number | null;
          vcr?: number | null;
          sentiment_pct?: number | null;
          cpe?: number | null;
          emv?: number | null;
          source?: MetricSource;
          captured_at?: string;
        };
        Relationships: [];
      };
      asana_connections: {
        Row: AsanaConnectionRow;
        Insert: {
          id?: string;
          workspace_gid?: string | null;
          project_gid: string;
          project_name?: string | null;
          webhook_id?: string | null;
          webhook_secret?: string | null;
          status?: string;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_gid?: string | null;
          project_gid?: string;
          project_name?: string | null;
          webhook_id?: string | null;
          webhook_secret?: string | null;
          status?: string;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      asana_sync_log: {
        Row: AsanaSyncLogRow;
        Insert: {
          id?: string;
          direction: SyncDirection;
          entity_type: string;
          entity_id?: string | null;
          event?: string | null;
          status?: SyncStatus;
          latency_ms?: number | null;
          message?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          direction?: SyncDirection;
          entity_type?: string;
          entity_id?: string | null;
          event?: string | null;
          status?: SyncStatus;
          latency_ms?: number | null;
          message?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      consent_tokens: {
        Row: ConsentTokenRow;
        Insert: {
          id?: string;
          influencer_id: string;
          token: string;
          expires_at: string;
          used_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          token?: string;
          expires_at?: string;
          used_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      creator_consents: {
        Row: CreatorConsentRow;
        Insert: {
          id?: string;
          influencer_id: string;
          token_id?: string | null;
          scopes?: Json;
          terms_accepted?: boolean;
          terms_version?: string | null;
          whatsapp_notify?: boolean;
          email_notify?: boolean;
          granted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          token_id?: string | null;
          scopes?: Json;
          terms_accepted?: boolean;
          terms_version?: string | null;
          whatsapp_notify?: boolean;
          email_notify?: boolean;
          granted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_connections: {
        Row: PlatformConnectionRow;
        Insert: {
          id?: string;
          influencer_id: string;
          platform: PlatformType;
          provider: string;
          external_user_id?: string | null;
          scopes?: string[];
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          status?: string;
          connected_via_consent?: string | null;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          platform?: PlatformType;
          provider?: string;
          external_user_id?: string | null;
          scopes?: string[];
          access_token_encrypted?: string | null;
          refresh_token_encrypted?: string | null;
          token_expires_at?: string | null;
          status?: string;
          connected_via_consent?: string | null;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      metric_snapshots: {
        Row: MetricSnapshotRow;
        Insert: {
          id?: string;
          influencer_id: string;
          platform: PlatformType;
          followers?: number | null;
          engagement_rate?: number | null;
          extra?: Json;
          source?: MetricSource;
          captured_at?: string;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          platform?: PlatformType;
          followers?: number | null;
          engagement_rate?: number | null;
          extra?: Json;
          source?: MetricSource;
          captured_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: {
          id?: string;
          actor?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          diff?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          diff?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      metric_sync_runs: {
        Row: MetricSyncRunRow;
        Insert: {
          id?: string;
          platform?: PlatformType | null;
          status?: SyncStatus;
          creators_scanned?: number;
          metrics_written?: number;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          platform?: PlatformType | null;
          status?: SyncStatus;
          creators_scanned?: number;
          metrics_written?: number;
          error_message?: string | null;
          started_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_consent_token: {
        Args: { p_influencer_id: string; p_ttl_hours?: number };
        Returns: string;
      };
      get_consent_context: {
        Args: { p_token: string };
        Returns: Json;
      };
      grant_consent: {
        Args: {
          p_token: string;
          p_scopes?: Json;
          p_terms_accepted?: boolean;
          p_whatsapp_notify?: boolean;
          p_email_notify?: boolean;
        };
        Returns: Json;
      };
      revoke_consent: {
        Args: { p_token: string };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      platform_type: PlatformType;
      influencer_tier: InfluencerTier;
      influencer_status: InfluencerStatus;
      campaign_stage: CampaignStage;
      approval_status: ApprovalStatus;
      audit_status: AuditStatus;
      sync_direction: SyncDirection;
      sync_status: SyncStatus;
      metric_source: MetricSource;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
