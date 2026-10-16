import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import type { TeamsAssignmentSnapshot } from "./teams-assignment-snapshot.js";
import { matchTeamsCourse, teamsAssignmentDue, teamsCourseBaseName } from "./teams-assignment-normalize.js";

const origin = "https://assignments.edu.cloud.microsoft";
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export type TeamsAssignmentApplyCounts = {
  courses: { linked: number; created: number; unchanged: number };
  assignments: { created: number; updated: number; unchanged: number; stale: number; skipped: number };
};

export async function applyTeamsAssignmentSnapshot(client: PoolClient, vaultId: string, snapshot: TeamsAssignmentSnapshot): Promise<TeamsAssignmentApplyCounts> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))", [vaultId, origin]);
  const counts: TeamsAssignmentApplyCounts = { courses: { linked: 0, created: 0, unchanged: 0 }, assignments: { created: 0, updated: 0, unchanged: 0, stale: 0, skipped: 0 } };
  const courseIds = new Map<string, string>();
  for (const record of snapshot.records) {
    let courseId = courseIds.get(record.classExternalId);
    if (!courseId) {
      const prior = (await client.query("SELECT course_id FROM school_snapshot_links WHERE vault_id=$1 AND source_origin=$2 AND record_kind='course' AND external_id=$3 FOR UPDATE", [vaultId, origin, record.classExternalId])).rows[0];
      if (prior) {
        const linked = (await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, prior.course_id])).rows[0];
        if (!linked) throw new Error("teams_assignment_linked_course_unavailable");
        courseId = linked.id;
        counts.courses.unchanged++;
      } else {
        const candidates = (await client.query("SELECT id,name FROM school_courses WHERE vault_id=$1 AND archived_at IS NULL", [vaultId])).rows as Array<{ id: string; name: string }>;
        courseId = matchTeamsCourse(record.courseTitle, candidates) ?? undefined;
        if (courseId) counts.courses.linked++;
        else {
          const name = teamsCourseBaseName(record.courseTitle);
          if (!name || name.length > 500) throw new Error("teams_assignment_course_title_invalid");
          let subjectId = (await client.query("SELECT id FROM school_subjects WHERE vault_id=$1 AND lower(name)=lower($2) AND archived_at IS NULL", [vaultId, name])).rows[0]?.id as string | undefined;
          if (!subjectId) subjectId = (await client.query("INSERT INTO school_subjects(vault_id,name,origin) VALUES ($1,$2,'provider') RETURNING id", [vaultId, name])).rows[0].id as string;
          courseId = (await client.query("INSERT INTO school_courses(vault_id,subject_id,name,origin) VALUES ($1,$2,$3,'provider') RETURNING id", [vaultId, subjectId, name])).rows[0].id as string;
          counts.courses.created++;
        }
        await client.query(`INSERT INTO school_snapshot_links(vault_id,source_origin,record_kind,external_id,course_id,content_hash,source_record,source_timestamp)
          VALUES ($1,$2,'course',$3,$4,$5,$6::jsonb,$7)`, [vaultId, origin, record.classExternalId, courseId, hash(record.courseTitle), JSON.stringify({ classExternalId: record.classExternalId, courseTitle: record.courseTitle }), snapshot.source_timestamp]);
      }
      if (!courseId) throw new Error("teams_assignment_course_unavailable");
      courseIds.set(record.classExternalId, courseId);
    }

    const externalId = `${record.classExternalId}:${record.assignmentExternalId}`;
    const normalizedDue = teamsAssignmentDue(record.metadataText, snapshot.source_timestamp);
    const contentHash = hash({ record, due: normalizedDue });
    const link = (await client.query("SELECT assignment_id,content_hash,source_timestamp FROM school_snapshot_links WHERE vault_id=$1 AND source_origin=$2 AND record_kind='assignment' AND external_id=$3 FOR UPDATE", [vaultId, origin, externalId])).rows[0];
    if (link && new Date(link.source_timestamp).getTime() > Date.parse(snapshot.source_timestamp)) { counts.assignments.stale++; continue; }
    if (link?.content_hash === contentHash) {
      await client.query("UPDATE school_snapshot_links SET last_seen_at=now(),source_timestamp=$4 WHERE vault_id=$1 AND source_origin=$2 AND record_kind='assignment' AND external_id=$3", [vaultId, origin, externalId, snapshot.source_timestamp]);
      counts.assignments.unchanged++;
      continue;
    }
    if (link) {
      const current = (await client.query("SELECT id,origin FROM school_assignments WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE", [vaultId, link.assignment_id])).rows[0];
      if (!current || current.origin !== "provider") { counts.assignments.skipped++; continue; }
    }
    const sourceText = [
      `Teams assignment: ${record.title}`,
      `Teams list: ${record.listSection ?? "unknown"}`,
      `Detail access: ${record.detailState ?? "available"}`,
      `Course: ${record.courseTitle}`,
      `Due as shown by Teams: ${record.metadataText}`,
      `Points: ${record.pointsText}`,
      `Instructions: ${record.instructions}`,
      record.detailState === "not_assigned" ? `Visible list card: ${record.cardText}` : "",
      record.linkedFileNames.length ? `Linked files: ${record.linkedFileNames.join(", ")}` : "Linked files: none visible",
      `Original: ${record.detailUrl}`,
    ].join("\n");
    const sourceId = (await client.query("INSERT INTO sources(vault_id,kind,original_text,content_hash) VALUES ($1,'provider',$2,$3) RETURNING id", [vaultId, sourceText, createHash("sha256").update(sourceText).digest("hex")])).rows[0].id as string;
    const due = JSON.stringify(normalizedDue);
    if (link) {
      await client.query(`UPDATE school_assignments SET course_id=$3,title=$4,due=$5::jsonb,instructions_source_ids=ARRAY[$6]::uuid[],provider_list_section=$7,provider_detail_state=$8,revision=revision+1,updated_at=now()
        WHERE vault_id=$1 AND id=$2 AND origin='provider' AND archived_at IS NULL`, [vaultId, link.assignment_id, courseId, record.title, due, sourceId, record.listSection ?? null, record.detailState ?? "available"]);
      await client.query("UPDATE school_snapshot_links SET content_hash=$4,source_record=$5::jsonb,source_timestamp=$6,last_seen_at=now() WHERE vault_id=$1 AND source_origin=$2 AND record_kind='assignment' AND external_id=$3", [vaultId, origin, externalId, contentHash, JSON.stringify(record), snapshot.source_timestamp]);
      counts.assignments.updated++;
    } else {
      const created = (await client.query(`INSERT INTO school_assignments(vault_id,course_id,title,due,instructions_source_ids,origin,provider_list_section,provider_detail_state)
        VALUES ($1,$2,$3,$4::jsonb,ARRAY[$5]::uuid[],'provider',$6,$7) RETURNING id`, [vaultId, courseId, record.title, due, sourceId, record.listSection ?? null, record.detailState ?? "available"])).rows[0];
      await client.query(`INSERT INTO school_snapshot_links(vault_id,source_origin,record_kind,external_id,assignment_id,content_hash,source_record,source_timestamp)
        VALUES ($1,$2,'assignment',$3,$4,$5,$6::jsonb,$7)`, [vaultId, origin, externalId, created.id, contentHash, JSON.stringify(record), snapshot.source_timestamp]);
      counts.assignments.created++;
    }
  }
  return counts;
}
