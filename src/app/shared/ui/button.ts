import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Icon } from './icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-container text-on-primary-container hover:bg-primary-container/90 border border-primary-container/60 shadow-[0_0_20px_-6px_rgba(77,142,255,0.6)]',
  secondary:
    'bg-surface-low text-on-surface hover:bg-surface-container border border-white/10',
  ghost:
    'bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent',
  danger:
    'bg-error/15 text-error hover:bg-error/25 border border-error/40',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

@Component({
  selector: 'button[app-button], a[app-button]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (icon()) {
      <app-icon [name]="icon()!" [size]="size() === 'sm' ? 13 : 15" />
    }
    <ng-content />
  `,
  host: {
    class:
      'inline-flex cursor-pointer items-center justify-center font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none outline-none focus-visible:ring-2 focus-visible:ring-primary-container/60 disabled:pointer-events-none disabled:opacity-50',
    '[class]': 'classes()',
  },
  imports: [Icon],
})
export class Button {
  readonly variant = input<ButtonVariant>('secondary');
  readonly size = input<ButtonSize>('md');
  readonly icon = input<string | null>(null);

  readonly classes = computed(
    () =>
      `${VARIANT_CLASSES[this.variant()]} ${SIZE_CLASSES[this.size()]}`,
  );
}
