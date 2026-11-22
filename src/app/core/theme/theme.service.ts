import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'ims.theme';

/**
 * Light/dark theme controller — toggles the `.light` class on
 * <html> to swap the @theme design token set (see styles.css).
 * Dark is the default; the preference persists in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly light = signal<boolean>(this.restore());

  constructor() {
    this.apply();
  }

  toggle(): void {
    this.light.update((v) => !v);
    try {
      localStorage.setItem(STORAGE_KEY, this.light() ? 'light' : 'dark');
    } catch {
      // storage unavailable — stays session-only
    }
    this.apply();
  }

  private apply(): void {
    document.documentElement.classList.toggle('light', this.light());
  }

  private restore(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'light';
    } catch {
      return false;
    }
  }
}
