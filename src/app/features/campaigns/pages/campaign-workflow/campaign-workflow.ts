import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { environment } from '../../../../../environments/environment';
import {
  BoardDeliverable,
  CampaignDataService,
  SyncTelemetry,
} from '../../campaign-data.service';
import { AsanaApiService } from '../../../../core/asana/asana-api.service';
import { CampaignContextService } from '../../../../core/campaign/campaign-context.service';
import { CampaignStage } from '../../../../shared/models/domain.models';
import { compactCount, formatDate, formatMoney, timeAgo } from '../../../../shared/utils/format';
import { BrandLogo, type BrandPlatform } from '../../../../shared/ui/brand-logo';

/** Per-card middle-section payloads — exactly one is present per task. */
interface TaskNote {
  text: string;
  icon: string;
  iconCls: string;
  textCls: string;
  right?: string;
}
interface TaskDocusign {
  due: string;
  pct: number;
}
interface TaskAsset {
  file: string;
  size: string;
  status: string;
}
interface TaskLive {
  views: string;
  vel: string;
  bars: { h: number; cls: string }[];
}
type TaskMetric = { label: string; value: string; cls: string };

interface Task {
  id: string;
  asn: string;
  /** Real Asana task gid (live cards) — powers outbound actions. */
  gid?: string | null;
  /** Kanban stage enum of the underlying deliverable. */
  stageKey?: CampaignStage;
  priority: { label: string; cls: string };
  creator: { name: string; handle: string; image: string };
  title: string;
  format: { label: string; dot: string; brand?: BrandPlatform };
  fee: string;
  note?: TaskNote;
  docusign?: TaskDocusign;
  asset?: TaskAsset;
  live?: TaskLive;
  metrics?: [TaskMetric, TaskMetric];
  due?: string;
  risk?: string;
  scheduleNote?: { text: string; icon: string };
  footer: {
    assignee: { name: string; image: string };
    kind: 'counts' | 'liveCounts' | 'badge';
    comments?: number;
    attachments?: number;
    /** Attachment counter icon — "description" for document-heavy cards. */
    attachmentsIcon?: string;
    views?: string;
    likes?: string;
    badge?: string;
    badgeCls?: string;
  };
}

interface Stage {
  key: string;
  label: string;
  dot: string;
  /** Creator avatar (group-by-creator mode) — replaces the dot in the header. */
  image?: string | null;
  count: number;
  capLabel: string;
  capValue: string;
  tasks: Task[];
}

const BRODY = {
  name: 'M. Brody',
  image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCcwJQY3ExexLlUyFK0N0aMqG0smSD45HaHVN_fF1QjW30yBcDLnsf6RSrUQXd4iLO6zlf3jXpvOc3QQOkpPAL8khy3dphYTHo6FQWA-PligKzstHr8xvBR85qfe7-vSIlvizEwaqLS76UcTE9uhBJY0DZbquQHhMHg8OknPVDV0eszPJ_Gk4VB7M2tCKUcgTjYiOJJmIF8VF0mbe3bY8D16wxFtg_xrROva6pqssVQUJbCyVudok2',
};
const ROSTOVA = {
  name: 'E. Rostova',
  image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBQIq07DSnZCDFpKGWydFUCPeT7OeHZ9B9A_UL03WDtkgH_lcfKuLCahKSxk5_uMi3ION_qosAJGGqc-lEC2QEw-OplY8WhTxIoqBZ5gL_PMgz3f0X2x6G1DX9crnmAStA0U-didA0L93brw3cKyHQL2r5kiXMfGtbHJanFTgCWPEtA2LbqA7Oo6_ia6y4zuKUjiRLaw62N-YgvKvHDMb4ASOOmToFy7DJzQ4EY98UJKZb7ofAVNlCM',
};
const VANCE = {
  name: 'S. Vance',
  image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuARmpL4SGOxTkZoVvCBLeWfD4BKTO2Hrc09Q2N3xQ3IXaX6m0NagUz7QRl5ORkyJcHPCL2v1PEpow5h7ekpdTSr220Yh3FFalZFTC4AZmwFy3ejkSQXB2NaRS6T1clU3YTxnslXEuqxy_vjk6v0oZW5v1FJGkPVK8fVO8MnwgMztIOA6f5vR110gHypegbej8xPXPH4s4r6QSDSU2bJtm_NwV8lK3SqBA1QywDx3omCBOnxpQNxr6vV',
};

