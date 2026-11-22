import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from '../../../../shared/ui/brand-logo';

import { environment } from '../../../../../environments/environment';
import { InfluencerDataService, ProfileBundle } from '../../influencer-data.service';
import { PlatformMetric } from '../../../../shared/models/domain.models';
import { compactCount, formatDate, formatMoney, sourceLabel } from '../../../../shared/utils/format';
import {
  AUDIT_DESC,
  PlatformTelemetry,
  platforms,
  ProfileData,
  PROFILES,
} from './profile-demo';

/** Kanban stage → pipeline label used by the Asana task card. */
const STAGE_LABELS: Record<string, string> = {
  selection_pitching: 'Selection',
  briefing_contract: 'Contract Stage',
  content_creation: 'Creative Review',
  scheduled_live: 'Scheduled',
  performance_reporting: 'Performance',
};

/**
 * Module 3 — Influencer Profile & On-Demand AI Safety Audit.
 * Hero dossier bento, 4-channel telemetry grid, AI brand-safety
 * certification and the live Asana deliverable pipeline.
 *
 * Faz 2: the dossier loads by uuid from Supabase (influencer +
 * platform metrics + latest safety audit + assigned deliverables);
 * unknown ids surface a not-found banner instead of silently falling
 * back to the demo dossier. Demo data remains for demoMode/offline.
 */
@Component({
  selector: 'app-influencer-profile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BrandLogo],
  templateUrl: './influencer-profile.html',
  host: { class: 'block' },
})
export class InfluencerProfile {
  private readonly data = inject(InfluencerDataService);

  /** Route param — a creator uuid on the live path, slug on demo. */
  readonly id = input.required<string>();

  protected readonly notFound = signal(false);
  protected readonly source = signal<'live' | 'demo'>('demo');

  protected readonly profileData = signal<ProfileData | null>(null);

  /** Template-facing dossier — demo flagship until the live row lands. */
  protected readonly profile = computed<ProfileData>(
    () => this.profileData() ?? PROFILES['maya-chen']!,
  );

  /** Remote demo avatars that failed — initials render instead. */
  protected readonly failedAvatar = signal(false);

  /** Media Kit PDF generation state. */
  protected readonly exporting = signal(false);

  /** Audit rerun simulation: idle → running → completed. */
  protected readonly auditState = signal<'idle' | 'running' | 'completed'>('idle');

  protected readonly selectedCampaign = signal('');

  constructor() {
    effect(() => {
      const id = this.id();
      this.auditState.set('idle');
      this.failedAvatar.set(false);
      this.selectedCampaign.set('');

      if (environment.demoMode) {
        this.notFound.set(false);
        this.source.set('demo');
        const demo = PROFILES[id] ?? PROFILES['maya-chen']!;
        this.profileData.set(demo);
        this.selectedCampaign.set(demo.campaigns[0] ?? '');
        return;
      }
      void this.loadProfile(id);
    });
  }

  private async loadProfile(id: string): Promise<void> {
    const bundle = await this.data.loadProfile(id);
    if (!bundle) {
      // Not a known uuid (and not offline demoMode) — surface it.
      this.notFound.set(true);
      this.source.set('demo');
      this.profileData.set(PROFILES[id] ?? PROFILES['maya-chen']!);
      return;
    }
    this.notFound.set(false);
    this.source.set('live');
    const mapped = this.toProfileData(bundle);
    this.profileData.set(mapped);
    this.selectedCampaign.set(mapped.campaigns[0] ?? '');
  }

