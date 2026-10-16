import { describe, expect, it } from "vitest";
import { assignmentSubmission } from "./assignment-submission.js";

describe("assignment submission evidence", () => {
  const now = Date.parse("2026-10-16T12:00:00Z");
  const due = { kind: "exact", dueAt: "2026-10-15T21:59:00Z" };
  const record = (status: string) => ({ courseTitle: "Maths", cardText: `TitleMaths${status}`, listSection: "completed" });
  const state = (status: string) => assignmentSubmission(record(status), null, due, now).status;
  it("does not equate Completed or prepared with submitted", () => {
    expect(state("Not turned inNot turned in")).toBe("missing");
    expect(state("InactiveInactive")).toBe("unknown");
    expect(state("")).toBe("unknown");
  });
  it("distinguishes submitted and late submissions", () => {
    expect(state("Turned inTurned in")).toBe("submitted");
    expect(state("Turned inFeedbackTurned inFeedback")).toBe("submitted");
    expect(state("Turned in lateTurned in late")).toBe("submitted_late");
  });
  it("keeps future unsubmitted work neutral and retains the observation time", () => {
    expect(assignmentSubmission(record("Not turned in"), "2026-10-16T12:00:00Z", { kind: "exact", dueAt: "2026-10-20T21:59:00Z" }, now)).toEqual({ status: "pending", observedAt: "2026-10-16T12:00:00Z" });
  });
  it("ignores status words in titles and does not invent late from a clock time", () => {
    expect(assignmentSubmission({ ...record(""), cardText: "Turned in lateMaths" }, null, due, now).status).toBe("unknown");
    expect(assignmentSubmission({ ...record(""), detailState: "not_assigned" }, null, due, now).status).toBe("unknown");
  });
});