/**
 * Module 4 — Campaign Workflow
 * Telemetry banner + 5-stage Kanban pipeline with per-stage task card
 * variants (pitch notes, DocuSign progress, video draft assets, live
 * telemetry sparklines, performance metrics) per the approved design.
 *
 * Faz 2: the board loads from the `deliverables` join in Supabase and
 * the telemetry banner derives from `asana_connections` +
 * `asana_sync_log`; the demo board stays as the offline fallback.
 */

/** Asana task detail (read-only modal). */
interface TaskDetail {
  gid: string;
  name: string;
  notes?: string | null;
  due_on?: string | null;
  completed?: boolean;
  created_at?: string;
  modified_at?: string;
  assignee?: { name: string } | null;
  memberships?: { project?: { name?: string }; section?: { name?: string } }[];
  custom_fields?: { name: string; display_value?: string | null }[];
}

interface CommentRow {
  text: string;
  created_at: string;
  created_by?: { name: string };
}

interface AttachmentRow {
  gid: string;
  name: string;
  resource_subtype: string;
  size?: number | null;
  host?: { name?: string } | null;
  created_at: string;
}

@Component({
  selector: 'app-campaign-workflow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BrandLogo],
  templateUrl: './campaign-workflow.html',
  host: {
    class: 'block',
    '(document:keydown.escape)': 'closeDetail()',
  },
})
export class CampaignWorkflow {
  private readonly data = inject(CampaignDataService);
  private readonly asana = inject(AsanaApiService);
  protected readonly campaignContext = inject(CampaignContextService);

  /* ── Header interactions ─────────────────────────────────────── */
  protected readonly syncState = signal<'idle' | 'syncing' | 'synced'>('idle');
  protected readonly search = signal('');
  protected readonly viewMode = signal('stage');
  protected readonly failedAvatars = signal<ReadonlySet<string>>(new Set());

  /** 'live' = Supabase board, 'demo' = design-flight fallback. */
  protected readonly source = signal<'live' | 'demo'>('demo');

  /** Telemetry banner snapshot — design defaults until live data lands. */
  protected readonly telemetry = signal<SyncTelemetry>({
    projectLabel: '#PRJ-916-SUMMER25',
    projectGid: null,
    webhookId: null,
    syncedTasks: 42,
    totalTasks: 42,
    conflicts: 0,
    latencyMs: 320,
  });

  protected readonly viewModes = [
    { key: 'stage', icon: 'view_kanban', label: 'Stage Flow' },
    { key: 'creator', icon: 'person', label: 'Group by Creator' },
    { key: 'deliverable', icon: 'folder_copy', label: 'Group by Deliverable' },
  ];

  constructor() {
    void this.campaignContext.ensureLoaded();
    if (!environment.demoMode) {
      void this.loadBoard();
      void this.loadTelemetry();
    }
  }

  /** Live deliverable rows (campaign filter applies reactively). */
  private readonly boardRows = signal<BoardDeliverable[]>([]);

  private async loadBoard(): Promise<void> {
    const rows = await this.data.loadBoard();
    if (!rows || rows.length === 0) return;
    this.boardRows.set(rows);
    this.source.set('live');
  }

  private async loadTelemetry(): Promise<void> {
    const snapshot = await this.data.loadTelemetry();
    if (snapshot) this.telemetry.set(snapshot);
  }

  /* ── Live board mapping (deliverables → stage buckets) ────────── */
  private toBoard(rows: BoardDeliverable[]): Stage[] {
    const buckets: { key: string; stage: CampaignStage; label: string; dot: string; capLabel: string }[] = [
      { key: 'selection', stage: 'selection_pitching', label: '1. Selection & Pitch', dot: 'bg-outline', capLabel: 'Allocated Cap' },
      { key: 'briefing', stage: 'briefing_contract', label: '2. Brief & Contract', dot: 'bg-primary', capLabel: 'Committed Contracts' },
      { key: 'draft', stage: 'content_creation', label: '3. Draft Approval', dot: 'bg-secondary', capLabel: 'Active In Production' },
      { key: 'live', stage: 'scheduled_live', label: '4. Scheduled / Live', dot: 'bg-tertiary', capLabel: 'Live Payout Pool' },
      { key: 'reporting', stage: 'performance_reporting', label: '5. Performance & ROI', dot: 'bg-primary-container', capLabel: 'Settled Value' },
    ];
    return buckets.map(({ key, stage, label, dot, capLabel }) => {
      const stageRows = rows.filter((r) => r.stage === stage);
      return {
        key,
        label,
        dot,
        capLabel,
        capValue: formatMoney(stageRows.reduce((sum, r) => sum + (r.fee ?? 0), 0)),
        count: stageRows.length,
        tasks: stageRows.map((r, i) => this.toTask(r, i)),
      };
    });
  }

