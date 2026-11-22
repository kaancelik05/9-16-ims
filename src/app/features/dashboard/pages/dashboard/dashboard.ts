import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import {
  AssetRowData,
  CampaignDataService,
} from '../../../campaigns/campaign-data.service';
import {
  DashboardDataService,
  FeedRow,
  RadarRow,
} from '../../dashboard-data.service';
import { Campaign } from '../../../../shared/models/domain.models';
import { CampaignContextService } from '../../../../core/campaign/campaign-context.service';
import { ConsentApiService } from '../../../../core/consent/consent-api.service';
import { BrandLogo, type BrandPlatform } from '../../../../shared/ui/brand-logo';
import {
  compactCount,
  timeAgo,
} from '../../../../shared/utils/format';

interface ConsentRow {
  id: string;
  handle: string;
}

interface KpiSnapshot {
  reach: string;
  impressions: string;
  reachPct: number;
  er: string;
  alpha: string;
  spent: string;
  committed: string;
  burnPct: number;
  roi: string;
  emv: string;
}

interface PlatformCard {
  code: string;
  brand: BrandPlatform;
  name: string;
  codeClass: string;
  status: string;
  statusClass: string;
  headline: string;
  headlineLabel: string;
  right: string;
  rightLabel: string;
  rightClass: string;
  footLeft: string;
  footRight: string;
  footRightClass: string;
}

interface FeedCard {
  id: string;
  title: string;
  icon: string;
  iconClass: string;
  assignee: string;
  status: string;
  statusClass: string;
  time: string;
}

interface RadarCard {
  handle: string;
  image: string;
  score: string;
  scoreClass: string;
  note: string;
  meta: string | null;
  action: 'verify' | 'rider';
}

interface ShowcaseCard {
  image: string;
  dot: string;
  format: string;
  roi: string;
  roiClass: string;
  title: string;
  handle: string;
  metrics: { label: string; value: string; valueClass: string }[];
  footIcon: string;
  footText: string;
  footClass: string;
}

/**
 * Executive Dashboard — global campaign velocity overview.
 *
 * Renders the approved "Global Campaign Velocity" screen: hero banner,
 * 4 KPI cards, platform telemetry bento, live Asana task stream, AI
 * brand-safety radar, consent & rights panel and the 9:16 asset showcase.
 *
 * Faz 2B: every block derives from live Supabase aggregates
 * (campaigns, asset_metrics, asana_sync_log, safety_audits,
 * influencers.last_consent_state); the design-flight demo data stays
 * as the offline/demoMode fallback.
 */
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrandLogo],
  templateUrl: './dashboard.html',
  host: { class: 'block' },
})
export class Dashboard {
  private readonly campaignData = inject(CampaignDataService);
  private readonly dashData = inject(DashboardDataService);
  private readonly consentApi = inject(ConsentApiService);
  protected readonly campaignContext = inject(CampaignContextService);

  /** 'live' = Supabase aggregates, 'demo' = design-flight fallback. */
  protected readonly source = signal<'live' | 'demo'>('demo');

  /* ── Banner ───────────────────────────────────────────────────── */
  protected readonly activeCampaign = signal("Summer Hype '25");
  protected readonly flightLabel = signal('(Day 31 of 45)');

  /* ── KPI cards (design defaults until live aggregates land) ───── */
  protected readonly kpi = signal<KpiSnapshot>({
    reach: '48.6M',
    impressions: '56.2M',
    reachPct: 82,
    er: '4.82%',
    alpha: '+1.92%',
    spent: '$342.8K',
    committed: '$450K',
    burnPct: 76.2,
    roi: '4.35x',
    emv: '$1,491,180',
  });

