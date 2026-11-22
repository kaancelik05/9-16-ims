import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import { AssetRowData, CampaignDataService } from '../../../campaigns/campaign-data.service';
import { CampaignContextService } from '../../../../core/campaign/campaign-context.service';
import { compactCount, formatDate } from '../../../../shared/utils/format';
import { BrandLogo, type BrandPlatform } from '../../../../shared/ui/brand-logo';

interface PlatformVelocity {
  name: string;
  dot: string;
  brand?: BrandPlatform;
  er: string;
  erBold: boolean;
  emv: string;
  share: number;
  bar: string;
}

interface Highlight {
  icon: string;
  iconCls: string;
  label: string;
  headline: string;
  detail: string;
}

interface AssetRow {
  id: string;
  thumb: string;
  duration: string;
  title: string;
  formatKey: string;
  formatLabel: string;
  formatCls: string;
  asn: string;
  creator: { name: string; handle: string; avatar: string };
  platform: { name: string; dot: string };
  published: string;
  views: string;
  impressions: string;
  likes: string;
  saves: string;
  comments: string;
  sentiment: string;
  shares: string;
  taps: string;
  er: string;
  erCls: string;
  emv: string;
  cpe: string;
}

interface KpiSnapshot {
  spent: string;
  budget: string;
  pct: number;
  reach: string;
  impressions: string;
  vcr: string;
  er: string;
  alpha: string;
  emv: string;
  cpe: string;
  assetCount: number;
}

/**
 * Module 5 — Campaign Content Performance & Analytics.
 * Executive KPI bento, platform velocity breakdown, AI creative
 * highlights and the deep 9:16 asset telemetry table per the
 * approved design.
 *
 * Faz 2: the asset table, format pills and platform velocity derive
 * from the live `asset_metrics` join; the demo rows stay as the
 * offline/demoMode fallback (KPI bento remains design-static until
 * campaign selection wiring lands).
 */
@Component({
  selector: 'app-campaign-analytics',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandLogo],
  templateUrl: './campaign-analytics.html',
  host: { class: 'block' },
})
export class CampaignAnalytics {
  private readonly data = inject(CampaignDataService);
  protected readonly campaignContext = inject(CampaignContextService);

  /* ── Filter state ────────────────────────────────────────────── */
  protected readonly activeFormat = signal('all');
  protected readonly tableSearch = signal('');
  protected readonly failedThumbs = signal<ReadonlySet<string>>(new Set());

  /** 'live' = Supabase asset rows, 'demo' = design-flight fallback. */
  protected readonly source = signal<'live' | 'demo'>('demo');

  /* ── Date selection (KPI + velocity scope; campaign = global topbar) ── */
  /** 0 = all time; otherwise days of lookback. */
  protected readonly rangeDays = signal(0);

  /** Raw live rows (unmapped) feeding KPI/velocity computations. */
  private readonly raw = signal<AssetRowData[]>([]);

  constructor() {
    void this.campaignContext.ensureLoaded();
    if (!environment.demoMode) void this.loadAssets();
  }

  private async loadAssets(): Promise<void> {
    const rows = await this.data.loadAssetRows();
    if (!rows || rows.length === 0) return;
    this.raw.set(rows);
    this.assets.set(rows.map((row) => this.toAssetRow(row)));
    this.source.set('live');
  }

  /** Raw rows scoped by the global campaign selector + date range. */
  protected readonly scopedRows = computed(() => {
    const campaignId = this.campaignContext.selectedId();
    const days = this.rangeDays();
    const cutoff = days > 0 ? Date.now() - days * 86_400_000 : 0;
    return this.raw().filter((row) => {
      if (campaignId !== 'all' && row.deliverables?.campaigns?.id !== campaignId) return false;
      if (cutoff > 0 && new Date(row.captured_at).getTime() < cutoff) return false;
      return true;
    });
  });

