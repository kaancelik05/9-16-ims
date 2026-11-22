import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** Payload emitted when the agency registers a new creator. */
export interface NewInfluencer {
  name: string;
  location: string;
  email: string;
  niche: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  snapchat: string;
  tier: string;
  campaign: string;
  audit: boolean;
  /** Selected profile photo (uploaded by the directory service). */
  avatarFile: File | null;
  /** Local object-URL preview for the offline fallback card. */
  avatarPreview: string | null;
  /** Internal note from the registering agent. */
  internalNotes: string;
}

/**
 * Module 2 — Add Influencer modal.
 *
 * Three-section registration form (identity, social handles & telemetry,
 * workflow/Asana assignment) with the instant AI brand-safety audit
 * toggle and the Asana-sync footer, per the approved design.
 */
@Component({
  selector: 'app-add-influencer-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-influencer-modal.html',
  host: {
    class: 'contents',
    '(document:keydown.escape)': 'close()',
  },
})
export class AddInfluencerModal {
  readonly open = input(false, { transform: booleanAttribute });
  readonly closed = output<void>();
  readonly registered = output<NewInfluencer>();

  /* ── Form state ───────────────────────────────────────────────── */
  protected readonly name = signal('');
  protected readonly location = signal('');
  protected readonly email = signal('');
  protected readonly niche = signal('Tech & AI Tools');
  protected readonly instagram = signal('');
  protected readonly tiktok = signal('');
  protected readonly youtube = signal('');
  protected readonly snapchat = signal('');
  protected readonly tier = signal('Exclusive Tier 1 (Key Opinion Leader)');
  protected readonly campaign = signal("Summer Hype '25 • Multi-Platform Blitz");
  protected readonly auditOn = signal(true);

  /* ── Avatar picker & agency notes ─────────────────────────────── */
  protected readonly avatarFile = signal<File | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);
  protected readonly internalNotes = signal('');

  protected onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      input.value = '';
      return;
    }
    if (this.avatarPreview()) URL.revokeObjectURL(this.avatarPreview()!);
    this.avatarFile.set(file);
    this.avatarPreview.set(URL.createObjectURL(file));
  }

  protected clearAvatar(): void {
    if (this.avatarPreview()) URL.revokeObjectURL(this.avatarPreview()!);
    this.avatarFile.set(null);
    this.avatarPreview.set(null);
  }

  /** Auto-Fetch is a visual demo pulse until the metrics service lands. */
  protected readonly fetching = signal(false);

  protected readonly canRegister = computed(() => this.name().trim().length > 0);

  protected readonly nicheOptions = [
    'Beauty & Skincare',
    'Tech & AI Tools',
    'Fashion & Luxury',
    'Gaming & Esports',
    'Fitness & Wellness',
    'Culinary & Travel',
  ];

  protected readonly tierOptions = [
    'Exclusive Tier 1 (Key Opinion Leader)',
    'Tier 2 • High Velocity Mid-Tier',
    'Micro / UGC Specialist Pool',
    'Guest Collaborator (Single Campaign)',
  ];

  protected readonly campaignOptions = [
    "Summer Hype '25 • Multi-Platform Blitz",
    "Nike Summer Air '25",
    "Sony Alpha Lab '25",
    "Nespresso Origin '25",
    'None - General Creator Roster',
  ];

  private readonly doc = inject(DOCUMENT);

  constructor() {
    effect((onCleanup) => {
      if (this.open()) {
        this.doc.body.style.overflow = 'hidden';
        onCleanup(() => {
          this.doc.body.style.overflow = '';
        });
      }
    });
  }

  protected close(): void {
    if (this.open()) this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected autoFetch(): void {
    if (this.fetching()) return;
    this.fetching.set(true);
    setTimeout(() => this.fetching.set(false), 1200);
  }

  protected register(): void {
    if (!this.canRegister()) return;
    this.registered.emit({
      name: this.name().trim(),
      location: this.location().trim(),
      email: this.email().trim(),
      niche: this.niche(),
      instagram: this.instagram().trim().replace(/^@/, ''),
      tiktok: this.tiktok().trim().replace(/^@/, ''),
      youtube: this.youtube().trim(),
      snapchat: this.snapchat().trim().replace(/^@/, ''),
      tier: this.tier(),
      campaign: this.campaign(),
      audit: this.auditOn(),
      avatarFile: this.avatarFile(),
      avatarPreview: this.avatarPreview(),
      internalNotes: this.internalNotes(),
    });
    this.resetForm();
  }

  private resetForm(): void {
    this.name.set('');
    this.location.set('');
    this.email.set('');
    this.niche.set('Tech & AI Tools');
    this.instagram.set('');
    this.tiktok.set('');
    this.youtube.set('');
    this.snapchat.set('');
    this.tier.set('Exclusive Tier 1 (Key Opinion Leader)');
    this.campaign.set("Summer Hype '25 • Multi-Platform Blitz");
    this.auditOn.set(true);
    this.clearAvatar();
    this.internalNotes.set('');
  }
}