  private toTask(r: BoardDeliverable, index: number): Task {
    const inf = r.influencers;
    const format = r.content_format ?? 'General';
    const lower = format.toLowerCase();
    const brand: BrandPlatform =
      lower.includes('snap') ? 'snapchat'
      : lower.includes('tiktok') ? 'tiktok'
      : lower.includes('youtube') || lower.includes('yt') ? 'youtube'
      : 'instagram';
    const dot =
      lower.includes('snap') ? 'bg-[#F59E0B]'
      : lower.includes('tiktok') ? 'bg-[#3B82F6]'
      : lower.includes('youtube') || lower.includes('yt') ? 'bg-[#EF4444]'
      : 'bg-[#8B5CF6]';
    const assignees = [BRODY, ROSTOVA, VANCE];
    const metric = r.asset_metrics?.[0] ?? null;

    const priority =
      r.stage === 'scheduled_live' && r.approval_status === 'approved'
        ? { label: 'Live Feed', cls: 'bg-tertiary/15 text-tertiary font-semibold' }
        : r.stage === 'performance_reporting' && r.approval_status === 'approved'
          ? { label: 'Completed', cls: 'bg-tertiary/15 text-tertiary font-semibold' }
          : r.approval_status === 'revision' || r.approval_status === 'rejected'
            ? { label: 'Urgent', cls: 'bg-error/20 text-error font-bold' }
            : r.approval_status === 'in_review'
              ? { label: 'High', cls: 'bg-primary-container/20 text-primary' }
              : { label: 'Medium', cls: 'bg-surface-highest text-outline' };

    const task: Task = {
      id: r.id,
      asn: r.asana_task_label ?? '—',
      gid: r.asana_task_gid,
      stageKey: r.stage,
      priority,
      creator: {
        name: inf?.full_name ?? 'Unassigned',
        handle: inf?.primary_handle ? `@${inf.primary_handle}` : '—',
        image: inf?.avatar_url ?? '',
      },
      title: r.title,
      format: { label: format, dot, brand },
      fee: formatMoney(r.fee),
      due: r.due_date ? `Due: ${formatDate(r.due_date)}` : undefined,
      footer: { assignee: assignees[index % assignees.length]!, kind: 'counts', comments: 0, attachments: 0 },
    };

    if (r.stage === 'selection_pitching') {
      task.note = {
        text: 'Pitch brief delivered — awaiting response',
        icon: 'schedule',
        iconCls: 'text-outline',
        textCls: '',
      };
    } else if (r.stage === 'briefing_contract') {
      if (r.approval_status === 'pending' && r.due_date) {
        task.docusign = { due: `Due: ${formatDate(r.due_date)}`, pct: 60 };
      } else {
        task.note = {
          text: 'Brief acknowledged • contract in review',
          icon: 'check_circle',
          iconCls: 'text-tertiary',
          textCls: '',
        };
      }
    } else if (r.stage === 'content_creation') {
      if (r.asset_filename) {
        task.asset = {
          file: r.asset_filename,
          size: '',
          status:
            r.approval_status === 'in_review' ? 'Pending Client Approval'
            : r.approval_status === 'revision' ? 'Revision Requested'
            : 'In Production',
        };
      } else {
        task.note = {
          text: r.approval_status === 'revision' ? 'Revision V1 Requested' : 'Draft in production',
          icon: r.approval_status === 'revision' ? 'edit_note' : 'movie_edit',
          iconCls: '',
          textCls: r.approval_status === 'revision' ? 'text-[#F59E0B] font-medium' : '',
        };
      }
      // Read-only mirror: approval state renders as a badge, never an action.
      if (r.approval_status === 'in_review') {
        task.footer.kind = 'badge';
        task.footer.badge = 'Awaiting Client Approval';
        task.footer.badgeCls = 'text-primary';
      } else if (r.approval_status === 'revision') {
        task.footer.kind = 'badge';
        task.footer.badge = 'Revision Requested';
        task.footer.badgeCls = 'text-[#F59E0B]';
      }
    } else if (r.stage === 'scheduled_live') {
      if (r.approval_status === 'approved' && r.due_date) {
        task.scheduleNote = { text: `Goes live: ${formatDate(r.due_date)}`, icon: 'alarm' };
      } else {
        task.scheduleNote = { text: `Scheduled: ${formatDate(r.due_date)}`, icon: 'event' };
      }
      if (metric) {
        task.footer.kind = 'liveCounts';
        task.footer.views = compactCount(metric.views);
        task.footer.likes = compactCount(metric.likes);
      }
    } else if (r.stage === 'performance_reporting') {
      if (metric) {
        task.metrics = [
          { label: 'Total Views', value: compactCount(metric.views), cls: 'text-tertiary' },
          { label: 'Impressions', value: compactCount(metric.impressions), cls: 'text-on-surface' },
        ];
      }
      task.footer.kind = 'badge';
      task.footer.badge = r.approval_status === 'approved' ? 'Report Exported' : 'In Reporting';
      task.footer.badgeCls = r.approval_status === 'approved' ? 'text-primary' : 'text-outline';
    }
    return task;
  }

