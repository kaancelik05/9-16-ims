import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { supabase } from '../supabase/supabase-client';
import { CampaignContextService } from '../campaign/campaign-context.service';
import { ThemeService } from '../theme/theme.service';
import { Logo } from '../../shared/ui/logo';

type NavBadge = 'count' | 'pulse' | 'live' | 'safe' | 'format' | 'lock';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: NavBadge;
  /** Suppress active styling (shared/placeholder routes). */
  noActive?: boolean;
}

const ROLE_TITLES: Record<string, string> = {
  admin: 'VP of Influencer Marketing',
  manager: 'Senior Campaign Manager',
  viewer: 'Portfolio Analyst',
};

/**
 * Persistent enterprise shell — fixed w-72 sidebar (nav + agency tier
 * card) and glass topbar (global search, active campaign chip,
 * notifications, profile) per the approved dashboard design.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  templateUrl: './shell.html',
  host: {
    '(document:click)': 'closeMenus()',
    '(document:keydown.escape)': 'closeMenus()',
  },
})
export class Shell {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly campaignContext = inject(CampaignContextService);
  protected readonly theme = inject(ThemeService);

  constructor() {
    void this.loadCounts();
    void this.campaignContext.ensureLoaded();
  }

  /** Mobile off-canvas sidebar state (lg+ keeps the persistent rail). */
  protected readonly sidebarOpen = signal(false);

  /** Topbar profile dropdown state. */
  protected readonly profileMenuOpen = signal(false);

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected closeMenus(): void {
    this.sidebarOpen.set(false);
    this.profileMenuOpen.set(false);
  }

  /** Desktop collapsed-rail state (lg+ only; persisted). */
  protected readonly sidebarCollapsed = signal<boolean>(this.restoreCollapsed());

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
    try {
      localStorage.setItem('ims.sidebarCollapsed', this.sidebarCollapsed() ? '1' : '0');
    } catch {
      // storage unavailable — stays session-only
    }
  }

  private restoreCollapsed(): boolean {
    try {
      return localStorage.getItem('ims.sidebarCollapsed') === '1';
    } catch {
      return false;
    }
  }

  protected readonly nav: NavItem[] = [
    { label: 'Dashboard', icon: 'grid_view', route: '/dashboard' },
    { label: 'Influencers', icon: 'group', route: '/influencers', badge: 'count' },
    { label: 'Asana Workflow', icon: 'sync_alt', route: '/campaigns', badge: 'live' },
    { label: 'Analytics', icon: 'insights', route: '/analytics', badge: 'format' },
    { label: 'Consent Portal', icon: 'gavel', route: '/consent', badge: 'lock' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  protected readonly avatarUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuClkSgtkXOwZL_0Xtzg7eB0_lTWOEps0NqTPva1fiGnjvy2Bqdi7CcRZoJI4xqabn8NWn6Cr3-sn7tRhUZ0bHXwi9HBWBsHN8RXJtFzP7ts-W-SqhKOmegyx08upL5WNedeOIz6yn3NwV3ZNcwf1dJrSeeHjLGt3UrWcSC93QXAJa_VwgB5KFJAOjgawFB1IrCdwHJqtGCNs648x3lyu891GeS9l3VMITHWD8WTUXM';

  /** Roster size for the sidebar badge — null keeps the design value. */
  protected readonly creatorCount = signal<number | null>(null);

  private async loadCounts(): Promise<void> {
    const { count, error } = await supabase
      .from('influencers')
      .select('id', { count: 'exact', head: true });
    if (!error && count != null) this.creatorCount.set(count);
  }

  protected roleTitle(): string {
    return ROLE_TITLES[this.auth.profile()?.role ?? 'viewer'] ?? 'Agency Member';
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigate(['/login']);
  }
}