  /** Executive KPI bento derived from the scoped rows + campaigns. */
  protected readonly kpi = computed<KpiSnapshot>(() => {
    const rows = this.scopedRows();
    const campaigns = this.campaignContext.campaigns();
    const selected =
      campaigns.find((c) => c.id === this.campaignContext.selectedId()) ?? null;
    const spent = selected ? selected.spend : campaigns.reduce((s, c) => s + c.spend, 0);
    const budget = selected ? selected.budget : campaigns.reduce((s, c) => s + c.budget, 0);

    const reach = rows.reduce((s, r) => s + (r.reach ?? 0), 0);
    const impressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const views = rows.reduce((s, r) => s + (r.views ?? 0), 0);
    const engagements = rows.reduce(
      (s, r) => s + (r.likes ?? 0) + (r.comments ?? 0) + (r.shares ?? 0),
      0,
    );
    const emv = rows.reduce((s, r) => s + (r.emv ?? 0), 0);
    const vcrs = rows.map((r) => r.vcr).filter((v): v is number => v != null);
    const cpes = rows.map((r) => r.cpe).filter((v): v is number => v != null);
    const er = views > 0 ? (engagements / views) * 100 : 0;

    return {
      spent: `$${Math.round(spent).toLocaleString('en-US')}`,
      budget: `$${compactCount(budget)}`,
      pct: budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0,
      reach: compactCount(reach),
      impressions: compactCount(impressions),
      vcr: vcrs.length > 0 ? `${(vcrs.reduce((a, b) => a + b, 0) / vcrs.length).toFixed(1)}%` : '—',
      er: `${er.toFixed(2)}%`,
      alpha: `+${Math.max(0, er - 2.8).toFixed(2)}%`,
      emv: `$${compactCount(emv)}`,
      cpe: cpes.length > 0 ? `$${(cpes.reduce((a, b) => a + b, 0) / cpes.length).toFixed(3)}` : '—',
      assetCount: rows.length,
    };
  });

  private toAssetRow(row: AssetRowData): AssetRow {
    const d = row.deliverables;
    const inf = d?.influencers;
    const format = d?.content_format ?? 'General';
    const lower = format.toLowerCase();
    const formatKey =
      lower.includes('tiktok') ? 'tt'
      : lower.includes('story') ? 'stories'
      : lower.includes('youtube') || lower.includes('shorts') || lower.includes('yt') ? 'yt'
      : 'ig';
    const formatCls =
      formatKey === 'tt' ? 'bg-tertiary/10 text-tertiary'
      : formatKey === 'yt' ? 'bg-secondary/15 text-secondary'
      : 'bg-primary/10 text-primary';

    const engagement =
      row.views > 0
        ? ((row.likes + row.comments + row.shares) / row.views) * 100
        : 0;
    const platformMeta: Record<string, { name: string; dot: string }> = {
      instagram: { name: 'Instagram', dot: 'bg-primary' },
      tiktok: { name: 'TikTok', dot: 'bg-tertiary' },
      youtube: { name: 'YouTube', dot: 'bg-secondary' },
      snapchat: { name: 'Snapchat', dot: 'bg-outline' },
    };
    const platformKey = row.platform ?? 'instagram';
    const platform = platformMeta[platformKey] ?? platformMeta['instagram']!;

    return {
      id: row.id,
      thumb: '',
      duration: '—',
      title: d?.title ?? 'Untitled asset',
      formatKey,
      formatLabel: format,
      formatCls,
      asn: d?.asana_task_label ?? '—',
      creator: {
        name: inf?.full_name ?? 'Unassigned',
        handle: inf?.primary_handle ? `@${inf.primary_handle}` : '—',
        avatar: inf?.avatar_url ?? '',
      },
      platform,
      published: formatDate(row.captured_at),
      views: `${compactCount(row.views)} Views`,
      impressions: `${compactCount(row.impressions)} Impr`,
      likes: compactCount(row.likes),
      saves: `${compactCount(row.saves)} Saves`,
      comments: compactCount(row.comments),
      sentiment: row.sentiment_pct != null ? `${row.sentiment_pct}% Pos` : '—',
      shares: compactCount(row.shares),
      taps: `${compactCount(row.swipe_ups)} Taps`,
      er: `${engagement.toFixed(1)}%`,
      erCls:
        engagement >= 7 ? 'bg-tertiary/10 text-tertiary'
        : engagement >= 5 ? 'bg-primary/10 text-primary'
        : 'bg-surface-highest text-on-surface',
      emv: row.emv != null ? `$${compactCount(row.emv)} EMV` : '—',
      cpe: row.cpe != null ? `$${row.cpe.toFixed(3)} CPE` : '—',
    };
  }

