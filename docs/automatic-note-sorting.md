# Automatic note sorting

## Behavior

- Brain groups notes and imported files by class without manual routing rules.
- Class headers on imported Teams posts and manifest paths on imported files provide source-based groups. An exact class heading on an owner capture also works without AI. Unknown and ambiguous material remains accessible under Your notes or Other files and conversations.
- Duplicate originals collapse only inside their group. Each source record and original attachment remains accessible. Search includes note titles, extracted content, subjects and topics.
- The API checks saved notes at startup, every 30 seconds and while listing notes. It processes at most 100 records per pass. Each non-empty, unlocked current revision missing a processing job is queued once. Existing failed/cancelled jobs are not silently retried. Empty and trashed notes are not queued; locked classifications are not changed.
- Original text, note revisions, filenames and original blobs are not rewritten by sorting. Organization metadata has its own revision. Stale organization is hidden after a content edit until the next pass.
- The local worker requests a constrained classification, suggested title, known subject and evidence-backed topic. Unknown subjects, unsupported evidence, invented topics and confidence below 0.85 are rejected. Source-based placement takes precedence over AI placement. AI changes remain recorded in classification history and use the existing guarded undo flow.

## Runtime boundary

Sorting never starts a model, enables a scheduled task or changes the crash-safety hold. Queuing jobs is not evidence of successful inference. Generation-dependent classification/topic inference must be tested separately once running the worker is approved and safe.

## UI decisions

The class list is the browsing structure, not a settings dashboard. Native expandable groups keep the initial page short and keyboard accessible. One search field opens matching groups. Existing paper, ink, type and navigation tokens keep Brain consistent with the rest of Sorta. Counts describe real loaded items, not activity metrics. Original-location details preserve provenance without repeating every attachment in the main list. Narrow screens use one content column, intermediate widths two, and wide screens three.

## Verification

Focused unit/render tests cover source/header boundaries, Norwegian names, academic periods in paths, ambiguous headings, evidence gating, constrained provider requests, stale groups, duplicate originals, searchable contents, loading/error/empty states and AI attribution.

`node apps/api/dist/test-note-sorting-db.js` exercises twelve assertions against PostgreSQL in a freshly created schema inside a rolled-back transaction. It checks backfill, repeat-run idempotency, edits, cross-vault isolation, locks, empty/trash exclusions and terminal-job preservation. It does not write production records or start a worker.

Deployment and live-browser results are recorded after verification; a successful unit test alone does not establish live AI functionality.
