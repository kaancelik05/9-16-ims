/**
 * Shared Asana task ingestion (webhook events + manual force sync).
 *
 * Fetches the task, maps section → Kanban stage and custom fields
 * (Content Format / Deliverable Fee / Approval Status), upserts the
 * deliverable and writes the asana_sync_log ledger entry.
 */

import { serviceClient } from './supabase.ts';
import { asanaFetch, mapSectionToStage, customFieldByName } from './asana.ts';

export interface AsanaTask {
  gid: string;
  name: string;
  due_on?: string | null;
  completed?: boolean;
  custom_fields?: { gid: string; name: string; display_value?: string | null }[];
  memberships?: {
    project?: { gid: string; name?: string };
    section?: { gid: string; name?: string };
  }[];
}

/** Ingest one Asana task into `deliverables`; logs to asana_sync_log. */
export async function ingestTask(gid: string, action: string, started: number): Promise<'upserted' | 'unlinked' | 'failed'> {
  const supabase = serviceClient();
  try {
    const { data: task } = await asanaFetch<{ data: AsanaTask }>(
      `/tasks/${gid}?opt_fields=name,due_on,completed,custom_fields,memberships.project,memberships.section`,
    );

    const membership = task.memberships?.[0];
    const projectGid = membership?.project?.gid ?? null;
    const sectionName = membership?.section?.name ?? null;

    let campaignId: string | null = null;
    if (projectGid) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('asana_project_gid', projectGid)
        .maybeSingle();
      campaignId = campaign?.id ?? null;
    }

    const stage = mapSectionToStage(sectionName);
    const format = customFieldByName(task.custom_fields, 'Content Format');
    const feeRaw = customFieldByName(task.custom_fields, 'Deliverable Fee');
    const approvalRaw = customFieldByName(task.custom_fields, 'Approval Status');

    if (!campaignId) {
      await supabase.from('asana_sync_log').insert({
        direction: 'inbound',
        entity_type: 'deliverable',
        entity_id: task.gid,
        event: 'task.unlinked_project',
        status: 'conflict',
        latency_ms: Date.now() - started,
        message: `Asana → IMP: "${task.name}" skipped — project ${projectGid} is not linked to a campaign`,
      });
      return 'unlinked';
    }

    const approvalStatus =
      /approv/i.test(approvalRaw ?? '') ? 'approved'
      : /revis/i.test(approvalRaw ?? '') ? 'revision'
      : /reject/i.test(approvalRaw ?? '') ? 'rejected'
      : /review/i.test(approvalRaw ?? '') ? 'in_review'
      : 'pending';

    const record = {
      campaign_id: campaignId,
      stage,
      title: task.name,
      content_format: format,
      fee: feeRaw ? Number(feeRaw.replace(/[^0-9.]/g, '')) || null : null,
      due_date: task.due_on ?? null,
      approval_status: approvalStatus,
      asana_task_gid: task.gid,
      asana_task_label: `ASANA-#${task.gid.slice(-5)}`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('deliverables')
      .upsert(record, { onConflict: 'asana_task_gid' });

    await supabase.from('asana_sync_log').insert({
      direction: 'inbound',
      entity_type: 'deliverable',
      entity_id: task.gid,
      event: `task.${action}`,
      status: error ? 'conflict' : 'success',
      latency_ms: Date.now() - started,
      message: `Asana → IMP: "${task.name}" → ${stage}`,
    });
    return error ? 'failed' : 'upserted';
  } catch (err) {
    await supabase.from('asana_sync_log').insert({
      direction: 'inbound',
      entity_type: 'deliverable',
      entity_id: gid,
      event: action === 'deleted' ? 'task.deleted' : 'task.fetch_failed',
      status: action === 'deleted' ? 'success' : 'failed',
      latency_ms: Date.now() - started,
      message: action === 'deleted'
        ? `Asana → IMP: task ${gid} deleted in Asana (deliverable kept)`
        : err instanceof Error ? err.message : String(err),
    });
    return 'failed';
  }
}
