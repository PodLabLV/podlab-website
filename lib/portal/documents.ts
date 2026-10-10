import { reportError } from '@/lib/alerts';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { documentSlug } from '@/lib/document-link';
import { notifySlack, logToCrm, type PortalCaller } from '@/lib/portal-server';

/**
 * Client documents with version history (portal_document_versions).
 *
 * The Clarity Document starts life as a file in private/clarity/<slug>/. The
 * first time anyone edits it, the file is saved as version 1 ("As delivered")
 * and the edit becomes version 2, so the original is always one restore away.
 * Versions are append-only: a restore writes a new version, nothing is deleted.
 *
 * Until the 20261009 migration runs the table does not exist; every function
 * here reports `ready: false` instead of throwing, and the document route keeps
 * serving the file.
 */

export const CLARITY = 'clarity';
export const MAX_DOC_BYTES = 2_000_000;

export type AuthorKind = 'client' | 'staff' | 'ai';

export interface DocVersionMeta {
  version_no: number;
  author_kind: AuthorKind;
  author_name: string | null;
  note: string | null;
  created_at: string;
}

export interface CurrentDoc {
  html: string;
  /** Null when no version exists yet and the file is being served. */
  versionNo: number | null;
  source: 'db' | 'file';
  /** Whether portal_document_versions exists. */
  ready: boolean;
}

function missingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === 'PGRST205' || err.code === '42P01' || /does not exist|schema cache/i.test(err.message ?? '');
}

export async function readClarityFile(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    return await readFile(path.join(process.cwd(), 'private', 'clarity', slug, 'clarity-document.html'), 'utf8');
  } catch {
    return null;
  }
}

