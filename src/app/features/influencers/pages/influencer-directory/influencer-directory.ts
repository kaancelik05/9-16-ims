import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../../environments/environment';
import {
  AddInfluencerModal,
  NewInfluencer,
} from '../../modals/add-influencer-modal/add-influencer-modal';
import {
  DirectoryRow,
  InfluencerDataService,
} from '../../influencer-data.service';
import { CampaignDataService } from '../../../campaigns/campaign-data.service';
import { AsanaApiService } from '../../../../core/asana/asana-api.service';
import { supabase } from '../../../../core/supabase/supabase-client';
import { compactCount, sourceLabel } from '../../../../shared/utils/format';
import { CreatorCard, DEMO_CREATORS } from './directory-demo';
import { BrandLogo, type BrandPlatform } from '../../../../shared/ui/brand-logo';

/** Glow accents cycled across live rows (Tailwind v4 literal strings). */
const GLOWS = [
  'bg-primary-container/10 group-hover:bg-primary-container/20',
  'bg-secondary/10 group-hover:bg-secondary/20',
  'bg-tertiary-container/10 group-hover:bg-tertiary-container/20',
  'bg-primary/10 group-hover:bg-primary/20',
  'bg-tertiary/10 group-hover:bg-tertiary/20',
];

/**
 * Module 1 — Influencer Discovery & Directory.
 *
 * Breadcrumb header + action toolbar, advanced multi-parameter filter
 * console (niche / platforms / reach / engagement / Asana state), the
 * bento creator roster grid and the batch-operations pagination footer.
 *
 * Faz 2: the roster loads from the `influencers` join in Supabase and
 * registrations persist; the design-flight demo roster stays as the
 * offline/demoMode fallback (header chip shows the active source).
 */
@Component({
  selector: 'app-influencer-directory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AddInfluencerModal, BrandLogo],
  templateUrl: './influencer-directory.html',
  host: { class: 'block' },
})
export class InfluencerDirectory {
  private readonly data = inject(InfluencerDataService);
  private readonly campaignData = inject(CampaignDataService);
  private readonly asana = inject(AsanaApiService);

  /* ── Add Influencer modal ─────────────────────────────────────── */
  protected readonly showModal = signal(false);
  /* ── Filter state ─────────────────────────────────────────────── */
  protected readonly search = signal('');
  protected readonly niche = signal('All Niches (Global)');
  /** Active platform pills — design default: IG/TT/YT on, SC off. */
  protected readonly platforms = signal<string[]>(['instagram', 'tiktok', 'youtube']);
  protected readonly erMin = signal(3.5);
  protected readonly asanaState = signal('All Workflow States');
  protected readonly showTierTag = signal(true);
  protected readonly showSafetyTag = signal(true);

  /** Grid (bento cards) or table roster view. */
  protected readonly viewMode = signal<'grid' | 'table'>('grid');

  /** Client-side pagination over the filtered roster. */
  protected readonly page = signal(1);
  protected readonly pageSize = 8;
  /** Creator ids whose remote demo avatar failed — initials render instead. */
  protected readonly failedAvatars = signal<ReadonlySet<string>>(new Set());

  /** 'live' = Supabase roster, 'demo' = design-flight fallback. */
  protected readonly source = signal<'live' | 'demo'>('demo');

  /** Audience reach stepper index into REACH_VALUES (100K → 5M). */
  protected readonly reachStep = signal(0);

  protected readonly nicheOptions = [
    'All Niches (Global)',
    'Lifestyle & Daily Vlog',
    'Tech & AI Tools',
    'Fashion & Luxury',
    'Gaming & Esports',
    'Beauty & Skincare',
    'Fitness & Wellness',
  ];

  protected readonly platformPills: { key: BrandPlatform; code: string; icon: string }[] = [
    { key: 'instagram', code: 'IG', icon: 'photo_camera' },
    { key: 'tiktok', code: 'TT', icon: 'music_note' },
    { key: 'youtube', code: 'YT', icon: 'smart_display' },
    { key: 'snapchat', code: 'SC', icon: 'chat' },
  ];