  /* ── Kanban stages (design demo — fallback for offline/demoMode) ── */
  protected readonly demoStages: Stage[] = [
    {
      key: 'selection',
      label: '1. Selection & Pitch',
      dot: 'bg-outline',
      count: 6,
      capLabel: 'Allocated Cap',
      capValue: '$64,500',
      tasks: [
        {
          id: 't-88392',
          asn: 'ASANA-#88392',
          priority: { label: 'Medium', cls: 'bg-surface-highest text-outline' },
          creator: {
            name: 'Lex Rivera',
            handle: '@lex.cinema',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCdcytF_XuWui5QuM2xAO7ppZWxnnpveloeI_tcqIEUGTSi2DPTb2aUIs4WwB0FxL4MjWBZCB88W1FFxP9NyX-_lod5xvipLXp9gMkTXtpWaRGV6-SkLlYnJWjWjHRTPwEP_04mSVW8R-NF4k3gRiYoFjKI1S-iVdmMnxFVxJsz0wMQQWkPqjCo1xINmtwNj7zBfbbi7EgpG4kM8xUCY50AgP8EOtkl1E-adTkU1xSXhlyJ1_ZXcwMr',
          },
          title: 'TikTok Creative Trend Mashup & Visual FX',
          format: { label: 'TikTok 9:16', dot: 'bg-[#3B82F6]' },
          fee: '$9,800',
          note: {
            text: 'Rate card pitched; awaiting counter',
            icon: 'check_circle',
            iconCls: 'text-tertiary',
            textCls: '',
          },
          footer: { assignee: BRODY, kind: 'counts', comments: 3, attachments: 1 },
        },
        {
          id: 't-93821',
          asn: 'ASANA-#93821',
          priority: { label: 'High', cls: 'bg-primary-container/20 text-primary' },
          creator: {
            name: 'Chloe Zhang',
            handle: '@chloe.glow',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuD4yFm219vs7dObxlPSelI0ZqjOMR04BVPI2XMXHuNOfFfHcJojJRDmNsXUmrQcdIkp5DfB3mckfITD2GB48VUxjVnxFONZlpFGfjtMyop-_W99bli9S20DQBSOmJ3u9nFtbjpYW8qfALBuedx_rz5PYfpJOB0suVCL4ux7UKYFbrwvbdNOq3nmZdqYwi8fQROgAzwXMw5eq6GMx_xEUtwaRXj4SCScngw02XBRW4nAfksiEgzsMe4',
          },
          title: 'Snapchat Spotlight 2x Spotlight Blast',
          format: { label: 'Snapchat Spotlight', dot: 'bg-[#F59E0B]' },
          fee: '$14,200',
          note: {
            text: 'Talent rep review in progress',
            icon: 'schedule',
            iconCls: 'text-outline',
            textCls: '',
          },
          footer: { assignee: ROSTOVA, kind: 'counts', comments: 5, attachments: 2 },
        },
      ],
    },
    {
      key: 'briefing',
      label: '2. Brief & Contract',
      dot: 'bg-primary',
      count: 5,
      capLabel: 'Committed Contracts',
      capValue: '$82,000',
      tasks: [
        {
          id: 't-91041',
          asn: 'ASANA-#91041',
          priority: { label: 'Urgent', cls: 'bg-error/20 text-error font-bold' },
          creator: {
            name: 'Jordan Cruz',
            handle: '@jordan.vibe',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBIYNQIYemdUVO92vBDZot4R-CO0diQvi9Ms8uPvDxY0oo6pHBEXU8ba2mJVtvjaloqqyEpKPvvq67l6AQNLPLqbyLaoeYwsKwjnU_g1_F5Cmzqe0XNk_vI2YgsnegKb4rr7nFydHmEQ0kqZFIa2fCr-9KfaNWjLqS7g0eiHPatMA31IhSyOY4Xep19JTW5QMZeWcQSLtqct-kfVbJKK1MWFqI6pJ1IW_1uR-R-li9BIpi7T3UHlXtH',
          },
          title: 'Instagram 9:16 Reel + 3x Story Frame Series',
          format: { label: 'IG Reel + Story', dot: 'bg-[#8B5CF6]' },
          fee: '$18,500',
          docusign: { due: 'Due: Tomorrow (Oct 24)', pct: 90 },
          footer: { assignee: VANCE, kind: 'counts', comments: 8, attachments: 3, attachmentsIcon: 'description' },
        },
        {
          id: 't-64390',
          asn: 'ASANA-#64390',
          priority: { label: 'Medium', cls: 'bg-surface-highest text-outline' },
          creator: {
            name: 'Kai Chen',
            handle: '@kai.creative',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuBfIwzXh2QF0RNukcO1N-5ZHrtIm74m8NGAn2mplQkpq_xMlWiZc0xVqEeL7xiWBcl25g862_r_3PguNRz4j5H_wdx4ijbcAgaFB6ShKcKMRFgEnTDEy6C6lM3NC2dxtSqmdywp9q66GcsXDKnwS82lDGFYLcj9om99NuDWyjWE6QpYw8q7B3jZwWIKEnp7sUYPbh5Iji4WJwSJZBM8Ih46oR2wDw_WzBSXeWuVlEi2fIboxcRhgC8y',
          },
          title: 'YouTube Dedicated Sponsorship 60s Integration',
          format: { label: 'YT 60s', dot: 'bg-[#EF4444]' },
          fee: '$22,000',
          note: {
            text: 'Brief Acknowledged • Whitelist Granted',
            icon: 'check_circle',
            iconCls: 'text-tertiary',
            textCls: '',
          },
          footer: { assignee: BRODY, kind: 'counts', comments: 2, attachments: 4 },
        },
      ],
    },
    {
      key: 'draft',
      label: '3. Draft Approval',
      dot: 'bg-secondary',
      count: 8,
      capLabel: 'Active In Production',
      capValue: '$142,500',
      tasks: [
        {
          id: 't-77215',
          asn: 'ASANA-#77215',
          priority: { label: 'High', cls: 'bg-primary-container/20 text-primary' },
          creator: {
            name: 'Maya Lin',
            handle: '@maya.lifestyle',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDLOSYlki868-lJyijMxW0-fiYMSK8-vYM5hCjEU1QftTgYxazGWHhYYrOG6Y6KuIq_hkEIVNXtUATtYa3M3M7YrO9HjMmYhUNY5rMIz8INS86MYW8zxFp8p72IIOqfsptB9LRV8YAl4tP95Wossi3OFvaR-zmve1xRvhpCgwEvuMcLvoFf0DuA13m5gyTdjOmbjy62I2HYpckR3ZeudRfJULS7NNpwVVxhrjzEixITnhq7KdEMtxn_',
          },
          title: 'TikTok 9:16 Unboxing & GRWM Morning Routine',
          format: { label: 'TikTok 9:16', dot: 'bg-[#3B82F6]' },
          fee: '$12,500',
          asset: { file: 'Draft_V2_4K_9x16.mp4', size: '235 MB', status: 'Pending Client Approval' },
          due: 'Due: Oct 28, 2025',
          risk: '99.4% Safe',
          footer: {
            assignee: ROSTOVA,
            kind: 'badge',
            badge: 'Pending Client Approval',
            badgeCls: 'text-primary',
          },
        },
        {
          id: 't-88421',
          asn: 'ASANA-#88421',
          priority: { label: 'Medium', cls: 'bg-surface-highest text-outline' },
          creator: {
            name: 'Elena Vance',
            handle: '@elena.vance',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuB1odOCGa0BBfy3BEw-2WDi6B7wyyBPInMw-bVNd81Jwop8y2lP7HxACdzM9203wUd3wAYVs1dhBXZydAx7mS-50rrlOz3HmRClt9COuJcgkLOmD6dcl51Ojay1ItLdyA2qSW58vAJ9XlpZ-swltUqY5QHjf4SqQclrRTiBku_v6pkoL_FIgrBg5ZR4AfJy5E8_7C80e-bYjfwFroGq94zIQ_h0Z2Kix-KMqjJYoLhXRsMa_IxeDCoB',
          },
          title: 'High-Intensity Circuit Training 9:16 Reel',
          format: { label: 'IG Reel', dot: 'bg-[#8B5CF6]' },
          fee: '$11,000',
          note: {
            text: 'Revision V1 Requested',
            icon: 'edit_note',
            iconCls: '',
            textCls: 'text-[#F59E0B] font-medium',
            right: '2 notes',
          },
          footer: { assignee: VANCE, kind: 'counts', comments: 6, attachments: 1 },
        },
      ],
    },
    {
      key: 'live',
      label: '4. Scheduled / Live',
      dot: 'bg-tertiary',
      count: 4,
      capLabel: 'Live Payout Pool',
      capValue: '$58,000',
      tasks: [
        {
          id: 't-59201',
          asn: 'ASANA-#59201',
          priority: {
            label: 'Live Feed',
            cls: 'bg-tertiary/15 text-tertiary font-semibold',
          },
          creator: {
            name: 'Julian Santos',
            handle: '@juliansantos',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuDLmKXvSCpzog_fAFoNR3pFh9VgqAxvnu5KmNaJxtcUQwiMX9ta1khSvA8XyhMpheZpVi9x_iGNZhcADYCWvD4nky3XwvE2m8wCYgEf-AJ8DJqmdI4yjHfoTIITuqLl9cZrPNEjkW7BD4rhLA139GaMCxAUhRI_pFaIG_eUFkvEQvzHJPCbkrLzj-EJ8_zaSz2XuqcbV1FPLzgOqpUb0cyowct0woXsXOngid0WsH5-VsN8ZGcF8abA',
          },
          title: 'TikTok Sound Integration & Challenge Drop',
          format: { label: 'TikTok 9:16', dot: 'bg-[#3B82F6]' },
          fee: '$15,000',
          live: {
            views: '412.8K Views',
            vel: '+14.2% vel',
            bars: [
              { h: 2, cls: 'bg-primary/20' },
              { h: 3, cls: 'bg-primary/30' },
              { h: 2.5, cls: 'bg-primary/40' },
              { h: 4, cls: 'bg-primary/50' },
              { h: 3.5, cls: 'bg-primary/70' },
              { h: 5, cls: 'bg-tertiary' },
            ],
          },
          footer: { assignee: BRODY, kind: 'liveCounts', views: '412K', likes: '38K' },
        },
        {
          id: 't-61922',
          asn: 'ASANA-#61922',
          priority: { label: 'Scheduled', cls: 'bg-surface-highest text-outline' },
          creator: {
            name: 'Tara Thorne',
            handle: '@tara.nomad',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuAQN7e1dFe7sR621colBYaCc3s8otTbKwVAig2-VKsSx_OXeG8ukc1Qdhm9ytt6GsA6C1w1gDMZhc-ZC6AFSKFuOIIs3E_iRuOL9mYwTN6OWb8W-eHZ0ge1wFWbYjqHAclnl9Fy20oOvtv-OdNzZXtGyGZEsexjLU7l-g2ud8LIlbEzSmEWh_db1KCYvb912SqmZdauf6FGOxwQ1dZAuy8h99bWDsEvN2aUUvSGxRQVieqg6JsBmzqQ',
          },
          title: 'Instagram 9:16 Cinematic Transition Reel',
          format: { label: 'IG Reel', dot: 'bg-[#8B5CF6]' },
          fee: '$12,000',
          scheduleNote: { text: 'Goes live: Oct 25, 18:00 EST', icon: 'alarm' },
          footer: { assignee: VANCE, kind: 'counts', comments: 4, attachments: 2 },
        },
      ],
    },
    {
      key: 'reporting',
      label: '5. Performance & ROI',
      dot: 'bg-primary-container',
      count: 5,
      capLabel: 'Settled Value',
      capValue: '$95,800',
      tasks: [
        {
          id: 't-44190',
          asn: 'ASANA-#44190',
          priority: { label: 'Completed', cls: 'bg-tertiary/15 text-tertiary font-semibold' },
          creator: {
            name: 'David Karr',
            handle: '@davidkarr.pov',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuB4LAKUh39pBehDH9ELk3-th636VIs8TOFxONCUHL9nJKhQwOOuc0cBbGDhZ1TKv_tGTA-tF8xoiF2ZrnMQexy6vSpwYrqwWpsdY-hjrBK2qP_unbB2Y7-xCfXrHITEtOgHzIRtwvkRCWGzh3nxX7di_35rs6TTVKO1OQ4QhZ4N4tErMKm_rQnPdfYGDC5kTROItmWy1g5baQznvo3c_Al8MH7ZsnqOr44wQDkoJJR6X7qcooJ-Q9I2',
          },
          title: 'POV Skit 9:16 Video + Spark Ads Push',
          format: { label: 'TikTok Spark', dot: 'bg-[#3B82F6]' },
          fee: '$24,000',
          metrics: [
            { label: 'Actual ROAS', value: '4.82x', cls: 'text-tertiary' },
            { label: 'Total Imp.', value: '1.48M', cls: 'text-on-surface' },
          ],
          footer: { assignee: ROSTOVA, kind: 'badge', badge: 'Report Exported', badgeCls: 'text-primary' },
        },
        {
          id: 't-39108',
          asn: 'ASANA-#39108',
          priority: { label: 'Audit Passed', cls: 'bg-tertiary/15 text-tertiary font-semibold' },
          creator: {
            name: 'Mia Thorne',
            handle: '@mia.drinks',
            image:
              'https://lh3.googleusercontent.com/aida-public/AB6AXuA6B7jERiGCXOBgmw0YQglrxJ191JFSMXgJ8I1aNOqeAC1SPCKZ45yl5cSHLh9-Qm5CoNxxibwlMjbfajlSBdymSgvAmAPWaFm60eazuQDB5IW7SYWiC8wM7QTM-jboItD1dVgMgcFIwWzVp-tY6H0qiHgJ4fRo5mB2Z621lgnjE2p9jtKJlJlaChMnUA02y4c0pPtzHmj94M89cx6Fb93j62zjfLx7bqUcw-SUI43A3tEdXzM436OP',
          },
          title: 'Mixology 9:16 Recipe Reel & Interactive Poll',
          format: { label: 'IG Reel', dot: 'bg-[#8B5CF6]' },
          fee: '$16,500',
          metrics: [
            { label: 'CTR', value: '5.14%', cls: 'text-primary' },
            { label: 'Engagement', value: '9.8%', cls: 'text-on-surface' },
          ],
          footer: { assignee: VANCE, kind: 'badge', badge: 'Archived', badgeCls: 'text-outline' },
        },
      ],
    },
  ];

