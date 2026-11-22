/**
 * asana-proxy — outbound Asana REST bridge (App → Asana).
 *
 * JWT-verified (agency staff only). The ASANA_ACCESS_TOKEN stays in
 * Edge Function secrets; the browser never sees it. Every mutation is
 * mirrored into asana_sync_log so the realtime ticker stays truthful.
 *
 * Body: { action, ...params } — see AsanaApiService on the Angular side.
 */

import { json, corsHeaders } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/supabase.ts';
import { asanaFetch, mapSectionToStage } from '../_shared/asana.ts';
import { requireAgencyMember, requireWriteRole } from '../_shared/auth.ts';
import { ingestTask } from '../_shared/ingest.ts';

/** Appends a story comment to a task (graceful fallback channel). */
async function addStory(taskId: string, text: string): Promise<void> {
  await asanaFetch(`/tasks/${taskId}/stories`, {
    method: 'POST',
    body: JSON.stringify({ data: { text } }),
  });
}

/**
 * Sets the "Approval Status" custom field when the linked project has
 * one; otherwise records the decision as a story comment so the sync
 * still leaves a trace on any Asana project shape.
 */
async function setApprovalOnTask(taskId: string, label: string): Promise<'custom_field' | 'comment'> {
  const { data: task } = await asanaFetch<{
    data: { custom_fields?: { gid: string; name: string; resource_subtype?: string }[] };
  }>(`/tasks/${taskId}?opt_fields=name,custom_fields,custom_fields.name,custom_fields.resource_subtype`);

  const field = task.custom_fields?.find(
    (f) => f.name.toLowerCase() === 'approval status',
  );
  if (field) {
    let value: string | undefined;
    if (field.resource_subtype === 'enum') {
      const { data: cf } = await asanaFetch<{
        data: { enum_options?: { gid: string; name: string; enabled?: boolean }[] };
      }>(`/custom_fields/${field.gid}?opt_fields=enum_options.name,enum_options.enabled`);
      value = cf.enum_options
        ?.filter((o) => o.enabled !== false)
        .find((o) => o.name.toLowerCase() === label.toLowerCase())?.gid;
    } else {
      value = label;
    }
    if (value) {
      await asanaFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: { custom_fields: { [field.gid]: value } } }),
      });
      return 'custom_field';
    }
  }
  await addStory(taskId, `IMP: approval status → ${label}`);
  return 'comment';
}

/**
 * Moves a task into the Asana section matching the Kanban stage
 * (lenient name matching, same families as inbound mapping); falls
 * back to a story comment when no matching section exists.
 */
async function moveTaskStage(taskId: string, stage: string): Promise<'section' | 'comment'> {
  const { data: task } = await asanaFetch<{
    data: { projects?: { gid: string }[] };
  }>(`/tasks/${taskId}?opt_fields=projects`);
  const projectId = task.projects?.[0]?.gid;
  if (projectId) {
    const { data } = await asanaFetch<{
      data: { gid: string; name: string }[];
    }>(`/projects/${projectId}/sections?opt_fields=name&limit=50`);
    const target = (data.data ?? []).find((s) => mapSectionToStage(s.name) === stage);
    if (target) {
      await asanaFetch(`/sections/${target.gid}/addTask`, {
        method: 'POST',
        body: JSON.stringify({ data: { task: taskId } }),
      });
      return 'section';
    }
  }
  await addStory(taskId, `IMP: stage → ${stage}`);
  return 'comment';
}

