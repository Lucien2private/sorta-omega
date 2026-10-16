import type { SchoolAssignment } from "@sorta/contracts";

function dueDate(assignment: SchoolAssignment): string | null {
  if (assignment.due.kind === "date_only") return assignment.due.date;
  if (assignment.due.kind === "unknown") return null;
  try {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: assignment.due.timezone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(assignment.due.dueAt));
  } catch {
    return assignment.due.dueAt.slice(0, 10);
  }
}

export function assignmentNeedsAttention(assignment: SchoolAssignment): boolean {
  if (assignment.submission?.status === "submitted" || assignment.submission?.status === "submitted_late") return false;
  if (assignment.submission?.status === "missing") return true;
  return assignment.providerListSection !== "completed";
}

export function openSchoolAssignmentsForToday(assignments: SchoolAssignment[], today: string): SchoolAssignment[] {
  return assignments
    .filter(assignment => !assignment.archivedAt && assignmentNeedsAttention(assignment))
    .sort((left, right) => {
      const leftDate = dueDate(left);
      const rightDate = dueDate(right);
      const rank = (date: string | null) => date === today ? 0 : date && date < today ? 1 : date ? 2 : 3;
      const rankDifference = rank(leftDate) - rank(rightDate);
      if (rankDifference) return rankDifference;
      if (leftDate && rightDate) {
        const dateDifference = rank(leftDate) === 1 ? rightDate.localeCompare(leftDate) : leftDate.localeCompare(rightDate);
        if (dateDifference) return dateDifference;
      }
      const leftPastDue = left.providerListSection === "past_due" ? 0 : 1;
      const rightPastDue = right.providerListSection === "past_due" ? 0 : 1;
      return leftPastDue - rightPastDue || left.title.localeCompare(right.title);
    });
}
