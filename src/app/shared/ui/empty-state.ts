import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from './icon';

/**
 * Placeholder / empty state — used while screen designs land.
 * `<app-empty-state icon="board" title="Coming soon" description="...">`
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="glass glow-top flex flex-col items-center justify-center gap-4 rounded-xl px-6 py-16 text-center">
      <div class="grid h-14 w-14 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
        <app-icon [name]="icon()" [size]="24" />
      </div>
      <div class="max-w-md">
        <h3 class="text-base font-bold text-white">{{ title() }}</h3>
        <p class="mt-1.5 text-sm leading-relaxed text-slate-400">{{ description() }}</p>
      </div>
      <div class="text-xs text-slate-500">
        <ng-content />
      </div>
    </div>
  `,
  imports: [Icon],
  host: { class: 'block' },
})
export class EmptyState {
  readonly icon = input<string>('spark');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}