  /** Platform velocity bento derived from the scoped raw rows. */
  private computeVelocity(rows: AssetRowData[]): PlatformVelocity[] {
    const meta: Record<string, { name: string; dot: string; bar: string }> = {
      instagram: { name: 'Instagram (Reels & Stories)', dot: 'bg-primary', bar: 'bg-primary' },
      tiktok: { name: 'TikTok 9:16 Feed', dot: 'bg-tertiary', bar: 'bg-tertiary' },
      youtube: { name: 'YouTube Shorts', dot: 'bg-secondary', bar: 'bg-secondary' },
      snapchat: { name: 'Snapchat Spotlight', dot: 'bg-outline', bar: 'bg-outline' },
    };
    const groups = new Map<string, { views: number; eng: number; emv: number }>();
    for (const row of rows) {
      const key = row.platform ?? 'instagram';
      const bucket = groups.get(key) ?? { views: 0, eng: 0, emv: 0 };
      bucket.views += row.views ?? 0;
      bucket.eng += (row.likes ?? 0) + (row.comments ?? 0) + (row.shares ?? 0);
      bucket.emv += row.emv ?? 0;
      groups.set(key, bucket);
    }
    const totalEmv = [...groups.values()].reduce((sum, g) => sum + g.emv, 0);
    const erOf = (g: { views: number; eng: number }) =>
      g.views > 0 ? (g.eng / g.views) * 100 : 0;
    const bestEr = Math.max(0, ...[...groups.values()].map(erOf));

    return Object.entries(meta).map(([key, m]) => {
      const g = groups.get(key);
      const er = g ? erOf(g) : 0;
      const emv = g?.emv ?? 0;
      const share = totalEmv > 0 ? Math.round((emv / totalEmv) * 100) : 0;
      const emvLabel = emv >= 1_000_000 ? `$${(emv / 1_000_000).toFixed(1)}M` : `$${compactCount(emv)}`;
      return {
        name: m.name,
        dot: m.dot,
        brand: key as BrandPlatform,
        er: `${er.toFixed(1)}% ER`,
        erBold: er > 0 && er === bestEr,
        emv: `${emvLabel} EMV (${share}%)`,
        share,
        bar: m.bar,
      };
    });
  }

  /* ── Format pills (live counts over the active rows) ─────────── */
  protected readonly formatPills = computed(() => {
    const rows = this.assets();
    const count = (key: string) => (key === 'all' ? rows.length : rows.filter((r) => r.formatKey === key).length);
    return [
      { key: 'all', label: `All Formats (${count('all')})` },
      { key: 'ig', label: `IG Reels (${count('ig')})` },
      { key: 'tt', label: `TikTok 9:16 (${count('tt')})` },
      { key: 'stories', label: `IG Stories (${count('stories')})` },
      { key: 'yt', label: `YouTube Shorts (${count('yt')})` },
    ];
  });

