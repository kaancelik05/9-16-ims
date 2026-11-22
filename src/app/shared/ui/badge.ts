import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { booleanAttribute } from '@angular/core';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-white/5 text-slate-300 border-white/10',
  primary: 'bg-primary/10 text-primary border-primary/30',
  success: 'bg-safety/10 text-safety border-safety/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-alert/10 text-alert border-alert/30',
};

const DOT_CLASSES: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-primary',
  success: 'bg-safety',
  warning: 'bg-warning',
  danger: 'bg-alert',
};

/**
 * Status badge / format pill — `<app-badge variant="success" [dot]="true">`.
 */
@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-md border font-semibold tracking-wide"
      [class]="variantClass()"
    >
      @if (dot()) {
        <span class="h-1.5 w-1.5 rounded-full" [class]="dotClass()"></span>
      }
      <ng-content />
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
  readonly dot = input(false, { transform: booleanAttribute });
  readonly size = input<'sm' | 'md'>('sm');

  readonly variantClass = computed(() => {
    const base = this.size() === 'sm'
      ? 'px-2 py-0.5 text-[10px] uppercase'
      : 'px-2.5 py-1 text-xs';
    return `${base} ${VARIANT_CLASSES[this.variant()]}`;
  });
  readonly dotClass = computed(() => DOT_CLASSES[this.variant()]);
}