  /* ── Platform telemetry cards ─────────────────────────────────── */
  protected readonly platforms = signal<PlatformCard[]>([
    {
      code: 'TT',
      brand: 'tiktok',
      name: 'TikTok',
      codeClass: 'text-on-surface',
      status: 'Healthy',
      statusClass: 'bg-tertiary-container/20 text-tertiary',
      headline: '22.4M',
      headlineLabel: 'Impressions',
      right: '8.4%',
      rightLabel: 'Engagement',
      rightClass: 'text-tertiary',
      footLeft: '14 Creator Posts Live',
      footRight: '+22.4% w/w',
      footRightClass: 'text-tertiary',
    },
    {
      code: 'IG',
      brand: 'instagram',
      name: 'Instagram',
      codeClass: 'text-primary',
      status: 'Healthy',
      statusClass: 'bg-tertiary-container/20 text-tertiary',
      headline: '18.2M',
      headlineLabel: 'Organic Reach',
      right: '9.8%',
      rightLabel: 'Story Completion',
      rightClass: 'text-primary',
      footLeft: '28 Deliverables',
      footRight: '+14.1% w/w',
      footRightClass: 'text-primary',
    },
    {
      code: 'YT',
      brand: 'youtube',
      name: 'YouTube Shorts',
      codeClass: 'text-error',
      status: 'Synced',
      statusClass: 'bg-primary-container/20 text-primary',
      headline: '6.8M',
      headlineLabel: 'Long + Shorts',
      right: '12m 04s',
      rightLabel: 'Avg Watch Time',
      rightClass: 'text-on-surface',
      footLeft: '5 Integrations',
      footRight: 'Retention 68%',
      footRightClass: 'text-tertiary',
    },
    {
      code: 'SC',
      brand: 'snapchat',
      name: 'Snapchat Spotlight',
      codeClass: 'text-secondary',
      status: 'Active',
      statusClass: 'bg-surface-high text-on-surface',
      headline: '1.2M',
      headlineLabel: 'Impressions',
      right: '4.1%',
      rightLabel: 'Swipe-Up Rate',
      rightClass: 'text-secondary',
      footLeft: '3 Ad Drops',
      footRight: '$0.18 CPC',
      footRightClass: 'text-secondary',
    },
  ]);

  /* ── Asana live task stream ───────────────────────────────────── */
  protected readonly tasks = signal([
    {
      id: 'ASN-8842',
      title: 'FTC Disclosure & Whitelist Clause',
      icon: 'assignment',
      iconClass: 'text-primary',
      assignee: '@sarah_vance • Legal / Brand Risk',
      status: 'In Review',
      statusClass: 'bg-surface-highest text-secondary',
      time: '2m ago',
    },
    {
      id: 'ASN-8839',
      title: 'TikTok 9:16 Draft Video #2',
      icon: 'check_circle',
      iconClass: 'text-tertiary',
      assignee: '@kai_creative • Creative Ops',
      status: 'Approved',
      statusClass: 'bg-tertiary-container/30 text-tertiary',
      time: '8m ago',
    },
    {
      id: 'ASN-8815',
      title: 'Whitelist Ad Access Grant',
      icon: 'warning',
      iconClass: 'text-primary-container',
      assignee: '@thelexiproject • Paid Social',
      status: 'Action Needed',
      statusClass: 'bg-primary-container/20 text-primary',
      time: '15m ago',
    },
    {
      id: 'ASN-8790',
      title: 'Final Payment Milestone & Rights',
      icon: 'verified',
      iconClass: 'text-tertiary',
      assignee: 'Finance Routing Node',
      status: 'Completed',
      statusClass: 'bg-tertiary-container/30 text-tertiary',
      time: 'Synced',
    },
  ]);

