type Submission = { status: "submitted" | "submitted_late" | "missing" | "pending" | "unknown"; observedAt: string | null };

export function assignmentSubmission(record: Record<string, unknown> | null | undefined, observedAt: string | null, due: { kind: string; dueAt?: string }, now = Date.now()): Submission {
  const result = (status: Submission["status"]): Submission => ({ status, observedAt });
  if (!record || record.detailState === "not_assigned") return result("unknown");
  const card = typeof record.cardText === "string" ? record.cardText : "";
  const course = typeof record.courseTitle === "string" ? record.courseTitle : "";
  // Only read Teams' status area, not teacher instructions or the title.
  const index = course ? card.lastIndexOf(course) : -1;
  const status = index < 0 ? "" : card.slice(index + course.length).replace(/\s+/g, " ").trim();
  const unsubmitted = /not (?:turned|handed) in|missing|ikke levert/i.test(status);
  if (!unsubmitted && /(?:turned|handed) in late|submitted late|levert (?:for sent|sent)/i.test(status)) return result("submitted_late");
  if (!unsubmitted && /turned in|handed in|submitted|levert/i.test(status)) return result("submitted");
  if (/inactive|inaktiv/i.test(status)) return result("unknown");
  const overdue = due.kind === "exact" && Number.isFinite(Date.parse(due.dueAt ?? "")) && Date.parse(due.dueAt!) < now;
  if (/missing/i.test(status) || record.listSection === "past_due" || unsubmitted && overdue) return result("missing");
  if (unsubmitted || record.listSection === "upcoming") return result("pending");
  return result("unknown");
}
