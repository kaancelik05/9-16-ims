import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

import { Icon } from './icon';

/**
 * Glassmorphic modal dialog.
 *
 * Usage:
 * ```html
 * <app-modal [open]="show()" (closed)="show.set(false)" title="Add Influencer">
 *   ...form content...
 * </app-modal>
 * ```
 */
@Component({
  selector: 'app-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
        (click)="onBackdrop($event)"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
      >
        <div
          class="glass my-auto w-full rounded-xl shadow-2xl shadow-black/60"
          [class]="widthClass()"
          #panel
        >
          <header class="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div class="min-w-0">
              @if (eyebrow()) {
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {{ eyebrow() }}
                </p>
              }
              <h2 class="truncate text-base font-bold text-white">{{ title() }}</h2>
            </div>
            <button
              type="button"
              class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              (click)="close()"
              aria-label="Close dialog"
            >
              <app-icon name="x" [size]="14" />
            </button>
          </header>
          <div class="max-h-[70vh] overflow-y-auto px-5 py-4">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
  imports: [Icon],
  host: { class: 'contents' },
})
export class Modal {
  readonly open = input(false, { transform: booleanAttribute });
  readonly title = input.required<string>();
  readonly eyebrow = input<string | null>(null);
  readonly width = input<'md' | 'lg' | 'xl'>('md');

  readonly closed = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  protected readonly isOpen = computed(() => this.open());

  constructor() {
    effect((onCleanup) => {
      const open = this.isOpen();
      const body = this.document.body;
      if (open) {
        body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => {
          if (e.key === 'Escape') this.close();
        };
        this.document.addEventListener('keydown', onKey);
        onCleanup(() => {
          body.style.overflow = '';
          this.document.removeEventListener('keydown', onKey);
        });
      }
    });
  }

  readonly widthClass = computed(
    () =>
      ({
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
      })[this.width()],
  );

  close(): void {
    this.closed.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === this.host.nativeElement.firstElementChild) this.close();
  }
}