  protected readonly erOptions = [
    { value: 2, label: '> 2.0% Baseline' },
    { value: 3.5, label: '> 3.5% High Velocity' },
    { value: 5, label: '> 5.0% Viral Tier' },
    { value: 8, label: '> 8.0% Supercharged' },
  ];

  protected readonly asanaOptions = [
    'All Workflow States',
    'Available for Booking',
    'Assigned to Campaign',
    'Pending Creative Sign-off',
    'Legal / Compliance Hold',
  ];

  /** Discrete reach tiers — snapped thumb keeps the readout predictable. */
  protected readonly reachValues = [100_000, 500_000, 1_000_000, 2_000_000, 5_000_000];
  protected readonly reachLabels = ['100K', '500K', '1M', '2M', '5M'];

  /* ── Roster (live Supabase → design demo fallback) ────────────── */
  protected readonly creators = signal<CreatorCard[]>(DEMO_CREATORS);

  constructor() {
    if (!environment.demoMode) void this.loadRoster();
    // Any filter change returns to the first page.
    effect(() => {
      this.filtered();
      this.page.set(1);
    });
  }

  private async loadRoster(): Promise<void> {
    const rows = await this.data.loadDirectory();
    if (!rows || rows.length === 0) return; // stay on demo roster
    this.creators.set(rows.map((row, index) => this.toCard(row, index)));
    this.source.set('live');
  }

