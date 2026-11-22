import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from './icon';

export type KpiTone = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const TONE_TEXT: Record<KpiTone, string> = {
  default: 'text-white',
  primary: 'text-primary',
  success: 'text-safety',
  warning: 'text-warning',
  danger: 'text-alert',
};

/**
 * KPI summary card — `<app-kpi-card label="Total Reach" value="18.4M" icon="globe" tone="success">`.
 * Projected content renders as a hint row below the value (delta chips, sub-metrics).
 */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="glass glow-top rounded-xl p-4 transition-colors duration-200 hover:border-white/20"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {{ label() }}
          </p>
          <p class="mt-1.5 truncate text-2xl font-bold leading-none" [class]="toneText()">
            {{ value() }}
          </p>
        </div>
        @if (icon()) {
          <div
            class="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5"
            [class]="toneText()"
          >
            <app-icon [name]="icon()!" [size]="16" />
          </div>
        }
      </div>
      <div class="mt-3 min-h-0 text-[11px] text-slate-400">
        <ng-content />
      </div>
    </div>
  `,
  imports: [Icon],
  host: { class: 'block' },
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input<string | null>(null);
  readonly tone = input<KpiTone>('default');

  readonly toneText = computed(() => TONE_TEXT[this.tone()]);
}
