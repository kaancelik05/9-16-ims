import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Stroke icon registry (24×24, lucide-style geometry). */
const ICONS: Record<string, string[]> = {
  users: [
    'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1',
    'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M22 19v-1a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5'],
  board: [
    'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z',
    'M9 7v10',
    'M15 7v6',
  ],
  chart: ['M3 3v18h18', 'M7 14l4-5 4 3 4.5-6'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M21 21l-4.35-4.35'],
  plus: ['M12 5v14', 'M5 12h14'],
  shield: [
    'M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z',
    'M9 11.5l2 2 4-4.5',
  ],
  bolt: ['M13 2 4 14h6l-1 8 9-12h-6l1-8z'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['M4.5 12.5l5 5 10-11'],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
  filter: ['M4 5h16l-6.5 8v5l-3 2v-7L4 5z'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M4 21h16'],
  upload: ['M12 21V9', 'M7 14l5-5 5 5', 'M4 3h16'],
  alert: ['M12 3 2 20h20L12 3z', 'M12 10v4', 'M12 17.5h.01'],
  video: [
    'M2 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z',
    'M15 10l7-4v12l-7-4',
  ],
  refresh: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
  eye: [
    'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z',
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ],
  mail: ['M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M3 7l9 6 9-6'],
  calendar: ['M3 4h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z', 'M8 2v4', 'M16 2v4', 'M3 10h18'],
  dollar: ['M12 2v20', 'M16.5 6.5c-1-1.2-2.6-2-4.5-2-2.5 0-4 1.3-4 3s1.5 2.6 4 3.2 5 1.3 5 3.8-2 3.5-5 3.5c-2 0-3.6-.8-4.5-2'],
  globe: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M3 12h18', 'M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.5-4-9s1.5-6.5 4-9z'],
  spark: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z', 'M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z'],
  'arrow-right': ['M4 12h16', 'M13 5l7 7-7 7'],
  link: [
    'M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 5.4',
    'M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07l1.3-1.28',
  ],
  send: ['M22 2 11 13', 'M22 2l-7 20-4-9-9-4 20-7z'],
  lock: ['M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8', 'M10.3 21a2 2 0 0 0 3.4 0'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
  sliders: ['M4 6h9', 'M17 6h3', 'M4 12h3', 'M11 12h9', 'M4 18h9', 'M17 18h3', 'M15 4v4', 'M9 10v4', 'M15 16v4'],
  file: ['M14 2H6a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7l-5-5z', 'M14 2v5h5'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z'],
  comment: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z'],
  share: ['M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7', 'M16 6l-4-4-4 4', 'M12 2v13'],
  pin: ['M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z', 'M12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'],
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  host: { class: 'inline-block shrink-0 leading-none' },
})
export class Icon {
  readonly name = input.required<string>();
  readonly size = input(16);
  readonly paths = computed(() => ICONS[this.name()] ?? []);
}