  /* ── AI safety radar creators ─────────────────────────────────── */
  protected readonly creators = signal<RadarCard[]>([
    {
      handle: '@maya.lifestyle',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCPVT-CA7wUdTFx7emJeUIYMZ9WebnncnJQVoiFgbwAExIvxJkbjUFqs8xSA-tTczKUsMZUL4h8lm3q3I3vVB_L4entXsnX1FVRMa90PKZFAbJnGpjepQCBU_UXZZAe1OE09uYdzX6s-Jleql68Ey6YGzOKNtFTSt2KzE2qR9eTlQNKlkFTcSmLvK5VRZGRSMurSg6wmIq8-3Uqbl2dYPz3Js7xx9dq1BR8qKvrr6I',
      score: '99.1% SAFE',
      scoreClass:
        'rounded-full bg-tertiary-container/20 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-tertiary',
      note: 'Clean press history · 0 FTC infractions · 98% authentic engagement.',
      meta: 'Audited 1h ago',
      action: 'verify' as const,
    },
    {
      handle: '@danny_hyper',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCnFvrY8pHwU-UF5MIA4xJSaTcDOwU5nDAbeFET54TcWG5NRzOF9uArTvja0aZN17YxSnvxnHDIX87SN37TOO2okYiE8uxB1tdPti0rIpx__VQhipzif4aZfeLGJJk4qgDhnrNFWyNySTIhZY-JY_QEjDr-ijXXzL1Lmv4r5awf8bGNw3JvuSQeP6KVTfOwTUpjo6jz5dnTcOA1qVV03kRUPN0kWCBOsN36uCBI-ZI',
      score: '78.4% MODERATE RISK',
      scoreClass:
        'rounded-full bg-secondary-container/40 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-secondary',
      note: 'Competitor conflict (Q3 2024) · add 6-month non-compete clause.',
      meta: null as string | null,
      action: 'rider' as const,
    },
    {
      handle: '@zen_alchemist',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDaxtWAH6CKsZBgkM9KQGaWn8cOioHmKPsJ4Ov1df7moaKteKGH6k746QcsaZFcOL7CXiLNTdalnyo6wIWISWKNC2x2dPVnTcGj6diVfS7QyIEbUfBwK6a3q2hK4GOerMqSobJ41Bg58RhOJxIpcR4qESguBSr9Mtotf4B5ftDOUZTLM2sXmEzos2865Lcz5exKMlyiW0feIOHNPwi63M5OFh0DQllhW-L-AJtcQU',
      score: '96.8% SAFE',
      scoreClass:
        'rounded-full bg-tertiary-container/20 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-tertiary',
      note: '+91% positive sentiment · high organic cadence and retention.',
      meta: 'Audited 3h ago',
      action: 'verify' as const,
    },
  ]);

  /* ── Consent panel ────────────────────────────────────────────── */
  protected readonly pendingConsents = signal<ConsentRow[]>([
    { id: 'demo-1', handle: '@thelexiproject' },
    { id: 'demo-2', handle: '@jordan_vibe' },
    { id: 'demo-3', handle: '@carter.athletics' },
  ]);

  /** Minted single-use consent links (creator id → url). */
  protected readonly consentLinks = signal<Record<string, string>>({});
  /** Batch "Send Digital Releases" result rows. */
  protected readonly generatedLinks = signal<{ handle: string; url: string }[]>([]);
  protected readonly consentBusy = signal(false);