interface ProxyBody {
  action: string;
  workspaceId?: string;
  projectId?: string;
  taskId?: string;
  webhookId?: string;
  text?: string;
  payload?: {
    projectId?: string;
    taskId?: string;
    name: string;
    notes?: string;
    dueOn?: string;
    customFields?: Record<string, string | number | boolean>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ data: null, error: 'POST only' }, 405);

  const started = Date.now();
  let body: ProxyBody;
  try {
    body = (await req.json()) as ProxyBody;
  } catch {
    return json({ data: null, error: 'Invalid JSON body' }, 400);
  }

  try {
    // The gateway accepts anon-level publishable keys, so the proxy
    // verifies the caller is real agency staff before touching Asana.
    const profile = await requireAgencyMember(req.headers.get('authorization'));

    const mutationActions = [
      'create-task',
      'update-task',
      'add-comment',
      'create-webhook',
      'delete-webhook',
      'set-approval',
      'move-stage',
      'sync-project',
    ];
    if (mutationActions.includes(body.action)) {
      requireWriteRole(profile);
    }

    let result: unknown;

    switch (body.action) {
      case 'health': {
        await asanaFetch<{ data: unknown }>('/users/me');
        result = { ok: true, latencyMs: Date.now() - started };
        break;
      }

      case 'list-projects': {
        const query = body.workspaceId
          ? `?workspace=${body.workspaceId}&archived=false&limit=50`
          : `?archived=false&limit=50`;
        const res = await asanaFetch<{ data: { gid: string; name: string }[] }>(
          `/projects${query}`,
        );
        result = res.data;
        break;
      }

      case 'list-tasks': {
        if (!body.projectId) throw new Error('projectId is required');
        const res = await asanaFetch<{ data: { gid: string; name: string }[] }>(
          `/projects/${body.projectId}/tasks?opt_fields=name,completed,due_on,custom_fields&limit=100`,
        );
        result = res.data;
        break;
      }

      case 'create-task': {
        const p = body.payload ?? {};
        const projectId = p.projectId ?? body.projectId;
        if (!projectId) throw new Error('projectId is required');
        const res = await asanaFetch<{ data: { gid: string } }>('/tasks', {
          method: 'POST',
          body: JSON.stringify({
            data: {
              name: p.name,
              notes: p.notes ?? '',
              due_on: p.dueOn ?? null,
              projects: [projectId],
              custom_fields: p.customFields ?? {},
            },
          }),
        });
        result = res.data;
        break;
      }

      case 'update-task': {
        const p = body.payload ?? {};
        const taskId = p.taskId ?? body.taskId;
        if (!taskId) throw new Error('taskId is required');
        const res = await asanaFetch<{ data: { gid: string } }>(
          `/tasks/${taskId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              data: {
                ...(p.name ? { name: p.name } : {}),
                ...(p.notes !== undefined ? { notes: p.notes } : {}),
                ...(p.dueOn ? { due_on: p.dueOn } : {}),
                ...(p.customFields ? { custom_fields: p.customFields } : {}),
              },
            }),
          },
        );
        result = res.data;
        break;
      }

      case 'add-comment': {
        if (!body.taskId || !body.text) {
          throw new Error('taskId and text are required');
        }
        const res = await asanaFetch<{ data: { gid: string } }>(
          `/tasks/${body.taskId}/stories`,
          {
            method: 'POST',
            body: JSON.stringify({ data: { text: body.text } }),
          },
        );
        result = res.data;
        break;
      }

      // ── Webhook lifecycle ─────────────────────────────────────────
      // The secret for X-Hook-Signature validation is taken from the
      // webhook-creation response and stored scoped to the project row —
      // the webhook endpoint itself only echoes the handshake.

      case 'create-webhook': {
        const projectId = body.projectId;
        if (!projectId) throw new Error('projectId is required');

        const target = Deno.env.get('ASANA_WEBHOOK_PUBLIC_URL')
          ?? `${Deno.env.get('SUPABASE_URL') ?? ''}/functions/v1/asana-webhook`;
        if (!target || !/^https?:\/\//.test(target)) {
          throw new Error(
            'Webhook target URL could not be determined (set ASANA_WEBHOOK_PUBLIC_URL for local dev)',
          );
        }

        const res = await asanaFetch<{ data: { gid: string; secret?: string } }>(
          '/webhooks',
          {
            method: 'POST',
            body: JSON.stringify({
              data: {
                resource: projectId,
                target,
                filters: [
                  { action: 'added', resource_type: 'task' },
                  { action: 'changed', resource_type: 'task' },
                  { action: 'deleted', resource_type: 'task' },
                ],
              },
            }),
          },
        );

        const proj = await asanaFetch<{
          data: { name: string; workspace?: { gid: string } | null };
        }>(`/projects/${projectId}?opt_fields=name,workspace`);

        const supabase = serviceClient();
        const { error: dbError } = await supabase.from('asana_connections').upsert({
          project_gid: projectId,
          project_name: proj.data.name,
          workspace_gid: proj.data.workspace?.gid ?? null,
          webhook_id: res.data.gid,
          webhook_secret: res.data.secret ?? null,
          status: 'connected',
          last_sync_at: new Date().toISOString(),
        }, { onConflict: 'project_gid' });
        if (dbError) throw dbError;

        result = res.data;
        break;
      }

      case 'delete-webhook': {
        const supabase = serviceClient();
        let webhookId = body.webhookId ?? null;
        if (!webhookId && body.projectId) {
          const { data: conn } = await supabase
            .from('asana_connections')
            .select('webhook_id')
            .eq('project_gid', body.projectId)
            .maybeSingle();
          webhookId = conn?.webhook_id ?? null;
        }
        if (!webhookId) throw new Error('webhookId or projectId is required');

        await asanaFetch(`/webhooks/${webhookId}`, { method: 'DELETE' });

        await supabase
          .from('asana_connections')
          .update({
            status: 'disconnected',
            webhook_id: null,
            webhook_secret: null,
          })
          .eq(body.projectId ? 'project_gid' : 'webhook_id', body.projectId ?? webhookId);

        result = { deleted: true, webhookId };
        break;
      }

      // ── Read-only task detail (Asana Workflow detail modal) ────────

      case 'get-task': {
        if (!body.taskId) throw new Error('taskId is required');
        const res = await asanaFetch<{
          data: {
            gid: string;
            name: string;
            notes?: string | null;
            due_on?: string | null;
            completed?: boolean;
            created_at?: string;
            modified_at?: string;
            assignee?: { name: string } | null;
            memberships?: { project?: { name?: string }; section?: { name?: string } }[];
            custom_fields?: { name: string; display_value?: string | null }[];
          };
        }>(
          `/tasks/${body.taskId}?opt_fields=name,notes,due_on,completed,created_at,modified_at,` +
            'assignee.name,memberships.project.name,memberships.section.name,' +
            'custom_fields.name,custom_fields.display_value',
        );
        result = res.data;
        break;
      }

      case 'list-comments': {
        if (!body.taskId) throw new Error('taskId is required');
        const res = await asanaFetch<{
          data: { type: string; text: string; created_at: string; created_by?: { name: string } }[];
        }>(
          `/tasks/${body.taskId}/stories?opt_fields=type,text,created_at,created_by.name&limit=50`,
        );
        result = (res.data ?? []).filter((s) => s.type === 'comment');
        break;
      }

      case 'list-attachments': {
        if (!body.taskId) throw new Error('taskId is required');
        const res = await asanaFetch<{
          data: {
            gid: string;
            name: string;
            resource_subtype: string;
            size?: number | null;
            host?: { name?: string } | null;
            created_at: string;
          }[];
        }>(
          `/tasks/${body.taskId}/attachments?opt_fields=name,resource_subtype,size,host.name,created_at&limit=50`,
        );
        result = res.data ?? [];
        break;
      }

      // ── Live sync operations (Faz 3) ──────────────────────────────

      case 'sync-project': {
        const supabase = serviceClient();
        let projectId = body.projectId ?? null;
        if (!projectId) {
          const { data: conn } = await supabase
            .from('asana_connections')
            .select('project_gid')
            .eq('status', 'connected')
            .limit(1)
            .maybeSingle();
          projectId = conn?.project_gid ?? null;
        }
        if (!projectId) throw new Error('No connected Asana project');

        const res = await asanaFetch<{ data: { gid: string }[] }>(
          `/projects/${projectId}/tasks?opt_fields=name&limit=100`,
        );
        const gids = (res.data ?? []).map((t) => t.gid);
        const started = Date.now();
        let upserted = 0;
        let failures = 0;
        for (const gid of gids) {
          const outcome = await ingestTask(gid, 'synced', started);
          if (outcome === 'upserted') upserted++;
          else if (outcome === 'failed') failures++;
        }
        await supabase
          .from('asana_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('project_gid', projectId);
        result = { processed: gids.length, upserted, failures };
        break;
      }

      case 'set-approval': {
        const taskId = body.taskId;
        const label = body.text; // 'Approved' | 'Revision' | …
        if (!taskId || !label) throw new Error('taskId and text are required');
        const mode = await setApprovalOnTask(taskId, label);

        const supabase = serviceClient();
        const approval =
          /approv/i.test(label) ? 'approved'
          : /revis/i.test(label) ? 'revision'
          : /reject/i.test(label) ? 'rejected'
          : /review/i.test(label) ? 'in_review'
          : 'pending';
        await supabase
          .from('deliverables')
          .update({ approval_status: approval, updated_at: new Date().toISOString() })
          .eq('asana_task_gid', taskId);

        result = { taskId, mode, approval };
        break;
      }

      case 'move-stage': {
        const taskId = body.taskId;
        const stage = body.text; // campaign_stage enum value
        if (!taskId || !stage) throw new Error('taskId and text are required');
        const mode = await moveTaskStage(taskId, stage);

        const supabase = serviceClient();
        await supabase
          .from('deliverables')
          .update({ stage: stage as never, updated_at: new Date().toISOString() })
          .eq('asana_task_gid', taskId);

        result = { taskId, mode, stage };
        break;
      }

      default:
        return json({ data: null, error: `Unknown action: ${body.action}` }, 400);
    }

    // Mirror outbound activity into the sync ledger (ticker + health).
    const isMutation = [
      'create-task',
      'update-task',
      'add-comment',
      'set-approval',
      'move-stage',
      'sync-project',
    ].includes(body.action);
    if (isMutation) {
      const supabase = serviceClient();
      await supabase.from('asana_sync_log').insert({
        direction: 'outbound',
        entity_type: body.action === 'add-comment' ? 'comment' : 'deliverable',
        entity_id: body.taskId ?? null,
        event: body.action,
        status: 'success',
        latency_ms: Date.now() - started,
        message: `IMP → Asana: ${body.action}`,
      });
    }

    return json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuthError = [
      'Missing authorization header',
      'Invalid session',
      'No agency profile for this user',
    ].includes(message) || message.startsWith('Only admin/manager');
    return json({ data: null, error: message }, isAuthError ? 403 : 502);
  }
});