  /** Maps the Supabase bundle onto the design's dossier shape. */
  private toProfileData(bundle: ProfileBundle): ProfileData {
    const inf = bundle.influencer;
    const metric = (platform: PlatformMetric['platform']) =>
      bundle.metrics.find((m) => m.platform === platform);
    const ig = metric('instagram');
    const tt = metric('tiktok');
    const yt = metric('youtube');
    const sc = metric('snapchat');

    const first = bundle.deliverables[0];
    const campaignNames = [
      ...new Set(bundle.deliverables.map((d) => d.campaigns?.name).filter((n): n is string => !!n)),
    ];

    const grid: PlatformTelemetry[] = platforms(
      [compactCount(ig?.followers), ig?.engagement_rate ? `${ig.engagement_rate}%` : '—'],
      [compactCount(tt?.followers), tt?.engagement_rate ? `${tt.engagement_rate}%` : '—'],
      [compactCount(yt?.followers), compactCount(yt?.avg_views)],
      [compactCount(sc?.followers), compactCount(sc?.story_reach)],
      compactCount(ig?.story_reach),
      ig?.reel_retention != null ? `${Math.round(ig.reel_retention)}%` : '—',
      compactCount(tt?.avg_views),
      tt?.viral_index != null ? `${tt.viral_index} / 10` : '—',
      compactCount(sc?.story_reach),
    );
    // Consent-first provenance: where each channel's numbers came from.
    const sources = [sourceLabel(ig?.source), sourceLabel(tt?.source), sourceLabel(yt?.source), sourceLabel(sc?.source)];
    grid.forEach((card, i) => {
      card.source = sources[i];
    });

    return {
      name: inf.full_name,
      handle: inf.primary_handle ? `@${inf.primary_handle}` : '—',
      image: inf.avatar_url ?? '',
      location: inf.region ?? '—',
      timezone: inf.timezone ?? '—',
      agentEmail: inf.agent_contact ?? '—',
      baseRate: formatMoney(inf.rate_card, inf.currency),
      deals: `${bundle.deliverables.length}`,
      assignedCampaign: first?.campaigns?.name ?? null,
      tags: inf.tags.length > 0 ? inf.tags : [inf.niche ?? 'Creator'],
      platforms: grid,
      auditScore:
        bundle.audit?.score != null ? `${bundle.audit.score}`
        : bundle.audit?.status === 'in_progress' ? 'Scan queued'
        : '—',
      auditDesc: AUDIT_DESC,
      notes: inf.internal_notes ?? null,
      task: first
        ? {
            asn: first.asana_task_label ?? '—',
            title: first.title,
            stage: STAGE_LABELS[first.stage] ?? first.stage,
            due: formatDate(first.due_date),
            assignee: 'Agency Desk',
          }
        : { asn: '—', title: 'No active task', stage: '—', due: '—', assignee: '—' },
      campaigns:
        campaignNames.length > 0 ? campaignNames : ['General Creator Roster'],
    };
  }

  protected rerunAudit(): void {
    if (this.auditState() === 'running') return;
    this.auditState.set('running');
    setTimeout(() => this.auditState.set('completed'), 1600);
  }

