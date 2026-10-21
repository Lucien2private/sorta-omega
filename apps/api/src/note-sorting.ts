import { createHash, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { transaction } from "./db.js";

export type AutomaticOrganization = {
  subject: string | null;
  topic: string | null;
  origin: "source" | "ai" | "unassigned";
  evidenceQuote: string | null;
  sourceRevision: number;
  contextHash?: string;
};

export function subjectName(value: string): string {
  const label = value.replaceAll("├ÿ", "Ø").replaceAll("├╕", "ø");
  return label.replace(/\s+-\s+VGMAI\s*$/i, "").replace(/\s+(?:20)?\d{2}(?:[/_–-]|\s+)(?:20)?\d{2}\b.*$/u, "").replace(/\s+20\d{2}$/, "").trim().slice(0, 240);
}

function normalized(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("nb-NO").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function sourceOrganization(note: { body: string; sourceKind: string | null; relativePath: string | null; revision: number }, subjects: string[]): AutomaticOrganization {
  const header = note.body.split(/\r?\n\r?\n/, 1)[0];
  let subject: string | null = null;
  let evidenceQuote: string | null = null;
  if (note.sourceKind === "provider" && header.startsWith("Source: Teams class channel post\n")) {
    const classLine = header.split("\n").find(line => line.startsWith("Class: "));
    if (classLine) { subject = subjectName(classLine.slice(7)); evidenceQuote = classLine; }
  } else if (note.relativePath?.startsWith("Teams/")) {
    // The import manifest supplies the path, not text inside the uploaded file.
    const classPath = note.relativePath.match(/^Teams\/(.+?)\/(?:Shared|Posts|Assignments|Files|Filer|Class Materials|Kursmateriell|General|Generelt)(?:\/|$)/i)?.[1] ?? note.relativePath.split("/")[1] ?? "";
    subject = subjectName(classPath);
    evidenceQuote = note.body.split("\n", 1)[0];
  } else if (note.sourceKind === "capture" || note.sourceKind === null) {
    const heading = note.body.trim().split(/\r?\n/, 1)[0].trim();
    const matches = subjects.filter(name => normalized(name) === normalized(heading));
    if (matches.length === 1) { subject = matches[0]; evidenceQuote = heading; }
  }
  return { subject: subject || null, topic: null, origin: subject ? "source" : "unassigned", evidenceQuote: evidenceQuote?.slice(0, 1000) ?? null, sourceRevision: note.revision };
}

export function acceptedAiOrganization(
  proposal: { subject: string | null; topic: string | null; evidenceQuote: string; confidence: number } | null | undefined,
  body: string, subjects: string[], revision: number
): AutomaticOrganization | null {
  if (!proposal || proposal.confidence < 0.85 || !proposal.evidenceQuote.trim() || !body.includes(proposal.evidenceQuote)) return null;
  if (proposal.subject !== null && !subjects.includes(proposal.subject)) return null;
  if (proposal.topic !== null && !proposal.evidenceQuote.toLocaleLowerCase("nb-NO").includes(proposal.topic.toLocaleLowerCase("nb-NO"))) return null;
  if (!proposal.subject && !proposal.topic) return null;
  return { subject: proposal.subject, topic: proposal.topic, origin: "ai", evidenceQuote: proposal.evidenceQuote, sourceRevision: revision };
}

export function noteProcessingInput(note: { id: string; source_id: string; revision: number }, subjects: string[]) {
  return { type: "note_processing", noteId: note.id, sourceId: note.source_id, revision: note.revision, stages: ["classify"], subjects };
}

export async function sortingSubjects(client: Pick<PoolClient, "query">, vaultId: string): Promise<string[]> {
  const courses = await client.query<{ name: string }>("SELECT name FROM school_courses WHERE vault_id=$1 AND archived_at IS NULL ORDER BY name LIMIT 200", [vaultId]);
  return [...new Set(courses.rows.map(course => subjectName(course.name)).filter(Boolean))].sort().slice(0, 100);
}

export async function reconcileNoteSorting(vaultId: string, batchSize = 100) {
  return transaction(client => reconcileNoteSortingInTransaction(client, vaultId, batchSize));
}

export async function reconcileNoteSortingInTransaction(client: PoolClient, vaultId: string, batchSize = 100) {
    // Serialize backfills with note edits and existing capture/job creation transactions.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`note-sorting:${vaultId}`]);
    const subjects = await sortingSubjects(client, vaultId);
    const contextHash = createHash("sha256").update(JSON.stringify({ version: 2, subjects })).digest("hex");
    const result = await client.query(
      `SELECT n.*, s.kind AS source_kind, p.relative_path FROM notes n
       LEFT JOIN sources s ON s.id=n.source_id AND s.vault_id=n.vault_id
       LEFT JOIN personal_file_imports p ON p.note_id=n.id AND p.vault_id=n.vault_id
       WHERE n.vault_id=$1 AND n.trashed_at IS NULL AND NOT n.classification_locked
       AND (n.automatic_organization IS NULL OR n.automatic_organization->>'sourceRevision' IS DISTINCT FROM n.revision::text
         OR n.automatic_organization->>'contextHash' IS DISTINCT FROM $2)
       ORDER BY n.created_at,n.id LIMIT $3 FOR UPDATE OF n SKIP LOCKED`, [vaultId, contextHash, batchSize]
    );
    let queued = 0;
    let grouped = 0;
    for (const note of result.rows) {
      let organization = sourceOrganization({ body: note.body, sourceKind: note.source_kind ?? null, relativePath: note.relative_path ?? null, revision: note.revision }, subjects);
      if (organization.origin === "unassigned" && note.automatic_organization?.origin === "ai" && note.automatic_organization.sourceRevision === note.revision) organization = note.automatic_organization;
      await client.query("UPDATE notes SET automatic_organization=$2::jsonb,organization_revision=organization_revision+1 WHERE id=$1", [note.id, JSON.stringify({ ...organization, contextHash })]);
      if (organization.subject) grouped++;
      if (!note.body.trim() || note.classified_revision === note.revision) continue;
      const existing = await client.query("SELECT 1 FROM jobs WHERE vault_id=$1 AND kind='note_process' AND input->>'noteId'=$2 AND input->>'revision'=$3 LIMIT 1", [vaultId, note.id, String(note.revision)]);
      if (existing.rowCount) continue;
      if (!note.source_id) {
        const source = await client.query<{ id: string }>("INSERT INTO sources(vault_id,kind,original_text,content_hash) VALUES ($1,'capture',$2,$3) RETURNING id", [vaultId, note.body, createHash("sha256").update(note.body).digest("hex")]);
        note.source_id = source.rows[0].id;
        await client.query("UPDATE notes SET source_id=$2 WHERE id=$1", [note.id, note.source_id]);
      }
      const input = JSON.stringify(noteProcessingInput(note, subjects));
      const jobId = randomUUID();
      await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,input,input_hash) VALUES ($1,$2,'note_process','waiting_for_worker','awaiting_local_worker',$3::jsonb,$4)", [jobId, vaultId, input, createHash("sha256").update(input).digest("hex")]);
      await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted','{\"status\":\"waiting_for_worker\"}'::jsonb)", [jobId]);
      queued++;
    }
    return { examined: result.rows.length, grouped, queued };
}
