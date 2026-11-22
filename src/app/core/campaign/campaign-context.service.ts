import { Injectable, computed, signal } from '@angular/core';

import { supabase } from '../supabase/supabase-client';
import { Campaign } from '../../shared/models/domain.models';

const STORAGE_KEY = 'ims.selectedCampaign';

/**
 * Global campaign context (topbar selector) — a single selection that
 * scopes the data screens (Dashboard, Kanban, Analytics). 'all' clears
 * the scope. Persists across reloads via localStorage.
 */
@Injectable({ providedIn: 'root' })
export class CampaignContextService {
  /** Campaign roster (loaded once per session, after auth). */
  private readonly _campaigns = signal<Campaign[]>([]);
  /** Selected campaign id — 'all' or a campaign uuid. */
  private readonly _selectedId = signal<string>(this.restore());

  private loaded = false;
  private loading: Promise<void> | null = null;

  readonly campaigns = this._campaigns.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();

  /** The selected campaign row, or null when scope = all. */
  readonly selected = computed<Campaign | null>(
    () => this._campaigns().find((c) => c.id === this._selectedId()) ?? null,
  );

  setSelected(id: string): void {
    this._selectedId.set(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable — selection stays session-only
    }
  }

  /** Loads the campaign list once; safe to call from every consumer. */
  ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    this.loading ??= (async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('spend', { ascending: false });
      if (!error && data) this._campaigns.set(data as unknown as Campaign[]);
      this.loaded = true;
    })();
    return this.loading;
  }

  /** Drops a stale stored id (e.g. campaign deleted). */
  private restore(): string {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value && value !== '' ? value : 'all';
    } catch {
      return 'all';
    }
  }
}