  /* ── Media Kit PDF (branded one-pager) ────────────────────────── */
  protected async exportMediaKit(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const { jsPDF } = await import('jspdf');
      const p = this.profile();
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth(); // 595
      const M = 44;
      let y = 0;

      // ── Page 1: brand band ──
      doc.setFillColor(12, 14, 17);
      doc.rect(0, 0, W, 148, 'F');
      doc.setFillColor(77, 142, 255, 0.18); // primary glow
      doc.circle(W - 60, 20, 120, 'F');
      doc.setTextColor(173, 198, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('9:16 IMP · MEDIA KIT', M, 40);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(26);
      doc.text(p.name, M, 78);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(180, 185, 195);
      doc.text(
        `${p.handle}   ·   ${p.location}   ·   ${p.timezone}`,
        M,
        100,
      );
      doc.text(
        `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        M,
        122,
      );

      y = 184;
      const section = (label: string): void => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(120, 126, 138);
        doc.text(label.toUpperCase(), M, y);
        doc.setDrawColor(226, 228, 232);
        doc.line(M, y + 6, W - M, y + 6);
        y += 24;
      };
      const tile = (label: string, value: string, x: number, w: number, accent: string): void => {
        doc.setFillColor(245, 246, 248);
        doc.roundedRect(x, y, w, 58, 6, 6, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(130, 136, 148);
        doc.text(label.toUpperCase(), x + 12, y + 18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(accent as never);
        doc.text(value, x + 12, y + 42);
      };

      // ── Snapshot tiles ──
      section('Creator Snapshot');
      const tw = (W - M * 2 - 16) / 4;
      tile('Base Rate', p.baseRate, M, tw, '#4d8eff');
      tile('Brand Deals (30d)', p.deals, M + tw + 5, tw, '#111316');
      tile('Audit Score', `${p.auditScore}%`, M + (tw + 5) * 2, tw, '#4edea3');
      tile(
        'Capacity',
        p.assignedCampaign ? 'Active Flight' : 'Open',
        M + (tw + 5) * 3,
        tw,
        '#111316',
      );
      y += 76;

      // ── Platform telemetry table ──
      section('Cross-Platform Telemetry');
      const cols = ['Platform', 'Followers', 'Key Rate', 'Signature Metric', 'Source'];
      const colX = [M, M + 130, M + 232, M + 322, M + 470];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(120, 126, 138);
      cols.forEach((c, i) => doc.text(c.toUpperCase(), colX[i]!, y));
      y += 8;
      doc.setDrawColor(232, 234, 238);
      doc.line(M, y, W - M, y);
      y += 16;
      doc.setFont('helvetica', 'normal');
      for (const t of p.platforms) {
        const short =
          t.brand === 'instagram' ? 'Instagram' : t.brand === 'tiktok' ? 'TikTok'
          : t.brand === 'youtube' ? 'YouTube' : 'Snapchat';
        doc.setTextColor(20, 22, 26);
        doc.setFontSize(9.5);
        doc.text(short, colX[0]!, y);
        doc.setFont('helvetica', 'bold');
        doc.text(t.followers, colX[1]!, y);
        doc.setFont('helvetica', 'normal');
        doc.text(t.dockMeta, colX[2]!, y);
        doc.text(t.stat2.value ?? '—', colX[3]!, y);
        doc.setTextColor(120, 126, 138);
        doc.text(t.source ?? '—', colX[4]!, y);
        y += 20;
      }
      y += 12;

      // ── Audit summary ──
      section('AI Reputation & Brand Safety');
      doc.setFillColor(245, 246, 248);
      doc.roundedRect(M, y, W - M * 2, 64, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor('#4edea3' as never);
      doc.text(`${p.auditScore}% VERIFIED SAFE`, M + 14, y + 26);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90, 96, 108);
      doc.text(doc.splitTextToSize(p.auditDesc, W - M * 2 - 28), M + 14, y + 44);
      y += 88;

      // ── Representation & tags ──
      section('Representation & Positioning');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 64, 72);
      doc.text(`Agent: ${p.agentEmail}`, M, y);
      doc.text(`Campaign: ${p.assignedCampaign ?? 'Unassigned'}`, M + 200, y);
      y += 18;
      doc.text(`Tags: ${p.tags.join(' · ')}`, M, y, { maxWidth: W - M * 2 });
      y += 30;

      // ── Active pipeline ──
      section('Active Pipeline');
      doc.setFontSize(9.5);
      doc.setTextColor(60, 64, 72);
      doc.text(`${p.task.asn} · ${p.task.stage}`, M, y);
      y += 16;
      doc.text(doc.splitTextToSize(p.task.title, W - M * 2), M, y);
      y += 16;
      doc.setTextColor(130, 136, 148);
      doc.text(`Due ${p.task.due} · ${p.task.assignee}`, M, y);

      // ── Footer band ──
      doc.setFillColor(12, 14, 17);
      doc.rect(0, 792, W, 50, 'F');
      doc.setTextColor(150, 155, 165);
      doc.setFontSize(8);
      doc.text('9-16 IMP — Influencer Management Platform', M, 820);
      doc.text('confidential · internal use', W - M, 820, { align: 'right' });

      doc.save(`${p.handle.replace('@', '')}-media-kit.pdf`);
    } finally {
      this.exporting.set(false);
    }
  }

  protected initials(): string {
    return this.profile()
      .name.split(/[\s']+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('');
  }
}
