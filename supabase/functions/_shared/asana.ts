/**
 * Asana REST helper — the Personal Access Token lives only in
 * Edge Function secrets (supabase secrets set ASANA_ACCESS_TOKEN=…).
 */

const ASANA_API = 'https://app.asana.com/api/1.0';

export function asanaToken(): string {
  const token = Deno.env.get('ASANA_ACCESS_TOKEN');
  if (!token) throw new Error('ASANA_ACCESS_TOKEN secret is not configured.');
  return token;
}

export async function asanaFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${ASANA_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${asanaToken()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Asana API ${res.status} on ${path}: ${text}`);
  }
  // Some endpoints (e.g. DELETE /webhooks/:id) return 200 with an empty body.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ── Deliverable stage mapping ──────────────────────────────────────
 * Kanban stage is derived from the Asana section the task lives in.
 * Section names are matched leniently so workspace naming can vary.  */

export type CampaignStage =
  | 'selection_pitching'
  | 'briefing_contract'
  | 'content_creation'
  | 'scheduled_live'
  | 'performance_reporting';

const SECTION_TO_STAGE: [RegExp, CampaignStage][] = [
  [/select|pitch/i, 'selection_pitching'],
  [/brief|contract/i, 'briefing_contract'],
  [/creat|draft|approv/i, 'content_creation'],
  [/schedul|live|publish/i, 'scheduled_live'],
  [/report|performance/i, 'performance_reporting'],
];

export function mapSectionToStage(sectionName: string | null): CampaignStage {
  if (!sectionName) return 'selection_pitching';
  for (const [pattern, stage] of SECTION_TO_STAGE) {
    if (pattern.test(sectionName)) return stage;
  }
  return 'selection_pitching';
}

/* ── Custom field extraction ──────────────────────────────────────── */

export interface AsanaCustomField {
  gid: string;
  name: string;
  display_value?: string | null;
}

export function customFieldByName(
  fields: AsanaCustomField[] | undefined,
  name: string,
): string | null {
  return fields?.find((f) => f.name.toLowerCase() === name.toLowerCase())
    ?.display_value ?? null;
}
