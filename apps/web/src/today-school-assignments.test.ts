import { describe, expect, it } from "vitest";
import type { SchoolAssignment } from "@sorta/contracts";
import { openSchoolAssignmentsForToday } from "./today-school-assignments";

function assignment(id: string, overrides: Partial<SchoolAssignment> = {}): SchoolAssignment {
  return {
    id, vaultId: id, courseId: id, title: id, instructionsSourceIds: [], due: { kind: "unknown" },
    materialSourceIds: [], taskIds: [], preparationStatus: "not_started", origin: "provider",
    providerListSection: "upcoming", archivedAt: null, revision: 1,
    createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Today school assignments", () => {
  it("keeps missing work visible even when Teams files it under Completed", () => {
    const missing = assignment("missing", { providerListSection: "completed", submission: { status: "missing", observedAt: null } });
    const submitted = assignment("submitted", { providerListSection: "past_due", submission: { status: "submitted_late", observedAt: null } });
    expect(openSchoolAssignmentsForToday([missing, submitted], "2026-10-16").map(item => item.id)).toEqual(["missing"]);
  });
  it("shows open imports, puts today's deadline first, and leaves unknown due dates visible", () => {
    const unknown = assignment("unknown");
    const later = assignment("later", { due: { kind: "date_only", date: "2026-10-10", timezone: "Europe/Oslo" } });
    const sooner = assignment("sooner", { due: { kind: "exact", dueAt: "2026-10-06T10:00:00.000Z", timezone: "Europe/Oslo" } });
    const past = assignment("past", { providerListSection: "past_due", due: { kind: "date_only", date: "2026-10-01", timezone: "Europe/Oslo" } });
    const today = assignment("today", { due: { kind: "date_only", date: "2026-10-05", timezone: "Europe/Oslo" } });
    const completed = assignment("completed", { providerListSection: "completed" });
    const archived = assignment("archived", { archivedAt: "2026-10-01T00:00:00.000Z" });
    expect(openSchoolAssignmentsForToday([unknown, later, completed, sooner, archived, past, today], "2026-10-05").map(item => item.id)).toEqual(["today", "past", "sooner", "later", "unknown"]);
  });
});
