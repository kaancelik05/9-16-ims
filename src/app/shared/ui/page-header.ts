import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Standard page header — eyebrow + title + description with an actions slot.
 * `<app-page-header eyebrow="Directory" title="Influencers">…buttons…</app-page-header>`
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            {{ eyebrow() }}
          </p>
        }
        <h1 class="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
          {{ title() }}
        </h1>
        @if (description()) {
          <p class="mt-1 max-w-2xl text-sm text-slate-400">{{ description() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
  host: { class: 'block' },
})
export class PageHeader {
  readonly eyebrow = input<string | null>(null);
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
