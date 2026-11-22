/** Display formatters shared by the data-driven screens (Faz 2). */

/** 1400000 → "1.4M", 840000 → "840K", null → "—". */
export function compactCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`;
  }
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value}`;
}

/** 18500 → "$18,500", null → "—". */
export function formatMoney(value: number | null | undefined, currency = 'USD'): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** "2026-10-28" → "Oct 28, 2026"; null → "—". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length <= 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "2026-09-20T…" → "2m ago" / "5h ago" / "3d ago"; null → "—". */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Metric provenance enum → display label (consent-first source badges). */
export function sourceLabel(
  source: 'api' | 'declared' | 'manual' | null | undefined,
): 'API' | 'Declared' | 'Manual' | null {
  if (source === 'api') return 'API';
  if (source === 'declared') return 'Declared';
  if (source === 'manual') return 'Manual';
  return null;
}

/** "$342.8K" / "$1.2M" style compact money. */
export function formatMoneyCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `$${compactCount(value)}`;
}