  /* ── 9:16 asset showcase ──────────────────────────────────────── */
  protected readonly assets = signal([
    {
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC0D_T3N4ORuf95lu3VAK00YUF8cKJojRGUTupynN9YN-EpnmMLEa36vWjPqqr9UR7rC3rFDPoxGqwVtIS6QCDPBDS_qKFHZqQIMVcOnsoH1w-_QwL9DMIWxuXzORuzjVXyikOrG_Ti8_2fCLDvNkb2i6-7Joro_R1h4fs57lGzsRy0qtak1XyNcW8eRojPGwfG6uIcc34MRFQiPX3kPtIsDKELBewl4dwp75egVQo',
      dot: 'bg-primary',
      format: 'IG Reel • 9:16',
      roi: '5.2x ROI',
      roiClass:
        'rounded bg-tertiary-container/80 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-on-tertiary-container',
      title: 'Summer Glow Hydration Reel',
      handle: '@maya.lifestyle',
      metrics: [
        { label: 'Views', value: '3.8M', valueClass: 'text-on-surface' },
        { label: 'Eng. Rate', value: '6.4%', valueClass: 'text-tertiary' },
        { label: 'Est. EMV', value: '$84.2K', valueClass: 'text-primary' },
      ],
      footIcon: 'trending_up',
      footText: 'Top 5% Network',
      footClass: 'text-tertiary',
    },
    {
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDi4wgFqWaQGrKgKse1m61eWg6JNORa88Q0CV2gPpmXlnjviC7Ai3DslylG6LShIpVpnDYACnLSAi9cZdT2E62ebZGocL7aoy4kCG92ocPWuWHrkF0ci3YND6flvabiSlY4i-8xqG30lgFWKosVZDXy43z7cc8aNVIphoub-G1tWPUqPCrmST5ywJUB5AO6WfnlDnp7xPvQxhtbU85aNQPUvAuNit9LNg5kzUVWnLQ',
      dot: 'bg-tertiary',
      format: 'TikTok • 9:16',
      roi: '6.8x ROI',
      roiClass:
        'rounded bg-tertiary-container/80 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-on-tertiary-container',
      title: 'Unboxing GRWM Short',
      handle: '@kai_creative',
      metrics: [
        { label: 'Views', value: '5.1M', valueClass: 'text-on-surface' },
        { label: 'Eng. Rate', value: '7.9%', valueClass: 'text-tertiary' },
        { label: 'Est. EMV', value: '$112K', valueClass: 'text-primary' },
      ],
      footIcon: 'local_fire_department',
      footText: 'Viral Breakout',
      footClass: 'text-tertiary',
    },
    {
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDAORFxFNRbluKn4JdrS8jYnkTBKSkpFKuVuA2_kUl8RDH2rNgf1GpzQm09z4FhH4fMMr5bIcJXpgMiMcIGw8zCKe3YCY8H6QX9nS6DW8Q9z2FVfmftavxiIWxNoURN9suVrtcIcIjKIFtpfsSpoJ3PephkMxFYWTfJYNd-sTEOG_3GhiVY5-_ae4T7lK0R0vmAlYTyHSuNU6hV9eSdcV0YwbOK2QeVd2rtLJaD-VU',
      dot: 'bg-secondary',
      format: 'IG Story Stack • 9:16',
      roi: '3.9x ROI',
      roiClass:
        'rounded bg-primary-container/80 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-on-primary-container',
      title: 'Behind the Scenes Stack',
      handle: '@thelexiproject',
      metrics: [
        { label: 'Story Reach', value: '840K', valueClass: 'text-on-surface' },
        { label: 'Link Clicks', value: '24.9K', valueClass: 'text-tertiary' },
        { label: 'Tap Back', value: '2.1%', valueClass: 'text-secondary' },
      ],
      footIcon: 'touch_app',
      footText: 'High Click-Through',
      footClass: 'text-primary',
    },
  ]);

  /** Mints a single-use consent link for one pending creator (Ping). */
  protected async generateLink(row: ConsentRow): Promise<void> {
    if (!row.id || this.consentBusy()) return;
    this.consentBusy.set(true);
    try {
      const url = await this.consentApi.createLink(row.id);
      this.consentLinks.update((map) => ({ ...map, [row.id]: url }));
    } catch {
      // leave the Ping button in place; a retry is cheap
    } finally {
      this.consentBusy.set(false);
    }
  }

  /** Batch Send Digital Releases — links for creators without a grant. */
  protected async batchSend(): Promise<void> {
    if (this.consentBusy()) return;
    this.consentBusy.set(true);
    this.generatedLinks.set([]);
    try {
      const targets = (await this.dashData.loadConsentTargets()) ?? [];
      const rows: { handle: string; url: string }[] = [];
      for (const target of targets) {
        try {
          rows.push({ handle: target.handle, url: await this.consentApi.createLink(target.id) });
        } catch {
          rows.push({ handle: target.handle, url: '(link could not be minted)' });
        }
      }
      this.generatedLinks.set(
        rows.length > 0 ? rows : [{ handle: '@all creators already granted', url: '—' }],
      );
    } finally {
      this.consentBusy.set(false);
    }
  }

  protected copyLink(url: string): void {
    void navigator.clipboard?.writeText(url);
  }

  /* ── Sparkline & metric switcher ──────────────────────────────── */
  protected readonly sparkBars = [40, 65, 50, 80, 70, 95, 85, 100, 90, 75, 92, 84];

  /** Showcase thumbnails whose remote URL died — gradient fallback renders. */
  protected readonly failedAssets = signal<ReadonlySet<string>>(new Set());

  protected onAssetImageError(title: string): void {
    this.failedAssets.update((set) => new Set(set).add(title));
  }

  /** Platform of a showcase card — drives the fallback brand mark. */
  protected brandOf(a: { format: string }): BrandPlatform {
    const format = a.format.toLowerCase();
    if (format.includes('tiktok')) return 'tiktok';
    if (format.includes('snap')) return 'snapchat';
    if (format.includes('youtube') || format.includes('shorts')) return 'youtube';
    return 'instagram';
  }

