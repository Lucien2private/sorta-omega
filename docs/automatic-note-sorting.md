# Automatic note sorting

## Behavior

- Brain groups notes and imported files by class without manual routing rules.
- Class headers on imported Teams posts and manifest paths on imported files provide source-based groups. An exact class heading on an owner capture also works without AI. Unknown and ambiguous material remains accessible under Your notes or Other files and conversations.
- Duplicate originals collapse only inside their group. Each source record and original attachment remains accessible. Search includes note titles, extracted content, subjects and topics.
- While Brain is open, it checks a compact note-change marker every 30 seconds and on returning to the tab. The complete list is fetched only after a change or retry. Refreshes do not overlap, replace a search, or close an expanded group. Closing the view stops its watcher.
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

### Live verification — 21 October 2026

- Deployed code through `348adfb` to SILENT-4090. Node 22 production builds passed; readiness returned `ready` with the database available. Overlapping local camera work was preserved and compared before/after deployment. A verified database backup was retained outside the checkout.
- 53 focused tests passed: API 22, local-worker 12 (mocked provider), web 19. Twelve PostgreSQL assertions passed in a rolled-back transaction; no production test records or test schemas remained.
- The production vault contained 362 active notes, all with organization metadata; 269 had a recorded class. No eligible current revision lacked a processing job, and no current revision had duplicate processing jobs. Queued jobs are not completed inference.
- Tested the deployed site in Codex's browser: completed loading, all nine source/personal/other groups, maths expansion by keyboard, search across imported content, no-results recovery, opening an original workbook, and its download link. Duplicate PowerPoint source locations remained independently accessible. An expanded maths group survived a refresh interval without a load error; browser error logs were empty.
- Rendered checks passed at actual CSS widths 320, 768 and 1280 px (also checked 354 px during implementation). The compact header was corrected to fit 320 px with 44 px controls. No document horizontal overflow was observed. Screenshots: `C:/Users/viktor/.codex/artifacts/note-sorting-20261021/brain-sorted-desktop.png` and `brain-sorted-phone.png`.
- In-scope design checks passed: existing design tokens retained, native disclosure keyboard/focus behavior verified, loading/error/empty/search states covered, source-location provenance retained, and no scanner findings in the new component/CSS. Text contrast checks passed. This is not an audit of unrelated app screens.

### Remaining boundary

The LocalWorker, OllamaEmbedding and QwenGeneration scheduled tasks remained disabled throughout. Source-based automatic class grouping works without them. AI-generated types, titles and topics are implemented and unit-tested but **not live inference-tested**; that requires resolving the existing crash-safety hold first. No claim is made that all AI features are working.
