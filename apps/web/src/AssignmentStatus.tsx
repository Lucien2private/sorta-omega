import type { CalendarView } from "@sorta/contracts";

export type AssignmentSubmission = CalendarView["overlayItems"][number]["submission"];

export function assignmentStatusClass(submission: AssignmentSubmission) {
  return submission ? `assignment-${submission.status}` : "";
}

export function AssignmentStatus({ submission }: { submission: AssignmentSubmission }) {
  if (!submission) return null;
  const labels = { submitted: "Submitted", submitted_late: "Submitted late", missing: "Missing / not submitted", pending: "Not submitted yet", unknown: "Submission unconfirmed" };
  const checked = submission.observedAt ? new Intl.DateTimeFormat("nb-NO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date(submission.observedAt)) : null;
  return <>
    {submission.status === "submitted_late" && <span className="assignment-late-corner" aria-hidden="true"/>}
    <small className="assignment-submission-label" title={checked ? `Last recorded by Teams: ${checked}` : "No Teams submission evidence"}>{labels[submission.status]}{checked && <span className="assignment-observed"> · Teams {checked}</span>}</small>
  </>;
}