  protected readonly sparkBarClasses = ['bg-primary-container', 'bg-primary', 'bg-tertiary'];

  protected readonly metricTabs = [
    { key: 'views', label: 'Views' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'conversion', label: 'Conversion' },
    { key: 'emv', label: 'EMV' },
  ];
  protected readonly activeMetric = signal('views');

  constructor() {
    void this.campaignContext.ensureLoaded();
    if (!environment.demoMode) void this.loadDashboard();
    // Re-scope the campaign-derived blocks whenever the topbar selector
    // changes (raw data is cached, so this is a pure remap).
    effect(() => {
      this.campaignContext.selectedId();
      if (this.rawCampaigns.length > 0 || this.rawAssets.length > 0) {
        this.applyCampaignScope();
      }
    });
  }

  private rawCampaigns: Campaign[] = [];
  private rawAssets: AssetRowData[] = [];

  private async loadDashboard(): Promise<void> {
    const [campaigns, assetRows, feed, radar, pending] = await Promise.all([
      this.campaignData.loadCampaigns(),
      this.campaignData.loadAssetRows(),
      this.dashData.loadSyncFeed(),
      this.dashData.loadSafetyRadar(),
      this.dashData.loadConsentPending(),
    ]);
    if (!campaigns && !assetRows) return; // backend unreachable — stay demo
    this.rawCampaigns = campaigns ?? [];
    this.rawAssets = assetRows ?? [];
    this.source.set('live');

    // ── Asana task stream (global, campaign-agnostic)
    if (feed && feed.length > 0) this.tasks.set(this.mapFeed(feed));

    // ── AI safety radar (latest audit per creator)
    if (radar && radar.length > 0) this.creators.set(this.mapRadar(radar));

    // ── Consent panel (creators with a pending link)
    if (pending) {
      this.pendingConsents.set(
        pending.length > 0 ? pending : [{ id: '', handle: '@all-clear — no pending releases' }],
      );
    }

    this.applyCampaignScope();
  }

  /** Banner + KPI + platforms + showcase, scoped by the global selector. */
  private applyCampaignScope(): void {
    const campaigns = this.rawCampaigns;
    const selected =
      campaigns.find((c) => c.id === this.campaignContext.selectedId()) ?? null;
    const assets = selected
      ? this.rawAssets.filter((a) => a.deliverables?.campaigns?.id === selected.id)
      : this.rawAssets;
    const scope = selected ? [selected] : campaigns;

    // ── Banner: selected (or flagship) campaign + flight progress
    const flagship = selected ?? campaigns.find((c) => c.status === 'active') ?? campaigns[0];
    if (flagship?.name) this.activeCampaign.set(flagship.name);
    if (flagship?.start_date && flagship?.end_date) {
      const start = new Date(`${flagship.start_date}T00:00:00Z`).getTime();
      const end = new Date(`${flagship.end_date}T00:00:00Z`).getTime();
      if (end > start) {
        const day = Math.max(1, Math.ceil((Date.now() - start) / 86_400_000));
        const total = Math.ceil((end - start) / 86_400_000);
        this.flightLabel.set(`(Day ${Math.min(day, total)} of ${total})`);
      }
    }

    // ── KPI aggregates (scoped)
    const reach = assets.reduce((s, a) => s + (a.reach ?? 0), 0);
    const impressions = assets.reduce((s, a) => s + (a.impressions ?? 0), 0);
    const views = assets.reduce((s, a) => s + (a.views ?? 0), 0);
    const engagements = assets.reduce(
      (s, a) => s + (a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0),
      0,
    );
    const emv = assets.reduce((s, a) => s + (a.emv ?? 0), 0);
    const spent = scope.reduce((s, c) => s + (c.spend ?? 0), 0);
    const committed = scope.reduce((s, c) => s + (c.budget ?? 0), 0);
    const er = views > 0 ? (engagements / views) * 100 : 0;
    const roi = spent > 0 && emv > 0 ? emv / spent : 0;

    this.kpi.set({
      reach: compactCount(reach),
      impressions: compactCount(impressions),
      reachPct: impressions > 0 ? Math.min(99, Math.round((reach / impressions) * 100)) : 0,
      er: `${er.toFixed(2)}%`,
      alpha: `+${Math.max(0, er - 2.9).toFixed(2)}%`,
      spent: `$${compactCount(spent)}`,
      committed: `$${compactCount(committed)}`,
      burnPct: committed > 0 ? Math.round((spent / committed) * 1000) / 10 : 0,
      roi: roi > 0 ? `${roi.toFixed(2)}x` : '—',
      emv: `$${Math.round(emv).toLocaleString('en-US')}`,
    });

    // ── Platform telemetry bento (scoped)
    this.platforms.set(this.mapPlatforms(assets));

    // ── Asset showcase (top EMV, scoped)
    if (assets.length > 0) this.assets.set(this.mapShowcase(assets));
  }

