import { describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import { teamsAssignmentSnapshotSchema } from "./teams-assignment-snapshot.js";
import { applyTeamsAssignmentSnapshot } from "./teams-assignment-snapshot-store.js";

function snapshot(metadataText: string, sourceTimestamp = "2026-10-16T12:00:00.000Z") {
  return teamsAssignmentSnapshotSchema.parse({
    version: "omega_teams_assignments_json_v1", source_timestamp: sourceTimestamp,
    source_origin: "https://assignments.edu.cloud.microsoft",
    coverage: { listRoute: "/classes/all/list", visibleCardCount: 1, capturedDetailCount: 1, complete: false, limitation: "Test capture" },
    records: [{ classExternalId: "10000000-0000-4000-8000-000000000001", assignmentExternalId: "20000000-0000-4000-8000-000000000001", title: "Chapter assignment", courseTitle: "Matematikk 2P", metadataText, dueSummary: "", instructions: "Source instructions", pointsText: "", cardText: "Chapter assignment", linkedFileNames: [], detailUrl: "https://assignments.edu.cloud.microsoft/classes/10000000-0000-4000-8000-000000000001/assignments/20000000-0000-4000-8000-000000000001", listSection: "upcoming", detailState: "available" }]
  });
}

function store() {
  let link: Record<string, unknown> | null = null;
  let assignment: Record<string, unknown> | null = null;
  let inserts = 0;
  const client = { query: async (sql: string, values: unknown[] = []) => {
    if (sql.includes("pg_advisory_xact_lock")) return { rows: [] };
    if (sql.startsWith("SELECT course_id FROM school_snapshot_links")) return { rows: [{ course_id: "course" }] };
    if (sql.startsWith("SELECT id FROM school_courses")) return { rows: [{ id: "course" }] };
    if (sql.startsWith("SELECT assignment_id,content_hash,source_timestamp")) return { rows: link ? [link] : [] };
    if (sql.startsWith("SELECT id,origin FROM school_assignments")) return { rows: assignment ? [assignment] : [] };
    if (sql.startsWith("INSERT INTO sources")) return { rows: [{ id: "source" }] };
    if (sql.startsWith("INSERT INTO school_assignments")) {
      inserts++;
      assignment = { id: "assignment", origin: "provider", due: JSON.parse(String(values[3])), preparation_status: "in_progress", task_ids: ["task"] };
      return { rows: [{ id: "assignment" }] };
    }
    if (sql.startsWith("INSERT INTO school_snapshot_links")) {
      link = { assignment_id: values[3], content_hash: values[4], source_timestamp: values[6] };
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE school_assignments")) {
      assignment = { ...assignment, due: JSON.parse(String(values[4])) };
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE school_snapshot_links SET content_hash")) {
      link = { ...link, content_hash: values[3], source_timestamp: values[5] };
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE school_snapshot_links SET last_seen_at")) {
      link = { ...link, source_timestamp: values[3] };
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  } } as unknown as PoolClient;
  return { client, assignment: () => assignment, inserts: () => inserts };
}

describe("Teams assignment deadline updates", () => {
  it("moves a changed deadline without duplicate assignments or resetting preparation", async () => {
    const db = store();
    await applyTeamsAssignmentSnapshot(db.client, "vault", snapshot("Due October 20, 2026 11:59 PM"));
    const changed = snapshot("Due October 21, 2026 10:00 AM", "2026-10-17T12:00:00.000Z");
    expect((await applyTeamsAssignmentSnapshot(db.client, "vault", changed)).assignments.updated).toBe(1);
    expect(db.assignment()).toMatchObject({ due: { dueAt: "2026-10-21T08:00:00.000Z", timezone: "Europe/Oslo" }, preparation_status: "in_progress", task_ids: ["task"] });
    expect((await applyTeamsAssignmentSnapshot(db.client, "vault", changed)).assignments.unchanged).toBe(1);
    expect((await applyTeamsAssignmentSnapshot(db.client, "vault", snapshot("Due October 20, 2026 11:59 PM"))).assignments.stale).toBe(1);
    expect(db.inserts()).toBe(1);
  });

  it("recalculates unchanged relative text on a new captured day", async () => {
    const db = store();
    await applyTeamsAssignmentSnapshot(db.client, "vault", snapshot("Due tomorrow at 11:59 PM"));
    expect(db.assignment()).toMatchObject({ due: { dueAt: "2026-10-17T21:59:00.000Z" } });
    const later = snapshot("Due tomorrow at 11:59 PM", "2026-10-17T12:00:00.000Z");
    expect((await applyTeamsAssignmentSnapshot(db.client, "vault", later)).assignments.updated).toBe(1);
    expect(db.assignment()).toMatchObject({ due: { dueAt: "2026-10-18T21:59:00.000Z" } });
    expect(db.inserts()).toBe(1);
  });
});
