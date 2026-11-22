import { Injectable, inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';
import { supabase } from '../supabase/supabase-client';

/** Task payload for creating/updating Asana deliverable tasks. */
export interface AsanaTaskPayload {
  projectId?: string;
  taskId?: string;
  name: string;
  notes?: string;
  assignee?: string;
  dueOn?: string; // YYYY-MM-DD
  customFields?: Record<string, string | number | boolean>;
}

type ProxyResponse<T> = { data: T | null; error: string | null };

/**
 * Outbound Asana calls — always through the `asana-proxy` Edge Function so
 * the Personal Access Token never reaches the browser. The function maps
 * `action` to Asana REST endpoints server-side.
 */
@Injectable({ providedIn: 'root' })
export class AsanaApiService {
  private readonly auth = inject(AuthService);

  /** Raw proxy invocation shared by every action helper. */
  private async call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.auth.isAuthenticated()) {
      throw new Error('Asana API calls require an authenticated session.');
    }

    const { data, error } = await supabase.functions.invoke<ProxyResponse<T>>(
      'asana-proxy',
      { body: { action, ...params } },
    );

    // functions.invoke wraps Edge Function errors — surface them uniformly.
    const message = error ?? data?.error;
    if (message) throw new Error(message);
    if (!data?.data) throw new Error(`Asana proxy returned no data for "${action}".`);
    return data.data;
  }

  /** Projects visible to the connected PAT — used by connection setup. */
  listProjects(workspaceId?: string) {
    return this.call<{ gid: string; name: string }[]>('list-projects', { workspaceId });
  }

  /** All tasks of the linked project (synced into `deliverables`). */
  listTasks(projectId: string) {
    return this.call<unknown[]>('list-tasks', { projectId });
  }

  createTask(payload: AsanaTaskPayload) {
    return this.call<{ gid: string }>('create-task', { payload });
  }

  updateTask(payload: AsanaTaskPayload & { taskId: string }) {
    return this.call<{ gid: string }>('update-task', { payload });
  }

  addComment(taskId: string, text: string) {
    return this.call<{ gid: string }>('add-comment', { taskId, text });
  }

  /** Asana connectivity + PAT health check for the telemetry banner. */
  health() {
    return this.call<{ ok: boolean; latencyMs: number }>('health');
  }

  /** Subscribe our webhook to a project's task events; the proxy stores
   *  the signing secret scoped to the project's connection row. */
  createWebhook(projectId: string) {
    return this.call<{ gid: string; secret?: string }>('create-webhook', { projectId });
  }

  /** Unsubscribe the project's webhook (by webhook or project gid). */
  deleteWebhook(params: { webhookId?: string; projectId?: string }) {
    return this.call<{ deleted: boolean; webhookId: string }>('delete-webhook', params);
  }

  /** Force-sync the connected project's tasks into deliverables. */
  syncProject(projectId?: string) {
    return this.call<{ processed: number; upserted: number; failures: number }>(
      'sync-project',
      { projectId },
    );
  }

  /** Push an approval decision to Asana (custom field or comment). */
  setApproval(taskId: string, label: 'Approved' | 'Revision' | 'Rejected' | 'In Review') {
    return this.call<{ taskId: string; mode: 'custom_field' | 'comment'; approval: string }>(
      'set-approval',
      { taskId, text: label },
    );
  }

  /** Move a task to the Asana section matching a Kanban stage. */
  moveStage(taskId: string, stage: string) {
    return this.call<{ taskId: string; mode: 'section' | 'comment'; stage: string }>(
      'move-stage',
      { taskId, text: stage },
    );
  }

  /** Task detail for the read-only mirror's detail modal. */
  getTask(taskId: string) {
    return this.call<{
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
    }>('get-task', { taskId });
  }

  /** Task comments (Asana stories of type 'comment'). */
  listComments(taskId: string) {
    return this.call<
      { text: string; created_at: string; created_by?: { name: string } }[]
    >('list-comments', { taskId });
  }

  /** Task attachments metadata. */
  listAttachments(taskId: string) {
    return this.call<
      {
        gid: string;
        name: string;
        resource_subtype: string;
        size?: number | null;
        host?: { name?: string } | null;
        created_at: string;
      }[]
    >('list-attachments', { taskId });
  }
}