  private mapPlatforms(assets: AssetRowData[]): PlatformCard[] {
    const meta = [
      { key: 'tiktok', code: 'TT', name: 'TikTok', codeClass: 'text-on-surface', status: 'Healthy', statusClass: 'bg-tertiary-container/20 text-tertiary', headlineLabel: 'Impressions', rightLabel: 'Engagement', rightClass: 'text-tertiary', footRightClass: 'text-tertiary', useReach: false },
      { key: 'instagram', code: 'IG', name: 'Instagram', codeClass: 'text-primary', status: 'Healthy', statusClass: 'bg-tertiary-container/20 text-tertiary', headlineLabel: 'Organic Reach', rightLabel: 'Engagement', rightClass: 'text-primary', footRightClass: 'text-primary', useReach: true },
      { key: 'youtube', code: 'YT', name: 'YouTube Shorts', codeClass: 'text-error', status: 'Synced', statusClass: 'bg-primary-container/20 text-primary', headlineLabel: 'Views', rightLabel: 'Earned Value', rightClass: 'text-on-surface', footRightClass: 'text-tertiary', useReach: false },
      { key: 'snapchat', code: 'SC', name: 'Snapchat Spotlight', codeClass: 'text-secondary', status: 'Active', statusClass: 'bg-surface-high text-on-surface', headlineLabel: 'Impressions', rightLabel: 'Swipe-Up Rate', rightClass: 'text-secondary', footRightClass: 'text-secondary', useReach: false },
    ] as const;

    return meta.map((m) => {
      const rows = assets.filter((a) => a.platform === m.key);
      const headline = rows.reduce(
        (s, a) => s + (m.useReach ? a.reach ?? 0 : m.headlineLabel === 'Views' ? a.views ?? 0 : a.impressions ?? 0),
        0,
      );
      const views = rows.reduce((s, a) => s + (a.views ?? 0), 0);
      const engagements = rows.reduce(
        (s, a) => s + (a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0),
        0,
      );
      const emv = rows.reduce((s, a) => s + (a.emv ?? 0), 0);
      const swipeUps = rows.reduce((s, a) => s + (a.swipe_ups ?? 0), 0);
      const impr = rows.reduce((s, a) => s + (a.impressions ?? 0), 0);

      const right =
        m.rightLabel === 'Earned Value' ? `$${compactCount(emv)}`
        : m.rightLabel === 'Swipe-Up Rate' && impr > 0
          ? `${((swipeUps / impr) * 100).toFixed(1)}%`
        : views > 0 ? `${((engagements / views) * 100).toFixed(1)}%` : '—';

      return {
        code: m.code,
        brand: m.key as BrandPlatform,
        name: m.name,
        codeClass: m.codeClass,
        status: rows.length > 0 ? m.status : 'No Data',
        statusClass: rows.length > 0 ? m.statusClass : 'bg-surface-high text-outline',
        headline: rows.length > 0 ? compactCount(headline) : '—',
        headlineLabel: m.headlineLabel,
        right,
        rightLabel: m.rightLabel,
        rightClass: m.rightClass,
        footLeft: `${rows.length} Deliverables`,
        footRight: `EMV $${compactCount(emv)}`,
        footRightClass: m.footRightClass,
      };
    });
  }