  /** Template helper (module fn not template-accessible). */
  protected readonly timeAgo = timeAgo;

  /** Board scoped by the global topbar campaign selector (demo fallback). */
  protected readonly stages = computed<Stage[]>(() => {
    if (this.source() === 'demo') return this.demoStages;
    const campaignId = this.campaignContext.selectedId();
    const rows = campaignId === 'all'
      ? this.boardRows()
      : this.boardRows().filter((r) => r.campaign_id === campaignId);
    return this.toBoard(rows);
  });

  /* ── Alternate groupings (view switcher) ──────────────────────── */

  /** Every card on the current (campaign-scoped) board. */
  private allTasks(): Task[] {
    return this.stages().flatMap((stage) => stage.tasks);
  }

  /** Group by creator — one column per creator. */
  protected readonly creatorBoard = computed<Stage[]>(() => {
    const groups = new Map<string, Stage>();
    for (const task of this.allTasks()) {
      const name = task.creator.name;
      const group =
        groups.get(name) ??
        ({
          key: `creator-${name}`,
          label: name,
          dot: 'bg-primary',
          image: task.creator.image || null,
          count: 0,
          capLabel: '',
          capValue: '',
          tasks: [],
        } satisfies Stage);
      group.tasks.push(task);
      group.count++;
      groups.set(name, group);
    }
    return [...groups.values()];
  });