  /* ── Platform velocity (left bento — live computed, demo fallback) ── */
  private readonly demoPlatforms: PlatformVelocity[] = [
    {
      name: 'Instagram (Reels & Stories)',
      dot: 'bg-primary',
      er: '6.1% ER',
      erBold: false,
      emv: '$607.2K EMV (44%)',
      share: 44,
      bar: 'bg-primary',
    },
    {
      name: 'TikTok 9:16 Feed',
      dot: 'bg-tertiary',
      er: '7.8% ER',
      erBold: true,
      emv: '$524.4K EMV (38%)',
      share: 38,
      bar: 'bg-tertiary',
    },
    {
      name: 'YouTube Shorts',
      dot: 'bg-secondary',
      er: '3.9% ER',
      erBold: false,
      emv: '$165.6K EMV (12%)',
      share: 12,
      bar: 'bg-secondary',
    },
    {
      name: 'Snapchat Spotlight',
      dot: 'bg-outline',
      er: '4.4% ER',
      erBold: false,
      emv: '$82.8K EMV (6%)',
      share: 6,
      bar: 'bg-outline',
    },
  ];

  protected readonly platforms = computed<PlatformVelocity[]>(() =>
    this.source() === 'live' ? this.computeVelocity(this.scopedRows()) : this.demoPlatforms,
  );

  /* ── Creative highlights (right bento) ───────────────────────── */
  protected readonly highlights: Highlight[] = [
    {
      icon: 'motion_photos_on',
      iconCls: 'bg-primary/10 text-primary',
      label: 'Highest Converting Hook',
      headline: '3-sec GRWM Transition (+14.2% hold)',
      detail: 'First 3-second drop-off down to 16.2% (Nike Pegasus test).',
    },
    {
      icon: 'workspace_premium',
      iconCls: 'bg-tertiary/10 text-tertiary',
      label: 'Top Performing Creator',
      headline: 'Maya Lin ($214K EMV, 6.8x ROI)',
      detail: '1.4M organic views · 24K+ link clicks.',
    },
    {
      icon: 'sync_alt',
      iconCls: 'bg-secondary-container/30 text-secondary',
      label: 'Asana Operations Hook',
      headline: 'All 24 Deliverables Syncing',
      detail: '100% asset/task tag match · zero revision lag.',
    },
  ];

