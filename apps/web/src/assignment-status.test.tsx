import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AssignmentStatus, assignmentStatusClass } from "./AssignmentStatus";

describe("assignment status display", () => {
  it("pairs colour classes with explicit status labels", () => {
    for (const [status, label] of [["submitted", "Submitted"], ["missing", "Missing / not submitted"], ["pending", "Not submitted yet"], ["unknown", "Submission unconfirmed"]] as const) {
      const submission = { status, observedAt: null };
      expect(assignmentStatusClass(submission)).toBe(`assignment-${status}`);
      expect(renderToStaticMarkup(<AssignmentStatus submission={submission}/>)).toContain(label);
    }
  });
  it("marks late submissions and shows when Teams was checked", () => {
    const html = renderToStaticMarkup(<AssignmentStatus submission={{ status: "submitted_late", observedAt: "2026-10-16T12:00:00Z" }}/>);
    expect(html).toContain("assignment-late-corner");
    expect(html).toContain("Submitted late");
    expect(html).toContain("16.10.2026");
    expect(html).toContain("14:00");
  });
  it("adds nothing to lessons or personal events", () => {
    expect(assignmentStatusClass(null)).toBe("");
    expect(renderToStaticMarkup(<AssignmentStatus submission={null}/>)).toBe("");
  });
});