  /** Group by deliverable format — one column per content format. */
  protected readonly formatBoard = computed<Stage[]>(() => {
    const groups = new Map<string, Stage>();
    for (const task of this.allTasks()) {
      const format = task.format.label;
      const group =
        groups.get(format) ??
        ({
          key: `format-${format}`,
          label: format,
          dot: task.format.dot,
          count: 0,
          capLabel: '',
          capValue: '',
          tasks: [],
        } satisfies Stage);
      group.tasks.push(task);
      group.count++;
      groups.set(format, group);
    }
    return [...groups.values()];
  });

  /** Active board per the view switcher. */
  protected readonly board = computed<Stage[]>(() =>
    this.viewMode() === 'creator'
      ? this.creatorBoard()
      : this.viewMode() === 'deliverable'
        ? this.formatBoard()
        : this.stages(),
  );

  /* ── Derived: search-filtered board ───────────────────────────── */
  protected readonly filteredStages = computed(() => {
    const q = this.search().toLowerCase().trim();
    const columns = this.board();
    if (!q) return columns;
    return columns
      .map((stage) => ({
        ...stage,
        tasks: stage.tasks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.creator.name.toLowerCase().includes(q) ||
            t.creator.handle.toLowerCase().includes(q) ||
            t.asn.toLowerCase().includes(q),
        ),
      }))
      .filter((stage) => stage.tasks.length > 0);
  });

  /* ── Interactions ────────────────────────────────────────────── */

  /** Card currently executing an outbound Asana action. */
  protected readonly busyTask = signal<string | null>(null);

  /** Subscribes the inbound webhook to the connected project. */
  protected async connectWebhook(): Promise<void> {
    const projectGid = this.telemetry().projectGid;
    if (!projectGid || this.busyTask() !== null) return;
    this.busyTask.set('webhook');
    try {
      await this.asana.createWebhook(projectGid);
      await this.loadTelemetry();
    } catch {
      // handshake/permission failures surface via telemetry staying empty
    } finally {
      this.busyTask.set(null);
    }
  }


  /* ── Task detail modal (read-only Asana mirror) ───────────────── */

  /** Card opened in the detail modal. */
  protected readonly expandedTask = signal<Task | null>(null);
  protected readonly detail = signal<TaskDetail | null>(null);
  protected readonly comments = signal<CommentRow[]>([]);
  protected readonly attachments = signal<AttachmentRow[]>([]);
  protected readonly detailLoading = signal(false);

  protected openDetail(t: Task): void {
    this.expandedTask.set(t);
    this.detail.set(null);
    this.comments.set([]);
    this.attachments.set([]);
    if (!t.gid) return; // demo/local card — modal shows card data only
    this.detailLoading.set(true);
    void (async () => {
      const [task, comments, attachments] = await Promise.all([
        this.asana.getTask(t.gid!).catch(() => null),
        this.asana.listComments(t.gid!).catch(() => null),
        this.asana.listAttachments(t.gid!).catch(() => null),
      ]);
      this.detail.set(task ?? null);
      this.comments.set(comments ?? []);
      this.attachments.set(attachments ?? []);
      this.detailLoading.set(false);
    })();
  }

  protected closeDetail(): void {
    this.expandedTask.set(null);
    this.detail.set(null);
    this.comments.set([]);
    this.attachments.set([]);
    this.detailLoading.set(false);
  }

  /** Bytes → "2.4 MB" for the attachment list. */
  protected fmtSize(bytes: number | null | undefined): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  }

  /** Deep-links the card into the Asana project board. */
  protected openAsana(t: Task): void {
    const projectGid = this.telemetry().projectGid;
    const url =
      t.gid && projectGid ? `https://app.asana.com/0/${projectGid}/${t.gid}`
      : projectGid ? `https://app.asana.com/0/${projectGid}`
      : 'https://app.asana.com';
    window.open(url, '_blank', 'noopener');
  }

  protected forceSync(): void {
    if (this.syncState() !== 'idle') return;
    this.syncState.set('syncing');
    void (async () => {
      await this.asana.syncProject().catch(() => null);
      await Promise.all([this.loadBoard(), this.loadTelemetry()]);
      this.syncState.set('synced');
      setTimeout(() => this.syncState.set('idle'), 2200);
    })();
  }

  protected onAvatarError(id: string): void {
    this.failedAvatars.update((set) => new Set(set).add(id));
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