  /** Maps a joined influencer row onto the bento card view model. */
  private toCard(row: DirectoryRow, index: number): CreatorCard {
    const metric = (platform: string) =>
      row.influencer_platform_metrics.find((m) => m.platform === platform);
    const ig = metric('instagram');
    const tt = metric('tiktok');
    const yt = metric('youtube');
    const sc = metric('snapchat');

    const audit = [...(row.safety_audits ?? [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
    const linked = (row.deliverables ?? []).find((d) => d.campaigns?.name);

    const allMetrics = [ig, tt, yt, sc].filter((m): m is NonNullable<typeof m> => !!m);
    const maxEr = Math.max(0, ...allMetrics.map((m) => m.engagement_rate ?? 0));
    const reachK = Math.max(0, ...allMetrics.map((m) => m.followers ?? 0)) / 1000;

    return {
      id: row.id,
      name: row.full_name,
      handle: row.primary_handle ? `@${row.primary_handle}` : '—',
      chip: row.category ?? row.niche ?? 'Creator',
      niche: row.niche ?? 'General',
      nicheTag: row.tags?.[1] ?? row.tags?.[0] ?? 'New Addition',
      glow: GLOWS[index % GLOWS.length]!,
      image: row.avatar_url ?? '',
      metrics: [
        {
          platform: 'instagram',
          code: 'IG',
          followers: compactCount(ig?.followers),
          sub: ig?.engagement_rate ? `${ig.engagement_rate}%` : '—',
          subClass: 'text-tertiary font-semibold',
          source: sourceLabel(ig?.source),
        },
        {
          platform: 'tiktok',
          code: 'TT',
          followers: compactCount(tt?.followers),
          sub: tt?.engagement_rate ? `${tt.engagement_rate}%` : '—',
          subClass: 'text-tertiary font-semibold',
          source: sourceLabel(tt?.source),
        },
        {
          platform: 'youtube',
          code: 'YT',
          followers: compactCount(yt?.followers),
          sub: compactCount(yt?.avg_views),
          subClass: 'text-outline-variant',
          source: sourceLabel(yt?.source),
        },
        {
          platform: 'snapchat',
          code: 'SC',
          followers: compactCount(sc?.followers),
          sub: sc?.story_reach ? 'Daily' : 'Stories',
          subClass: sc?.story_reach ? 'text-primary font-medium' : 'text-outline font-medium',
          source: sourceLabel(sc?.source),
        },
      ],
      maxEr,
      reachK,
      assigned: row.status === 'assigned',
      campaign: linked?.campaigns?.name ?? null,
      asn: linked?.asana_task_label ?? null,
      auditFlag:
        audit?.status === 'green_flag' ? 'green'
        : audit?.status === 'red_flag' ? 'red'
        : audit?.status === 'in_progress' ? 'queued'
        : 'none',
      pendingSignoff: (row.deliverables ?? []).some((d) => d.approval_status === 'in_review'),
      audit:
        audit == null ? '—'
        : audit.status === 'in_progress' ? 'Scan queued'
        : audit.score != null ? `${audit.score}%`
        : '—',
    };
  }

  /** Creator whose "Add to Asana" call is in flight. */
  protected readonly busyCreator = signal<string | null>(null);

  /** Transient status line next to the header chips (Asana add result). */
  protected readonly syncNote = signal<string | null>(null);

  /**
   * Faz 3 — creates a real Asana task for the creator in the linked
   * campaign's project and records the deliverable locally.
   */
  protected async addToAsana(c: CreatorCard): Promise<void> {
    if (this.busyCreator() !== null) return;
    this.busyCreator.set(c.id);
    this.syncNote.set(null);
    try {
      const linked = await this.campaignData.loadLinkedCampaign();
      if (!linked) {
        this.syncNote.set('No campaign is linked to an Asana project yet');
        return;
      }
      const created = await this.asana.createTask({
        projectId: linked.projectGid,
        name: `${c.name} • IMP Outreach Task (${linked.name})`,
        notes: `Created from the IMP Directory roster. Handle: ${c.handle}.`,
      });
      await supabase.from('deliverables').insert({
        campaign_id: linked.campaignId,
        title: `${c.name} • IMP Outreach Task (${linked.name})`,
        stage: 'selection_pitching',
        approval_status: 'pending',
        asana_task_gid: created.gid,
        asana_task_label: `ASANA-#${created.gid.slice(-5)}`,
      });
      this.syncNote.set(`Asana task created for ${c.name} → ${linked.name}`);
      await this.loadRoster();
    } catch (err) {
      this.syncNote.set(err instanceof Error ? err.message : 'Asana task creation failed');
    } finally {
      this.busyCreator.set(null);
      setTimeout(() => this.syncNote.set(null), 6000);
    }
  }

  /* ── Derived roster ───────────────────────────────────────────── */
  protected readonly minReach = computed(() => this.reachValues[this.reachStep()]);
  protected readonly reachLabel = computed(() => this.reachLabels[this.reachStep()]);

  protected readonly assignedCount = computed(
    () => this.creators().filter((c) => c.assigned).length,
  );

  /** Inline track fill for the range input (percent through the tiers). */
  protected readonly sliderBackground = computed(() => {
    const pct = (this.reachStep() / (this.reachValues.length - 1)) * 100;
    return `linear-gradient(90deg, var(--color-primary-container) ${pct}%, var(--color-surface-high) ${pct}%)`;
  });

  protected readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const niche = this.niche();
    const platforms = this.platforms();
    const erMin = this.erMin();
    const state = this.asanaState();
    const minReach = this.minReach();
    const roster = this.creators();

    return roster.filter((c) => {
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.handle.toLowerCase().includes(q) &&
        !c.chip.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (niche !== 'All Niches (Global)' && c.niche !== niche) return false;
      if (platforms.some((p) => !c.metrics.some((m) => m.platform === p))) return false;
      // Newly registered creators carry no telemetry yet — they pass
      // through the ER/reach gates until metrics are fetched.
      if (c.maxEr > 0 && c.maxEr < erMin) return false;
      if (c.reachK > 0 && c.reachK * 1000 < minReach) return false;
      if (state === 'Available for Booking' && c.assigned) return false;
      if (state === 'Assigned to Campaign' && !c.assigned) return false;
      if (state === 'Pending Creative Sign-off' && !c.pendingSignoff) return false;
      if (state === 'Legal / Compliance Hold' && c.auditFlag !== 'red') return false;
      return true;
    });
  });

  /* ── Pagination (client-side over the filtered roster) ─────────── */
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / this.pageSize)),
  );

  protected readonly paged = computed(() => {
    const rows = this.filtered();
    const total = this.totalPages();
    const current = Math.min(this.page(), total);
    return rows.slice((current - 1) * this.pageSize, current * this.pageSize);
  });

  /** Windowed page buttons: {label, page|null(ellipsis)}. */
  protected readonly pageWindow = computed<{ label: string; page: number | null }[]>(() => {
    const total = this.totalPages();
    const current = Math.min(this.page(), total);
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => ({ label: `${i + 1}`, page: i + 1 }));
    }
    const middle = [current - 1, current, current + 1].filter((p) => p > 1 && p < total);
    const items: { label: string; page: number | null }[] = [{ label: '1', page: 1 }];
    if (middle[0] !== undefined && middle[0]! > 2) items.push({ label: '…', page: null });
    for (const p of middle) items.push({ label: `${p}`, page: p });
    if (middle.length > 0 && middle[middle.length - 1]! < total - 1) {
      items.push({ label: '…', page: null });
    }
    items.push({ label: `${total}`, page: total });
    return items;
  });

  protected goToPage(target: number | null): void {
    if (target == null) return;
    this.page.set(Math.max(1, Math.min(target, this.totalPages())));
  }

  protected pageStart = computed(
    () => (Math.min(this.page(), this.totalPages()) - 1) * this.pageSize + 1,
  );
  protected pageEnd = computed(() =>
    Math.min(this.page(), this.totalPages()) * this.pageSize > this.filtered().length
      ? this.filtered().length
      : Math.min(this.page(), this.totalPages()) * this.pageSize,
  );

  /* ── Export: filtered roster → Media Kit PDF ───────────────────── */
  protected readonly exporting = signal(false);

  protected async exportPdf(): Promise<void> {
    const rows = this.filtered();
    if (rows.length === 0 || this.exporting()) return;
    this.exporting.set(true);
    try {
      // Dynamic import keeps the PDF lib out of the initial bundle.
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 48;
    let y = 0;

    const header = (): void => {
      doc.setFillColor(12, 14, 17);
      doc.rect(0, 0, pageWidth, 86, 'F');
      doc.setTextColor(173, 198, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('9:16 IMP — Media Kit', marginX, 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 155, 165);
      const scope = this.niche() === 'All Niches (Global)' ? 'All niches' : this.niche();
      doc.text(
        `${rows.length} creators · ${scope} · generated ${new Date().toLocaleDateString('en-US')}`,
        marginX,
        58,
      );
      y = 118;
    };

    header();
    rows.forEach((c, index) => {
      if (y > 720) {
        doc.addPage();
        header();
      }
      if (index > 0) {
        doc.setDrawColor(226, 228, 232);
        doc.line(marginX, y - 14, pageWidth - marginX, y - 14);
      }

      doc.setTextColor(20, 22, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(c.name, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110, 116, 126);
      doc.text(`${c.handle}   ·   ${c.niche}${c.asn ? `   ·   ${c.asn}` : ''}`, marginX, y + 15);

      const platformLine = c.metrics
        .map((m) => `${m.code} ${m.followers}${m.sub !== 'New' && m.sub !== '—' ? ` (${m.sub})` : ''}`)
        .join('    ·    ');
      doc.setTextColor(60, 64, 70);
      doc.setFontSize(10);
      doc.text(platformLine, marginX, y + 34);

      doc.setFontSize(9);
      doc.setTextColor(110, 116, 126);
      doc.text(
        `Peak ER ${c.maxEr > 0 ? `${c.maxEr}%` : '—'}   ·   Audit ${c.audit}   ·   ` +
          `${c.campaign ?? 'Unassigned'}${c.campaign ? ' campaign' : ''}`,
        marginX,
        y + 51,
      );
      y += 92;
    });

      doc.save(`916-media-kit-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      this.exporting.set(false);
    }
  }

  /* ── Interactions ─────────────────────────────────────────────── */
  protected togglePlatform(key: string): void {
    this.platforms.update((list) =>
      list.includes(key) ? list.filter((p) => p !== key) : [...list, key],
    );
  }

  protected isPlatformActive(key: string): boolean {
    return this.platforms().includes(key);
  }

  /** ER select hands us the option value as a string. */
  protected setEr(value: string): void {
    this.erMin.set(Number.parseFloat(value));
  }

  /** Range input hands us the tier index as a string. */
  protected setReach(value: string): void {
    this.reachStep.set(Number.parseInt(value, 10));
    this.showTierTag.set(true);
  }

  /** Remote demo avatar died → fall back to initials badge. */
  protected onAvatarError(id: string): void {
    this.failedAvatars.update((set) => new Set(set).add(id));
  }

  protected initials(name: string): string {
    return name
      .split(/[\s']+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }

  /** Compact reach label for the table view ("1.6M" / "780K"). */
  protected compactReach(c: CreatorCard): string {
    if (c.reachK <= 0) return '—';
    return c.reachK >= 1000 ? `${(c.reachK / 1000).toFixed(1)}M` : `${Math.round(c.reachK)}K`;
  }

  protected resetAll(): void {
    this.search.set('');
    this.niche.set('All Niches (Global)');
    this.platforms.set(['instagram', 'tiktok', 'youtube']);
    this.erMin.set(3.5);
    this.asanaState.set('All Workflow States');
    this.reachStep.set(0);
    this.showTierTag.set(true);
    this.showSafetyTag.set(true);
  }

  protected currentErLabel(): string {
    return `ER > ${this.erMin()}%`;
  }

  /** Ribbon chip text — design default at floor, live range otherwise. */
  protected tierTagLabel(): string {
    return this.reachStep() === 0 ? 'Tier: 100K–5M' : `Reach ≥ ${this.reachLabel()}`;
  }

  /** Module 2 — persists the registration, then prepends the card. */
  protected async onRegistered(n: NewInfluencer): Promise<void> {
    this.showModal.set(false);

    if (this.source() === 'live') {
      const row = await this.data.create({
        name: n.name,
        location: n.location,
        email: n.email,
        niche: n.niche,
        instagram: n.instagram,
        tiktok: n.tiktok,
        youtube: n.youtube,
        snapchat: n.snapchat,
        tierLabel: n.tier,
        campaign: n.campaign,
        audit: n.audit,
        avatarFile: n.avatarFile,
        internalNotes: n.internalNotes,
      });
      if (row) {
        this.creators.update((roster) => [this.toCard(row, 0), ...roster]);
        return;
      }
      // Insert failed (RLS/offline) — fall through to the local card so
      // the UI still acknowledges the registration.
    }

    const assigned = n.campaign !== 'None - General Creator Roster';
    const handleBase = n.instagram || n.tiktok || n.name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
    const metricFor = (platform: string, code: string): CreatorCard['metrics'][number] => ({
      platform,
      code,
      followers: '—',
      sub: 'New',
      subClass: 'text-outline',
      source: 'Manual',
    });
    const card: CreatorCard = {
      id: handleBase.replace(/[^a-z0-9]+/g, '-') || `creator-${Date.now()}`,
      name: n.name,
      handle: `@${handleBase}`,
      chip: n.niche.split(/ [&•] /)[0]!,
      niche: n.niche,
      nicheTag: 'New Addition',
      glow: 'bg-primary-container/10 group-hover:bg-primary-container/20',
      image: n.avatarPreview ?? '',
      metrics: [
        metricFor('instagram', 'IG'),
        metricFor('tiktok', 'TT'),
        metricFor('youtube', 'YT'),
        metricFor('snapchat', 'SC'),
      ],
      maxEr: 0,
      reachK: 0,
      assigned,
      campaign: assigned ? n.campaign.split(' • ')[0] : null,
      asn: assigned ? `ASN-${Math.floor(1000 + Math.random() * 9000)}` : null,
      audit: n.audit ? 'Scan queued' : '—',
    };
    this.creators.update((roster) => [card, ...roster]);
  }
}