  /* ── Asset telemetry table (live rows — demo fallback) ───────── */
  protected readonly assets = signal<AssetRow[]>([
    {
      id: 'a-9104',
      thumb:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCdKOVFuv1va2bNSklYvQfP66Oj0ekFM1w0tlUpx-DIZaP3sWjDHXY9FsxK4AhHUyzL9REeUGz2z4TBPNowiyqpRKduiyC-Y1qLXGp6_j5bh7IG5gbDpJ2WfAoxRwxBO0EtdZGw1CF3ljpiJdzKfkHfJDjCgB6gdN_ksEISuKq9SgWxKiRGiQvsTOyc6TbadxTotxuDo5d5YoflsdmTwdkZYhRmIzZIP3VYRkg2qmwX-3DXsh9P1JCo',
      duration: '0:28',
      title: 'Sunrise Pacing: 10K Prep',
      formatKey: 'ig',
      formatLabel: 'IG Reel',
      formatCls: 'bg-primary/10 text-primary',
      asn: 'ASN-9104',
      creator: {
        name: 'Maya Lin',
        handle: '@maya.lifestyle',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBItBfINFWxWoE4mw32DsUwwTXa0bhimZ8bKfje0V_CsLDhyatZhZuh0JHm0x_GccSGvppl3xYJKV7Jc8vKmL7P4u_xkjB9SkXkz_2PYcnV3pKewb7VAn6-vgDhkmGMDI33OhIBNvMOasIMC_yUIPjXiVHC9mgHsdfkvauOA5tST87Brf3ze_PpVrD8JpezGBuz4KcdEUODJU5271QRjDAJ5j1W4ib3kp3yBti0MRcg29iOzdAc5jI2',
      },
      platform: { name: 'Instagram', dot: 'bg-primary' },
      published: 'Jun 14, 2026 • 2d ago',
      views: '4.8M Views',
      impressions: '5.9M Impr',
      likes: '342K',
      saves: '48.2K Saves',
      comments: '12.4K',
      sentiment: '98.4% Pos',
      shares: '86.5K',
      taps: '24.1K Taps',
      er: '8.2%',
      erCls: 'bg-tertiary/10 text-tertiary',
      emv: '$112.5K EMV',
      cpe: '$0.014 CPE',
    },
    {
      id: 'a-9108',
      thumb:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCyQ4qOtvuWcXpzg69SzSjvx4qevei_KN1ieOHV-27g_xQr_rYDkXveM4NDZ_YeNa7TbDg4iKJmG4Uzzaxrk24KeSkc15zez42cwyURM1epNqfhZR3Ba0mJ8lsgibqpQ7cNi-21y9MF9dehSlEUh3XfGmQ_dxwMnISdw8mPcBbJuPB48A1p0p_x3y7JuK7Kkif-SJ4Ur7sCA11V7q5XZbDh1Xch-IEXumcFDFXz98Hr5EnUzbDWRrSf',
      duration: '0:15',
      title: 'Sprint Form Hack #3',
      formatKey: 'tt',
      formatLabel: 'TikTok 9:16',
      formatCls: 'bg-tertiary/10 text-tertiary',
      asn: 'ASN-9108',
      creator: {
        name: 'Jordan Cruz',
        handle: '@jordan.vibe',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBztpk2tCdZzm3G4jsZcbGYBDMNhKGMfoq24rw5alJzGTTwB1Cu1eheUP4bfgEVzEZqWlVzD6r1ext6zBhmGH6AvxiShNMoyw6ulyqJkRiJucOwxSI_JSpPYu9MYuJ2CTcvcbSg8D4-9wsolzms0v5aZUte6rBOAZ-3CZUO6UgZa7CgeyWLed0veFjsN6PACSlnCTCdt0hbELQlfA9N5MNAhqVr5ftnvwLwImniCeVlK967IS7Spuhv',
      },
      platform: { name: 'TikTok', dot: 'bg-tertiary' },
      published: 'Jun 13, 2026 • 3d ago',
      views: '3.6M Views',
      impressions: '4.2M Impr',
      likes: '289K',
      saves: '34.5K Saves',
      comments: '9.1K',
      sentiment: '96.8% Pos',
      shares: '62.0K',
      taps: '18.4K Taps',
      er: '7.4%',
      erCls: 'bg-tertiary/10 text-tertiary',
      emv: '$89.4K EMV',
      cpe: '$0.016 CPE',
    },
    {
      id: 'a-9112',
      thumb:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAmJ5-l1bUm-9OWeuLv-7aHOPtNBFX4I1BH6yBcI4CXhjX3T7n5uQFQ3kszTQotrQsiEIbKj1zwRn_TXR6dMeV_59-msH0C9HSUZbB3E9dAbXBPrFQHkJQA8K1i1NqEPbdhFtYNZH01_0MPRHUOunGB2UpxL1ZIi-1PDqYnC6gjbd6w8mYfSTiYd2uVJtLEINyvelsm6MdN5EiqHbvLqcGBeQ5YecOnhkiPltN3tsK6O55qcYY7555i',
      duration: '0:45',
      title: 'Cinematic City Strides',
      formatKey: 'ig',
      formatLabel: 'IG Reel',
      formatCls: 'bg-primary/10 text-primary',
      asn: 'ASN-9112',
      creator: {
        name: 'Lex Rivera',
        handle: '@lex.cinema',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBbNWClkl8dt8GRo6eIVT7Iexms4VRpqyYStLZu2eVTOgJWZ4ZF3lj-Dv1UDC5lbvHam1f8kNWjmLPeg4tejwtbSijFAL2wzACyWXw2S2RH5j_aNMvZ7OOc68Q-K8KzdEIQQKNKF8zG_P2rrdSMU17c5DzSLi7fNZV6gSkhXzJOIlSYTlVls6guNcXZECNFwm-d_V6YdSdEPKkhqvndA2kMgCK7rXS7SQzj1rgDLVdlT48v3CXihSGc',
      },
      platform: { name: 'Instagram', dot: 'bg-primary' },
      published: 'Jun 11, 2026 • 5d ago',
      views: '2.9M Views',
      impressions: '3.8M Impr',
      likes: '210K',
      saves: '39.1K Saves',
      comments: '8.4K',
      sentiment: '99.1% Pos',
      shares: '54.2K',
      taps: '15.3K Taps',
      er: '6.8%',
      erCls: 'bg-tertiary/10 text-tertiary',
      emv: '$76.2K EMV',
      cpe: '$0.018 CPE',
    },
    {
      id: 'a-9118',
      thumb:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuArYgCD5XG12fPuRQ9xtFA3GHx5U72dZbJUHrFdQCYeZAh4XArI0M_0WR_1vlos0Hig0PkzRSZX1xGM55GYdfxLjAwREgBCrih1nf6W2YJWNRtegb_SyCsyrybsuPNj_DQ7LFj-MMrYdEffYMEtlAPGbcUAWvx7p42TUs4hJd2BZ051pW61-BLyeyUSiHpUrQoyK6pXwlf92CCzaBdYAX1R6jcvsMNVe2hg5H_jJ6wa6bI5fMbnm4Mn',
      duration: '0:32',
      title: 'GRWM: Marathon Sunday',
      formatKey: 'tt',
      formatLabel: 'TikTok 9:16',
      formatCls: 'bg-tertiary/10 text-tertiary',
      asn: 'ASN-9118',
      creator: {
        name: 'Elena Vance',
        handle: '@elena.vance',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBxGjsMvaPX5ieX3NhPP-HBO-1ZbsI42v8nUMpo6qaXZXTx7dAJMXnOnSiIuhsgwSE1SeFFwEDioSj3KZ5QTlsm1v1vD5LacT1Y2akdczreukO_f5rlVcqZBKpdyeIewrFksdkICNOV_T6IzmEVJhYDPZa_tHUlgsg2qbkgLo5tpVDv0DRRrheYHfvpOj8ZSeMX6H0HWzFqdf_RI23u2tUxIrKpqz5PQlVNavc0V-ijhZ612k0eKc3z',
      },
      platform: { name: 'TikTok', dot: 'bg-tertiary' },
      published: 'Jun 10, 2026 • 6d ago',
      views: '3.1M Views',
      impressions: '3.9M Impr',
      likes: '244K',
      saves: '29.8K Saves',
      comments: '6.8K',
      sentiment: '97.2% Pos',
      shares: '48.9K',
      taps: '21.0K Taps',
      er: '6.1%',
      erCls: 'bg-primary/10 text-primary',
      emv: '$71.8K EMV',
      cpe: '$0.019 CPE',
    },
    {
      id: 'a-9125',
      thumb:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAYlIpd6p9fnxA_kkeWtYj7L35_NjZsdEEyo12_2zoq4py2Itlb2n7UE6sbAkgdceRylIkuu2vEjk3vScU_8F0aTPsR1CDnkYvUa1GcB_2muBcxhlAbbhHXM2nEVbLudxOgeTSJ0MZNDNt5QRVCsrYJYTs5b08QxfCW525SQbS6xQxyDmC2L63TymbNc8Op91hu7mx0K9wCHL0GzZw_HNHrr6Uu-WWpFENnJ8XaQQGPgDu78RCp80Na',
      duration: '0:58',
      title: 'Nike ZoomX Lab Breakdown',
      formatKey: 'yt',
      formatLabel: 'YT Shorts',
      formatCls: 'bg-secondary/15 text-secondary',
      asn: 'ASN-9125',
      creator: {
        name: 'Kai Chen',
        handle: '@kai.creative',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAbVgfIuUVeB7sIvirUxMMbn9a1lD7HGZVJqz0mVTkqFcmt_-STRFguiq-o3UKaxI0YSYpsfvwJm2HbruZs7OGF2uxP-2xQhb3vuB5aVAzU-l2mXH1S9QbVRgHpUxYABCgbklKfIxmim_0nJu3LRZewzpxmCdAO67gUjbvuk2jn07ASdDTdZRvGvBqIfeUTguW2ffaufqOeENBw8HHI0UefluLBoPcfyOfrLVyuxLv0_3ndXJdk0eND',
      },
      platform: { name: 'YouTube', dot: 'bg-secondary' },
      published: 'Jun 08, 2026 • 8d ago',
      views: '1.8M Views',
      impressions: '2.2M Impr',
      likes: '118K',
      saves: '19.4K Saves',
      comments: '5.1K',
      sentiment: '95.4% Pos',
      shares: '22.4K',
      taps: '9.8K Taps',
      er: '4.9%',
      erCls: 'bg-surface-highest text-on-surface',
      emv: '$42.6K EMV',
      cpe: '$0.022 CPE',
    },
    {
      id: 'a-9130',
      thumb:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCsfSwrGgBcnl32sJVjVH7mwDC9p2E_UxY9K48E-GviqE6jauevmDLRuBu8U6XLBz6qJmwt5yT5IsUij-M1RUkXO7W6CuF__nV5Zow_841MjbOTJMrDRNs20cgIL52Go67Ty5NHF8_efra9LOPjGtq_q3GSwVY5JHGT-zoD2FuaXs6NBM9TD7LOuP3F99bz3gPXTXmlY-h8J57ljImd1sZgCGKEh77IhKZR23eDRNRW4IueUaMZeVj4',
      duration: '0:20',
      title: 'Colorway Drop Reaction',
      formatKey: 'stories',
      formatLabel: 'IG Story Stack',
      formatCls: 'bg-primary/10 text-primary',
      asn: 'ASN-9130',
      creator: {
        name: 'Chloe Zhang',
        handle: '@chloe.glow',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCNVYHm484aH3Vseg_oQ36vDvdJ24ir0-VSw2vw8VwD-Pflrf-Uv-qSM5sq-7ZHOtrZmtoUM0D11Qk1br92KJHbDQB71QJZnqGiIWCWU7-zPUkzPQSem4jMdyMG-ZQOjDtDfqZXMHenem_Ifwl7rBiId0HT9HcnskWph6NKABM-taRYNs9rvesA2ZuJEpiLrR79tKkiQTVBiDoZA4Y7Vw1cnDE7GAHLH1Pbl66OSQAhvyvGkElnIay6',
      },
      platform: { name: 'Instagram', dot: 'bg-primary' },
      published: 'Jun 06, 2026 • 10d ago',
      views: '1.2M Views',
      impressions: '1.6M Impr',
      likes: '94.2K',
      saves: '14.1K Saves',
      comments: '3.8K',
      sentiment: '96.0% Pos',
      shares: '31.4K',
      taps: '12.2K Taps',
      er: '5.8%',
      erCls: 'bg-primary/10 text-primary',
      emv: '$38.4K EMV',
      cpe: '$0.020 CPE',
    },
  ]);

  /* ── Derived rows (format pill + table search) ───────────────── */
  protected readonly filteredAssets = computed(() => {
    const format = this.activeFormat();
    const q = this.tableSearch().toLowerCase().trim();
    return this.assets().filter((a) => {
      if (format !== 'all' && a.formatKey !== format) return false;
      if (
        q &&
        !a.title.toLowerCase().includes(q) &&
        !a.creator.name.toLowerCase().includes(q) &&
        !a.creator.handle.toLowerCase().includes(q) &&
        !a.asn.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  });

  /** Select hands us the lookback days as a string. */
  protected setRange(value: string): void {
    this.rangeDays.set(Number.parseInt(value, 10));
  }

  protected onThumbError(id: string): void {
    this.failedThumbs.update((set) => new Set(set).add(id));
  }

  protected initials(name: string): string {
    return name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }
}