  private mapFeed(feed: FeedRow[]): FeedCard[] {
    return feed.map((row) => {
      const status =
        row.status === 'success' ? 'Synced'
        : row.status === 'conflict' ? 'Review'
        : 'Failed';
      const cls =
        row.status === 'success' ? 'bg-tertiary-container/30 text-tertiary'
        : row.status === 'conflict' ? 'bg-surface-highest text-secondary'
        : 'bg-error/15 text-error';
      return {
        id: row.entity_id ?? 'SYNC',
        title: row.message ?? `${row.direction} ${row.status}`,
        icon: row.status === 'success' ? 'check_circle' : row.status === 'conflict' ? 'assignment' : 'error',
        iconClass: row.status === 'success' ? 'text-tertiary' : 'text-primary',
        assignee: row.direction === 'inbound' ? 'Asana → IMP' : 'IMP → Asana',
        status,
        statusClass: cls,
        time: timeAgo(row.created_at),
      };
    });
  }

  private mapRadar(radar: RadarRow[]): RadarCard[] {
    const seen = new Set<string>();
    const rows = radar.filter((r) => {
      if (!r.influencers || seen.has(r.influencer_id)) return false;
      seen.add(r.influencer_id);
      return true;
    }).slice(0, 3);

    return rows.map((r) => {
      const safe = (r.score ?? 0) >= 80;
      return {
        handle: r.influencers!.primary_handle ? `@${r.influencers!.primary_handle}` : '—',
        image: r.influencers!.avatar_url ?? '',
        score: `${r.score ?? '—'}% ${safe ? 'SAFE' : 'MODERATE RISK'}`,
        scoreClass: safe
          ? 'rounded-full bg-tertiary-container/20 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-tertiary'
          : 'rounded-full bg-secondary-container/40 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-secondary',
        note:
          `${r.mentions_scanned ?? '—'} posts · +${r.sentiment_positive ?? '—'}% sentiment · 0 FTC infractions.`,
        meta: r.completed_at ? `Audited ${timeAgo(r.completed_at)}` : null,
        action: safe ? ('verify' as const) : ('rider' as const),
      };
    });
  }

  private mapShowcase(assets: AssetRowData[]): ShowcaseCard[] {
    const dots: Record<string, string> = {
      instagram: 'bg-primary',
      tiktok: 'bg-tertiary',
      youtube: 'bg-secondary',
      snapchat: 'bg-outline',
    };
    const foot = [
      { icon: 'trending_up', text: 'Top Performing', cls: 'text-tertiary' },
      { icon: 'local_fire_department', text: 'High Velocity', cls: 'text-tertiary' },
      { icon: 'touch_app', text: 'Strong CTA', cls: 'text-primary' },
    ];

    return [...assets]
      .sort((a, b) => (b.emv ?? 0) - (a.emv ?? 0))
      .slice(0, 3)
      .map((a, i) => {
        const d = a.deliverables;
        const inf = d?.influencers;
        const views = a.views ?? 0;
        const er = views > 0 ? (((a.likes ?? 0) + (a.comments ?? 0) + (a.shares ?? 0)) / views) * 100 : 0;
        const roi = d?.fee && a.emv ? a.emv / d.fee : null;
        const f = foot[i % foot.length]!;
        return {
          image: inf?.avatar_url ?? '',
          dot: dots[a.platform ?? 'instagram'] ?? 'bg-primary',
          format: `${d?.content_format ?? '9:16'} • 9:16`,
          roi: roi ? `${roi.toFixed(1)}x ROI` : `${compactCount(a.emv)} EMV`,
          roiClass:
            'rounded bg-tertiary-container/80 px-2 py-0.5 font-data-mono text-label-sm font-semibold text-on-tertiary-container',
          title: d?.title ?? 'Untitled asset',
          handle: inf?.primary_handle ? `@${inf.primary_handle}` : '—',
          metrics: [
            { label: 'Views', value: compactCount(a.views), valueClass: 'text-on-surface' },
            { label: 'Eng. Rate', value: `${er.toFixed(1)}%`, valueClass: 'text-tertiary' },
            { label: 'Est. EMV', value: `$${compactCount(a.emv)}`, valueClass: 'text-primary' },
          ],
          footIcon: f.icon,
          footText: f.text,
          footClass: f.cls,
        };
      });
  }
}