export async function clientDocumentInfo(
  db: SupabaseClient,
  clientId: string,
): Promise<{ slug: string | null; external: string | null }> {
  const { data } = await db.from('portal_clients').select('document_url').eq('id', clientId).maybeSingle();
  const url: string | null = data?.document_url ?? null;
  const slug = documentSlug(url);
  return { slug, external: !slug && url && /^https:\/\//.test(url) ? url : null };
}

/** Newest saved version, or the delivered file. Null when the client has no editable document. */
export async function currentDocument(db: SupabaseClient, clientId: string, docKey = CLARITY): Promise<CurrentDoc | null> {
  const { data, error } = await db
    .from('portal_document_versions')
    .select('html, version_no')
    .eq('client_id', clientId)
    .eq('doc_key', docKey)
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  const ready = !missingTable(error);
  if (error && ready) reportError('[portal] document version read failed', error.message);
  if (data?.html) return { html: data.html, versionNo: data.version_no, source: 'db', ready };

  if (docKey !== CLARITY) return null;
  const { slug } = await clientDocumentInfo(db, clientId);
  if (!slug) return null;
  const html = await readClarityFile(slug);
  return html ? { html, versionNo: null, source: 'file', ready } : null;
}

export async function listVersions(
  db: SupabaseClient,
  clientId: string,
  docKey = CLARITY,
): Promise<{ ready: boolean; versions: DocVersionMeta[] }> {
  const { data, error } = await db
    .from('portal_document_versions')
    .select('version_no, author_kind, author_name, note, created_at')
    .eq('client_id', clientId)
    .eq('doc_key', docKey)
    .order('version_no', { ascending: false })
    .limit(100);
  if (error) {
    if (!missingTable(error)) reportError('[portal] document versions list failed', error.message);
    return { ready: !missingTable(error), versions: [] };
  }
  return { ready: true, versions: (data ?? []) as DocVersionMeta[] };
}

export type SaveResult =
  | { ok: true; versionNo: number }
  | { ok: false; reason: 'not_ready' | 'too_large' | 'error'; message: string };

async function insertVersion(
  db: SupabaseClient,
  row: { client_id: string; doc_key: string; html: string; version_no: number; author_kind: AuthorKind; author_name: string; note: string | null },
) {
  return db.from('portal_document_versions').insert(row).select('version_no').single();
}

/**
 * Append a version. When none exist yet, the delivered file goes in first as
 * version 1 so the original can be restored. Retries once on a version-number
 * race (unique client_id, doc_key, version_no).
 */
export async function saveVersion(
  db: SupabaseClient,
  clientId: string,
  html: string,
  author: { kind: AuthorKind; name: string },
  note: string | null,
  docKey = CLARITY,
): Promise<SaveResult> {
  if (Buffer.byteLength(html, 'utf8') > MAX_DOC_BYTES) {
    return { ok: false, reason: 'too_large', message: 'That document is too large to save.' };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: top, error: topErr } = await db
      .from('portal_document_versions')
      .select('version_no')
      .eq('client_id', clientId)
      .eq('doc_key', docKey)
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (missingTable(topErr)) {
      return { ok: false, reason: 'not_ready', message: 'Document history is not switched on yet.' };
    }
    if (topErr) {
      reportError('[portal] document version read failed', topErr.message);
      return { ok: false, reason: 'error', message: 'Could not save that.' };
    }

    let next = (top?.version_no ?? 0) + 1;
    if (!top && docKey === CLARITY) {
      const { slug } = await clientDocumentInfo(db, clientId);
      const original = slug ? await readClarityFile(slug) : null;
      if (original) {
        const { error } = await insertVersion(db, {
          client_id: clientId,
          doc_key: docKey,
          html: original,
          version_no: 1,
          author_kind: 'staff',
          author_name: 'PodLab',
          note: 'As delivered',
        });
        if (error && error.code !== '23505') {
          reportError('[portal] baseline version failed', error.message);
          return { ok: false, reason: 'error', message: 'Could not save that.' };
        }
        if (error) continue; // someone else wrote v1 a moment ago; re-read
        next = 2;
      }
    }

    const { data, error } = await insertVersion(db, {
      client_id: clientId,
      doc_key: docKey,
      html,
      version_no: next,
      author_kind: author.kind,
      author_name: author.name.slice(0, 120),
      note: note ? note.slice(0, 500) : null,
    });
    if (!error && data) return { ok: true, versionNo: data.version_no };
    if (error?.code === '23505') continue;
    reportError('[portal] document version insert failed', error?.message);
    return { ok: false, reason: 'error', message: 'Could not save that.' };
  }
  return { ok: false, reason: 'error', message: 'Someone else saved a change at the same moment. Try again.' };
}

/** Restore = copy an old version forward as the newest one. */
export async function restoreVersion(
  db: SupabaseClient,
  clientId: string,
  versionNo: number,
  author: { kind: AuthorKind; name: string },
  docKey = CLARITY,
): Promise<SaveResult & { restoredFrom?: number }> {
  const { data, error } = await db
    .from('portal_document_versions')
    .select('html, version_no')
    .eq('client_id', clientId)
    .eq('doc_key', docKey)
    .eq('version_no', versionNo)
    .maybeSingle();
  if (missingTable(error)) return { ok: false, reason: 'not_ready', message: 'Document history is not switched on yet.' };
  if (error || !data) return { ok: false, reason: 'error', message: `There is no version ${versionNo}.` };

  const current = await currentDocument(db, clientId, docKey);
  if (current?.versionNo === versionNo) {
    return { ok: false, reason: 'error', message: `Version ${versionNo} is already the current one.` };
  }
  const res = await saveVersion(db, clientId, data.html, author, `Restored version ${versionNo}`, docKey);
  return { ...res, restoredFrom: versionNo };
}

/** Slack + CRM timeline for any document change. Best effort, like every portal ping. */
export async function announceDocChange(
  db: SupabaseClient,
  caller: PortalCaller,
  headline: string,
  detail: string,
): Promise<void> {
  await Promise.all([
    notifySlack(`*Clarity Document ${headline}* — ${caller.businessName}\n${detail.slice(0, 1500)}`),
    logToCrm(db, caller, `Clarity Document ${headline}: ${detail.replace(/\n/g, ' | ').slice(0, 1500)}`),
  ]);
}
