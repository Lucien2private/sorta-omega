import { z } from "zod";
export { httpOperations, type HttpOperation } from "./http-operations.js";
export { isDirectReminderRequest } from "./assistant-action.js";

export const idSchema = z.string().uuid();
export const vaultIdSchema = idSchema;
const localeSchema = z.string().trim().min(2).max(35).refine((value) => {
  try { new Intl.Locale(value); return true; } catch { return false; }
}, "Unsupported locale");
const timezoneSchema = z.string().trim().min(1).max(100).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}, "Unsupported timezone");
export const notificationChannelSchema = z.enum(["in_app", "windows_native"]);
export const sensitiveSchoolCategorySchema = z.enum(["attendance", "performance", "health", "accommodations", "discipline"]);
export const preferencesSchema = z.object({
  locale: localeSchema,
  timezone: timezoneSchema,
  notificationChannels: z.array(notificationChannelSchema).min(1).max(2).refine((items) => new Set(items).size === items.length, "Notification channels must be unique"),
  protectFocusTime: z.boolean(),
  defaultFocusMinutes: z.number().int().min(15).max(240),
  profileInferenceEnabled: z.boolean(),
  expandedDataEgressEnabled: z.boolean(),
  defaultPersonalDataSync: z.enum(["off", "manual", "scheduled"]),
  sensitiveSchoolCategories: z.array(sensitiveSchoolCategorySchema).max(5).refine((items) => new Set(items).size === items.length, "Sensitive school categories must be unique"),
  revision: z.number().int().positive(),
  updatedAt: z.string().datetime()
}).strict();
export const updatePreferencesSchema = z.object({
  expectedRevision: z.number().int().positive(),
  patch: z.object({
    locale: localeSchema.optional(),
    timezone: timezoneSchema.optional(),
    notificationChannels: z.array(notificationChannelSchema).min(1).max(2).refine((items) => new Set(items).size === items.length, "Notification channels must be unique").optional(),
    protectFocusTime: z.boolean().optional(),
    defaultFocusMinutes: z.number().int().min(15).max(240).optional(),
    profileInferenceEnabled: z.boolean().optional(),
    expandedDataEgressEnabled: z.boolean().optional(),
    defaultPersonalDataSync: z.enum(["off", "manual", "scheduled"]).optional(),
    sensitiveSchoolCategories: z.array(sensitiveSchoolCategorySchema).max(5).refine((items) => new Set(items).size === items.length, "Sensitive school categories must be unique").optional()
  }).strict().refine((patch) => Object.keys(patch).length > 0, "A preference update must change at least one field")
}).strict();
export const systemStatusSchema = z.object({
  storage: z.object({ database: z.literal("available"), databaseBytes: z.number().int().nonnegative(), vaultCount: z.number().int().nonnegative() }).strict(),
  sync: z.object({ activeDevices: z.number().int().nonnegative(), latestEventId: z.string().regex(/^\d+$/), retentionFloorEventId: z.string().regex(/^\d+$/) }).strict(),
  workers: z.object({ enrolled: z.number().int().nonnegative(), online: z.number().int().nonnegative(), lastSeenAt: z.string().datetime().nullable() }).strict(),
  backup: z.object({ status: z.enum(["not_configured","configured_unverified","verified","failed"]), lastVerifiedAt: z.string().datetime().nullable(), limitation: z.string() }).strict(),
  versions: z.object({ api: z.string(), schema: z.number().int().positive(), clientMinimum: z.string() }).strict(),
  checkedAt: z.string().datetime()
}).strict();
export const vaultSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(160),
  locale: localeSchema,
  timezone: timezoneSchema,
  storageMode: z.enum(["machine_local", "host_synced"]),
  remoteAuthorized: z.boolean(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
}).strict();
export const createVaultSchema = z.object({ name: z.string().trim().min(1).max(160), locale: localeSchema, timezone: timezoneSchema }).strict();
export const updateVaultSchema = z.object({
  expectedRevision: z.number().int().positive(),
  patch: z.object({ name: z.string().trim().min(1).max(160).optional(), locale: localeSchema.optional(), timezone: timezoneSchema.optional() }).strict().refine((patch) => Object.keys(patch).length > 0, "A vault update must change metadata")
}).strict();
export const purgeRequestSchema=z.object({confirmation:z.literal("permanently_purge"),expectedRevision:z.number().int().positive()}).strict();
export const uploadMediaTypeSchema = z.enum([
  "application/octet-stream", "application/pdf", "application/json", "application/zip", "application/x-tar",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/markdown", "text/csv", "text/calendar", "text/calendar; charset=utf-8",
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif",
  "audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "video/mp4", "video/webm"
]);
export const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
export const notePurgeResultSchema=z.object({type:z.literal("note_purge"),targetIdHash:sha256Schema,deletedDerivedRecords:z.number().int().nonnegative(),revokedJobs:z.number().int().nonnegative(),sourceDeleted:z.boolean(),blobFilesDeleted:z.number().int().nonnegative(),blobFileDeleteFailures:z.number().int().nonnegative(),minimalLedgerRetained:z.literal(true),writesApplied:z.literal(true)}).strict();
export const createUploadSchema = z.object({
  filename: z.string().trim().min(1).max(255).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Filename contains control characters"),
  mediaType: uploadMediaTypeSchema,
  byteLength: z.number().int().min(1).max(2_147_483_648),
  sha256: sha256Schema
}).strict();
export const uploadSessionSchema = z.object({ uploadId: idSchema, partSize: z.number().int().positive(), expiresAt: z.string().datetime() }).strict();
export const completeUploadSchema = z.object({ sha256: sha256Schema, partCount: z.number().int().min(1).max(512) }).strict();
export const blobSummarySchema = z.object({
  id: idSchema, vaultId: vaultIdSchema, filename: z.string(), mediaType: uploadMediaTypeSchema,
  byteLength: z.number().int().nonnegative().max(2_147_483_648), sha256: sha256Schema, createdAt: z.string().datetime()
}).strict();
export const syncRecordTypeSchema = z.enum(["note","task","reminder","notification","calendar","calendar_event","event_reminder_plan","calendar_entity","commitment","school_subject","school_course","school_assignment","school_lesson","school_assessment","attendance_record","performance_grade","performance_target","study_session","knowledge_gap","flashcard_deck","flashcard","scheduler_preferences","momentum_preferences","project","idea","goal","memory","integration_connection","insight","personal_data_item","interest","provider_calendar_action"]);

export const noteStatusSchema = z.enum(["saved", "processing", "ready", "failed"]);
export const noteSchema = z.object({
  id: idSchema,
  vaultId: vaultIdSchema,
  title: z.string().min(1).max(240),
  body: z.string(),
  status: noteStatusSchema,
  classification: z.enum(["note", "task", "event", "idea", "reference", "unknown"]).nullable(),
  classificationLocked: z.boolean(),
  suggestedTitle: z.string().nullable(),
  classifiedRevision: z.number().int().positive().nullable(),
  organizationRevision: z.number().int().positive(),
  sourceId: idSchema.nullable(),
  originalSha256: sha256Schema.nullable().optional(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export const exportDomainSchema=z.enum(["notes","tasks","calendar","school","study","profile"]);
export const createExportSchema=z.object({scope:z.union([z.literal("all"),z.object({domains:z.array(exportDomainSchema).min(1).max(6)}).strict()]),format:z.enum(["markdown_bundle","full_fidelity"]),includeHistory:z.boolean()}).strict();
export const exportManifestSchema=z.object({id:idSchema,vaultId:vaultIdSchema,kind:z.enum(["vault","calendar"]),status:z.enum(["generating","ready","failed","expired"]),format:z.enum(["markdown_bundle","full_fidelity","ics"]),privacy:z.enum(["authorized_full","minimal"]),byteLength:z.number().int().nonnegative().nullable(),sha256:sha256Schema.nullable(),expiresAt:z.string().datetime(),createdAt:z.string().datetime()}).strict();
export const planImportSchema=z.object({blobId:idSchema,format:z.enum(["markdown","plain_text","omega_notes_json_v1"]),options:z.object({defaultTitle:z.string().trim().min(1).max(240).nullable().default(null),stripFrontmatter:z.boolean().default(false)}).strict().default({})}).strict();
export const importManifestItemSchema=z.object({id:idSchema,sequence:z.number().int().positive(),sourcePath:z.string(),title:z.string(),byteLength:z.number().int().nonnegative(),contentSha256:sha256Schema,plannedAction:z.enum(["create","skip"]),applyStatus:z.enum(["pending","created","skipped","failed"]),appliedNoteId:idSchema.nullable(),warning:z.string().nullable()}).strict();
export const importManifestSchema=z.object({id:idSchema,vaultId:vaultIdSchema,blobId:idSchema,format:z.enum(["markdown","plain_text","omega_notes_json_v1"]),status:z.enum(["planned","applying","applied","failed"]),options:z.object({defaultTitle:z.string().nullable(),stripFrontmatter:z.boolean()}).strict(),warnings:z.array(z.string()),counts:z.object({total:z.number().int().nonnegative(),create:z.number().int().nonnegative(),skip:z.number().int().nonnegative(),created:z.number().int().nonnegative(),skipped:z.number().int().nonnegative(),failed:z.number().int().nonnegative()}).strict(),items:z.array(importManifestItemSchema),planRevision:z.number().int().positive(),appliedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const applyImportSchema=z.object({planRevision:z.number().int().positive(),collisionPolicy:z.enum(["create_new","skip_existing_title"]),confirmation:z.literal("apply_import_plan")}).strict();
export const importPlanResultSchema=z.object({type:z.literal("import_plan"),importId:idSchema,itemCount:z.number().int().nonnegative(),warningCount:z.number().int().nonnegative(),writesApplied:z.literal(false)}).strict();
export const importApplyResultSchema=z.object({type:z.literal("import_apply"),importId:idSchema,createdNoteIds:z.array(idSchema),skippedItemIds:z.array(idSchema),idRemapping:z.record(idSchema),writesApplied:z.literal(true)}).strict();

export const correctNoteClassificationSchema = z.object({ expectedRevision: z.number().int().positive(), classification: z.enum(["note", "task", "event", "idea", "reference", "unknown"]), reason: z.string().trim().max(1000).optional(), lock: z.boolean() });
export const correctionReceiptSchema = z.object({ id: idSchema, noteId: idSchema, sourceNoteRevision: z.number().int().positive(), previousClassification: z.string().nullable(), correctedClassification: z.string(), locked: z.boolean(), organizationRevision: z.number().int().positive(), createdAt: z.string().datetime() });
export const aiOperationSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, noteId: idSchema.nullable(), jobId: idSchema, kind: z.literal("classification"), sourceRevision: z.number().int().positive(), modelProfileId: z.string(), modelDigest: z.string().nullable(), promptVersion: z.string(), result: z.record(z.unknown()), inverse: z.record(z.unknown()), applied: z.boolean(), effectOrganizationRevision: z.number().int().positive().nullable(), undoneAt: z.string().datetime().nullable(), createdAt: z.string().datetime() });
export const undoAiOperationSchema = z.object({ expectedCurrentRevision: z.number().int().positive() });
export const undoReceiptSchema = z.object({ operationId: idSchema, noteId: idSchema, restoredClassification: z.string().nullable(), removedRuleLabels: z.number().int().nonnegative(), organizationRevision: z.number().int().positive(), undoneAt: z.string().datetime() });
export const activityEventSchema = z.object({
  id: z.string().min(1), vaultId: vaultIdSchema, noteId: idSchema.nullable(),
  kind: z.enum(["note_revision", "classification_correction", "ai_operation", "ai_undo", "relationship_created", "routing_rule_created"]),
  actor: z.enum(["owner", "system", "model"]), objectType: z.enum(["note", "relationship", "routing_rule", "ai_operation"]),
  objectId: idSchema, summary: z.string(), metadata: z.record(z.unknown()), createdAt: z.string().datetime()
});
export const labelKindSchema = z.enum(["area", "project", "topic", "entity"]);
export const labelSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, kind: labelKindSchema, name: z.string(), aliases: z.array(z.string()), parentId: idSchema.nullable(), status: z.enum(["provisional", "confirmed"]), pinned: z.boolean(), revision: z.number().int().positive(), supportedNoteCount: z.number().int().nonnegative(), createdAt: z.string().datetime() });
export const createLabelSchema = z.object({ kind: labelKindSchema, name: z.string().trim().min(1).max(160), aliases: z.array(z.string().trim().min(1).max(160)).max(20).default([]), parentId: idSchema.nullable().optional() });
export const updateLabelSchema = z.object({ expectedRevision: z.number().int().positive(), name: z.string().trim().min(1).max(160).optional(), aliases: z.array(z.string().trim().min(1).max(160)).max(20).optional(), parentId: idSchema.nullable().optional(), pinned: z.boolean().optional() });
export const setNoteLabelsSchema = z.object({ labelIds: z.array(idSchema).max(100), lockedLabelIds: z.array(idSchema).max(100), expectedRevision: z.number().int().positive() }).superRefine((value, context) => { const labels = new Set(value.labelIds); if (value.lockedLabelIds.some((id) => !labels.has(id))) context.addIssue({ code: "custom", message: "Locked labels must be assigned" }); });
export const noteOrganizationSchema = z.object({ noteId: idSchema, noteRevision: z.number().int().positive(), organizationRevision: z.number().int().positive(), labels: z.array(labelSchema.extend({ locked: z.boolean(), provenance: z.enum(["owner", "classification", "rule"]) })) });
export const noteFilterConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("classification"), value: z.enum(["note", "task", "event", "idea", "reference", "unknown"]).nullable() }),
  z.object({ type: z.literal("label"), labelId: idSchema }),
  z.object({ type: z.literal("text_contains"), value: z.string().trim().min(1).max(200) }),
  z.object({ type: z.literal("status"), value: noteStatusSchema })
]);
export const noteFilterSchema = z.object({ operator: z.enum(["and", "or"]), conditions: z.array(noteFilterConditionSchema).max(20) });
export const collectionSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, name: z.string(), filter: noteFilterSchema, sort: z.enum(["updated_desc", "created_desc", "title_asc"]), view: z.enum(["grid", "list"]), system: z.boolean(), revision: z.number().int().positive(), createdAt: z.string().datetime() });
export const createCollectionSchema = z.object({ name: z.string().trim().min(1).max(160), filter: noteFilterSchema, sort: z.enum(["updated_desc", "created_desc", "title_asc"]).default("updated_desc"), view: z.enum(["grid", "list"]).default("grid") });
export const updateCollectionSchema = z.object({ expectedRevision: z.number().int().positive(), name: z.string().trim().min(1).max(160).optional(), filter: noteFilterSchema.optional(), sort: z.enum(["updated_desc", "created_desc", "title_asc"]).optional(), view: z.enum(["grid", "list"]).optional() });
export const routingRuleSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, name: z.string(), condition: noteFilterSchema, targetLabelIds: z.array(idSchema), priority: z.number().int().min(0).max(1000), enabled: z.boolean(), provenance: z.literal("owner"), revision: z.number().int().positive(), createdAt: z.string().datetime() });
export const createRoutingRuleSchema = z.object({ name: z.string().trim().min(1).max(160), condition: noteFilterSchema, targetLabelIds: z.array(idSchema).min(1).max(20), priority: z.number().int().min(0).max(1000).default(100), enabled: z.boolean().default(true) });
export const updateRoutingRuleSchema = z.object({ expectedRevision: z.number().int().positive(), name: z.string().trim().min(1).max(160).optional(), condition: noteFilterSchema.optional(), targetLabelIds: z.array(idSchema).min(1).max(20).optional(), priority: z.number().int().min(0).max(1000).optional(), enabled: z.boolean().optional() });
export const routingRulePreviewSchema = z.object({ condition: noteFilterSchema, targetLabelIds: z.array(idSchema).min(1).max(20), sampleLimit: z.number().int().min(1).max(50).default(10) });
export const rulePreviewResultSchema = z.object({ affectedCount: z.number().int().nonnegative(), sampleNoteIds: z.array(idSchema), conflicts: z.array(z.object({ noteId: idSchema, reason: z.string() })) });
export const relationshipKindSchema = z.enum(["related", "supports", "contradicts", "duplicate_candidate"]);
export const relationshipSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, fromNoteId: idSchema, toNoteId: idSchema, kind: relationshipKindSchema, evidenceAnchorIds: z.array(idSchema), status: z.enum(["suggested", "confirmed", "dismissed"]), authoredBy: z.enum(["owner", "system"]), revision: z.number().int().positive(), createdAt: z.string().datetime() });
export const createRelationshipSchema = z.object({ fromNoteId: idSchema, toNoteId: idSchema, kind: relationshipKindSchema, evidenceAnchorIds: z.array(idSchema).max(50).default([]) }).superRefine((value, context) => { if (value.fromNoteId === value.toNoteId) context.addIssue({ code: "custom", message: "A note cannot relate to itself" }); });
export const relatedResultSchema=z.object({explicitLinks:z.array(relationshipSchema),suggestedLinks:z.array(z.object({noteId:idSchema,title:z.string(),score:z.number().min(0).max(1),reasonCodes:z.array(z.literal("shared_label")),sharedLabelIds:z.array(idSchema)}).strict()),suggestionMethod:z.literal("confirmed-shared-label-jaccard-v1"),suggestionsAreConfirmed:z.literal(false)}).strict();
export const resurfacingFeedbackInputSchema=z.object({noteId:idSchema,action:z.enum(["dismiss","snooze","hide_topic"]),labelId:idSchema.nullable().optional(),until:z.string().datetime().nullable().optional()}).strict().superRefine((value,context)=>{if((value.action==="snooze")!==Boolean(value.until))context.addIssue({code:"custom",message:"Snooze requires until and other actions forbid it"});if((value.action==="hide_topic")!==Boolean(value.labelId))context.addIssue({code:"custom",message:"Hide topic requires labelId and other actions forbid it"});if(value.until&&Date.parse(value.until)<=Date.now())context.addIssue({code:"custom",message:"Snooze must end in the future"});});
export const resurfacingFeedbackSchema=z.object({id:idSchema,vaultId:vaultIdSchema,noteId:idSchema,action:z.enum(["dismiss","snooze","hide_topic"]),labelId:idSchema.nullable(),until:z.string().datetime().nullable(),createdAt:z.string().datetime()}).strict();

export const createCaptureSchema = z.object({
  text: z.string().max(200_000).optional(),
  blobIds: z.array(idSchema).max(20).default([]).refine((items) => new Set(items).size === items.length, "Capture blob IDs must be unique"),
  title: z.string().min(1).max(240).optional(),
  clientOperationId: z.string().min(8).max(128)
}).strict().superRefine((value, context) => { if (!value.text?.trim() && value.blobIds.length === 0) context.addIssue({ code: "custom", message: "A capture requires text or a finalized blob" }); });
export const createUrlCaptureSchema=z.object({url:z.string().url().max(4096),fetchConsent:z.literal(true),selectedText:z.string().trim().min(1).max(200_000).optional(),title:z.string().trim().min(1).max(240).optional()}).strict();
export const captureSchema = z.object({
  id: idSchema, vaultId: vaultIdSchema, kind: z.enum(["capture", "file", "url"]), originalText: z.string().nullable(),sourceUrl:z.string().url().nullable().default(null),resolvedUrl:z.string().url().nullable().default(null),
  contentHash: sha256Schema, blobs: z.array(blobSummarySchema), noteId: idSchema, createdAt: z.string().datetime()
}).strict();

export const updateNoteMetadataSchema = z.object({
  title: z.string().trim().min(1).max(240).optional(),
  expectedRevision: z.number().int().positive()
});

export const editorNodeTypeSchema = z.enum(["paragraph","text","hardBreak","heading","bulletList","orderedList","listItem","taskList","taskItem","codeBlock","blockquote","callout","horizontalRule","table","tableRow","tableHeader","tableCell"]);
export const editorMarkTypeSchema = z.enum(["bold","italic","strike","code","link"]);
const editorAttributeValueSchema = z.union([z.string().max(4_096),z.number().finite(),z.boolean(),z.null(),z.array(z.number().int().min(0).max(10_000)).max(100)]);
export type EditorMarkInput={type:z.infer<typeof editorMarkTypeSchema>;attrs?:Record<string,z.infer<typeof editorAttributeValueSchema>>};
export type EditorNodeInput={type:z.infer<typeof editorNodeTypeSchema>;attrs?:Record<string,z.infer<typeof editorAttributeValueSchema>>;content?:EditorNodeInput[];text?:string;marks?:EditorMarkInput[]};
export const editorMarkSchema:z.ZodType<EditorMarkInput>=z.object({type:editorMarkTypeSchema,attrs:z.record(editorAttributeValueSchema).optional()}).strict().superRefine((mark,context)=>{if(mark.type!=="link"&&mark.attrs&&Object.keys(mark.attrs).length)context.addIssue({code:"custom",message:"Only links accept mark attributes"});if(mark.type==="link"){const href=mark.attrs?.href;if(typeof href!=="string"||!(/^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)))context.addIssue({code:"custom",message:"Link must use HTTPS, HTTP, mailto, or a root-relative path"});if(mark.attrs?.title!=null&&typeof mark.attrs.title!=="string")context.addIssue({code:"custom",message:"Link title must be text or null"});if(mark.attrs&&Object.keys(mark.attrs).some(key=>!["href","target","rel","class","title"].includes(key)))context.addIssue({code:"custom",message:"Unsupported link attribute"});}});
function boundedEditorNodeSchema(depth:number):z.ZodType<EditorNodeInput>{const content=depth>0?z.array(boundedEditorNodeSchema(depth-1)).max(20_000).optional():z.never().optional();return z.object({type:editorNodeTypeSchema,attrs:z.record(editorAttributeValueSchema).optional(),content,text:z.string().max(200_000).optional(),marks:z.array(editorMarkSchema).max(20).optional()}).strict().superRefine((node,context)=>{if(node.type==="text"&&typeof node.text!=="string")context.addIssue({code:"custom",message:"Text nodes require text"});if(node.type!=="text"&&node.text!==undefined)context.addIssue({code:"custom",message:"Only text nodes may contain text"});const allowed:Record<string,string[]>={heading:["level"],orderedList:["start","type"],taskItem:["checked"],codeBlock:["language"],callout:["kind"],tableCell:["colspan","rowspan","colwidth","align"],tableHeader:["colspan","rowspan","colwidth","align"]};if(node.attrs&&Object.keys(node.attrs).some(key=>!(allowed[node.type]??[]).includes(key)))context.addIssue({code:"custom",message:`Unsupported ${node.type} attribute`});if((node.type==="tableCell"||node.type==="tableHeader")&&node.attrs?.align!=null&&!["left","center","right"].includes(String(node.attrs.align)))context.addIssue({code:"custom",message:"Table alignment must be left, center, right, or null"});if(node.type==="callout"&&!["info","tip","warning","danger"].includes(String(node.attrs?.kind??"")))context.addIssue({code:"custom",message:"Callout kind must be info, tip, warning, or danger"});}) as z.ZodType<EditorNodeInput>;}
export const editorNodeSchema=boundedEditorNodeSchema(8);
export const editorDocumentSchema=z.object({type:z.literal("doc"),content:z.array(editorNodeSchema).max(20_000).default([])}).strict().refine(value=>JSON.stringify(value).length<=500_000,"Editor document is too large");
export type EditorDocument=z.infer<typeof editorDocumentSchema>;

export const createNoteSchema=z.object({
  id:idSchema.optional(),
  title:z.string().trim().min(1).max(240).optional(),
  content:z.discriminatedUnion("kind",[
    z.object({kind:z.literal("text"),text:z.string().max(200_000)}).strict(),
    z.object({kind:z.literal("editor_document"),document:editorDocumentSchema}).strict()
  ]),
  provenance:z.object({kind:z.literal("owner"),authoredAt:z.string().datetime().optional()}).strict().optional()
}).strict();
export const expectedNoteRevisionSchema=z.object({expectedRevision:z.number().int().positive()}).strict();
export const restoreNoteRevisionSchema=z.object({expectedCurrentRevision:z.number().int().positive()}).strict();

export const editNoteSchema = z.object({
  expectedRevision: z.number().int().positive(),
  edit: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("replace_document"), text: z.string().max(200_000) }),
    z.object({ kind: z.literal("replace_editor_document"), document: editorDocumentSchema }),
    z.object({ kind: z.literal("append_markdown"), markdown: z.string().min(1).max(100_000) })
  ])
});
export const reprocessNoteSchema = z.object({ expectedRevision: z.number().int().positive(), stages: z.array(z.literal("classify")).min(1).max(1) });

export const noteRevisionSchema = z.object({
  id: idSchema,
  noteId: idSchema,
  revision: z.number().int().positive(),
  title: z.string(),
  text: z.string(),
  actorKind: z.enum(["owner", "capture", "restore", "ai", "import", "migration"]),
  createdAt: z.string().datetime()
});

export const documentRepresentationSchema = z.object({
  format: z.enum(["editor_json", "markdown", "text", "yjs_update"]),
  content: z.union([z.string(), editorDocumentSchema]),
  revisionId: idSchema,
  sourceMap: z.array(z.object({ start: z.number().int().nonnegative(), end: z.number().int().nonnegative(), sourceId: idSchema.nullable() }))
});

export const taskSchema = z.object({
  id: idSchema,
  vaultId: vaultIdSchema,
  title: z.string().min(1).max(500),
  sourceNoteId: idSchema.nullable().optional(),
  completed: z.boolean(),
  dueAt: z.string().datetime().nullable(),
  estimatedMinutes: z.number().int().positive().nullable(),
  remainingMinutes: z.number().int().nonnegative().nullable(),
  earliestStart: z.string().datetime().nullable(),
  priority: z.number().int().min(1).max(5),
  allowSplit: z.boolean(),
  minBlockMinutes: z.number().int().positive().nullable(),
  maxBlockMinutes: z.number().int().positive().nullable(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const acceptNoteTaskSchema = z.object({ expectedRevision: z.number().int().positive() }).strict();

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  dueAt: z.string().datetime().nullable().optional(), estimatedMinutes: z.number().int().positive().max(10080).nullable().optional(), earliestStart: z.string().datetime().nullable().optional(), priority: z.number().int().min(1).max(5).default(3), allowSplit: z.boolean().default(true), minBlockMinutes: z.number().int().positive().max(1440).nullable().optional(), maxBlockMinutes: z.number().int().positive().max(1440).nullable().optional()
}).superRefine((value, context) => { if (value.minBlockMinutes && value.maxBlockMinutes && value.minBlockMinutes > value.maxBlockMinutes) context.addIssue({ code: "custom", message: "Task minimum block cannot exceed maximum block" }); });
export const updateTaskSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ title: z.string().min(1).max(500).optional(), completed: z.boolean().optional(), dueAt: z.string().datetime().nullable().optional(), estimatedMinutes: z.number().int().positive().max(10080).nullable().optional(), remainingMinutes: z.number().int().nonnegative().max(10080).nullable().optional(), earliestStart: z.string().datetime().nullable().optional(), priority: z.number().int().min(1).max(5).optional(), allowSplit: z.boolean().optional(), minBlockMinutes: z.number().int().positive().max(1440).nullable().optional(), maxBlockMinutes: z.number().int().positive().max(1440).nullable().optional() }) });
export const expectedTaskRevisionSchema=z.object({expectedRevision:z.number().int().positive()}).strict();
export const reminderStatusSchema=z.enum(["scheduled","snoozed","delivered","missed","dismissed","cancelled"]);
export const reminderSchema=z.object({id:idSchema,vaultId:vaultIdSchema,taskId:idSchema.nullable(),sourceAnchorId:idSchema.nullable(),calendarEventId:idSchema.nullable().default(null),title:z.string().nullable().default(null),remindAt:z.string().datetime(),timezone:z.string().min(1).max(100),channel:z.enum(["in_app","desktop"]),status:reminderStatusSchema,revision:z.number().int().positive(),deliveredAt:z.string().datetime().nullable(),dismissedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const createReminderSchema=z.object({taskId:idSchema.nullable().optional(),sourceAnchorId:idSchema.nullable().optional(),remindAt:z.string().datetime(),timezone:z.string().min(1).max(100),channel:z.enum(["in_app","desktop"])}).strict();
export const updateReminderSchema=z.object({remindAt:z.string().datetime().optional(),status:z.enum(["scheduled","snoozed","dismissed"]).optional(),expectedRevision:z.number().int().positive()}).strict().refine(value=>value.remindAt!==undefined||value.status!==undefined,"A reminder update must change time or status");
export const notificationSchema=z.object({id:idSchema,vaultId:vaultIdSchema,reminderId:idSchema,taskId:idSchema.nullable(),channel:z.enum(["in_app","desktop"]),title:z.string(),body:z.string(),state:z.enum(["unread","read","dismissed"]),revision:z.number().int().positive(),deliveredAt:z.string().datetime(),readAt:z.string().datetime().nullable(),dismissedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const updateNotificationSchema=z.object({state:z.enum(["read","dismissed"])}).strict();

export const projectStatusSchema=z.enum(["planned","active","paused","completed","cancelled"]);
export const projectSchema=z.object({id:idSchema,vaultId:vaultIdSchema,title:z.string(),descriptionNoteId:idSchema.nullable(),status:projectStatusSchema,goalIds:z.array(idSchema),noteIds:z.array(idSchema),taskIds:z.array(idSchema),ideaIds:z.array(idSchema),sourceAnchorIds:z.array(idSchema),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
const projectFieldsSchema=z.object({title:z.string().trim().min(1).max(500),descriptionNoteId:idSchema.nullable().default(null),status:projectStatusSchema.default("active"),goalIds:z.array(idSchema).max(200).default([]),noteIds:z.array(idSchema).max(500).default([]),taskIds:z.array(idSchema).max(500).default([]),ideaIds:z.array(idSchema).max(500).default([]),sourceAnchorIds:z.array(idSchema).max(200).default([])});
export const createProjectSchema=projectFieldsSchema;export const updateProjectSchema=z.object({expectedRevision:z.number().int().positive(),patch:projectFieldsSchema.partial()});
export const ideaSchema=z.object({id:idSchema,vaultId:vaultIdSchema,sourceId:idSchema,title:z.string().nullable(),projectId:idSchema.nullable(),state:z.enum(["inbox","developing","proposed","promoted","dismissed"]),sourceAnchorIds:z.array(idSchema),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
const ideaFieldsSchema=z.object({sourceId:idSchema,title:z.string().trim().min(1).max(500).nullable().default(null),projectId:idSchema.nullable().default(null),state:z.enum(["inbox","developing","proposed","promoted","dismissed"]).default("inbox"),sourceAnchorIds:z.array(idSchema).max(200).default([])});
export const createIdeaSchema=ideaFieldsSchema;export const updateIdeaSchema=z.object({expectedRevision:z.number().int().positive(),patch:ideaFieldsSchema.partial()});
export const goalSchema=z.object({id:idSchema,vaultId:vaultIdSchema,title:z.string(),kind:z.enum(["study","project","habit","personal","other"]),target:z.string().nullable(),scale:z.string().nullable(),targetDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),courseId:idSchema.nullable(),projectId:idSchema.nullable(),constraints:z.record(z.unknown()),sourceAnchorIds:z.array(idSchema),status:z.enum(["active","achieved","paused","abandoned"]),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
const goalFieldsSchema=z.object({title:z.string().trim().min(1).max(500),kind:z.enum(["study","project","habit","personal","other"]),target:z.string().trim().min(1).max(500).nullable().default(null),scale:z.string().trim().min(1).max(120).nullable().default(null),targetDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),courseId:idSchema.nullable().default(null),projectId:idSchema.nullable().default(null),constraints:z.record(z.unknown()).default({}),sourceAnchorIds:z.array(idSchema).max(200).default([]),status:z.enum(["active","achieved","paused","abandoned"]).default("active")});
export const createGoalSchema=goalFieldsSchema;export const updateGoalSchema=z.object({expectedRevision:z.number().int().positive(),patch:goalFieldsSchema.partial()});
export const memorySchema=z.object({id:idSchema,vaultId:vaultIdSchema,kind:z.enum(["fact","preference","workflow","plan","project_context","goal_context"]),content:z.string(),sourceAnchorIds:z.array(idSchema),origin:z.enum(["explicit","inferred"]),validFrom:z.string().datetime().nullable(),expiresAt:z.string().datetime().nullable(),userConfirmed:z.boolean(),status:z.enum(["active","superseded","dismissed"]),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
const memoryFieldsBase=z.object({kind:z.enum(["fact","preference","workflow","plan","project_context","goal_context"]),content:z.string().trim().min(1).max(10000),sourceAnchorIds:z.array(idSchema).max(200).default([]),origin:z.enum(["explicit","inferred"]),validFrom:z.string().datetime().nullable().default(null),expiresAt:z.string().datetime().nullable().default(null),userConfirmed:z.boolean().default(false),status:z.enum(["active","superseded","dismissed"]).default("active")});
export const createMemorySchema=memoryFieldsBase.superRefine((value,context)=>{if(value.origin==="inferred"&&!value.sourceAnchorIds.length)context.addIssue({code:"custom",message:"Inferred memory requires evidence"});if(value.origin==="inferred"&&value.userConfirmed)context.addIssue({code:"custom",message:"Inferred memory cannot start confirmed"});if(value.validFrom&&value.expiresAt&&Date.parse(value.expiresAt)<=Date.parse(value.validFrom))context.addIssue({code:"custom",message:"Expiry must follow validity start"});});export const updateMemorySchema=z.object({expectedRevision:z.number().int().positive(),patch:memoryFieldsBase.partial()});
export const personalProfileSchema=z.object({memories:z.array(memorySchema),goals:z.array(goalSchema),projects:z.array(projectSchema),summary:z.object({explicitMemories:z.number().int().nonnegative(),inferredUnconfirmedMemories:z.number().int().nonnegative(),activeGoals:z.number().int().nonnegative(),activeProjects:z.number().int().nonnegative()}),limitations:z.array(z.string()),generatedAt:z.string().datetime()});

export const integrationProviderSchema=z.enum(["microsoft","google_calendar","visma_inschool","youtube","spotify","tiktok","instagram","reddit","discord","maxun","firecrawl","anakin_oss","meetily"]);
export const integrationStateSchema=z.enum(["disconnected","authentication_required","admin_approval_required","needs_provider_configuration","connected","rate_limited","syncing","degraded","error","unsupported","import_only"]);
export const integrationCapabilitySchema=z.object({key:z.string().regex(/^[a-z0-9_.-]{1,80}$/),mode:z.enum(["live_read","live_write","import_only","unsupported","unverified"]),enabled:z.boolean(),verifiedAt:z.string().datetime().nullable(),limitation:z.string().max(1000).nullable()});
export const connectorScheduleSchema=z.object({enabled:z.boolean(),intervalMinutes:z.number().int().min(15).max(10080),windows:z.array(z.object({weekday:z.number().int().min(1).max(7),start:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),end:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),timezone:z.string().min(1).max(100)}).strict()).max(14)}).strict().superRefine((value,context)=>{for(const window of value.windows)if(window.end<=window.start)context.addIssue({code:"custom",message:"Schedule window end must follow start"});if(value.enabled&&!value.windows.length)context.addIssue({code:"custom",message:"Enabled connector schedule requires at least one window"});});
const legacyIntegrationScheduleSchema=z.discriminatedUnion("kind",[z.object({kind:z.literal("manual")}),z.object({kind:z.literal("daily"),localTime:z.string().regex(/^\d{2}:\d{2}$/),timezone:z.string()}),z.object({kind:z.literal("weekly"),weekday:z.number().int().min(1).max(7),localTime:z.string().regex(/^\d{2}:\d{2}$/),timezone:z.string()})]);
export const integrationConnectionSchema=z.object({id:idSchema,vaultId:vaultIdSchema,provider:integrationProviderSchema,label:z.string(),state:integrationStateSchema,capabilities:z.array(integrationCapabilitySchema),credentialConfigured:z.boolean(),lastSuccessAt:z.string().datetime().nullable(),lastFailureAt:z.string().datetime().nullable(),nextScheduledAt:z.string().datetime().nullable(),importedCount:z.number().int().nonnegative(),coverage:z.record(z.unknown()),lastErrorCode:z.string().nullable(),schedule:z.union([legacyIntegrationScheduleSchema,connectorScheduleSchema]),revision:z.number().int().positive(),disconnectedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const createIntegrationConnectionSchema=z.object({provider:integrationProviderSchema,label:z.string().trim().min(1).max(160)});
export const integrationCapabilityListSchema=z.object({connectionId:idSchema,state:integrationStateSchema,items:z.array(integrationCapabilitySchema),disclaimer:z.string()});
export const integrationProviderDescriptorSchema=z.object({providerId:integrationProviderSchema,displayName:z.string(),backendIdentity:z.object({registry:z.literal("omega-local-provider-registry-v1"),adapter:z.string(),verified:z.boolean()}).strict(),capabilities:z.array(integrationCapabilitySchema),accountBlockers:z.array(z.string()),optionalModules:z.array(z.object({key:z.string(),enabled:z.boolean(),reason:z.string().nullable()}).strict()),authorizationMode:z.enum(["oauth","owner_export","local_service","configuration_required"])}).strict();
export const providerAuthorizationCapabilitySchema=z.enum(["calendar.read","calendar.write","teams.read","teams.channels.read","classes.read","assignments.read","mail.read","files.read","files.read.all","sites.read","tasks.read","notes.read","contacts.read","offline.access"]);
export const authorizationRequestSchema=z.object({requestedCapabilities:z.array(providerAuthorizationCapabilitySchema).min(1).max(14).refine(items=>new Set(items).size===items.length,"Requested capabilities must be unique"),registeredReturnTarget:z.enum(["connections","connection_detail"])}).strict();
export const reauthorizationRequestSchema=authorizationRequestSchema.extend({reason:z.enum(["expired","revoked","permission_upgrade","owner_requested"])}).strict();
export const authorizationStartSchema=z.object({transactionId:idSchema,provider:z.enum(["microsoft","google_calendar"]),authorizationUrl:z.string().url(),requestedCapabilities:z.array(providerAuthorizationCapabilitySchema),registeredReturnTarget:authorizationRequestSchema.shape.registeredReturnTarget,expiresAt:z.string().datetime(),pkce:z.literal("S256"),stateStoredAsHash:z.literal(true),secretsIncluded:z.literal(false)}).strict();
export const connectorResourceSchema=z.object({id:idSchema,connectionId:idSchema,providerResourceId:z.string(),kind:z.string(),parentId:idSchema.nullable(),name:z.string(),accessState:z.enum(["available","denied","skipped","unavailable"]),selected:z.boolean(),metadata:z.record(z.unknown()),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
const resourceSelectionWindowSchema=z.object({from:z.string().datetime().nullable(),to:z.string().datetime().nullable()}).strict();
const sensitiveDatasetSchema=z.enum(["grades","attendance","private_chats","personal_data_history"]);
export const resourceSelectionSchema=z.object({selectedResourceIds:z.array(idSchema).max(500),window:resourceSelectionWindowSchema.nullable(),sensitiveDataOptIns:z.array(sensitiveDatasetSchema),revision:z.number().int().positive()}).strict().superRefine((value,context)=>{if(value.window?.from&&value.window.to&&Date.parse(value.window.to)<=Date.parse(value.window.from))context.addIssue({code:"custom",message:"Selection window must move forward"});});
export const resourceSelectionInputSchema=z.object({selectedResourceIds:z.array(idSchema).max(500),window:resourceSelectionWindowSchema.nullable().default(null),scopeExpansionApproval:z.boolean().default(false),sensitiveDataOptIns:z.array(sensitiveDatasetSchema).max(4).default([])}).strict().superRefine((value,context)=>{if(value.window?.from&&value.window.to&&Date.parse(value.window.to)<=Date.parse(value.window.from))context.addIssue({code:"custom",message:"Selection window must move forward"});if(value.selectedResourceIds.length!==new Set(value.selectedResourceIds).size)context.addIssue({code:"custom",message:"Selected resource IDs must be unique"});});
export const connectorSyncStatusSchema=z.object({connectionId:idSchema,state:integrationStateSchema,lastAttemptAt:z.string().datetime().nullable(),lastSuccessAt:z.string().datetime().nullable(),partialCoverage:z.record(z.unknown()),throttled:z.boolean(),authorizationRequired:z.boolean(),workerAvailable:z.boolean(),latestJob:z.object({id:idSchema,status:z.enum(["queued","waiting_for_worker","running","succeeded","failed","cancelled","superseded"]),stage:z.string()}).strict().nullable(),blockers:z.array(z.string())}).strict();
export const connectionSyncResultSchema=z.object({coverage:z.array(z.object({dataset:z.enum(["assignments","chats","channels","calendar","mail","files","sharepoint","todo","planner","onenote","contacts"]),imported:z.number().int().nonnegative(),complete:z.boolean(),contentComplete:z.boolean(),limitations:z.array(z.string()),error:z.string().nullable()}).strict()),complete:z.boolean(),privateChatsOptedIn:z.boolean()}).strict();
export const disconnectIntegrationSchema=z.object({previewId:idSchema,expectedRevision:z.number().int().positive(),confirmation:z.literal("disconnect")}).strict();
export const previewConnectionDisconnectSchema=z.object({retentionChoice:z.enum(["retain_imported","delete_imported","retain_sources_delete_derived"])}).strict();
export const connectionDisconnectPreviewSchema=z.object({id:idSchema,vaultId:vaultIdSchema,connectionId:idSchema,connectionRevision:z.number().int().positive(),retentionChoice:previewConnectionDisconnectSchema.shape.retentionChoice,impact:z.object({credentialReferencesToDelete:z.number().int().nonnegative(),subscriptionsToStop:z.number().int().nonnegative(),selectedResources:z.number().int().nonnegative(),sourceObjects:z.number().int().nonnegative(),derivedArtifacts:z.number().int().nonnegative(),importedRecords:z.number().int().nonnegative(),retainedRecordKinds:z.array(z.string()),deletedRecordKinds:z.array(z.string()),providerRevocationAttemptedOnApply:z.boolean(),providerCleanupMayBeIncomplete:z.literal(true),writesApplied:z.literal(false)}).strict(),requiredConfirmation:z.literal("disconnect"),stale:z.boolean(),expiresAt:z.string().datetime(),createdAt:z.string().datetime()}).strict();
const connectionFieldMappingSchema=z.object({sourceField:z.string().regex(/^[A-Za-z0-9_.-]{1,120}$/),targetField:z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,79}$/),transformation:z.enum(["identity","string_trim","datetime_iso","string_array","boolean"]),provenance:z.enum(["provider_schema","owner_export_schema","browser_observation"])}).strict();
const connectionDatasetMappingSchema=z.object({sourceKind:z.string().regex(/^[a-z0-9_.-]{1,80}$/),targetRecordType:z.enum(["calendar_event","task","school_lesson","school_assignment","school_assessment","attendance_record","grade_record","source_object","transcript","personal_data_item"]),fieldMappings:z.array(connectionFieldMappingSchema).min(1).max(80)}).strict().superRefine((value,context)=>{const source=value.fieldMappings.map(item=>item.sourceField),target=value.fieldMappings.map(item=>item.targetField);if(source.length!==new Set(source).size)context.addIssue({code:"custom",path:["fieldMappings"],message:"Source fields must be unique within a dataset"});if(target.length!==new Set(target).size)context.addIssue({code:"custom",path:["fieldMappings"],message:"Target fields must be unique within a dataset"});});
export const setConnectionMappingSchema=z.object({datasets:z.array(connectionDatasetMappingSchema).max(30),timezone:z.string().trim().min(1).max(100),entityMapping:z.object({person:z.enum(["provider_id_then_email","provider_id_only","manual"]),course:z.enum(["provider_id_then_code","provider_id_only","manual"]),calendar:z.enum(["provider_id","manual"])}).strict(),extractionProfile:z.enum(["provider_native_v1","owner_export_v1","browser_session_v1"])}).strict().superRefine((value,context)=>{const kinds=value.datasets.map(item=>item.sourceKind);if(kinds.length!==new Set(kinds).size)context.addIssue({code:"custom",path:["datasets"],message:"Source kinds must be unique"});});
export const connectionMappingSchema=setConnectionMappingSchema.and(z.object({connectionId:idSchema,provider:integrationProviderSchema,schemaVersion:z.literal("connection-mapping-v1"),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict());
export type IntegrationConnection=z.infer<typeof integrationConnectionSchema>;
export type ConnectorResource=z.infer<typeof connectorResourceSchema>; export type ConnectorSyncStatus=z.infer<typeof connectorSyncStatusSchema>;
export const insightFactSchema=z.object({key:z.string(),label:z.string(),value:z.number().nullable(),unit:z.string().nullable(),epistemicStatus:z.enum(["observed","planned","unknown"]),evidenceIds:z.array(idSchema)});
export const insightCoverageSchema=z.object({domain:z.enum(["tasks","study","attendance","assessments","projects","ideas","calendar","personal_data"]),status:z.enum(["observed","partial","unavailable","not_requested"]),recordCount:z.number().int().nonnegative(),limitation:z.string().nullable()});
export const insightSchema=z.object({id:idSchema,vaultId:vaultIdSchema,kind:z.enum(["weekly_review","project_review","study_pattern","interest_trend"]),window:z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),title:z.string(),facts:z.array(insightFactSchema),coverage:z.array(insightCoverageSchema),suggestions:z.array(z.object({text:z.string(),evidenceIds:z.array(idSchema),bounded:z.literal(true)})),sourceManifest:z.array(z.object({objectType:z.string(),objectId:idSchema,revision:z.number().int().positive()})),generator:z.string(),state:z.enum(["seen","dismissed","pinned"]),annotation:z.string().nullable(),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const generateInsightSchema=z.object({kind:z.literal("weekly_review"),window:z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}),scope:z.array(z.enum(["tasks","study","attendance","assessments","projects","ideas","calendar","personal_data"])).min(1).max(8)}).superRefine((value,context)=>{if(value.window.to<value.window.from)context.addIssue({code:"custom",message:"Insight window must move forward"});});
export const updateInsightSchema=z.object({expectedRevision:z.number().int().positive(),state:z.enum(["seen","dismissed","pinned"]),annotation:z.string().trim().max(2000).nullable().default(null)});
export type Insight=z.infer<typeof insightSchema>;
export const personalDataActionSchema=z.enum(["saved","liked","played","watched","skipped","subscribed","fetched","commented","posted","unknown"]);
export const personalDataCoverageSchema=z.object({semantics:z.enum(["provider_declared","owner_export_declared","unknown"]),knownFields:z.array(z.string()),unknownFields:z.array(z.string()),windowFrom:z.string().datetime().nullable(),windowTo:z.string().datetime().nullable(),limitations:z.array(z.string())});
export const normalizedPersonalDataRecordSchema=z.object({sourceItemId:z.string().trim().min(1).max(500),actionKind:personalDataActionSchema,observedAt:z.string().datetime().nullable(),title:z.string().trim().max(1000).nullable().default(null),contentReference:z.string().trim().max(4000).nullable().default(null),url:z.string().url().max(4000).nullable().default(null),metadata:z.record(z.unknown()).default({}),coverage:personalDataCoverageSchema});
export const previewPersonalDataImportSchema=z.object({provider:z.string().regex(/^[a-z0-9_.-]{1,80}$/),accountLabel:z.string().trim().min(1).max(160),exportFormat:z.literal("omega_normalized_json_v1"),records:z.array(normalizedPersonalDataRecordSchema).min(1).max(1000)});
export const personalDataImportPreviewSchema=z.object({id:idSchema,vaultId:vaultIdSchema,provider:z.string(),accountLabel:z.string(),exportFormat:z.literal("omega_normalized_json_v1"),summary:z.object({recordCount:z.number().int().nonnegative(),uniqueCount:z.number().int().nonnegative(),duplicateCount:z.number().int().nonnegative(),unknownActionCount:z.number().int().nonnegative(),suppressedCount:z.number().int().nonnegative()}),sample:z.array(normalizedPersonalDataRecordSchema).max(20),status:z.enum(["draft","applied","expired"]),revision:z.number().int().positive(),expiresAt:z.string().datetime(),createdAt:z.string().datetime()});
export const applyPersonalDataImportSchema=z.object({expectedRevision:z.number().int().positive(),confirmation:z.literal("apply_normalized_import")});
export const personalDataImportReceiptSchema=z.object({previewId:idSchema,insertedCount:z.number().int().nonnegative(),duplicateCount:z.number().int().nonnegative(),suppressedCount:z.number().int().nonnegative(),appliedAt:z.string().datetime()});
export const personalDataItemSchema=z.object({id:idSchema,vaultId:vaultIdSchema,provider:z.string(),accountLabel:z.string(),sourceItemId:z.string(),actionKind:personalDataActionSchema,observedAt:z.string().datetime().nullable(),title:z.string().nullable(),contentReference:z.string().nullable(),url:z.string().nullable(),metadata:z.record(z.unknown()),coverage:personalDataCoverageSchema,importPreviewId:idSchema.nullable(),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const personalDataPolicyProviderSchema=z.enum(["youtube","spotify","tiktok","instagram","reddit","discord","maxun"]);
export const personalDataPoliciesSchema=z.object({vaultId:vaultIdSchema,enabledProviders:z.array(personalDataPolicyProviderSchema).max(7),analysisTypes:z.array(z.enum(["interest_topics","activity_patterns","study_relevance"])).max(3),retentionDays:z.number().int().min(0).max(3650),weeklySync:z.object({enabled:z.boolean(),weekday:z.number().int().min(1).max(7),localTime:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),timezone:z.string().min(1).max(100)}).strict(),privacy:z.object({includeRawTitles:z.boolean(),includeUrls:z.boolean(),allowProfileInference:z.boolean()}).strict(),revision:z.number().int().nonnegative(),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable()}).strict();
export const setPersonalDataPoliciesSchema=z.object({policies:personalDataPoliciesSchema.omit({vaultId:true,revision:true,createdAt:true,updatedAt:true}),expectedRevision:z.number().int().nonnegative(),disclosureConfirmation:z.literal("enable_personal_data_analysis").optional()}).strict().superRefine((value,context)=>{const enables=value.policies.enabledProviders.length>0||value.policies.analysisTypes.length>0||value.policies.weeklySync.enabled||value.policies.privacy.allowProfileInference;if(enables&&value.disclosureConfirmation!=="enable_personal_data_analysis")context.addIssue({code:"custom",message:"Enabling personal-data processing requires disclosure confirmation"});if(value.policies.weeklySync.enabled&&!value.policies.enabledProviders.length)context.addIssue({code:"custom",message:"Weekly sync requires at least one enabled provider"});});
export type PersonalDataItem=z.infer<typeof personalDataItemSchema>;export type PersonalDataImportPreview=z.infer<typeof personalDataImportPreviewSchema>;
export type PersonalDataPolicies=z.infer<typeof personalDataPoliciesSchema>;
export const interestSchema=z.object({id:idSchema,vaultId:vaultIdSchema,label:z.string(),origin:z.enum(["explicit","inferred"]),status:z.enum(["tentative","confirmed","corrected","dismissed","retracted"]),metric:z.object({name:z.literal("deduplicated_observation_count"),count:z.number().int().nonnegative(),denominator:z.number().int().nonnegative(),windowFrom:z.string().datetime(),windowTo:z.string().datetime(),actionKinds:z.array(personalDataActionSchema)}),confidenceSemantics:z.literal("rule_threshold_not_probability"),methodVersion:z.literal("owner-approved-topic-count-v1"),firstObservedAt:z.string().datetime().nullable(),lastObservedAt:z.string().datetime().nullable(),evidenceItemIds:z.array(idSchema),ownerCorrection:z.string().nullable(),suppression:z.record(z.unknown()).nullable(),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const refreshPersonalProfileSchema=z.object({window:z.object({from:z.string().datetime(),to:z.string().datetime()}),approvedTopicLabels:z.array(z.string().trim().min(1).max(120)).min(1).max(100)}).superRefine((value,context)=>{if(Date.parse(value.window.to)<=Date.parse(value.window.from))context.addIssue({code:"custom",message:"Profile window must move forward"});});
export const rebuildPersonalProfileSchema=z.object({sourceScope:z.object({personalDataItemIds:z.array(idSchema).max(500),providers:z.array(z.string().regex(/^[a-z0-9_.-]{1,80}$/)).max(20)}).strict(),timeWindow:z.object({from:z.string().datetime(),to:z.string().datetime()}).strict(),policyRevision:z.number().int().positive()}).strict().superRefine((value,context)=>{if(!value.sourceScope.personalDataItemIds.length&&!value.sourceScope.providers.length)context.addIssue({code:"custom",path:["sourceScope"],message:"Profile rebuild requires an explicit source scope"});if(value.sourceScope.personalDataItemIds.length!==new Set(value.sourceScope.personalDataItemIds).size)context.addIssue({code:"custom",path:["sourceScope","personalDataItemIds"],message:"Source item IDs must be unique"});if(value.sourceScope.providers.length!==new Set(value.sourceScope.providers).size)context.addIssue({code:"custom",path:["sourceScope","providers"],message:"Providers must be unique"});if(Date.parse(value.timeWindow.to)<=Date.parse(value.timeWindow.from))context.addIssue({code:"custom",path:["timeWindow"],message:"Profile window must move forward"});});
export const updateInterestSchema=z.object({expectedRevision:z.number().int().positive(),action:z.enum(["confirm","correct","dismiss"]),value:z.string().trim().min(1).max(120).optional(),reason:z.string().trim().min(1).max(1000).optional()}).superRefine((value,context)=>{if(value.action==="correct"&&!value.value)context.addIssue({code:"custom",message:"Correction requires a value"});});
export const decideInterestClaimSchema=z.object({decision:z.enum(["confirm","correct","dismiss"]),correctedValue:z.string().trim().min(1).max(120).optional(),reason:z.string().trim().min(1).max(1000).optional()}).strict().superRefine((value,context)=>{if(value.decision==="correct"&&!value.correctedValue)context.addIssue({code:"custom",path:["correctedValue"],message:"Correction requires a corrected value"});});
export const interestEvidenceSchema=z.object({personalDataItemId:idSchema,interactionKind:personalDataActionSchema,observedEventTime:z.string().datetime().nullable(),provider:z.string(),accountLabel:z.string(),sourceItemId:z.string(),title:z.string().nullable(),contentReference:z.string().nullable(),sourceUrl:z.string().nullable(),extractionLimits:z.object({semantics:z.enum(["provider_declared","owner_export_declared","unknown"]),knownFields:z.array(z.string()),unknownFields:z.array(z.string()),windowFrom:z.string().datetime().nullable(),windowTo:z.string().datetime().nullable(),limitations:z.array(z.string())}).strict(),fetchingContentProvesConsumption:z.literal(false),linkedAt:z.string().datetime()}).strict();
export const profileRefreshResultSchema=z.object({type:z.literal("profile_refresh"),interestIds:z.array(idSchema),skippedSparseTopics:z.array(z.string()),blockedSensitiveTopics:z.array(z.string()),writesApplied:z.literal(true)});
export const profileRebuildProposalResultSchema=z.object({type:z.literal("profile_rebuild_proposal"),policyRevision:z.number().int().positive(),candidates:z.array(z.object({interestId:idSchema,label:z.string(),observationCount:z.number().int().nonnegative(),evidenceItemIds:z.array(idSchema)}).strict()),skippedSparseTopics:z.array(z.string()),blockedSensitiveTopics:z.array(z.string()),ownerLocksPreserved:z.literal(true),writesApplied:z.literal(false)}).strict();
export const syncSelectedPersonalDataSchema=z.object({connectionIds:z.array(idSchema).min(1).max(20),capabilities:z.array(z.enum(["watch_history","listening_history","saved_items","likes","subscriptions","posts","comments"])).min(1).max(7),window:z.object({from:z.string().datetime(),to:z.string().datetime()}).strict().nullable().default(null),catchUpRunKey:z.string().trim().min(8).max(128).optional()}).strict().superRefine((value,context)=>{if(value.connectionIds.length!==new Set(value.connectionIds).size)context.addIssue({code:"custom",path:["connectionIds"],message:"Connection IDs must be unique"});if(value.capabilities.length!==new Set(value.capabilities).size)context.addIssue({code:"custom",path:["capabilities"],message:"Capabilities must be unique"});if(value.window&&Date.parse(value.window.to)<=Date.parse(value.window.from))context.addIssue({code:"custom",path:["window"],message:"Sync window must move forward"});});
export type Interest=z.infer<typeof interestSchema>;

export const recurrenceRuleSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]), interval: z.number().int().min(1).max(99).default(1),
  timezone: z.string().min(1).max(100), byWeekday: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).min(1).max(7).optional(),
  count: z.number().int().min(1).max(1000).optional(), until: z.string().datetime().optional()
}).superRefine((value, context) => { if (value.count && value.until) context.addIssue({ code: "custom", message: "Use count or until, not both" }); });
export const calendarDisplayPreferencesSchema=z.object({color:z.string().regex(/^#[0-9a-fA-F]{6}$/),showWeekends:z.boolean().default(true)}).strict();
export const calendarOriginSchema=z.enum(["sorta","microsoft","google_calendar","visma_inschool"]);
export const calendarSchema=z.object({
  id:idSchema,vaultId:vaultIdSchema,name:z.string(),timezone:z.string(),origin:calendarOriginSchema,ownership:z.enum(["owner","provider"]),
  capabilities:z.object({read:z.boolean(),write:z.boolean()}).strict(),selectedVisible:z.boolean(),displayPreferences:calendarDisplayPreferencesSchema,
  providerMapping:z.object({connectionId:idSchema,providerCalendarId:z.string()}).strict().nullable(),
  freshness:z.object({state:z.enum(["current","stale","not_configured"]),lastSyncedAt:z.string().datetime().nullable()}).strict(),
  revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()
}).strict();
export const createCalendarSchema=z.object({name:z.string().trim().min(1).max(160),displayPreferences:calendarDisplayPreferencesSchema.default({color:"#6366f1",showWeekends:true}),timezone:z.string().min(1).max(100),origin:z.literal("sorta")}).strict();
export const updateCalendarSchema=z.object({name:z.string().trim().min(1).max(160).optional(),timezone:z.string().min(1).max(100).optional(),selectedVisible:z.boolean().optional(),displayPreferences:calendarDisplayPreferencesSchema.optional(),archived:z.boolean().optional()}).strict().refine(value=>Object.keys(value).length>0,"Calendar patch must not be empty");
export const calendarEventSchema = z.object({
  id: idSchema,
  vaultId: vaultIdSchema,
  calendarId: idSchema,
  title: z.string().min(1).max(500),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  privateContext: z.string().nullable(),
  revision: z.number().int().positive(), timezone: z.string(), recurrence: recurrenceRuleSchema.nullable(), trashedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});

export const createCalendarEventSchema = z.object({
  calendarId: idSchema.optional(),
  title: z.string().min(1).max(500),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  privateContext: z.string().max(20_000).nullable().optional(),
  timezone: z.string().min(1).max(100).default("UTC"), recurrence: recurrenceRuleSchema.nullable().optional(),
  entityIds: z.array(idSchema).max(50).default([])
}).superRefine((value, ctx) => {
  if (Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End must be after start" });
  }
});
export const calendarEditScopeSchema=z.enum(["series","occurrence"]);
export const updateCalendarEventSchema = z.object({ scope:z.literal("series"),expectedRevision: z.number().int().positive(), title: z.string().trim().min(1).max(500).optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional(), timezone: z.string().min(1).max(100).optional(), recurrence: recurrenceRuleSchema.nullable().optional() }).strict();
export const eventOccurrenceSchema = z.object({ id: z.string(), eventId: idSchema, exceptionId: idSchema.nullable(), originalStartsAt: z.string().datetime(), title: z.string(), startsAt: z.string().datetime(), endsAt: z.string().datetime() });
export const calendarViewModeSchema=z.enum(["day","week","workweek","month","agenda"]);
export const calendarViewQuerySchema=z.object({from:z.string().datetime(),to:z.string().datetime(),timezone:z.string().min(1).max(100),view:calendarViewModeSchema,calendarIds:z.array(idSchema).max(50).default([])});
export const calendarViewOccurrenceSchema=eventOccurrenceSchema.extend({calendarId:idSchema,eventRevision:z.number().int().positive(),timezone:z.string(),layer:z.enum(["personal","school","study"]),attendanceStatus:z.enum(["present","absent","late","unknown"]).nullable().default(null),attendanceLabel:z.string().nullable().default(null),source:z.object({kind:z.enum(["local","provider"]),connectionId:idSchema.nullable(),stale:z.boolean()})});
export const calendarUnknownTimeMarkerSchema=z.object({id:idSchema,kind:z.enum(["lesson","assignment","assessment","attendance"]),title:z.string(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),attendanceStatus:z.enum(["present","absent","late","unknown"]).nullable().default(null),reason:z.enum(["time_unknown","date_only","unlinked_school_record"]),revision:z.number().int().positive()});
export const calendarOverlayItemSchema=z.object({id:idSchema,kind:z.enum(["lesson","assignment","assessment","attendance"]),title:z.string(),startsAt:z.string().datetime(),endsAt:z.string().datetime().nullable(),layer:z.enum(["school","deadline","assessment","attendance"]),attendanceStatus:z.enum(["present","absent","late","unknown"]).nullable().default(null),attendanceLabel:z.string().nullable().default(null),reason:z.literal("source_record_not_calendar_event"),revision:z.number().int().positive()});
export const calendarStaleSourceSchema=z.object({connectionId:idSchema,provider:z.enum(["microsoft","google_calendar"]),label:z.string(),state:integrationStateSchema,lastSuccessAt:z.string().datetime().nullable(),reason:z.string()});
export const assignmentSubmissionSchema=z.object({status:z.enum(["submitted","submitted_late","missing","pending","unknown"]),observedAt:z.string().datetime().nullable()});
export const calendarViewSchema=z.object({view:calendarViewModeSchema,range:z.object({from:z.string().datetime(),to:z.string().datetime(),timezone:z.string()}),selectedCalendarIds:z.array(z.string()),occurrences:z.array(calendarViewOccurrenceSchema),overlayItems:z.array(calendarOverlayItemSchema.extend({submission:assignmentSubmissionSchema.nullable().optional()})),unknownTimeMarkers:z.array(calendarUnknownTimeMarkerSchema.extend({submission:assignmentSubmissionSchema.nullable().optional()})),staleSources:z.array(calendarStaleSourceSchema)});
export const calendarBriefQuerySchema=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timezone:z.string().min(1).max(100)}).strict();
export const calendarBriefItemSchema=z.object({occurrenceId:z.string(),eventId:idSchema,calendarId:idSchema,title:z.string(),startsAt:z.string().datetime(),endsAt:z.string().datetime(),eventRevision:z.number().int().positive(),prepItemCount:z.number().int().nonnegative(),linkedCommitmentCount:z.number().int().nonnegative()}).strict();
export const calendarBriefSchema=z.object({vaultId:vaultIdSchema,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timezone:z.string(),state:z.enum(["missing","fresh","stale"]),revision:z.number().int().nonnegative(),generatedAt:z.string().datetime().nullable(),items:z.array(calendarBriefItemSchema),deterministicSummary:z.array(z.string()),sourceManifest:z.array(z.object({recordType:z.literal("calendar_event"),recordId:idSchema,revision:z.number().int().positive()})),generation:z.object({method:z.literal("deterministic-calendar-brief-v1"),sourceCount:z.number().int().nonnegative(),cached:z.boolean()}).strict()}).strict();
export const calendarExportInputSchema=z.object({calendarIds:z.array(idSchema).min(1).max(50),from:z.string().datetime(),to:z.string().datetime(),format:z.literal("ics"),privacy:z.literal("minimal")}).strict().superRefine((value,context)=>{const span=Date.parse(value.to)-Date.parse(value.from);if(span<=0||span>366*86_400_000)context.addIssue({code:"custom",message:"Calendar export range must be positive and at most 366 days"});if(new Set(value.calendarIds).size!==value.calendarIds.length)context.addIssue({code:"custom",message:"Calendar IDs must be unique"});});
export const calendarImportInputSchema=z.object({attachmentId:idSchema,format:z.literal("ics"),timezone:z.string().min(1).max(100),targetCalendarId:idSchema}).strict();
export const calendarImportItemSchema=z.object({sourceUid:z.string().min(1).max(500),sequence:z.number().int().nonnegative(),title:z.string().min(1).max(500),startsAt:z.string().datetime().nullable(),endsAt:z.string().datetime().nullable(),timezone:z.string(),recurrence:z.object({frequency:z.literal("weekly"),interval:z.number().int().positive(),count:z.number().int().positive()}).nullable(),sourceStatus:z.enum(["active","cancelled"]),action:z.enum(["create","create_series","cancel","duplicate","blocked"]),reasonCodes:z.array(z.string()),ignoredInvitationFields:z.array(z.enum(["ATTENDEE","ORGANIZER","RSVP"]))}).strict();
export const calendarImportPreviewSchema=z.object({id:idSchema,vaultId:vaultIdSchema,attachmentId:idSchema,targetCalendarId:idSchema,status:z.enum(["draft","applied","rejected","expired"]),timezone:z.string(),items:z.array(calendarImportItemSchema).max(10000),warnings:z.array(z.string()),counts:z.object({create:z.number().int().nonnegative(),createSeries:z.number().int().nonnegative(),cancel:z.number().int().nonnegative(),duplicate:z.number().int().nonnegative(),blocked:z.number().int().nonnegative()}).strict(),invitationsSent:z.literal(false),writesApplied:z.literal(false),revision:z.number().int().positive(),expiresAt:z.string().datetime(),createdAt:z.string().datetime()}).strict();
export const occurrenceExceptionInputSchema = z.object({ scope:z.literal("occurrence"),expectedRevision: z.number().int().positive(), originalStartsAt: z.string().datetime(), cancelled: z.boolean().default(false), title: z.string().trim().min(1).max(500).nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional() }).strict().superRefine((value, context) => { if ((value.startsAt == null) !== (value.endsAt == null)) context.addIssue({ code: "custom", message: "Override start and end together" }); if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) context.addIssue({ code: "custom", message: "End must be after start" }); });
export const occurrenceExceptionSchema = z.object({ id: idSchema, eventId: idSchema, originalStartsAt: z.string().datetime(), cancelled: z.boolean(), title: z.string().nullable(), startsAt: z.string().datetime().nullable(), endsAt: z.string().datetime().nullable(), revision: z.number().int().positive() });
export const updateOccurrenceExceptionSchema = z.object({ scope:z.literal("occurrence"),expectedEventRevision: z.number().int().positive(), expectedExceptionRevision: z.number().int().positive(), cancelled: z.boolean().optional(), title: z.string().trim().min(1).max(500).nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional() }).strict().superRefine((value, context) => { if (("startsAt" in value) !== ("endsAt" in value)) context.addIssue({ code: "custom", message: "Override start and end together" }); if (value.startsAt && value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) context.addIssue({ code: "custom", message: "End must be after start" }); });
export const calendarEventRevisionSchema = z.object({ id: idSchema, eventId: idSchema, revision: z.number().int().positive(), title: z.string(), startsAt: z.string().datetime(), endsAt: z.string().datetime(), timezone: z.string(), recurrence: recurrenceRuleSchema.nullable(), actorKind: z.enum(["owner", "provider", "system"]), changedFields: z.array(z.string()), createdAt: z.string().datetime() });
export const freeBusyQuerySchema = z.object({ from: z.string().datetime(), to: z.string().datetime(), timezone: z.string().min(1).max(100), calendarIds: z.array(idSchema).max(50).default([]) }).superRefine((value, context) => { if (Date.parse(value.to) <= Date.parse(value.from) || Date.parse(value.to) - Date.parse(value.from) > 366 * 86400000) context.addIssue({ code: "custom", message: "Invalid or unbounded range" }); });
export const freeBusyResultSchema = z.object({ from: z.string().datetime(), to: z.string().datetime(), timezone: z.string(), busy: z.array(z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime(), occurrenceIds: z.array(z.string()) })), unknownTimeConflicts: z.array(z.unknown()), staleSources: z.array(z.unknown()) });
export const calendarConflictSchema = z.object({ id: z.string(), kind: z.literal("overlap"), startsAt: z.string().datetime(), endsAt: z.string().datetime(), occurrenceIds: z.tuple([z.string(), z.string()]), eventIds: z.tuple([idSchema, idSchema]), titles: z.tuple([z.string(), z.string()]) });
export const calendarPolicyActionSchema=z.enum(["create_private_event","create_commitment","add_preparation","queue_external_calendar_action"]);
export const calendarPolicyRuleSchema=z.object({id:idSchema,sourceKind:z.enum(["owner_note","provider_structured_event","provider_message","school_record"]),action:calendarPolicyActionSchema,enabled:z.boolean(),confirmation:z.enum(["always_review","auto_local_only"]),predicate:z.object({statementKind:z.enum(["definite_plan","explicit_commitment","structured_event"]),requireResolvedDate:z.boolean(),requireResolvedIdentity:z.boolean(),encounterMode:z.enum(["any","in_person","virtual"])}).strict()}).strict().superRefine((value,context)=>{if(value.action==="queue_external_calendar_action"&&value.confirmation!=="always_review")context.addIssue({code:"custom",message:"External calendar actions always require review"});if(value.sourceKind!=="owner_note"&&value.confirmation==="auto_local_only")context.addIssue({code:"custom",message:"Only owner notes may enable automatic local-only actions"});});
const calendarPolicySetBaseSchema=z.object({rules:z.array(calendarPolicyRuleSchema).max(50)}).strict();
const uniqueCalendarPolicyRules=(value:{rules:Array<{id:string}>},context:z.RefinementCtx)=>{const ids=value.rules.map(rule=>rule.id);if(new Set(ids).size!==ids.length)context.addIssue({code:"custom",message:"Policy rule IDs must be unique"});};
export const calendarPolicySetInputSchema=calendarPolicySetBaseSchema.superRefine(uniqueCalendarPolicyRules);
export const calendarPolicySetSchema=calendarPolicySetBaseSchema.extend({vaultId:vaultIdSchema,revision:z.number().int().nonnegative(),effectSummary:z.object({enabledLocalActions:z.number().int().nonnegative(),reviewOnlyActions:z.number().int().nonnegative(),newlyEnabledRuleIds:z.array(idSchema),externalActionsAlwaysReviewed:z.literal(true)}),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable()}).superRefine(uniqueCalendarPolicyRules);
export const policyDryRunInputSchema=z.object({policy:calendarPolicyRuleSchema,sourceIds:z.array(idSchema).min(1).max(100),boundedWindow:z.object({from:z.string().datetime(),to:z.string().datetime()}).strict()}).strict().superRefine((value,context)=>{const span=Date.parse(value.boundedWindow.to)-Date.parse(value.boundedWindow.from);if(span<=0||span>90*86_400_000)context.addIssue({code:"custom",message:"Dry-run window must be positive and at most 90 days"});if(new Set(value.sourceIds).size!==value.sourceIds.length)context.addIssue({code:"custom",message:"Source IDs must be unique"});});
export const calendarPolicyDryRunResultSchema=z.object({type:z.literal("calendar_policy_dry_run"),policyRuleId:idSchema,evaluatedSources:z.number().int().nonnegative(),outcomes:z.array(z.object({sourceId:idSchema,outcome:z.enum(["suggested","blocked"]),reasonCodes:z.array(z.string())}).strict()),writesApplied:z.literal(false)}).strict();
export const automationDecisionSchema=z.object({id:idSchema,vaultId:vaultIdSchema,policyRuleId:idSchema.nullable(),sourceId:idSchema.nullable(),eventId:idSchema.nullable(),action:calendarPolicyActionSchema,outcome:z.enum(["applied","suggested","blocked"]),reasonCodes:z.array(z.string()),evidence:z.record(z.unknown()),policyRevision:z.number().int().positive(),reversible:z.boolean(),undoneAt:z.string().datetime().nullable(),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const undoCalendarDecisionSchema=z.object({expectedRevision:z.number().int().positive(),clientOperationId:z.string().min(8).max(128)}).strict();
export const calendarDecisionUndoResultSchema=z.object({decisionId:idSchema,compensation:z.enum(["event_trashed","prep_invalidated","commitment_archived"]),affectedRecordId:idSchema,writesApplied:z.literal(true),undoneAt:z.string().datetime()}).strict();

export const calendarEntityKindSchema = z.enum(["person", "place", "group", "object", "class"]);
export const calendarEntitySchema = z.object({
  id: idSchema,
  vaultId: vaultIdSchema,
  kind: calendarEntityKindSchema,
  name: z.string().min(1).max(240),
  mergedIntoEntityId: idSchema.nullable(),
  archivedAt: z.string().datetime().nullable(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  aliases:z.array(z.object({id:idSchema,alias:z.string(),scope:z.enum(["all","event_matching","search_only"]),evidenceNoteId:idSchema.nullable(),revision:z.number().int().positive()}).strict()).default([]),
  sourceLinks:z.array(z.object({kind:z.enum(["alias_evidence","commitment_evidence"]),sourceNoteId:idSchema,recordId:idSchema}).strict()).default([]),
  dependencies:z.object({eventCount:z.number().int().nonnegative(),activeCommitmentCount:z.number().int().nonnegative(),otherCommitmentCount:z.number().int().nonnegative()}).strict().default({eventCount:0,activeCommitmentCount:0,otherCommitmentCount:0})
});
export const personSummarySchema=z.object({id:idSchema,name:z.string(),roles:z.array(z.enum(["contact","teacher"])),aliases:z.array(z.string()),activeCommitmentCount:z.number().int().nonnegative(),upcomingEventCount:z.number().int().nonnegative(),revision:z.number().int().positive(),updatedAt:z.string().datetime()}).strict();
export const createCalendarEntitySchema = z.object({ kind: calendarEntityKindSchema, name: z.string().trim().min(1).max(240) });
export const updateCalendarEntitySchema = z.object({ name: z.string().trim().min(1).max(240) }).strict();
export const entityAliasScopeSchema = z.enum(["all", "event_matching", "search_only"]);
export const entityAliasSchema = z.object({ id: idSchema, entityId: idSchema, alias: z.string().min(1).max(240), scope: entityAliasScopeSchema, evidenceNoteId: idSchema.nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime() }).strict();
export const addEntityAliasSchema = z.object({ alias: z.string().trim().min(1).max(240), scope: entityAliasScopeSchema, evidenceNoteId: idSchema.nullable().optional() }).strict();
export const previewEntityMergeSchema = z.object({ entityIds: z.array(idSchema).min(2).max(50), targetId: idSchema, reason: z.string().trim().min(1).max(1000) }).strict().superRefine((value, context) => { const ids = new Set(value.entityIds); if (ids.size !== value.entityIds.length) context.addIssue({ code: "custom", message: "Entity IDs must be unique" }); if (!ids.has(value.targetId)) context.addIssue({ code: "custom", message: "Target entity must be included" }); });

export const commitmentStatusSchema = z.enum(["active", "fulfilled", "cancelled", "superseded"]);
export const commitmentCandidateSchema = z.object({
  evidenceQuote: z.string().trim().min(1).max(1000),
  personName: z.string().trim().min(1).max(120),
  objectLabel: z.string().trim().min(1).max(240),
  kind: z.literal("return_object"),
  conditionKind: z.literal("next_meeting_with_person")
}).strict();
export const noteCommitmentCandidateSchema = commitmentCandidateSchema.extend({
  id: idSchema, noteId: idSchema, noteRevision: z.number().int().positive(),
  state: z.enum(["proposed", "accepted", "dismissed"]),
  commitmentId: idSchema.nullable(), createdAt: z.string().datetime()
});
export const decideCommitmentCandidateSchema = z.object({ expectedNoteRevision: z.number().int().positive(), decision: z.enum(["accept", "dismiss"]) }).strict();
export const commitmentSchema = z.object({
  id: idSchema,
  vaultId: vaultIdSchema,
  text: z.string(),
  personEntityId: idSchema,
  objectEntityId: idSchema.nullable(),
  objectLabel: z.string().min(1).max(240),
  sourceNoteId: idSchema.nullable(),
  sourceNoteRevision: z.number().int().positive().nullable().optional(),
  sourceQuote: z.string().nullable().optional(),
  conditionKind: z.literal("next_meeting_with_person"),
  status: commitmentStatusSchema,
  revision: z.number().int().positive(),
  createdAt: z.string().datetime()
});
export const personContextSchema=z.object({person:personSummarySchema,activeCommitments:z.array(commitmentSchema),upcomingPlans:z.array(z.object({eventId:idSchema,title:z.string(),startsAt:z.string().datetime(),endsAt:z.string().datetime(),timezone:z.string(),revision:z.number().int().positive()}).strict()),borrowedItems:z.array(z.object({commitmentId:idSchema,objectEntityId:idSchema.nullable(),objectLabel:z.string(),status:commitmentStatusSchema,sourceNoteId:idSchema.nullable()}).strict()),discussionNotes:z.array(z.object({noteId:idSchema,title:z.string(),revision:z.number().int().positive()}).strict()),identityPolicy:z.literal("exact_canonical_entity_only"),privateSourcePolicy:z.literal("owner_vault_and_explicit_links_only"),personalityInferences:z.literal(false),generatedAt:z.string().datetime()}).strict();
export const proposeSocialTimeSchema=z.object({window:z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime()}).strict(),durationEstimate:z.number().int().min(15).max(480),userConstraintsRevision:z.number().int().nonnegative(),connectedAvailabilityScope:z.object({connectionIds:z.array(idSchema).min(1).max(10)}).strict().nullable().default(null)}).strict().superRefine((value,context)=>{const duration=Date.parse(value.window.endsAt)-Date.parse(value.window.startsAt);if(duration<=0)context.addIssue({code:"custom",path:["window"],message:"Social-time window must move forward"});if(duration>90*86_400_000)context.addIssue({code:"custom",path:["window"],message:"Social-time window may not exceed 90 days"});if(value.connectedAvailabilityScope&&new Set(value.connectedAvailabilityScope.connectionIds).size!==value.connectedAvailabilityScope.connectionIds.length)context.addIssue({code:"custom",path:["connectedAvailabilityScope","connectionIds"],message:"Connection IDs must be unique"});});
export const socialTimeProposalResultSchema=z.object({type:z.literal("social_time_proposal"),personId:idSchema,userConstraintsRevision:z.number().int().nonnegative(),window:z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime()}).strict(),durationEstimate:z.number().int().min(15).max(480),candidates:z.array(z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime(),ownerAvailability:z.literal("free"),otherPersonAvailability:z.enum(["explicitly_shared_free","unknown"]),evidenceConnectionIds:z.array(idSchema)}).strict()).max(10),connectedAvailabilityScope:z.array(idSchema),limitations:z.array(z.string()),invitationsSent:z.literal(false),writesApplied:z.literal(false)}).strict();
export const createCommitmentSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  personEntityId: idSchema,
  objectEntityId: idSchema.nullable().optional(),
  objectLabel: z.string().trim().min(1).max(240),
  sourceNoteId: idSchema.nullable().optional(),
  conditionKind: z.literal("next_meeting_with_person")
});
export const commitmentEvidenceKindSchema = z.enum(["owner_confirmed_action", "source_note", "owner_correction", "superseded_by_new_commitment"]);
export const updateCommitmentSchema = z.object({
  text: z.string().trim().min(1).max(1000).optional(), personEntityId: idSchema.optional(), objectEntityId: idSchema.nullable().optional(), objectLabel: z.string().trim().min(1).max(240).optional(),
  status: commitmentStatusSchema.optional(), evidenceKind: commitmentEvidenceKindSchema.optional(), evidenceNoteId: idSchema.nullable().optional(), reason: z.string().trim().min(1).max(1000).nullable().optional()
}).strict().refine((value) => Object.keys(value).length > 0, "A commitment update must change a field").superRefine((value, context) => {
  if (value.status && !value.evidenceKind) context.addIssue({ code: "custom", message: "A status transition requires explicit evidence kind" });
  if (value.evidenceKind === "source_note" && !value.evidenceNoteId) context.addIssue({ code: "custom", message: "Source-note evidence requires a note ID" });
  if (!value.status && (value.evidenceKind || value.evidenceNoteId || value.reason)) context.addIssue({ code: "custom", message: "Transition evidence is valid only with a status change" });
});
export const rematchCommitmentSchema = z.object({ expectedRevision: z.number().int().positive(), clientOperationId: z.string().min(8).max(128) }).strict();
export const commitmentStatusHistorySchema = z.object({ id: idSchema, fromStatus: commitmentStatusSchema.nullable(), toStatus: commitmentStatusSchema, actor: z.enum(["owner", "system"]), evidenceKind: z.enum(["creation", "owner_confirmed_action", "source_note", "owner_correction", "superseded_by_new_commitment", "archive"]), evidenceNoteId: idSchema.nullable(), reason: z.string().nullable(), createdAt: z.string().datetime() }).strict();
export const prepItemSchema = z.object({
  id: idSchema,
  eventId: idSchema,
  commitmentId: idSchema.nullable(),
  occurrenceId: z.string().nullable(),
  type: z.enum(["bring", "review", "checklist", "custom"]),
  text: z.string(),
  status: z.enum(["needed", "packed", "dismissed", "completed"]),
  evidenceNoteId: idSchema.nullable(),
  provenance: z.object({ origin: z.enum(["owner", "commitment_rule", "system"]), sourceId: idSchema.nullable().optional(), matchedAliasId: idSchema.nullable().optional() }),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime()
});
export const commitmentDetailSchema = z.object({ commitment: commitmentSchema, person: calendarEntitySchema, object: calendarEntitySchema.nullable(), sourceEvidence: z.object({ noteId: idSchema, title: z.string(), revision: z.number().int().positive() }).nullable(), bindings: z.array(z.object({ prepItem: prepItemSchema, event: calendarEventSchema })), statusHistory: z.array(commitmentStatusHistorySchema) }).strict();
export const createPrepItemSchema = z.object({ occurrenceId: z.string().max(300).nullable().optional(), type: z.enum(["bring", "review", "checklist", "custom"]), text: z.string().trim().min(1).max(1000), evidenceNoteId: idSchema.nullable().optional(), commitmentId: idSchema.nullable().optional() });
export const refreshPrivateEventContextSchema=z.object({occurrenceId:z.string().min(1).max(300).nullable().default(null),expectedRevision:z.number().int().positive()}).strict();
export const eventReminderScheduleSchema=z.object({minutesBefore:z.number().int().min(0).max(10080)}).strict();
const eventReminderPlanInputShape={occurrenceScope:z.enum(["series","occurrence"]),occurrenceId:z.string().min(1).max(300).nullable().default(null),schedules:z.array(eventReminderScheduleSchema).min(1).max(10).refine(items=>new Set(items.map(item=>item.minutesBefore)).size===items.length,"Reminder schedules must be unique"),channels:z.array(notificationChannelSchema).min(1).max(2).refine(items=>new Set(items).size===items.length,"Reminder channels must be unique")};
const validateEventReminderScope=(value:{occurrenceScope:"series"|"occurrence";occurrenceId:string|null},context:z.RefinementCtx)=>{if((value.occurrenceScope==="occurrence")!==Boolean(value.occurrenceId))context.addIssue({code:"custom",message:"Occurrence scope requires exactly one occurrence ID"});};
export const setEventReminderPlanSchema=z.object(eventReminderPlanInputShape).strict().superRefine(validateEventReminderScope);
export const eventReminderPlanSchema=z.object({...eventReminderPlanInputShape,schedules:z.array(eventReminderScheduleSchema).max(10),eventId:idSchema,vaultId:vaultIdSchema,eventRevision:z.number().int().positive(),revision:z.number().int().nonnegative(),nextTriggers:z.array(z.object({scheduledFor:z.string().datetime(),minutesBefore:z.number().int().nonnegative(),channels:z.array(notificationChannelSchema)})),deliverability:z.object({inApp:z.literal("durable_queue"),windowsNative:z.enum(["not_requested","unverified_host_delivery"]),guaranteedOsDelivery:z.literal(false),quietHoursApplied:z.boolean()}).strict(),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable()}).strict().superRefine(validateEventReminderScope);
export const updatePrepItemSchema = z.object({ expectedRevision: z.number().int().positive(), text: z.string().trim().min(1).max(1000).optional(), status: z.enum(["needed", "packed", "dismissed", "completed"]).optional() });

export const searchKindSchema = z.enum(["note", "task", "calendar_event"]);
export const searchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  mode: z.enum(["lexical", "hybrid", "semantic"]).default("lexical"),
  scope: z.object({ kinds: z.array(searchKindSchema).min(1).max(3).default(["note", "task", "calendar_event"]) }).default({ kinds: ["note", "task", "calendar_event"] }),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).optional()
});
export const searchItemSchema = z.object({
  kind: searchKindSchema,
  id: idSchema,
  title: z.string(),
  excerpt: z.string(),
  score: z.number().nonnegative(),
  sourceId: idSchema.nullable(),
  revision: z.number().int().positive(),
  updatedAt: z.string().datetime()
});
export const searchResultSchema = z.object({
  mode: z.enum(["lexical", "hybrid", "semantic"]),
  query: z.string(),
  items: z.array(searchItemSchema),
  coverage: z.object({ kinds: z.array(searchKindSchema), semanticAvailable: z.boolean() }),
  nextCursor: z.string().nullable()
});

export const chatEvidenceKindSchema = z.enum(["note", "task", "calendar_event", "school_assessment"]);
export const chatScopeSchema = z.object({ kinds: z.array(chatEvidenceKindSchema).min(1).max(4).default(["note", "school_assessment"]) });
export const chatSchema = z.object({
  id: idSchema, vaultId: vaultIdSchema, title: z.string().max(240).nullable(),
  defaultMode: z.enum(["notes", "tutor", "calendar", "profile", "brainstorm"]),
  defaultScope: chatScopeSchema, createdAt: z.string().datetime(), updatedAt: z.string().datetime()
});
export const createChatSchema = z.object({ title: z.string().trim().min(1).max(240).optional(), defaultMode: z.enum(["notes", "tutor", "calendar", "profile", "brainstorm"]).default("notes"), defaultScope: chatScopeSchema.default({ kinds: ["note", "school_assessment"] }) });
export const noteCitationSchema = z.object({ citationId: z.string().min(1).max(40), kind: z.literal("note").optional(), chunkId: idSchema, noteId: idSchema, sourceId: idSchema, revision: z.number().int().positive(), title: z.string(), startOffset: z.number().int().nonnegative(), endOffset: z.number().int().positive(), quote: z.string().min(1).max(4000) });
export const assessmentCitationSchema = z.object({ citationId: z.string().min(1).max(40), kind: z.literal("school_assessment"), assessmentId: idSchema, revision: z.number().int().positive(), title: z.string(), quote: z.string().min(1).max(4000) });
export const citationSchema = z.union([noteCitationSchema, assessmentCitationSchema]);
export const chatMessageSchema = z.object({
  id: idSchema, chatId: idSchema, clientMessageId: z.string().nullable(), role: z.enum(["user", "assistant"]), text: z.string(),
  mode: z.enum(["grounded", "brainstorm"]), status: z.enum(["persisted", "waiting_for_worker", "running", "succeeded", "failed", "cancelled"]),
  answerToId: idSchema.nullable(), jobId: idSchema.nullable(), citations: z.array(citationSchema), createdAt: z.string().datetime(), updatedAt: z.string().datetime()
});
export const createChatMessageSchema = z.object({ clientMessageId: z.string().trim().min(1).max(120), text: z.string().trim().min(1).max(8000), mode: z.enum(["grounded", "brainstorm"]).default("grounded"), scope: chatScopeSchema.optional(), queueWhenOffline: z.boolean().default(true) });
export const artifactGenerationKindSchema=z.enum(["summary","project_brief","comparison","outline","study_questions","checklist","catch_up","lesson_summary"]);
export const artifactScopeSchema=z.object({noteIds:z.array(idSchema).max(30).default([]),sourceIds:z.array(idSchema).max(30).default([]),courseIds:z.array(idSchema).max(20).default([]),projectIds:z.array(idSchema).max(20).default([])}).strict().superRefine((value,context)=>{const all=[...value.noteIds,...value.sourceIds,...value.courseIds,...value.projectIds];if(!all.length)context.addIssue({code:"custom",message:"Generation scope requires at least one explicit record"});if(new Set(all).size!==all.length)context.addIssue({code:"custom",message:"Generation scope IDs must be unique across the request"});});
export const generateArtifactSchema=z.object({kind:artifactGenerationKindSchema,scope:artifactScopeSchema,instructions:z.string().trim().max(4000).optional(),outputLanguage:z.string().trim().min(2).max(35).optional(),targetGeneratedNoteId:idSchema.optional(),expectedRevision:z.number().int().positive().optional()}).strict().superRefine((value,context)=>{if(Boolean(value.targetGeneratedNoteId)!==Boolean(value.expectedRevision))context.addIssue({code:"custom",message:"Generated-note refresh requires both target and expected revision"});});
export const askHandleSchema=z.object({jobId:idSchema,userMessageId:idSchema,answerMessageId:idSchema,status:z.enum(["waiting_for_worker","running","succeeded","failed","cancelled"])}).strict();
export const searchSuggestionsSchema=z.object({labels:z.array(z.object({id:idSchema,name:z.string()}).strict()),titles:z.array(z.object({kind:searchKindSchema,id:idSchema,title:z.string()}).strict()),savedQueries:z.array(z.object({id:idSchema,title:z.string(),query:z.string()}).strict())}).strict();
export const resolvedNoteCitationSchema=z.object({source:z.object({id:idSchema,kind:z.string(),contentHash:z.string().length(64),available:z.boolean()}).strict(),revision:z.object({noteId:idSchema,citedRevision:z.number().int().positive(),currentRevision:z.number().int().positive().nullable()}).strict(),anchor:z.object({chunkId:idSchema,startOffset:z.number().int().nonnegative(),endOffset:z.number().int().positive()}).strict(),exactExcerpt:z.string().min(1).max(4000),currentNoteLink:z.object({noteId:idSchema,title:z.string(),path:z.string()}).strict().nullable(),historical:z.boolean()}).strict();
export const resolvedAssessmentCitationSchema=z.object({kind:z.literal("school_assessment"),assessmentId:idSchema,citedRevision:z.number().int().positive(),currentRevision:z.number().int().positive().nullable(),title:z.string(),exactExcerpt:z.string().min(1).max(4000),currentAssessmentLink:z.object({assessmentId:idSchema,title:z.string(),path:z.string()}).strict().nullable(),historical:z.boolean()}).strict();
export const resolvedCitationSchema=z.union([resolvedNoteCitationSchema,resolvedAssessmentCitationSchema]);

export const scheduleReasonCodeSchema = z.enum(["preferred_window", "earliest_feasible", "bounded_block", "short_final_block", "unknown_effort", "exceeds_unsplittable_maximum", "deadline_before_horizon", "no_capacity"]);
export const schedulePlacementSchema = z.object({ taskId: idSchema, startsAt: z.string().datetime(), endsAt: z.string().datetime(), minutes: z.number().int().positive(), reasonCodes: z.array(scheduleReasonCodeSchema).min(1) });
export const unscheduledWorkSchema = z.object({ taskId: idSchema, remainingMinutes: z.number().int().nonnegative().nullable(), reasonCodes: z.array(scheduleReasonCodeSchema).min(1) });
export const schedulePreviewResultSchema = z.object({ type: z.literal("schedule_preview"), proposalId: idSchema, constraintsRevision: z.number().int().nonnegative(), inputRevisions: z.record(z.number().int().positive()), calendarDigest: z.string().length(64), horizon: z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime() }), placements: z.array(schedulePlacementSchema), unscheduled: z.array(unscheduledWorkSchema), unknownAvailability: z.array(z.string()), algorithmVersion: z.literal("deterministic-scheduler-v1"), writesApplied: z.literal(false) });
export const scheduleExplanationSchema=z.object({proposalId:idSchema,status:z.enum(["draft","approved","rejected","withdrawn","superseded","expired"]),stale:z.boolean(),algorithmVersion:z.literal("deterministic-scheduler-v1"),horizon:z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime()}),constraintsRevision:z.number().int().nonnegative(),calendarDigest:z.string().length(64),inputRevisions:z.record(z.number().int().positive()),placements:z.array(schedulePlacementSchema.extend({explanations:z.array(z.string()).min(1)})),unscheduled:z.array(unscheduledWorkSchema.extend({explanations:z.array(z.string()).min(1)})),unknownAvailability:z.array(z.string()),writesApplied:z.boolean()});
export const proposalApplyResultSchema = z.object({ type: z.literal("proposal_apply"), proposalId: idSchema, createdEventIds: z.array(idSchema), undoManifestId: idSchema, writesApplied: z.literal(true) });
export const providerCalendarActionApplyResultSchema=z.object({type:z.literal("provider_calendar_action_apply"),proposalId:idSchema,actionId:idSchema,writesApplied:z.literal(true),externalDelivery:z.literal(false)});
export const entityMergeApplyResultSchema=z.object({type:z.literal("entity_merge_apply"),proposalId:idSchema,targetEntityId:idSchema,mergedEntityIds:z.array(idSchema).min(1),affectedEventIds:z.array(idSchema),affectedCommitmentIds:z.array(idSchema),writesApplied:z.literal(true)});
export const contentProposalApplyResultSchema=z.object({type:z.literal("content_proposal_apply"),proposalId:idSchema,kind:z.enum(["merge_notes","split_note","merge_labels","bulk_reassign","idea_promotion"]),createdRecordIds:z.array(idSchema),updatedRecordIds:z.array(idSchema),applicationId:idSchema,writesApplied:z.literal(true)});
export const urlCaptureResultSchema=z.object({type:z.literal("url_capture"),captureId:idSchema,noteId:idSchema,requestedUrl:z.string().url(),finalUrl:z.string().url(),redirectCount:z.number().int().min(0).max(5),byteLength:z.number().int().nonnegative().max(5*1024*1024),writesApplied:z.literal(true)});
export const artifactGenerationResultSchema=z.object({type:z.literal("artifact_generation"),noteId:idSchema,noteRevision:z.number().int().positive(),kind:artifactGenerationKindSchema,created:z.boolean(),sourceRecordIds:z.array(idSchema).min(1).max(100),writesApplied:z.literal(true)});
export const undoProposalSchema = z.object({ expectedProposalRevision: z.number().int().positive(), confirmation: z.literal("undo_schedule") });
export const proposalUndoReceiptSchema = z.object({ proposalId: idSchema, applicationId: idSchema, trashedEventIds: z.array(idSchema), undoneAt: z.string().datetime(), writesApplied: z.literal(true) });
export const studyPlanGenerationResultSchema = z.object({ type: z.literal("study_plan_generation"), studyPlanId: idSchema, unitCount: z.number().int().nonnegative(), taskIds: z.array(idSchema), writesApplied: z.literal(true) });
export const studyExerciseGenerationResultSchema = z.object({ type: z.literal("study_exercise_generation"), exerciseIds: z.array(idSchema).min(1), writesApplied: z.literal(true) });
export const studyAttemptFeedbackResultSchema = z.object({ type: z.literal("study_attempt_feedback"), attemptId: idSchema, writesApplied: z.literal(true) });
export const catchUpPlanResultSchema=z.object({type:z.literal("catch_up_plan"),lessonIds:z.array(idSchema),coveredLessons:z.array(z.object({lessonId:idSchema,sourceIds:z.array(idSchema),anchorIds:z.array(idSchema),suggestedActions:z.array(z.object({kind:z.enum(["read_source","review_notes","check_assignment"]),sourceId:idSchema,label:z.string(),estimatedMinutes:z.number().int().positive().nullable()}))})),uncoveredLessonIds:z.array(idSchema),message:z.string(),writesApplied:z.literal(false)});
export const insightGenerationResultSchema=z.object({type:z.literal("insight_generation"),insightId:idSchema,writesApplied:z.literal(true)});
export const createSyncSnapshotSchema = z.object({ deviceId: idSchema }).strict();
export const syncSnapshotEntrySchema = z.object({ recordType: syncRecordTypeSchema, recordId: idSchema, revision: z.number().int().nonnegative(), changeKind: z.enum(["upsert", "tombstone"]) }).strict();
export const syncSnapshotResultSchema = z.object({ type: z.literal("sync_snapshot"), protocolVersion: z.literal(1), snapshotId: idSchema, requestedForDeviceId: idSchema, watermarkCursor: z.string().min(1), entries: z.array(syncSnapshotEntrySchema).max(20000), entryCount: z.number().int().min(0).max(20000), generatedAt: z.string().datetime(), writesApplied: z.literal(false) }).strict();
const syncOperationIdSchema = idSchema;
export const syncOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("note_yjs_update"), operationId: syncOperationIdSchema, noteId: idSchema, baseRevision: z.number().int().positive(), updateBase64: z.string().min(4).max(1_500_000).regex(/^[A-Za-z0-9+/]*={0,2}$/).refine(value=>value.length%4===0,"Yjs update must be canonical base64") }).strict(),
  z.object({ type: z.literal("task_create"), operationId: syncOperationIdSchema, taskId: idSchema, command: createTaskSchema }).strict(),
  z.object({ type: z.literal("task_update"), operationId: syncOperationIdSchema, taskId: idSchema, expectedRevision: z.number().int().positive(), patch: updateTaskSchema.shape.patch }).strict(),
  z.object({ type: z.literal("calendar_event_create"), operationId: syncOperationIdSchema, eventId: idSchema, command: createCalendarEventSchema }).strict(),
  z.object({ type: z.literal("calendar_event_update"), operationId: syncOperationIdSchema, eventId: idSchema, command: updateCalendarEventSchema }).strict(),
  z.object({ type: z.literal("calendar_event_trash"), operationId: syncOperationIdSchema, eventId: idSchema, expectedRevision: z.number().int().positive(), scope: z.literal("series") }).strict()
]);
export const pushSyncSchema = z.object({ deviceId: idSchema, operations: z.array(syncOperationSchema).min(1).max(100), lastCursor: z.string().min(1) }).strict().superRefine((value, context) => { const ids=value.operations.map(operation=>operation.operationId);if(new Set(ids).size!==ids.length)context.addIssue({code:"custom",message:"Sync operation IDs must be unique within a batch",path:["operations"]}); });
export const syncConflictSchema = z.object({ operationId: syncOperationIdSchema, code: z.enum(["stale_revision","record_not_found","record_tombstoned","record_already_exists","invalid_command","operation_id_reused"]), currentRevision: z.number().int().nonnegative().nullable(), tombstoned: z.boolean() }).strict();
export const syncAckSchema = z.object({ acceptedOperationIds: z.array(syncOperationIdSchema).max(100), cursor: z.string().min(1), conflicts: z.array(syncConflictSchema).max(100) }).strict();
export const syncSocketClientFrameSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("hello"),protocolVersion:z.literal(1),deviceId:idSchema,cursor:z.string().min(1),mode:z.enum(["read_only","read_write"])}).strict(),
  z.object({type:z.literal("push"),requestId:idSchema,lastCursor:z.string().min(1),operations:z.array(syncOperationSchema).min(1).max(100)}).strict(),
  z.object({type:z.literal("ping"),nonce:z.string().min(1).max(100)}).strict()
]);
export const performanceRecommendationHorizonSchema=z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict();
export const generatePerformanceRecommendationsSchema=z.object({courseIds:z.array(idSchema).max(50).default([]),horizon:performanceRecommendationHorizonSchema,sourceScope:z.object({sourceIds:z.array(idSchema).max(100).default([])}).strict().default({sourceIds:[]}),goalIds:z.array(idSchema).max(50).default([])}).strict().superRefine((value,context)=>{const days=(Date.parse(`${value.horizon.to}T00:00:00Z`)-Date.parse(`${value.horizon.from}T00:00:00Z`))/86400000;if(days<0||days>366)context.addIssue({code:"custom",path:["horizon"],message:"Recommendation horizon must be ordered and at most 366 days"});if(value.courseIds.length!==new Set(value.courseIds).size)context.addIssue({code:"custom",path:["courseIds"],message:"Course IDs must be unique"});});
export const performanceRecommendationsResultSchema=z.object({type:z.literal("performance_recommendations"),horizon:performanceRecommendationHorizonSchema,recommendations:z.array(z.object({courseId:idSchema,title:z.string(),rationale:z.string(),factors:z.array(z.object({kind:z.enum(["target","assessment","knowledge_gap","remaining_effort","goal"]),recordId:idSchema.nullable(),summary:z.string()}).strict()),uncertainty:z.string(),suggestedMinutes:z.number().int().positive().nullable(),sourceIds:z.array(idSchema)}).strict()).max(50),coverage:z.object({courseCount:z.number().int().nonnegative(),assessmentCount:z.number().int().nonnegative(),gapCount:z.number().int().nonnegative(),tasksWithKnownEffort:z.number().int().nonnegative(),tasksWithUnknownEffort:z.number().int().nonnegative()}).strict(),writesApplied:z.literal(false)}).strict();
export const proposeTaskBreakdownSchema=z.object({sourceScope:z.object({sourceIds:z.array(idSchema).min(1).max(30)}).strict(),maxSessionMinutes:z.number().int().min(5).max(240).nullable().default(null),remainingWork:z.object({minutes:z.number().int().positive().max(100000).optional(),description:z.string().trim().min(1).max(4000).optional()}).strict().nullable().default(null)}).strict().superRefine((value,context)=>{if(new Set(value.sourceScope.sourceIds).size!==value.sourceScope.sourceIds.length)context.addIssue({code:"custom",path:["sourceScope","sourceIds"],message:"Source IDs must be unique"});if(value.remainingWork&&!value.remainingWork.minutes&&!value.remainingWork.description)context.addIssue({code:"custom",path:["remainingWork"],message:"Remaining work needs minutes or a description"});});
export const taskBreakdownProposalResultSchema=z.object({type:z.literal("task_breakdown_proposal"),taskId:idSchema,taskRevision:z.number().int().positive(),steps:z.array(z.object({stepId:z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),title:z.string().trim().min(1).max(500),description:z.string().trim().min(1).max(4000),dependsOnStepIds:z.array(z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/)).max(20),sourceIds:z.array(idSchema).min(1).max(30),estimatedMinutes:z.number().int().min(5).max(240),estimateOrigin:z.literal("model")}).strict()).min(1).max(100),maxSessionMinutes:z.number().int().min(5).max(240).nullable(),uncertainty:z.string().trim().min(1).max(2000),writesApplied:z.literal(false)}).strict();
const schoolImportRecordKindSchema=z.enum(["subject","course","lesson","assignment","assessment","material","attendance","grade"]);
export const previewSchoolImportSchema=z.object({attachmentId:idSchema,format:z.enum(["auto","omega_school_json_v1"]),mapping:z.record(schoolImportRecordKindSchema).nullable().default(null),sourceTimestamp:z.string().datetime(),timezone:z.string().trim().min(1).max(100),period:z.object({from:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),to:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).strict().nullable().default(null)}).strict().superRefine((value,context)=>{const entries=Object.entries(value.mapping??{});if(entries.length>20||entries.some(([key])=>!/^[a-z0-9_.-]{1,80}$/.test(key)))context.addIssue({code:"custom",path:["mapping"],message:"School mapping keys must be finite registered identifiers"});if(value.period&&value.period.to<value.period.from)context.addIssue({code:"custom",path:["period"],message:"School import period must move forward"});});
export const schoolImportPreviewResultSchema=z.object({type:z.literal("school_import_preview"),detectedFormat:z.literal("omega_school_json_v1"),sourceTimestamp:z.string().datetime(),timezone:z.string(),period:z.object({from:z.string(),to:z.string()}).nullable(),counts:z.record(z.number().int().nonnegative()),sample:z.array(z.object({kind:schoolImportRecordKindSchema,externalId:z.string(),title:z.string()}).strict()).max(20),warnings:z.array(z.string()),snapshotOnly:z.literal(true),liveConnectionCreated:z.literal(false),writesApplied:z.literal(false)}).strict();
export const applySchoolImportSchema=z.object({previewJobId:idSchema}).strict();
const schoolImportActionCountsSchema=z.object({created:z.number().int().nonnegative(),updated:z.number().int().nonnegative(),linked:z.number().int().nonnegative(),unchanged:z.number().int().nonnegative(),stale:z.number().int().nonnegative()}).strict();
export const schoolImportApplyResultSchema=z.object({type:z.literal("school_import_apply"),previewJobId:idSchema,sourceTimestamp:z.string().datetime(),counts:z.object({subject:schoolImportActionCountsSchema,course:schoolImportActionCountsSchema,lesson:schoolImportActionCountsSchema,attendance:schoolImportActionCountsSchema.default({created:0,updated:0,linked:0,unchanged:0,stale:0}),grade:schoolImportActionCountsSchema.default({created:0,updated:0,linked:0,unchanged:0,stale:0})}).strict(),snapshotOnly:z.literal(true),liveConnectionCreated:z.literal(false),writesApplied:z.literal(true),limitations:z.array(z.string())}).strict();
export const jobKindSchema = z.enum(["note_process", "hybrid_search", "semantic_search", "ai_setup_test", "index_rebuild", "answer_generation", "schedule_preview", "proposal_apply", "calendar_policy_dry_run", "commitment_rematch", "calendar_context_refresh", "calendar_brief_refresh", "calendar_import_preview", "export_generate", "study_plan_generate", "study_exercise_generate", "study_attempt_feedback", "catch_up_plan", "insight_generate", "profile_refresh", "sync_snapshot", "domain_tool_run", "source_refresh", "transcript_analysis", "url_capture", "artifact_generate","performance_recommendations","task_breakdown","natural_language_command","connection_probe","profile_rebuild","personal_data_sync","import_plan","import_apply","school_import_preview","school_import_apply","social_time_proposal","note_purge"]);
export const jobStatusSchema = z.enum(["queued", "waiting_for_worker", "running", "succeeded", "failed", "cancelled", "superseded"]);
export const jobHandleSchema = z.object({
  id: idSchema,
  kind: jobKindSchema,
  status: jobStatusSchema,
  createdAt: z.string().datetime()
});
export const chatMessageAcceptedSchema = z.object({ userMessage: chatMessageSchema, assistantMessage: chatMessageSchema, job: jobHandleSchema });
export const typedJobResultSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("search"), search: searchResultSchema }),
  z.object({ type: z.literal("note_processing"), noteId: idSchema, processedRevision: z.number().int().positive(), classification: z.enum(["note", "task", "event", "idea", "reference", "unknown"]), suggestedTitle: z.string().max(240).nullable(), commitmentCandidates: z.array(commitmentCandidateSchema).max(5).default([]) }),
  z.object({ type: z.literal("ai_setup_test"), completion: z.boolean(), structuredOutput: z.boolean(), embeddings: z.boolean() }),
  z.object({ type: z.literal("index_rebuild"), indexedRevisions: z.number().int().nonnegative() }),
  z.object({ type: z.literal("answer"), chatId: idSchema, messageId: idSchema, answer: z.string().min(1).max(20000), citations: z.array(citationSchema), actionReceipt:z.object({calendarEventId:idSchema,reminderId:idSchema,remindAt:z.string().datetime()}).strict().nullable().optional() }),
  schedulePreviewResultSchema,
  proposalApplyResultSchema,
  providerCalendarActionApplyResultSchema,
  entityMergeApplyResultSchema,
  contentProposalApplyResultSchema,
  urlCaptureResultSchema,
  artifactGenerationResultSchema,
  performanceRecommendationsResultSchema,
  taskBreakdownProposalResultSchema,
  calendarPolicyDryRunResultSchema,
  z.object({type:z.literal("study_plan_withdrawal_apply"),proposalId:idSchema,studyPlanId:idSchema,trashedEventIds:z.array(idSchema),affectedTaskIds:z.array(idSchema),historyDeleted:z.literal(false),fixedOrExternalEventsDeleted:z.literal(false),writesApplied:z.literal(true)}).strict(),
  z.object({type:z.literal("commitment_rematch"),matchedEvents:z.number().int().nonnegative(),createdBindings:z.number().int().nonnegative(),writesApplied:z.boolean()}),
  z.object({type:z.literal("calendar_context_refresh"),eventId:idSchema,eventRevision:z.number().int().positive(),matchedCommitments:z.number().int().nonnegative(),createdPrepItems:z.number().int().nonnegative(),staleContext:z.boolean(),writesApplied:z.boolean()}),
  z.object({type:z.literal("calendar_brief_refresh"),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timezone:z.string(),briefRevision:z.number().int().positive(),sourceCount:z.number().int().nonnegative(),writesApplied:z.literal(true)}),
  z.object({type:z.literal("calendar_import_preview"),proposalId:idSchema,counts:calendarImportPreviewSchema.shape.counts,warnings:z.array(z.string()),invitationsSent:z.literal(false),writesApplied:z.literal(false)}),
  z.object({type:z.literal("export_generate"),exportId:idSchema,format:z.enum(["markdown_bundle","full_fidelity","ics"]),byteLength:z.number().int().nonnegative(),sha256:sha256Schema,expiresAt:z.string().datetime(),writesApplied:z.literal(true)}),
  z.object({type:z.literal("domain_tool_run"),toolName:z.enum(["search_notes","get_note_summary"]),output:z.record(z.unknown()),writesApplied:z.literal(false)}),
  z.object({type:z.literal("natural_language_command"),intent:z.enum(["search_notes","get_note_summary","needs_clarification"]),toolName:z.enum(["search_notes","get_note_summary"]).nullable(),output:z.record(z.unknown()).nullable(),clarification:z.string().nullable(),policyRevision:z.number().int().nonnegative(),writesApplied:z.literal(false),externalWritesAuthorized:z.literal(false)}).strict(),
  z.object({type:z.literal("transcript_analysis"),transcriptId:idSchema,artifactId:idSchema,sourceRevision:z.number().int().positive(),scope:z.enum(["concept_summary","instructions","homework","dates","questions","all"]),writesApplied:z.literal(true)}),
  studyPlanGenerationResultSchema,
  studyExerciseGenerationResultSchema,
  studyAttemptFeedbackResultSchema,
  catchUpPlanResultSchema,
  insightGenerationResultSchema,
  profileRefreshResultSchema,
  profileRebuildProposalResultSchema,
  importPlanResultSchema,
  importApplyResultSchema,
  schoolImportPreviewResultSchema,
  schoolImportApplyResultSchema,
  socialTimeProposalResultSchema,
  notePurgeResultSchema,
  syncSnapshotResultSchema
]);
export const jobSchema = jobHandleSchema.extend({
  vaultId: vaultIdSchema,
  stage: z.string(),
  progress: z.number().min(0).max(1).nullable(),
  result: typedJobResultSchema.nullable(),
  error: z.object({ code: z.string(), detail: z.string(), retryable: z.boolean() }).nullable(),
  cancelRequested: z.boolean(),
  attempts: z.number().int().nonnegative(),
  updatedAt: z.string().datetime()
});
export const jobEventSchema = z.object({
  jobId: idSchema,
  sequence: z.number().int().positive(),
  kind: z.enum(["accepted", "status", "progress", "completed", "failed", "cancelled"]),
  data: z.record(z.unknown()),
  createdAt: z.string().datetime()
});
export const systemJobKindSchema=z.enum(["backup_create","backup_verify","restore_plan","restore_apply","deployment_check","access_setup_preview","vault_purge"]);
export const systemJobResultSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("backup_created"),backupId:idSchema,manifestSha256:sha256Schema,writesApplied:z.literal(true)}).strict(),
  z.object({type:z.literal("backup_verified"),backupId:idSchema,verifiedAt:z.string().datetime(),complete:z.boolean(),writesApplied:z.literal(true)}).strict(),
  z.object({type:z.literal("restore_planned"),restorePlanId:idSchema,compatible:z.boolean(),planRevision:z.number().int().positive(),writesApplied:z.literal(true)}).strict(),
  z.object({type:z.literal("restore_applied"),restorePlanId:idSchema,mode:z.enum(["isolated_validation","replace_installation"]),writesApplied:z.literal(true)}).strict(),
  z.object({type:z.literal("deployment_checked"),profileId:z.literal("home-host"),checks:z.array(z.object({kind:z.enum(["database","blob_storage","canonical_origin","local_ai_endpoint","backup_destination"]),status:z.enum(["pass","fail","unknown"]),detail:z.string()}).strict()),writesApplied:z.literal(false)}).strict(),
  z.object({type:z.literal("access_setup_planned"),mode:z.enum(["tailscale_private","cloudflare_access"]),canonicalOriginCandidate:z.string().url(),prerequisites:z.array(z.object({kind:z.enum(["https_origin","loopback_service","provider_binary","owner_configuration"]),status:z.enum(["pass","fail","unknown"]),detail:z.string()}).strict()),reviewedActions:z.array(z.object({sequence:z.number().int().positive(),action:z.string().min(1),ownerConfirmationRequired:z.boolean()}).strict()).min(1),risks:z.array(z.string()),publicationApplied:z.literal(false),secretsIncluded:z.literal(false),writesApplied:z.literal(false)}).strict(),
  z.object({type:z.literal("vault_purge"),targetIdHash:sha256Schema,revokedJobs:z.number().int().nonnegative(),blobFilesDeleted:z.number().int().nonnegative(),blobFileDeleteFailures:z.number().int().nonnegative(),minimalLedgerRetained:z.literal(true),writesApplied:z.literal(true)}).strict()
]);
export const systemJobHandleSchema=z.object({id:idSchema,kind:systemJobKindSchema,status:jobStatusSchema,createdAt:z.string().datetime()}).strict();
export const systemJobSummarySchema=systemJobHandleSchema.extend({stage:z.string(),progress:z.number().min(0).max(1).nullable(),retryable:z.boolean(),updatedAt:z.string().datetime()}).strict();
export const systemJobSchema=systemJobSummarySchema.extend({result:systemJobResultSchema.nullable(),error:z.object({code:z.string(),detail:z.string(),retryable:z.boolean()}).nullable(),cancelRequested:z.boolean(),attempts:z.number().int().nonnegative()}).strict();
export const systemJobListSchema=z.object({items:z.array(systemJobSummarySchema),nextCursor:z.string().nullable()}).strict();
export const createBackupSchema=z.object({destinationId:idSchema,encryptionProfileId:z.string().trim().min(1).max(160)}).strict();
export const backupSummarySchema=z.object({id:idSchema,destinationId:idSchema,encryptionProfileId:z.string(),state:z.enum(["queued","creating","ready","verification_failed","failed"]),manifestSha256:sha256Schema.nullable(),bundleSha256:sha256Schema.nullable(),byteLength:z.number().int().nonnegative().nullable(),verifiedAt:z.string().datetime().nullable(),retentionUntil:z.string().datetime().nullable(),systemJobId:idSchema.nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const backupManifestSchema=z.object({backup:backupSummarySchema,format:z.literal("sorta-omega-backup-v2").nullable(),manifest:z.record(z.unknown()).nullable(),complete:z.boolean(),restorePrerequisites:z.array(z.string()),encrypted:z.literal(true),downloadReady:z.boolean()}).strict();
export const createRestorePlanSchema=z.object({backupId:idSchema,targetMode:z.enum(["isolated_validation","replace_installation"])}).strict();
export const applyRestoreSchema=z.object({planRevision:z.number().int().positive(),destructiveConfirmation:z.literal("replace_installation_from_verified_backup")}).strict();
export const hostResourceReportSchema=z.object({cpu:z.object({model:z.string(),logicalProcessors:z.number().int().positive(),physicalCores:z.number().int().positive().nullable()}).strict(),memory:z.object({totalBytes:z.number().int().positive(),freeBytes:z.number().int().nonnegative()}).strict(),gpus:z.array(z.object({name:z.string(),driverVersion:z.string().nullable(),adapterRamBytes:z.number().int().positive().nullable()}).strict()),disks:z.array(z.object({name:z.string(),sizeBytes:z.number().int().nonnegative(),freeBytes:z.number().int().nonnegative(),fileSystem:z.string().nullable()}).strict()),runtime:z.object({osPlatform:z.string(),osRelease:z.string(),architecture:z.string(),nodeVersion:z.string(),localAiBackend:z.enum(["ollama","openai_compatible"]),configuredModel:z.string(),endpointOrigin:z.string()}).strict(),probeState:z.object({windowsHardware:z.enum(["available","unavailable","not_applicable"]),limitations:z.array(z.string())}).strict(),observedAt:z.string().datetime()}).strict();
export const deploymentProfileSchema=z.object({profileId:z.literal("home-host"),canonicalOrigin:z.string().url(),apiBind:z.object({host:z.string(),port:z.number().int().min(1).max(65535)}).strict(),accessMode:z.enum(["local_only","private_network","public_access_proxy","unknown"]),remoteAccessConfigured:z.boolean(),database:z.enum(["available","unavailable"]),blobStorage:z.object({configuredPath:z.string(),available:z.boolean()}).strict(),backupDestinationCount:z.number().int().nonnegative(),workerCount:z.number().int().nonnegative(),localAi:z.object({backend:z.enum(["ollama","openai_compatible"]),model:z.string(),endpointOrigin:z.string(),liveVerified:z.boolean()}).strict(),diagnostics:z.array(z.string()),checkedAt:z.string().datetime()}).strict();
export const checkDeploymentSchema=z.object({profileId:z.literal("home-host"),checkKinds:z.array(z.enum(["database","blob_storage","canonical_origin","local_ai_endpoint","backup_destination"])).min(1).max(5)}).strict().superRefine((value,context)=>{if(value.checkKinds.length!==new Set(value.checkKinds).size)context.addIssue({code:"custom",message:"Deployment checks must be unique"});});
const clockTimeSchema=z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
export const resourcePolicySettingsSchema=z.object({maxInferenceConcurrency:z.number().int().min(1).max(8),backgroundBudget:z.object({maxConcurrentJobs:z.number().int().min(0).max(8),maxCpuPercent:z.number().int().min(5).max(100),maxGpuMemoryPercent:z.number().int().min(5).max(100)}).strict(),quietHours:z.object({startsAt:clockTimeSchema,endsAt:clockTimeSchema,timezone:z.string().trim().min(1).max(100)}).strict().nullable(),pauseBackground:z.boolean(),modelProfileIds:z.array(z.string().trim().min(1).max(120)).max(20),interactivePriority:z.enum(["preempt_background","queue_ahead"]),modelResidency:z.enum(["unload_when_idle","keep_active_profiles"])}).strict().superRefine((value,context)=>{if(value.modelProfileIds.length!==new Set(value.modelProfileIds).size)context.addIssue({code:"custom",path:["modelProfileIds"],message:"Model profile IDs must be unique"});if(value.quietHours&&value.quietHours.startsAt===value.quietHours.endsAt)context.addIssue({code:"custom",path:["quietHours"],message:"Quiet hours must have a non-zero duration"});});
export const resourcePolicySchema=resourcePolicySettingsSchema.and(z.object({revision:z.number().int().nonnegative(),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable()}).strict());
export const setHostResourcePolicySchema=resourcePolicySettingsSchema;
export const previewRemoteAccessSetupSchema=z.object({mode:z.enum(["tailscale_private","cloudflare_access"]),ownerConfigReference:z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/),canonicalOriginCandidate:z.string().url().max(2048)}).strict().superRefine((value,context)=>{let url:URL;try{url=new URL(value.canonicalOriginCandidate);}catch{return;}if(url.protocol!=="https:")context.addIssue({code:"custom",path:["canonicalOriginCandidate"],message:"Remote canonical origin must use HTTPS"});if(url.username||url.password)context.addIssue({code:"custom",path:["canonicalOriginCandidate"],message:"Canonical origin must not contain credentials"});if(url.pathname!=="/"||url.search||url.hash)context.addIssue({code:"custom",path:["canonicalOriginCandidate"],message:"Canonical origin must be an origin without a path, query, or fragment"});});
export const workerRuntimeStatusSchema = z.enum(["offline", "available", "busy", "error"]);
export const localModelBackendSchema = z.enum(["ollama", "openai_compatible"]);
export const workerSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  role: z.enum(["model", "scheduler", "connector"]),
  vaultIds: z.array(vaultIdSchema),
  allowedJobTypes: z.array(jobKindSchema),
  paused: z.boolean(),
  resourcePolicy: z.enum(["balanced", "low_resource", "gaming"]),
  runtimeStatus: workerRuntimeStatusSchema,
  installedProfiles: z.array(z.object({ id: z.string(), model: z.string(), digest: z.string(), backend: localModelBackendSchema.default("ollama") })),
  lastSeenAt: z.string().datetime().nullable(),
  revision: z.number().int().positive()
});
export const configureWorkerSchema = z.object({
  vaultIds: z.array(vaultIdSchema).min(1).max(50).optional(),
  allowedJobTypes: z.array(jobKindSchema).max(32).optional(),
  paused: z.boolean().optional(),
  resourcePolicy: z.enum(["balanced", "low_resource", "gaming"]).optional(),
  expectedRevision: z.number().int().positive()
});
export const workerHeartbeatRequestSchema = z.object({
  deviceId: idSchema,
  installedProfiles: z.array(z.object({ id: z.string().min(1).max(120), model: z.string().min(1).max(200), digest: z.string().min(1).max(256), backend: localModelBackendSchema })).max(20),
  capacity: z.object({ generationSlots: z.number().int().min(0).max(8), embeddingSlots: z.number().int().min(0).max(8) }),
  runtimeStatus: workerRuntimeStatusSchema
});
export const workerHeartbeatResponseSchema = z.object({ serverTime: z.string().datetime(), configRevision: z.number().int().positive() });
export const claimWorkerJobRequestSchema = z.object({
  supportedJobTypes: z.array(jobKindSchema).min(1).max(32),
  availableCapacity: z.number().int().min(1).max(8)
});
export const workerLeaseSchema = z.object({
  jobId: idSchema,
  vaultId: vaultIdSchema,
  leaseToken: z.string().min(32),
  expiresAt: z.string().datetime(),
  inputManifest: z.object({ kind: jobKindSchema, inputHash: z.string().length(64) })
});
export const workerJobInputSchema = z.object({
  jobId: idSchema,
  vaultId: vaultIdSchema,
  kind: jobKindSchema,
  inputHash: z.string().length(64),
  payload: z.discriminatedUnion("type", [
    z.object({ type: z.literal("note_processing"), noteId: idSchema, sourceId: idSchema, revision: z.number().int().positive(), stages: z.array(z.literal("classify")), source: z.object({ contentHash: z.string().length(64), text: z.string().max(200000) }) }),
    z.object({ type: z.literal("search"), query: z.string(), mode: z.enum(["hybrid", "semantic"]), scope: z.object({ kinds: z.array(searchKindSchema) }), limit: z.number().int().positive() }),
    z.object({ type: z.literal("ai_setup_test"), workerId: z.string(), modelProfileId: z.string() }),
    z.object({ type: z.literal("index_rebuild"), generationId: idSchema, modelProfileId: z.string(), chunkerVersion: z.string(), notes: z.array(z.object({ noteId: idSchema, sourceId: idSchema, revision: z.number().int().positive(), contentHash: z.string().length(64) })).max(5000) }),
    z.object({ type: z.literal("answer_generation"), chatId: idSchema, userMessageId: idSchema, assistantMessageId: idSchema, question: z.string().min(1).max(8000), mode: z.enum(["grounded", "brainstorm"]), scope: chatScopeSchema, requestedAt:z.string().datetime().optional(), timezone:z.string().min(1).max(100).optional(), actionType:z.literal("reminder").nullable().optional() }),
    z.object({ type:z.literal("study_plan_generation"),studyPlanId:idSchema,courseTitle:z.string().max(500).nullable(),assessmentTitle:z.string().max(500).nullable(),goals:z.array(z.string()).max(20),deadline:z.discriminatedUnion("kind",[z.object({kind:z.literal("unknown")}),z.object({kind:z.literal("date_only"),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),timezone:z.string()}),z.object({kind:z.literal("exact"),dueAt:z.string().datetime(),timezone:z.string()})]),sources:z.array(z.object({sourceId:idSchema,contentHash:z.string().length(64),text:z.string().min(1).max(200000)})).min(1).max(30) }),
    z.object({ type:z.literal("study_exercise_generation"),requestId:idSchema,mode:z.enum(["explain","socratic","active_recall","flashcards","practice","mock_exam","explain_12","advanced","knowledge_gaps"]),difficulty:z.enum(["introductory","standard","advanced"]).nullable(),count:z.number().int().min(1).max(20),courseId:idSchema.nullable(),language:z.string().min(2).max(35).nullable().default(null),sources:z.array(z.object({sourceId:idSchema,contentHash:z.string().length(64),text:z.string().min(1).max(200000)})).min(1).max(30) }),
    z.object({ type:z.literal("study_attempt_feedback"),attemptId:idSchema,exercise:z.object({prompt:z.string().min(1),referenceAnswer:z.string().nullable(),explanation:z.string().nullable(),mode:z.string()}),attempt:z.object({response:z.string().min(1),confidenceSelfReport:z.number().int().min(1).max(5).nullable()}),sources:z.array(z.object({sourceId:idSchema,contentHash:z.string().length(64),text:z.string().min(1).max(200000)})).min(1).max(30) })
    ,z.object({type:z.literal("transcript_analysis"),transcriptId:idSchema,sourceRevision:z.number().int().positive(),scope:z.enum(["concept_summary","instructions","homework","dates","questions","all"]),segments:z.array(z.object({id:z.string().min(1).max(120),startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),speakerLabel:z.string().max(200),text:z.string().min(1).max(20000)}).strict()).min(1).max(5000)}),
    z.object({type:z.literal("artifact_generation"),kind:artifactGenerationKindSchema,instructions:z.string().max(4000).nullable(),outputLanguage:z.string().min(2).max(35).nullable(),targetGeneratedNoteId:idSchema.nullable(),expectedRevision:z.number().int().positive().nullable(),sourceManifest:z.array(z.object({recordId:idSchema,recordType:z.enum(["note","source"]),revision:z.number().int().positive(),contentHash:z.string().length(64),title:z.string().max(500),text:z.string().min(1).max(200000)}).strict()).min(1).max(100)}),
    z.object({type:z.literal("task_breakdown"),taskId:idSchema,taskRevision:z.number().int().positive(),taskTitle:z.string().trim().min(1).max(500),maxSessionMinutes:z.number().int().min(5).max(240).nullable(),remainingWork:z.object({minutes:z.number().int().positive().max(100000).optional(),description:z.string().min(1).max(4000).optional()}).strict().nullable(),sources:z.array(z.object({sourceId:idSchema,contentHash:z.string().length(64),text:z.string().min(1).max(200000)})).min(1).max(30)})
  ])
});
export const workerSourceInputSchema = z.object({ sourceId: idSchema, noteId: idSchema, revision: z.number().int().positive(), contentHash: z.string().length(64), text: z.string().max(1000000) });
export const workerIndexBatchSchema = z.object({
  leaseToken: z.string().min(32).max(256),
  generationId: idSchema,
  noteId: idSchema,
  noteRevision: z.number().int().positive(),
  sourceHash: z.string().length(64),
  chunks: z.array(z.object({
    sequence: z.number().int().nonnegative(),
    text: z.string().min(1).max(4000),
    startOffset: z.number().int().nonnegative(),
    endOffset: z.number().int().positive(),
    contentHash: z.string().length(64),
    embedding: z.array(z.number().finite()).length(1024)
  })).min(1).max(128)
});
export const workerLeaseHeartbeatSchema = z.object({
  leaseToken: z.string().min(32).max(256),
  stage: z.string().trim().min(1).max(120),
  progress: z.number().min(0).max(1).optional()
});
export const workerProgressEventsSchema = z.object({
  leaseToken: z.string().min(32).max(256),
  sequence: z.number().int().positive(),
  events: z.array(z.object({ kind: z.enum(["status", "progress"]), stage: z.string().trim().min(1).max(120), progress: z.number().min(0).max(1).optional(), detail: z.string().max(500).optional() })).min(1).max(50)
});
export const workerSearchEmbeddingResultSchema = z.object({
  type: z.literal("search_embedding"),
  query: z.string().min(1).max(500),
  mode: z.enum(["hybrid", "semantic"]),
  modelProfileId: z.string().min(1).max(120),
  embedding: z.array(z.number().finite()).length(1024)
});
export const workerEvidenceRequestSchema = z.object({ leaseToken: z.string().min(32).max(256), modelProfileId: z.literal("local-qwen-embedding"), embedding: z.array(z.number().finite()).length(1024) });
export const workerEvidenceItemSchema = z.object({ citationId: z.string().min(1).max(40), title: z.string(), text: z.string().min(1).max(4000) });
export const workerEvidencePacketSchema = z.object({ items: z.array(workerEvidenceItemSchema).max(12) });
export const assistantReminderProposalSchema=z.object({kind:z.literal("reminder"),title:z.string().trim().min(1).max(240),remindAt:z.string().min(1).max(80),requestQuote:z.string().trim().min(1).max(1000)}).strict();
export const workerAnswerResultSchema = z.object({ type: z.literal("worker_answer"), chatId: idSchema, messageId: idSchema, answer: z.string().trim().min(1).max(20000), citationIds: z.array(z.string().min(1).max(40)).max(12), insufficientEvidence: z.boolean(), proposedReminder:assistantReminderProposalSchema.nullable().optional() });
export const workerCompleteSchema = z.object({ leaseToken: z.string().min(32).max(256), inputHash: z.string().length(64), result: z.union([typedJobResultSchema, workerSearchEmbeddingResultSchema, workerAnswerResultSchema,z.object({type:z.literal("worker_study_plan"),studyPlanId:idSchema,units:z.array(z.object({title:z.string().trim().min(1).max(500),objective:z.string().trim().min(1).max(2000),kind:z.enum(["read","explain","practice","recall","review"]),materialSourceIds:z.array(idSchema).min(1).max(30),estimatedMinutes:z.number().int().min(5).max(240)})).min(1).max(100)}),z.object({type:z.literal("worker_study_exercises"),requestId:idSchema,exercises:z.array(z.object({prompt:z.string().trim().min(1).max(10000),answer:z.string().trim().min(1).max(20000).nullable(),explanation:z.string().trim().min(1).max(20000).nullable(),materialSourceIds:z.array(idSchema).min(1).max(30)})).min(1).max(20)}),z.object({type:z.literal("worker_study_feedback"),attemptId:idSchema,feedback:z.object({summary:z.string().trim().min(1).max(10000),estimatedCorrectness:z.enum(["correct","partly_correct","incorrect","insufficient_evidence"]),scoreEstimate:z.number().min(0).max(1).nullable(),uncertainty:z.string().trim().min(1).max(2000),materialSourceIds:z.array(idSchema).min(1).max(30)})}),z.object({type:z.literal("worker_transcript_analysis"),transcriptId:idSchema,sourceRevision:z.number().int().positive(),scope:z.enum(["concept_summary","instructions","homework","dates","questions","all"]),content:z.object({conceptSummary:z.array(z.string().max(2000)).max(100),instructions:z.array(z.string().max(2000)).max(100),homework:z.array(z.string().max(2000)).max(100),dates:z.array(z.object({text:z.string().max(1000),normalizedDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),uncertain:z.boolean()}).strict()).max(100),questions:z.array(z.string().max(2000)).max(100),limitations:z.array(z.string().max(1000)).max(50)}).strict(),sourceSegmentIds:z.array(z.string().min(1).max(120)).max(5000)}),z.object({type:z.literal("worker_artifact_generation"),kind:artifactGenerationKindSchema,title:z.string().trim().min(1).max(240),contentMarkdown:z.string().trim().min(1).max(200000),sourceRecordIds:z.array(idSchema).min(1).max(100)}),z.object({type:z.literal("worker_task_breakdown"),taskId:idSchema,steps:z.array(z.object({stepId:z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),title:z.string().trim().min(1).max(500),description:z.string().trim().min(1).max(4000),dependsOnStepIds:z.array(z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/)).max(20),sourceIds:z.array(idSchema).min(1).max(30),estimatedMinutes:z.number().int().min(5).max(240)}).strict()).min(1).max(100),uncertainty:z.string().trim().min(1).max(2000)})]) });
export const workerFailSchema = z.object({ leaseToken: z.string().min(32).max(256), errorCode: z.string().regex(/^[a-z0-9_]{1,80}$/), safeDetail: z.string().max(500), retryable: z.boolean() });
export const agentToolNameSchema=z.enum(["search_notes","get_note_summary"]);
export const toolDescriptorSchema=z.object({name:agentToolNameSchema,domain:z.literal("notes"),description:z.string(),effect:z.literal("read"),requiredGrant:z.literal("notes:read"),inputSchema:z.record(z.unknown()),outputSchema:z.record(z.unknown()),capability:z.object({state:z.literal("available"),reason:z.string().nullable()}).strict()}).strict();
export const runDomainToolSchema=z.discriminatedUnion("toolName",[
  z.object({toolName:z.literal("search_notes"),input:z.object({query:z.string().trim().min(1).max(500),limit:z.number().int().min(1).max(20).default(10)}).strict(),mode:z.literal("read"),expectedRevisions:z.record(z.number().int().positive()).optional(),approvedProposalId:z.null().optional()}).strict(),
  z.object({toolName:z.literal("get_note_summary"),input:z.object({noteId:idSchema}).strict(),mode:z.literal("read"),expectedRevisions:z.record(z.number().int().positive()).optional(),approvedProposalId:z.null().optional()}).strict()
]);
export const toolPolicySchema=z.object({toolName:agentToolNameSchema,enabled:z.boolean(),scope:z.object({kind:z.enum(["vault","selected_notes"]),noteIds:z.array(idSchema).max(500)}).strict(),confirmation:z.enum(["none","always_review"]),quota:z.object({maxRunsPerHour:z.number().int().min(1).max(1000),maxResultBytes:z.number().int().min(1024).max(1048576)}).strict()}).strict().superRefine((value,context)=>{if(value.scope.kind==="selected_notes"&&!value.scope.noteIds.length)context.addIssue({code:"custom",message:"Selected-note scope requires note IDs"});if(value.scope.kind==="vault"&&value.scope.noteIds.length)context.addIssue({code:"custom",message:"Vault scope cannot include note IDs"});});
export const toolPolicySetSchema=z.object({vaultId:vaultIdSchema,policies:z.array(toolPolicySchema).max(20),policyVersion:z.literal("tool-policy-v1"),revision:z.number().int().nonnegative(),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable(),invariants:z.object({unrestrictedShell:z.literal(false),unrestrictedFilesystem:z.literal(false),unrestrictedNetwork:z.literal(false),externalAndDestructiveAlwaysReviewed:z.literal(true)}).strict()}).strict();
export const setToolPoliciesSchema=z.object({policies:z.array(toolPolicySchema).max(20)}).strict().superRefine((value,context)=>{const names=value.policies.map(item=>item.toolName);if(new Set(names).size!==names.length)context.addIssue({code:"custom",message:"Tool policies must be unique"});});
export const executeNaturalLanguageCommandSchema=z.object({text:z.string().trim().min(1).max(4000),sourceScope:z.object({noteIds:z.array(idSchema).max(500)}).strict(),contextIds:z.array(idSchema).max(100).default([]),clientOperationId:z.string().min(8).max(128)}).strict().superRefine((value,context)=>{if(value.sourceScope.noteIds.length!==new Set(value.sourceScope.noteIds).size)context.addIssue({code:"custom",message:"Source-scope note IDs must be unique"});if(value.contextIds.length!==new Set(value.contextIds).size)context.addIssue({code:"custom",message:"Context IDs must be unique"});});
export const sourceObjectSchema=z.object({id:idSchema,vaultId:vaultIdSchema,connectionId:idSchema,providerObjectId:z.string(),containerId:z.string().nullable(),kind:z.string(),title:z.string(),accessState:z.enum(["available","denied","unavailable","excluded","deleted"]),freshness:z.enum(["current","stale","unverified","tombstoned"]),currentRevision:z.number().int().positive(),deepLink:z.string().url().nullable(),excluded:z.boolean(),exclusionReason:z.string().nullable(),lastAttemptAt:z.string().datetime().nullable(),lastSuccessAt:z.string().datetime().nullable(),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const sourceObjectRevisionSchema=z.object({id:idSchema,sourceObjectId:idSchema,revision:z.number().int().positive(),contentHash:sha256Schema,exactContent:z.string().nullable(),metadata:z.record(z.unknown()),attachmentBlobIds:z.array(idSchema),fetchedAt:z.string().datetime()}).strict();
export const sourceObjectDetailSchema=z.object({source:sourceObjectSchema,selectedRevision:sourceObjectRevisionSchema,current:z.boolean(),historical:z.boolean()}).strict();
export const refreshSourceObjectSchema=z.object({expectedRevision:z.number().int().positive().optional()}).strict();
export const sourceExclusionInputSchema=z.object({excluded:z.boolean(),reason:z.string().trim().min(1).max(1000)}).strict();
export const sourceExclusionSchema=z.object({sourceObjectId:idSchema,excluded:z.boolean(),reason:z.string(),revision:z.number().int().positive(),derivedIndexInvalidated:z.boolean(),updatedAt:z.string().datetime()}).strict();
export const transcriptSegmentSchema=z.object({id:z.string().min(1).max(120),startMs:z.number().int().nonnegative(),endMs:z.number().int().positive(),text:z.string().min(1).max(20000),speaker:z.object({id:z.string().max(120).nullable(),label:z.string().min(1).max(200),status:z.enum(["unknown","machine_suggested","owner_confirmed"])}).strict()}).strict().superRefine((value,context)=>{if(value.endMs<=value.startMs)context.addIssue({code:"custom",message:"Transcript segment end must follow start"});if(value.speaker.status==="unknown"&&value.speaker.id!==null)context.addIssue({code:"custom",message:"Unknown speaker cannot have an identity"});});
export const transcriptAssociationSchema=z.object({id:idSchema,transcriptId:idSchema,lessonId:idSchema,transcriptRevision:z.number().int().positive(),evidenceRefs:z.array(idSchema),origin:z.literal("owner"),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const transcriptSchema=z.object({id:idSchema,vaultId:vaultIdSchema,sourceObject:sourceObjectSchema,sourceRevisionId:idSchema,revision:z.number().int().positive(),originalBlobIds:z.array(idSchema),segments:z.array(transcriptSegmentSchema).max(5000),exactText:z.string(),association:transcriptAssociationSchema.nullable(),correctionOfRevision:z.number().int().positive().nullable(),analysisArtifacts:z.array(z.object({id:idSchema,scope:z.enum(["concept_summary","instructions","homework","dates","questions","all"]),sourceRevision:z.number().int().positive(),createdAt:z.string().datetime()}).strict()),createdAt:z.string().datetime()}).strict();
export const meetilyImportSchema=z.object({meetingId:z.string().trim().min(1).max(240),title:z.string().trim().min(1).max(240),startedAt:z.string().datetime(),completedAt:z.string().datetime(),segments:z.array(transcriptSegmentSchema).min(1).max(5000),ownerConfirmedRecordingApproval:z.literal(true),lessonId:idSchema.nullable().default(null)}).strict().superRefine((value,context)=>{if(Date.parse(value.completedAt)<Date.parse(value.startedAt))context.addIssue({code:"custom",path:["completedAt"],message:"Completion must follow recording start"});if(new Set(value.segments.map(item=>item.id)).size!==value.segments.length)context.addIssue({code:"custom",path:["segments"],message:"Segment IDs must be unique"});});
export const meetilyImportResultSchema=z.object({transcript:transcriptSchema,imported:z.boolean(),lessonMatch:z.enum(["matched","selected","ambiguous","none"])}).strict();
export const correctTranscriptSchema=z.object({segmentEdits:z.array(z.object({segmentId:z.string().min(1).max(120),text:z.string().trim().min(1).max(20000)}).strict()).max(500).default([]),speakerLabelCorrections:z.array(z.object({segmentId:z.string().min(1).max(120),speakerId:z.string().min(1).max(120).nullable(),label:z.string().trim().min(1).max(200),status:z.literal("owner_confirmed")}).strict()).max(500).default([]),expectedRevision:z.number().int().positive()}).strict().superRefine((value,context)=>{if(!value.segmentEdits.length&&!value.speakerLabelCorrections.length)context.addIssue({code:"custom",message:"At least one transcript correction is required"});});
export const associateTranscriptSchema=z.object({lessonId:idSchema,evidenceRefs:z.array(idSchema).max(100).default([]),expectedRevision:z.number().int().positive()}).strict();
export const analyzeTranscriptSchema=z.object({scope:z.enum(["concept_summary","instructions","homework","dates","questions","all"]),expectedRevision:z.number().int().positive()}).strict();

export const modelCapabilitySchema = z.enum(["generate", "chat", "embed", "extract", "classify"]);
export const modelProfileSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(160),
  backend: localModelBackendSchema,
  model: z.string().min(1).max(200),
  digest: z.string().nullable(),
  capabilities: z.array(modelCapabilitySchema).min(1),
  enabled: z.boolean(),
  installed: z.boolean(),
  tested: z.boolean()
});
export const aiPurposeSchema=z.enum(["note_classification","grounded_qa","study_generation","search","calendar_assistance","profile_analysis"]);
export const aiPolicyLimitsSchema=z.object({maxSourceBytesPerRequest:z.number().int().min(0).max(10_000_000),maxRequestsPerDay:z.number().int().min(0).max(100_000)}).strict();
const vaultAiPolicyBaseSchema=z.object({vaultId:vaultIdSchema,local:z.object({enabled:z.boolean(),profileId:z.string().min(1).max(120),backend:z.literal("local_worker")}).strict(),cloud:z.object({enabled:z.boolean(),providerConnectionId:idSchema.nullable()}).strict(),purposes:z.array(aiPurposeSchema).max(6),limits:aiPolicyLimitsSchema,disclosure:z.object({cloudContentEgressEnabled:z.boolean(),statement:z.string().min(1).max(2000)}).strict(),revision:z.number().int().nonnegative(),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable()}).strict();
export const vaultAiPolicySchema=vaultAiPolicyBaseSchema.superRefine((value,context)=>{if(value.cloud.enabled!==value.disclosure.cloudContentEgressEnabled)context.addIssue({code:"custom",message:"Cloud egress disclosure must match cloud policy"});if(value.cloud.enabled&&!value.cloud.providerConnectionId)context.addIssue({code:"custom",message:"Cloud AI requires a provider connection"});});
export const aiDisclosurePreviewInputSchema=z.object({providerConnectionId:idSchema,purpose:aiPurposeSchema,scope:z.object({kinds:z.array(z.enum(["note","task","calendar_event","school","profile"])).min(1).max(5),sourceIds:z.array(idSchema).max(500).default([])}).strict(),limits:aiPolicyLimitsSchema}).strict();
export const aiDisclosurePreviewSchema=z.object({id:idSchema,vaultId:vaultIdSchema,providerConnectionId:idSchema,provider:z.string(),purpose:aiPurposeSchema,scope:aiDisclosurePreviewInputSchema.shape.scope,limits:aiPolicyLimitsSchema,boundary:z.object({contentLeavesVault:z.literal(true),fields:z.array(z.string()),excludedCategories:z.array(z.string()),providerReceives:z.string(),noContentSentDuringPreview:z.literal(true)}).strict(),expiresAt:z.string().datetime(),createdAt:z.string().datetime()}).strict();
const vaultAiPolicyInputSchema=vaultAiPolicyBaseSchema.omit({vaultId:true,revision:true,createdAt:true,updatedAt:true}).superRefine((value,context)=>{if(value.cloud.enabled!==value.disclosure.cloudContentEgressEnabled)context.addIssue({code:"custom",message:"Cloud egress disclosure must match cloud policy"});if(value.cloud.enabled&&!value.cloud.providerConnectionId)context.addIssue({code:"custom",message:"Cloud AI requires a provider connection"});});
export const setVaultAiPolicySchema=z.object({policy:vaultAiPolicyInputSchema,expectedRevision:z.number().int().nonnegative(),disclosurePreviewId:idSchema.nullable().optional(),explicitConsent:z.literal(true).optional()}).strict();
export const aiRuntimeStateSchema = z.enum(["worker_offline", "model_missing", "busy", "available", "error"]);
export const aiStatusSchema = z.object({
  state: aiRuntimeStateSchema,
  workers: z.array(z.object({ id: z.string(), backend: z.enum(["ollama", "openai_compatible", "mixed"]), state: aiRuntimeStateSchema, detail: z.string().nullable() })),
  capabilities: z.record(modelCapabilitySchema, z.boolean()),
  availableModels: z.array(z.string()),
  queuedJobs: z.number().int().nonnegative(),
  cloudFallbackEnabled: z.literal(false)
});
export const aiTestRequestSchema = z.object({
  workerId: z.string().trim().min(1).max(120),
  modelProfileId: z.string().trim().min(1).max(120)
});
export const indexStatusSchema = z.object({
  currentProfile: z.string().nullable(),
  currentGenerationId: idSchema.nullable(),
  chunkerVersion: z.string().nullable(),
  indexedRevisions: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  semanticAvailable: z.boolean()
});
export const rebuildIndexRequestSchema = z.object({
  modelProfileId: z.string().trim().min(1).max(120),
  scope: z.object({ noteIds: z.array(idSchema).min(1).max(1000).optional() }).optional(),
  chunkerVersion: z.string().trim().min(1).max(80)
});
export const recoveryRequestSchema = z.object({ recovery_code: z.string().trim().min(3).max(200) });
export const recoverySessionSchema = z.object({
  id: idSchema,
  expires_at: z.string().datetime(),
  allowed_actions: z.array(z.enum(["list_passkeys", "register_passkey"]))
});
export const passkeySummarySchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  device_type: z.string(),
  backed_up: z.boolean(),
  created_at: z.string().datetime(),
  last_used_at: z.string().datetime().nullable()
});
export const passkeyOptionsRequestSchema = z.object({ label: z.string().trim().min(1).max(120) });
export const recoveryCodesSchema = z.object({ codes_once: z.array(z.string()).min(1) });
export const sessionSummarySchema = z.object({
  id: idSchema,
  auth_level: z.enum(["passkey", "recovery"]),
  created_at: z.string().datetime(),
  last_seen_at: z.string().datetime(),
  expires_at: z.string().datetime(),
  current: z.boolean()
});

export const deviceRoleSchema = z.enum(["client", "worker"]);
export const deviceScopeSchema = z.enum(["vault:read", "export:read", "sync:read", "sync:write", "capture:write", "notes:write", "tasks:write", "calendar:write", "school:write", "transcript:import", "study:write", "profile:write", "integrations:write", "ai:run", "jobs:write"]);
export const createDevicePairingSchema = z.object({ device_name: z.string().trim().min(1).max(120), requested_role: deviceRoleSchema.default("client"), client_public_key: z.string().trim().min(20).max(10_000).nullable().default(null) }).strict();
export const devicePairingChallengeSchema = z.object({ pairing_id: idSchema, device_code_once: z.string().min(40), user_code: z.string().regex(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/), expires_at: z.string().datetime() });
export const approveDevicePairingSchema = z.object({ user_code: z.string().trim().min(8).max(20), vault_ids: z.array(idSchema).min(1).max(100), scopes: z.array(deviceScopeSchema).min(1).max(20), approved_role: deviceRoleSchema }).strict();
export const devicePairingApprovalSchema = z.object({ status: z.literal("approved"), expires_at: z.string().datetime() });
export const exchangeDevicePairingSchema = z.object({ device_code: z.string().min(40).max(200) }).strict();
export const refreshNativeTokenSchema = z.object({ refresh_token: z.string().regex(/^sdr_[A-Za-z0-9_-]{40,64}$/) }).strict();
export const tokenPairSchema = z.object({ device_id: idSchema, access_token: z.string().regex(/^sda_[A-Za-z0-9_-]{40,64}$/), refresh_token: z.string().regex(/^sdr_[A-Za-z0-9_-]{40,64}$/), expires_at: z.string().datetime(), refresh_expires_at: z.string().datetime(), vault_ids: z.array(idSchema), scopes: z.array(deviceScopeSchema) });
export const pairingPendingSchema = z.object({ status: z.literal("pending"), retry_after_seconds: z.number().int().min(1).max(60) });
export const deviceSummarySchema = z.object({ id: idSchema, name: z.string(), role: deviceRoleSchema, vault_ids: z.array(idSchema), scopes: z.array(deviceScopeSchema), last_seen_at: z.string().datetime().nullable(), compromised_at: z.string().datetime().nullable(), created_at: z.string().datetime() });
const deviceCacheLimitsSchema=z.object({maxBytes:z.number().int().min(1_048_576).max(107_374_182_400),maxItems:z.number().int().min(1).max(1_000_000)}).strict();
const deviceCacheReportedStateSchema=z.object({status:z.enum(["unknown","current","stale"]),cachedVaultIds:z.array(idSchema).max(100),byteCount:z.number().int().nonnegative().nullable(),itemCount:z.number().int().nonnegative().nullable(),reportedAt:z.string().datetime().nullable()}).strict();
export const deviceCachePolicySchema=z.object({deviceId:idSchema,mode:z.enum(["trusted_persistent","session_only"]),trusted:z.boolean(),selectedVaultIds:z.array(idSchema).max(100),cacheLimits:deviceCacheLimitsSchema,expireAfterSeconds:z.number().int().min(3600).max(31_536_000).nullable(),clearOnLogout:z.boolean(),reportedState:deviceCacheReportedStateSchema,latestPurge:z.object({id:idSchema,status:z.enum(["requested","acknowledged"]),requestedAt:z.string().datetime(),acknowledgedAt:z.string().datetime().nullable()}).strict().nullable(),revision:z.number().int().nonnegative(),createdAt:z.string().datetime().nullable(),updatedAt:z.string().datetime().nullable()}).strict();
export const setDeviceCachePolicySchema=z.object({trusted:z.boolean(),selectedVaultIds:z.array(idSchema).max(100),cacheLimits:deviceCacheLimitsSchema,expireAfterSeconds:z.number().int().min(3600).max(31_536_000).nullable(),clearOnLogout:z.boolean()}).strict().superRefine((value,context)=>{if(value.selectedVaultIds.length!==new Set(value.selectedVaultIds).size)context.addIssue({code:"custom",path:["selectedVaultIds"],message:"Selected vault IDs must be unique"});if(!value.trusted&&value.selectedVaultIds.length)context.addIssue({code:"custom",path:["selectedVaultIds"],message:"Session-only devices cannot retain selected vaults"});});
export const requestDeviceCachePurgeSchema=z.object({selectedVaultIds:z.array(idSchema).min(1).max(100),requestReason:z.string().trim().min(1).max(500)}).strict().superRefine((value,context)=>{if(value.selectedVaultIds.length!==new Set(value.selectedVaultIds).size)context.addIssue({code:"custom",path:["selectedVaultIds"],message:"Selected vault IDs must be unique"});});
export const cachePurgeRequestSchema=z.object({id:idSchema,deviceId:idSchema,selectedVaultIds:z.array(idSchema),requestReason:z.string(),status:z.enum(["requested","acknowledged"]),requestedAt:z.string().datetime(),acknowledgedAt:z.string().datetime().nullable(),offlineErasureCertified:z.literal(false)}).strict();
export const createApiTokenSchema = z.object({ label: z.string().trim().min(1).max(120), vault_ids: z.array(idSchema).min(1).max(100), scopes: z.array(deviceScopeSchema).min(1).max(20), expires_at: z.string().datetime() }).strict();
export const apiTokenSummarySchema = z.object({ id: idSchema, label: z.string(), vault_ids: z.array(idSchema), scopes: z.array(deviceScopeSchema), expires_at: z.string().datetime(), last_used_at: z.string().datetime().nullable(), created_at: z.string().datetime() });
export const apiTokenCreatedSchema = apiTokenSummarySchema.extend({ secret_once: z.string().regex(/^sat_[A-Za-z0-9_-]{40,64}$/) });

export const todayNextActionPlanSchema = z.object({
  task: taskSchema,
  source: z.enum(["scheduled_focus_block", "deterministic_slot"]),
  calendarEventId: idSchema.nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  reasonCodes: z.array(z.enum(["scheduled_focus_block", "preferred_window", "earliest_feasible", "bounded_block", "short_final_block", "earliest_deadline", "highest_priority"])).min(1),
  explanation: z.string().min(1).max(1000),
  materialSourceIds: z.array(idSchema),
  courseId: idSchema.nullable(),
  canStartNow: z.boolean()
});
export const todaySchema = z.object({
  nextAction: taskSchema.nullable(),
  nextActionPlan: todayNextActionPlanSchema.nullable(),
  upcomingEvents: z.array(calendarEventSchema),
  dueTasks: z.array(taskSchema),
  noteCount: z.number().int().nonnegative()
});
export const nextActionQuerySchema = z.object({ availableMinutes: z.number().int().min(5).max(480).nullable().default(null), context: z.enum(["any","school","home","on_the_go"]).default("any"), courseScope: idSchema.nullable().default(null), limit: z.number().int().min(1).max(10).default(5) });
export const nextActionCandidateSchema = z.object({ task: taskSchema, source: z.enum(["scheduled_focus_block","deterministic_slot","unsized_task"]), calendarEventId: idSchema.nullable(), startsAt: z.string().datetime().nullable(), endsAt: z.string().datetime().nullable(), durationMinutes: z.number().int().positive().nullable(), durationKnown: z.boolean(), fitsAvailableMinutes: z.boolean().nullable(), reasonCodes: z.array(z.enum(["scheduled_focus_block","preferred_window","earliest_feasible","bounded_block","short_final_block","unknown_effort"])).min(1), explanation: z.string().min(1).max(1000), materialSourceIds: z.array(idSchema), courseId: idSchema.nullable(), canStartNow: z.boolean() });
export const nextActionSetSchema = z.object({ generatedAt: z.string().datetime(), constraintsRevision: z.number().int().nonnegative(), availableMinutes: z.number().int().positive().nullable(), context: z.enum(["any","school","home","on_the_go"]), contextApplied: z.boolean(), courseScope: idSchema.nullable(), candidates: z.array(nextActionCandidateSchema).max(10), limitations: z.array(z.string()) });
export const momentumLockedParameterSchema = z.enum(["estimated_minutes","preferred_windows","protected_windows","daily_limit_minutes","break_minutes","block_size","replan_policy"]);
export const momentumPreferencesSchema = z.object({ vaultId: vaultIdSchema, enabled: z.boolean(), evidenceWindowDays: z.number().int().min(7).max(365), minObservations: z.number().int().min(2).max(100), userLockedParameters: z.array(momentumLockedParameterSchema).max(7), revision: z.number().int().nonnegative(), createdAt: z.string().datetime().nullable(), updatedAt: z.string().datetime().nullable() }).strict();
export const updateMomentumPreferencesSchema = z.object({ enabled: z.boolean().optional(), evidenceWindowDays: z.number().int().min(7).max(365).optional(), minObservations: z.number().int().min(2).max(100).optional(), userLockedParameters: z.array(momentumLockedParameterSchema).max(7).optional() }).strict().refine(value => Object.keys(value).length > 0, "At least one momentum preference must change");
export const momentumSummaryQuerySchema = z.object({ dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), courseId: idSchema.nullable().default(null) }).superRefine((value, context) => { const from = Date.parse(`${value.dateFrom}T00:00:00.000Z`); const to = Date.parse(`${value.dateTo}T00:00:00.000Z`); if (!Number.isFinite(from) || !Number.isFinite(to) || new Date(from).toISOString().slice(0, 10) !== value.dateFrom || new Date(to).toISOString().slice(0, 10) !== value.dateTo) context.addIssue({ code: "custom", message: "Momentum window dates must be real calendar dates" }); else if (to < from) context.addIssue({ code: "custom", message: "Momentum window must move forward" }); else if (to - from > 365 * 86_400_000) context.addIssue({ code: "custom", message: "Momentum window cannot exceed 366 days" }); });
export const momentumSummarySchema = z.object({
  window: z.object({ dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.string().min(1).max(100), courseId: idSchema.nullable() }),
  preferences: momentumPreferencesSchema,
  counts: z.object({ sessionObservations: z.number().int().nonnegative(), completedSessions: z.number().int().nonnegative(), skippedSessions: z.number().int().nonnegative(), interruptedSessions: z.number().int().nonnegative(), sessionsWithMeasuredDuration: z.number().int().nonnegative(), durationPairs: z.number().int().nonnegative() }),
  duration: z.object({ observedMinutes: z.number().int().nonnegative(), pairedObservedMinutes: z.number().int().nonnegative(), pairedEstimatedMinutes: z.number().int().nonnegative(), observedToEstimatedRatio: z.number().nonnegative().nullable() }),
  evidence: z.object({ minimumObservations: z.number().int().min(2), sufficient: z.boolean(), firstObservedAt: z.string().datetime().nullable(), lastObservedAt: z.string().datetime().nullable(), truncated: z.boolean() }),
  adaptiveEstimateEligible: z.boolean(),
  limitations: z.array(z.string().min(1)).min(1)
}).strict();

export const schoolSubjectSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, name: z.string(), code: z.string().nullable(), academicPeriod: z.string().nullable(), sourceAnchorIds: z.array(idSchema), origin: z.enum(["owner", "provider"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const createSchoolSubjectSchema = z.object({ name: z.string().trim().min(1).max(200), code: z.string().trim().min(1).max(60).nullable().optional(), academicPeriod: z.string().trim().min(1).max(120).nullable().optional(), sourceAnchorIds: z.array(idSchema).max(100).default([]) });
export const updateSchoolSubjectSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ name: z.string().trim().min(1).max(200).optional(), code: z.string().trim().min(1).max(60).nullable().optional(), academicPeriod: z.string().trim().min(1).max(120).nullable().optional(), sourceAnchorIds: z.array(idSchema).max(100).optional() }) });
export const schoolCourseSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, subjectId: idSchema, name: z.string(), academicPeriod: z.string().nullable(), teacherEntityIds: z.array(idSchema), classEntityIds: z.array(idSchema), sourceAnchorIds: z.array(idSchema), origin: z.enum(["owner", "provider"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const createSchoolCourseSchema = z.object({ name: z.string().trim().min(1).max(200), subjectId: idSchema, academicPeriod: z.string().trim().min(1).max(120).nullable().optional(), teacherEntityIds: z.array(idSchema).max(50).default([]), classEntityIds: z.array(idSchema).max(50).default([]), sourceAnchorIds: z.array(idSchema).max(100).default([]) });
export const updateSchoolCourseSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ name: z.string().trim().min(1).max(200).optional(), subjectId: idSchema.optional(), academicPeriod: z.string().trim().min(1).max(120).nullable().optional(), teacherEntityIds: z.array(idSchema).max(50).optional(), classEntityIds: z.array(idSchema).max(50).optional(), sourceAnchorIds: z.array(idSchema).max(100).optional() }) });
export const courseMaterialLinkSchema=z.object({id:idSchema,vaultId:vaultIdSchema,courseId:idSchema,sourceId:idSchema,revisionId:idSchema,chapter:z.string().nullable(),lessonId:idSchema.nullable(),mappingOrigin:z.enum(["owner","provider","import","inferred"]),evidenceAnchorIds:z.array(idSchema),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const linkCourseMaterialSchema=z.object({sourceId:idSchema,revisionId:idSchema.optional(),chapter:z.string().trim().min(1).max(240).nullable().default(null),lessonId:idSchema.nullable().default(null),mappingOrigin:z.enum(["owner","provider","import","inferred"]),evidenceAnchorIds:z.array(idSchema).max(100).default([])}).strict().superRefine((value,context)=>{if(value.mappingOrigin==="inferred"&&!value.evidenceAnchorIds.length)context.addIssue({code:"custom",path:["evidenceAnchorIds"],message:"Inferred mappings require evidence"});});
export const archiveSchoolAssignmentOverlaySchema=z.object({reason:z.string().trim().min(1).max(500).nullable().default(null)}).strict();
export const assignmentDueSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("unknown") }), z.object({ kind: z.literal("date_only"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timezone: z.string().min(1).max(100) }), z.object({ kind: z.literal("exact"), dueAt: z.string().datetime(), timezone: z.string().min(1).max(100) })]);
export const schoolAssignmentSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema, title: z.string(), instructionsSourceIds: z.array(idSchema), due: assignmentDueSchema, materialSourceIds: z.array(idSchema), taskIds: z.array(idSchema), preparationStatus: z.enum(["not_started", "in_progress", "prepared"]), origin: z.enum(["owner", "provider"]), providerListSection: z.enum(["upcoming", "past_due", "completed"]).nullable().optional(), providerDetailState: z.enum(["available", "not_assigned"]).nullable().optional(), providerSeenInLatestSnapshot: z.boolean().nullable().optional(), sourceObjectId: idSchema.nullable().optional(), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(), submission: assignmentSubmissionSchema.nullable().optional() });
export const createSchoolAssignmentSchema = z.object({ courseId: idSchema, title: z.string().trim().min(1).max(500), instructionsSourceIds: z.array(idSchema).max(100).default([]), due: assignmentDueSchema.default({ kind: "unknown" }), materialSourceIds: z.array(idSchema).max(100).default([]), taskIds: z.array(idSchema).max(100).default([]) });
export const updateSchoolAssignmentSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ courseId: idSchema.optional(), title: z.string().trim().min(1).max(500).optional(), instructionsSourceIds: z.array(idSchema).max(100).optional(), due: assignmentDueSchema.optional(), materialSourceIds: z.array(idSchema).max(100).optional(), taskIds: z.array(idSchema).max(100).optional(), preparationStatus: z.enum(["not_started", "in_progress", "prepared"]).optional() }) });
export const lessonTimeSpecSchema = z.discriminatedUnion("kind", [z.object({ kind: z.literal("unknown") }), z.object({ kind: z.literal("exact"), startsAt: z.string().datetime(), endsAt: z.string().datetime(), timezone: z.string().min(1).max(100) })]).superRefine((value, context) => { if (value.kind === "exact" && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) context.addIssue({ code: "custom", message: "End must be after start" }); });
export const schoolLessonSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema, calendarEventId: idSchema.nullable(), timeSpec: lessonTimeSpecSchema, room: z.string().nullable(), sourceAnchorIds: z.array(idSchema), origin: z.enum(["owner", "provider"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const createSchoolLessonSchema = z.object({ courseId: idSchema, calendarEventId: idSchema.nullable().optional(), timeSpec: lessonTimeSpecSchema.default({ kind: "unknown" }), room: z.string().trim().min(1).max(240).nullable().optional(), sourceAnchorIds: z.array(idSchema).max(100).default([]) }).superRefine((value, context) => { if (value.calendarEventId && value.timeSpec.kind !== "unknown") context.addIssue({ code: "custom", message: "Linked calendar event owns the lesson time" }); });
export const updateSchoolLessonSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ courseId: idSchema.optional(), calendarEventId: idSchema.nullable().optional(), timeSpec: lessonTimeSpecSchema.optional(), room: z.string().trim().min(1).max(240).nullable().optional(), sourceAnchorIds: z.array(idSchema).max(100).optional() }) });
export const teacherViewSchema=z.object({id:idSchema,name:z.string(),role:z.literal("teacher"),aliases:z.array(z.object({alias:z.string(),scope:z.enum(["all","event_matching","search_only"])}).strict()),courseIds:z.array(idSchema),sourceAnchorIds:z.array(idSchema),revision:z.number().int().positive(),updatedAt:z.string().datetime()}).strict();
export const schoolReadinessReportSchema=z.object({connectionId:idSchema,provider:integrationProviderSchema,state:integrationStateSchema,route:z.object({kind:z.enum(["live_adapter","import_snapshot","unsupported"]),approved:z.boolean(),registeredReturnTargetRequired:z.boolean()}).strict(),consent:z.object({credentialConfigured:z.boolean(),resourceSelectionRecorded:z.boolean()}).strict(),capabilityTests:z.array(z.object({key:z.string(),mode:integrationCapabilitySchema.shape.mode,enabled:z.boolean(),verifiedAt:z.string().datetime().nullable(),passed:z.boolean(),limitation:z.string().nullable()}).strict()),readyForLiveSync:z.boolean(),snapshotOnly:z.boolean(),lastSuccessAt:z.string().datetime().nullable(),limitations:z.array(z.string())}).strict();
export const assessmentKindSchema = z.enum(["exam", "test", "quiz", "presentation", "project", "other"]);
export const assessmentMaterialScopeSchema = z.object({ description: z.string().trim().min(1).max(2000).nullable(), sourceIds: z.array(idSchema).max(100) });
export const schoolAssessmentSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema, title: z.string(), kind: assessmentKindSchema, timeSpec: assignmentDueSchema, materialScope: assessmentMaterialScopeSchema.nullable(), officialWeight: z.number().min(0).max(1).nullable(), sourceAnchorIds: z.array(idSchema), origin: z.enum(["owner", "provider"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const createSchoolAssessmentSchema = z.object({ courseId: idSchema, title: z.string().trim().min(1).max(500), kind: assessmentKindSchema, timeSpec: assignmentDueSchema.default({ kind: "unknown" }), materialScope: assessmentMaterialScopeSchema.nullable().default(null), officialWeight: z.number().min(0).max(1).nullable().default(null), sourceAnchorIds: z.array(idSchema).max(100).default([]) });
export const schoolOverviewSchema=z.object({window:z.object({from:z.string().datetime(),to:z.string().datetime()}).strict(),subjects:z.array(schoolSubjectSchema),courses:z.array(schoolCourseSchema),lessons:z.array(schoolLessonSchema),assignments:z.array(schoolAssignmentSchema),assessments:z.array(schoolAssessmentSchema),materials:z.array(sourceObjectSchema),studyLinks:z.object({activePlanIds:z.array(idSchema),sessionIds:z.array(idSchema)}).strict(),sensitiveData:z.object({attendance:z.object({recordCount:z.number().int().nonnegative(),coverage:z.literal("explicit_opt_in")}).strict().nullable(),grades:z.object({recordCount:z.number().int().nonnegative(),coverage:z.literal("explicit_opt_in")}).strict().nullable(),reason:z.string()}).strict(),coverage:z.array(z.object({connectionId:idSchema,state:integrationStateSchema,lastSuccessAt:z.string().datetime().nullable(),freshness:z.object({current:z.number().int().nonnegative(),stale:z.number().int().nonnegative(),unverified:z.number().int().nonnegative(),tombstoned:z.number().int().nonnegative()}).strict(),limitations:z.array(z.string())}).strict()),generatedAt:z.string().datetime()}).strict();
export const updateSchoolAssessmentSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ courseId: idSchema.optional(), title: z.string().trim().min(1).max(500).optional(), kind: assessmentKindSchema.optional(), timeSpec: assignmentDueSchema.optional(), materialScope: assessmentMaterialScopeSchema.nullable().optional(), officialWeight: z.number().min(0).max(1).nullable().optional(), sourceAnchorIds: z.array(idSchema).max(100).optional() }) });
export const attendanceStatusSchema = z.enum(["present", "absent", "late", "unknown"]); export const excusalStatusSchema = z.enum(["excused", "unexcused", "unknown", "not_applicable"]); export const attendanceUnitsSchema = z.enum(["minutes", "lessons", "source_defined"]);
export const attendanceRecordSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema, lessonId: idSchema.nullable(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timeSpec: assignmentDueSchema, rawStatus: z.string(), normalizedStatus: attendanceStatusSchema, excusalStatus: excusalStatusSchema, duration: z.number().nonnegative().nullable(), units: attendanceUnitsSchema.nullable(), sourceAnchorIds: z.array(idSchema), origin: z.enum(["owner", "provider"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const attendanceFieldsSchema = z.object({ courseId: idSchema, lessonId: idSchema.nullable().optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), timeSpec: assignmentDueSchema.default({ kind: "unknown" }), rawStatus: z.string().trim().min(1).max(240), normalizedStatus: attendanceStatusSchema, excusalStatus: excusalStatusSchema.default("unknown"), duration: z.number().nonnegative().nullable().default(null), units: attendanceUnitsSchema.nullable().default(null), sourceAnchorIds: z.array(idSchema).max(100).default([]) });
export const createAttendanceRecordSchema = attendanceFieldsSchema.superRefine((value, context) => { if ((value.duration === null) !== (value.units === null)) context.addIssue({ code: "custom", message: "Duration and units must be supplied together" }); });
export const updateAttendanceRecordSchema = z.object({ expectedRevision: z.number().int().positive(), patch: attendanceFieldsSchema.partial().superRefine((value, context) => { if ((value.duration === undefined) !== (value.units === undefined)) context.addIssue({ code: "custom", message: "Update duration and units together" }); }) });
export const attendanceSummarySchema = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), aggregation: attendanceUnitsSchema, counts: z.record(z.number().nonnegative()), denominator: z.number().nonnegative(), units: attendanceUnitsSchema, coverage: z.object({ recordCount: z.number().int().nonnegative(), knownCount: z.number().int().nonnegative(), unknownCount: z.number().int().nonnegative() }), excludedUnknowns: z.number().int().nonnegative(), sourceAnchorIds: z.array(idSchema) });
export const createCatchUpPlanSchema=z.object({lessonIds:z.array(idSchema).min(1).max(30),authorizedSourceIds:z.array(idSchema).max(100).default([]),estimatePolicy:z.enum(["unknown_unless_explicit","bounded_default"]).default("unknown_unless_explicit"),expectedLessonRevisions:z.record(z.number().int().positive())}).superRefine((value,context)=>{for(const lessonId of value.lessonIds)if(value.expectedLessonRevisions[lessonId]===undefined)context.addIssue({code:"custom",path:["expectedLessonRevisions",lessonId],message:"Every lesson requires an expected revision"});});
export const previewAttendanceCatchUpSchema=z.object({attendanceRecordIds:z.array(idSchema).min(1).max(30),materialScope:z.object({sourceIds:z.array(idSchema).max(100)}).strict().nullable().default(null),constraints:z.object({estimatePolicy:z.enum(["unknown_unless_explicit","bounded_default"]).default("unknown_unless_explicit")}).strict().default({estimatePolicy:"unknown_unless_explicit"}),expectedRevisions:z.record(z.number().int().positive())}).strict().superRefine((value,context)=>{if(value.attendanceRecordIds.length!==new Set(value.attendanceRecordIds).size)context.addIssue({code:"custom",message:"Attendance record IDs must be unique"});for(const id of value.attendanceRecordIds)if(value.expectedRevisions[id]===undefined)context.addIssue({code:"custom",path:["expectedRevisions",id],message:"Every attendance record requires an expected revision"});});
export const performanceGradeSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema, assessmentId: idSchema.nullable(), gradeValue: z.string(), gradeScale: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), officialWeight: z.number().min(0).max(1).nullable(), sourceAnchorIds: z.array(idSchema), origin: z.enum(["owner", "provider"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const gradeFieldsSchema = z.object({ courseId: idSchema, assessmentId: idSchema.nullable().optional(), gradeValue: z.string().trim().min(1).max(120), gradeScale: z.string().trim().min(1).max(120), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), officialWeight: z.number().min(0).max(1).nullable().default(null), sourceAnchorIds: z.array(idSchema).max(100).default([]) });
export const createPerformanceGradeSchema = gradeFieldsSchema; export const updatePerformanceGradeSchema = z.object({ expectedRevision: z.number().int().positive(), patch: gradeFieldsSchema.partial() });
export const gradeRecordKindSchema=z.enum(["official","manual"]);
export const gradeRecordSchema=z.object({id:idSchema,vaultId:vaultIdSchema,courseId:idSchema,assessmentId:idSchema.nullable(),rawGrade:z.string(),scale:z.string(),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),officialOrManual:gradeRecordKindSchema,weight:z.number().min(0).max(1).nullable(),sourceAnchorIds:z.array(idSchema),feedbackSourceId:idSchema.nullable(),origin:z.enum(["owner","provider"]),sourceOwned:z.boolean(),archivedAt:z.string().datetime().nullable(),archiveReason:z.string().nullable(),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
const gradeRecordFieldsSchema=z.object({courseId:idSchema,assessmentId:idSchema.nullable().optional(),rawGrade:z.string().trim().min(1).max(120),scale:z.string().trim().min(1).max(120),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),officialOrManual:gradeRecordKindSchema,weight:z.number().min(0).max(1).nullable().default(null),sourceAnchorIds:z.array(idSchema).max(100).default([]),feedbackSourceId:idSchema.nullable().default(null)}).strict();
export const createGradeRecordSchema=gradeRecordFieldsSchema.superRefine((value,context)=>{if(value.sourceAnchorIds.length!==new Set(value.sourceAnchorIds).size)context.addIssue({code:"custom",path:["sourceAnchorIds"],message:"Source anchors must be unique"});});
export const updateGradeRecordSchema=gradeRecordFieldsSchema.partial().strict().superRefine((value,context)=>{if(Object.keys(value).length===0)context.addIssue({code:"custom",message:"At least one permitted field is required"});if(value.sourceAnchorIds&&value.sourceAnchorIds.length!==new Set(value.sourceAnchorIds).size)context.addIssue({code:"custom",path:["sourceAnchorIds"],message:"Source anchors must be unique"});});
export const archiveGradeRecordSchema=z.object({reason:z.string().trim().min(1).max(1000).nullable().default(null)}).strict();
export const performanceTargetSchema = z.object({ courseId: idSchema, vaultId: vaultIdSchema, targetValue: z.string(), scale: z.string(), effectivePeriod: z.string().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const setPerformanceTargetSchema = z.object({ targetValue: z.string().trim().min(1).max(120), scale: z.string().trim().min(1).max(120), effectivePeriod: z.string().trim().min(1).max(120).nullable().optional(), expectedRevision: z.number().int().nonnegative() });
export const performanceSummarySchema = z.object({ courseId: idSchema.nullable(), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), formulaId: z.literal("descriptive-v1"), gradeCount: z.number().int().nonnegative(), groups: z.array(z.object({ scale: z.string(), count: z.number().int().positive(), observedValues: z.array(z.string()), knownWeightTotal: z.number().nonnegative(), weightedNumericMean: z.number().nullable() })), target: performanceTargetSchema.nullable(), disclaimer: z.string() });
export const studyModeSchema = z.enum(["explain", "socratic", "active_recall", "flashcards", "practice", "mock_exam", "explain_12", "advanced", "knowledge_gaps"]);
export const studySessionStateSchema = z.enum(["planned", "active", "paused", "interrupted", "completed", "skipped"]);
export const activeTimeSegmentSchema = z.object({ startedAt: z.string().datetime(), endedAt: z.string().datetime().nullable() }).superRefine((value, context) => { if (value.endedAt && Date.parse(value.endedAt) < Date.parse(value.startedAt)) context.addIssue({ code: "custom", message: "Segment end must not precede start" }); });
export const sourceSnapshotSchema = z.object({ sourceId: idSchema, contentHash: z.string().min(1) });
export const studyExerciseSchema = z.object({ id:idSchema,vaultId:vaultIdSchema,courseId:idSchema.nullable(),generationJobId:idSchema.nullable(),mode:studyModeSchema,difficulty:z.enum(["introductory","standard","advanced"]).nullable(),status:z.enum(["generating","ready","generation_failed"]),prompt:z.string().nullable(),answer:z.string().nullable(),explanation:z.string().nullable(),materialSourceIds:z.array(idSchema).min(1),sourceSnapshots:z.array(sourceSnapshotSchema),sourceStale:z.boolean(),modelProfileId:z.string().nullable(),promptVersion:z.string().nullable(),ownerCorrection:z.string().nullable(),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime() });
export const createStudyExerciseSchema = z.object({mode:studyModeSchema,difficulty:z.enum(["introductory","standard","advanced"]).nullable().default(null),count:z.number().int().min(1).max(20).default(1),courseId:idSchema.nullable().default(null),materialSourceIds:z.array(idSchema).min(1).max(30)});
export const studyFeedbackSchema = z.object({summary:z.string(),estimatedCorrectness:z.enum(["correct","partly_correct","incorrect","insufficient_evidence"]),scoreEstimate:z.number().min(0).max(1).nullable(),uncertainty:z.string(),materialSourceIds:z.array(idSchema).min(1).max(30)});
export const studyAttemptSchema = z.object({id:idSchema,vaultId:vaultIdSchema,exerciseId:idSchema,response:z.string(),responseKind:z.enum(["text","self_assessment","spoken_transcript"]),startedAt:z.string().datetime().nullable(),completedAt:z.string().datetime(),hintsUsed:z.array(z.string()),confidenceSelfReport:z.number().int().min(1).max(5).nullable(),feedbackStatus:z.enum(["not_requested","waiting_for_worker","ready","failed"]),feedbackJobId:idSchema.nullable(),feedback:studyFeedbackSchema.nullable(),ownerCorrection:z.object({correction:z.string(),scoreOverride:z.number().min(0).max(1).nullable(),evidenceSourceIds:z.array(idSchema),correctedAt:z.string().datetime()}).nullable(),revision:z.number().int().positive(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const createStudyAttemptSchema = z.object({response:z.string().trim().min(1).max(50000),responseKind:z.enum(["text","self_assessment","spoken_transcript"]).default("text"),startedAt:z.string().datetime().nullable().optional(),completedAt:z.string().datetime(),hintsUsed:z.array(z.string().trim().min(1).max(500)).max(50).default([]),confidenceSelfReport:z.number().int().min(1).max(5).nullable().default(null),idempotencyKey:idSchema}).superRefine((value,context)=>{if(value.startedAt&&Date.parse(value.completedAt)<Date.parse(value.startedAt))context.addIssue({code:"custom",message:"Attempt completion cannot precede start"});});
export const requestStudyFeedbackSchema = z.object({expectedAttemptRevision:z.number().int().positive()});
export const correctStudyFeedbackSchema = z.object({expectedAttemptRevision:z.number().int().positive(),correction:z.string().trim().min(1).max(10000),scoreOverride:z.number().min(0).max(1).nullable().default(null),evidenceSourceIds:z.array(idSchema).max(30).default([])});
export const studyActivityModeSchema=z.enum(["explain","socratic","active_recall","flashcards","practice","mock_exam","simple","advanced","knowledge_gaps"]);
export const createStudyActivitySchema=z.object({mode:studyActivityModeSchema,sourceScope:z.object({sourceIds:z.array(idSchema).min(1).max(30),courseId:idSchema.nullable().default(null)}).strict(),sessionId:idSchema.nullable().default(null),difficulty:z.enum(["introductory","standard","advanced"]).nullable().default(null),length:z.number().int().min(1).max(20).default(5),language:z.string().trim().min(2).max(35).nullable().default(null)}).strict();
export const submitStudyResponseSchema=z.object({itemId:idSchema,answer:z.string().trim().min(1).max(50000),responseId:idSchema,expectedActivityRevision:z.number().int().positive(),elapsedActiveSeconds:z.number().int().min(0).max(86400).nullable().default(null)}).strict();
export const studyActivityItemSchema=studyExerciseSchema.extend({responses:z.array(studyAttemptSchema).max(200)});
export const studyActivitySchema=z.object({id:idSchema,vaultId:vaultIdSchema,sessionId:idSchema.nullable(),generationJobId:idSchema.nullable(),mode:studyActivityModeSchema,difficulty:z.enum(["introductory","standard","advanced"]).nullable(),requestedLength:z.number().int().min(1).max(20),language:z.string().nullable(),materialSourceIds:z.array(idSchema).min(1).max(30),sourceSnapshots:z.array(sourceSnapshotSchema).min(1).max(30),staleSourceIds:z.array(idSchema),state:z.enum(["generating","ready","generation_failed"]),items:z.array(studyActivityItemSchema).max(20),responseCount:z.number().int().nonnegative(),revision:z.number().int().positive(),archivedAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const studyPlanUnitKindSchema = z.enum(["read", "explain", "practice", "recall", "review"]);
export const studyPlanUnitStatusSchema = z.enum(["planned", "in_progress", "completed", "skipped"]);
export const studyPlanUnitSchema = z.object({ id: idSchema, planId: idSchema, sequence: z.number().int().nonnegative(), title: z.string(), objective: z.string(), kind: studyPlanUnitKindSchema, materialSourceIds: z.array(idSchema).min(1), estimatedMinutes: z.number().int().min(5).max(240), estimateOrigin: z.enum(["owner", "model"]), taskId: idSchema.nullable(), status: studyPlanUnitStatusSchema, revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const studyPlanStatusSchema = z.enum(["generating", "draft", "active", "completed", "generation_failed"]);
export const studyPlanSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema.nullable(), assessmentId: idSchema.nullable(), generationJobId: idSchema.nullable(), status: studyPlanStatusSchema, goals: z.array(z.string()), deadline: assignmentDueSchema, materialSourceIds: z.array(idSchema).min(1), materialSnapshots: z.array(sourceSnapshotSchema), taskIds: z.array(idSchema), scheduleProposalIds: z.array(idSchema), scheduledBlockIds:z.array(idSchema), constraints: z.object({ dailyLimitMinutes: z.number().int().min(0).max(1440).optional(), breakMinutes: z.number().int().min(0).max(240).optional(), minBlockMinutes: z.number().int().min(1).max(1440).optional(), maxBlockMinutes: z.number().int().min(1).max(1440).optional(), allowSplit: z.boolean().optional() }), units: z.array(studyPlanUnitSchema), progress: z.object({ completedUnits: z.number().int().nonnegative(), totalUnits: z.number().int().nonnegative(), completedMinutes: z.number().int().nonnegative(), totalMinutes: z.number().int().nonnegative() }), staleSourceIds: z.array(idSchema), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const studyPlanConstraintsSchema = z.object({ dailyLimitMinutes: z.number().int().min(0).max(1440).optional(), breakMinutes: z.number().int().min(0).max(240).optional(), minBlockMinutes: z.number().int().min(1).max(1440).optional(), maxBlockMinutes: z.number().int().min(1).max(1440).optional(), allowSplit: z.boolean().optional() }).superRefine((value,context)=>{if(value.minBlockMinutes&&value.maxBlockMinutes&&value.minBlockMinutes>value.maxBlockMinutes)context.addIssue({code:"custom",message:"Minimum block cannot exceed maximum block"});});
export const createStudyPlanSchema = z.object({ materialSourceIds: z.array(idSchema).min(1).max(30), courseId: idSchema.nullable().optional(), assessmentId: idSchema.nullable().optional(), taskIds: z.array(idSchema).max(100).default([]), deadline: assignmentDueSchema.default({kind:"unknown"}), goals: z.array(z.string().trim().min(1).max(500)).max(20).default([]), constraints: studyPlanConstraintsSchema.default({}) });
export const updateStudyPlanSchema = z.object({ expectedRevision: z.number().int().positive(), patch: z.object({ goals: z.array(z.string().trim().min(1).max(500)).max(20).optional(), deadline: assignmentDueSchema.optional(), status: z.enum(["draft","active","completed"]).optional(), unitUpdates: z.array(z.object({ unitId:idSchema,expectedRevision:z.number().int().positive(),patch:z.object({title:z.string().trim().min(1).max(500).optional(),objective:z.string().trim().min(1).max(2000).optional(),kind:studyPlanUnitKindSchema.optional(),materialSourceIds:z.array(idSchema).min(1).max(30).optional(),estimatedMinutes:z.number().int().min(5).max(240).optional(),status:studyPlanUnitStatusSchema.optional()}) })).max(100).optional() }) });
export const withdrawStudyPlanSchema=z.object({selectedUnstartedBlockIds:z.array(idSchema).min(1).max(100),reason:z.string().trim().min(1).max(1000).nullable().default(null)}).strict().superRefine((value,context)=>{if(value.selectedUnstartedBlockIds.length!==new Set(value.selectedUnstartedBlockIds).size)context.addIssue({code:"custom",path:["selectedUnstartedBlockIds"],message:"Selected block IDs must be unique"});});
export const studyWithdrawalProposalSchema=z.object({id:idSchema,vaultId:vaultIdSchema,studyPlanId:idSchema,studyPlanRevision:z.number().int().positive(),kind:z.literal("study_plan_withdrawal"),status:z.enum(["draft","approved","rejected","withdrawn","superseded","expired"]),revision:z.number().int().positive(),diff:z.object({selectedUnstartedBlockIds:z.array(idSchema),affectedTaskIds:z.array(idSchema),historyDeleted:z.literal(false),fixedOrExternalEventsDeleted:z.literal(false),writesApplied:z.boolean()}).strict(),reason:z.string().nullable(),stale:z.boolean(),expiresAt:z.string().datetime(),rejectionReason:z.string().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()}).strict();
export const workerStudyPlanUnitSchema = z.object({ title:z.string().trim().min(1).max(500),objective:z.string().trim().min(1).max(2000),kind:studyPlanUnitKindSchema,materialSourceIds:z.array(idSchema).min(1).max(30),estimatedMinutes:z.number().int().min(5).max(240) });
export const workerStudyPlanResultSchema = z.object({ type:z.literal("worker_study_plan"),studyPlanId:idSchema,units:z.array(workerStudyPlanUnitSchema).min(1).max(100) });
export const studySessionSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema.nullable(), planId: idSchema.nullable(), unitIds: z.array(idSchema), taskIds: z.array(idSchema), materialSourceIds: z.array(idSchema), calendarEventId: idSchema.nullable(), mode: studyModeSchema.nullable(), state: studySessionStateSchema, estimatedMinutes: z.number().int().positive().nullable(), activeTimeSegments: z.array(activeTimeSegmentSchema), observedActiveSeconds: z.number().int().nonnegative(), outcome: z.string().nullable(), actualProgress: z.number().min(0).max(1).nullable(), sourceSnapshots: z.array(sourceSnapshotSchema), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const createStudySessionSchema = z.object({ courseId: idSchema.nullable().optional(), planId: idSchema.nullable().optional(), unitIds: z.array(idSchema).max(100).default([]), taskIds: z.array(idSchema).max(100).default([]), materialSourceIds: z.array(idSchema).max(100), calendarEventId: idSchema.nullable().optional(), mode: studyModeSchema.nullable().optional(), estimatedMinutes: z.number().int().positive().max(1440).nullable().optional(), startImmediately: z.boolean().default(false), expectedTaskRevisions: z.record(z.number().int().positive()).default({}) }).superRefine((value, context) => { if (value.unitIds.length && !value.planId) context.addIssue({ code: "custom", message: "Unit IDs require a study plan" }); if (value.startImmediately && !value.taskIds.length) context.addIssue({ code: "custom", message: "Starting immediately requires at least one task" }); if (value.startImmediately && value.taskIds.some(id => value.expectedTaskRevisions[id] === undefined)) context.addIssue({ code: "custom", message: "Starting immediately requires every task revision" }); });
export const studySessionActionSchema = z.object({ action: z.enum(["start", "pause", "resume", "interrupt", "complete", "skip"]), observedAt: z.string().datetime(), progress: z.number().min(0).max(1).nullable().optional(), outcome: z.string().trim().min(1).max(2000).nullable().optional(), expectedRevision: z.number().int().positive() });
export const studySessionActionRecordSchema = z.object({ id: idSchema, action: z.enum(["start", "pause", "resume", "interrupt", "complete", "skip"]), observedAt: z.string().datetime(), resultingRevision: z.number().int().positive(), createdAt: z.string().datetime() });
export const executionSessionSchema = studySessionSchema.extend({ actions: z.array(studySessionActionRecordSchema).max(200), actionsTruncated: z.boolean() });
export const taskExecutionHistorySchema = z.object({ taskId: idSchema, items: z.array(executionSessionSchema).max(100), nextCursor: z.string().nullable() });
const executionWorkSchema=z.object({minutes:z.number().int().nonnegative().max(100000).optional(),description:z.string().trim().min(1).max(4000).optional()}).strict().superRefine((value,context)=>{if(value.minutes===undefined&&!value.description)context.addIssue({code:"custom",message:"Work needs minutes or a description"});});
export const startExecutionSessionSchema=z.object({taskId:idSchema,studySessionId:idSchema.nullable().default(null),plannedMinutes:z.number().int().positive().max(1440).nullable().default(null),mode:z.enum(["focus","study","practice","project","admin","other"]),clientOperationId:z.string().trim().min(8).max(200)}).strict();
export const transitionExecutionSessionSchema=z.object({action:z.enum(["pause","resume","finish","abandon"]),observedAt:z.string().datetime(),completedWork:executionWorkSchema.nullable().default(null),remainingWork:executionWorkSchema.nullable().default(null),actualMinutesCorrection:z.number().int().nonnegative().max(100000).nullable().default(null)}).strict().superRefine((value,context)=>{if(value.action==="resume"&&(value.completedWork||value.remainingWork||value.actualMinutesCorrection!==null))context.addIssue({code:"custom",message:"Resume cannot carry completion observations"});if(value.action==="pause"&&value.actualMinutesCorrection!==null)context.addIssue({code:"custom",message:"Pause cannot correct total actual minutes"});});
export const executionSessionRecordSchema=z.object({id:idSchema,vaultId:vaultIdSchema,taskId:idSchema,studySessionId:idSchema.nullable(),plannedMinutes:z.number().int().positive().nullable(),mode:z.enum(["focus","study","practice","project","admin","other"]),state:z.enum(["active","paused","finished","abandoned"]),activeTimeSegments:z.array(activeTimeSegmentSchema).max(1000),observedActiveSeconds:z.number().int().nonnegative(),actualMinutesCorrection:z.number().int().nonnegative().nullable(),completedWork:executionWorkSchema.nullable(),remainingWork:executionWorkSchema.nullable(),referenceSourceIds:z.array(idSchema),clientOperationId:z.string(),revision:z.number().int().positive(),startedAt:z.string().datetime(),updatedAt:z.string().datetime(),finishedAt:z.string().datetime().nullable()}).strict();
export const vaultChangeEventSchema = z.object({ eventId: z.string().regex(/^\d+$/), vaultId: vaultIdSchema, recordType: syncRecordTypeSchema, recordId: idSchema, changeKind: z.enum(["upsert","tombstone"]), revision: z.number().int().nonnegative(), changedAt: z.string().datetime(), cursor: z.string().min(1) }).strict();
export const syncBatchSchema = z.object({ events: z.array(vaultChangeEventSchema).max(500), nextCursor: z.string().nullable(), hasMore: z.boolean(), snapshotRequired: z.boolean(), retentionFloorEventId: z.string().regex(/^\d+$/), latestEventId: z.string().regex(/^\d+$/) }).strict();
export const syncSocketServerFrameSchema=z.discriminatedUnion("type",[
  z.object({type:z.literal("hello_ack"),protocolVersion:z.literal(1),mode:z.enum(["read_only","read_write"]),cursor:z.string().min(1)}).strict(),
  z.object({type:z.literal("changes"),events:z.array(vaultChangeEventSchema).max(100),nextCursor:z.string().min(1)}).strict(),
  z.object({type:z.literal("push_ack"),requestId:idSchema,ack:syncAckSchema}).strict(),
  z.object({type:z.literal("resync_required"),reason:z.enum(["cursor_expired","cursor_ahead"]),retentionFloorEventId:z.string().regex(/^\d+$/),latestEventId:z.string().regex(/^\d+$/)}).strict(),
  z.object({type:z.literal("pong"),nonce:z.string().min(1).max(100)}).strict(),
  z.object({type:z.literal("error"),code:z.enum(["hello_required","invalid_frame","unsupported_protocol","origin_not_allowed","device_not_authorized","write_not_allowed","access_revoked","internal_error"]),retryable:z.boolean()}).strict()
]);
export const knowledgeGapStatusSchema = z.enum(["reported", "confirmed", "corrected", "dismissed", "resolved"]);
export const knowledgeGapSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema.nullable(), concept: z.string(), materialSourceIds: z.array(idSchema), statement: z.string(), evidenceAnchorIds: z.array(idSchema), origin: z.enum(["owner_report", "teacher_feedback", "practice_inference"]), status: knowledgeGapStatusSchema, uncertainty: z.string().nullable(), correction: z.string().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const createReportedKnowledgeGapSchema = z.object({ courseId: idSchema.nullable().optional(), concept: z.string().trim().min(1).max(300), materialSourceIds: z.array(idSchema).max(100).default([]), statement: z.string().trim().min(1).max(2000), evidenceAnchorIds: z.array(idSchema).max(100).default([]) });
export const updateKnowledgeGapSchema = z.object({ status: z.enum(["confirmed", "corrected", "dismissed", "resolved"]), correction: z.string().trim().min(1).max(2000).nullable().optional(), evidenceAnchorIds: z.array(idSchema).max(100).optional(), expectedRevision: z.number().int().positive() }).superRefine((value, context) => { if (value.status === "corrected" && !value.correction) context.addIssue({ code: "custom", message: "A corrected gap requires a correction" }); });
export const correctKnowledgeGapSchema=z.object({state:z.enum(["confirmed","corrected","dismissed","resolved"]),correctionReason:z.string().trim().min(1).max(2000),evidenceAnchorIds:z.array(idSchema).max(100).optional()}).strict().superRefine((value,context)=>{if(value.evidenceAnchorIds&&new Set(value.evidenceAnchorIds).size!==value.evidenceAnchorIds.length)context.addIssue({code:"custom",path:["evidenceAnchorIds"],message:"Evidence anchors must be unique"});});
export const flashcardDeckSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, courseId: idSchema.nullable(), name: z.string(), materialSourceIds: z.array(idSchema), sourceSnapshots: z.array(sourceSnapshotSchema), origin: z.enum(["owner", "generated"]), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const flashcardDeckFieldsSchema = z.object({ name: z.string().trim().min(1).max(200), courseId: idSchema.nullable().optional(), materialSourceIds: z.array(idSchema).max(100).default([]) });
export const createFlashcardDeckSchema = flashcardDeckFieldsSchema; export const updateFlashcardDeckSchema = z.object({ patch: flashcardDeckFieldsSchema.partial(), expectedRevision: z.number().int().positive() });
export const flashcardSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, deckId: idSchema, prompt: z.string(), answer: z.string(), sourceAnchorIds: z.array(idSchema), sourceStale: z.boolean(), origin: z.enum(["owner", "generated"]), approvalStatus: z.enum(["draft", "approved"]), reviewPolicyVersion: z.literal("omega-review-v1"), nextDue: z.string().datetime().nullable(), reviewCount: z.number().int().nonnegative(), archivedAt: z.string().datetime().nullable(), revision: z.number().int().positive(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
const flashcardFieldsSchema = z.object({ deckId: idSchema, prompt: z.string().trim().min(1).max(4000), answer: z.string().trim().min(1).max(8000), sourceAnchorIds: z.array(idSchema).max(100).default([]), approvalStatus: z.enum(["draft", "approved"]).default("approved") });
export const createFlashcardSchema = flashcardFieldsSchema; export const updateFlashcardSchema = z.object({ patch: flashcardFieldsSchema.partial(), expectedRevision: z.number().int().positive() });
export const flashcardRatingSchema = z.enum(["again", "hard", "good", "easy"]);
export const recordFlashcardReviewSchema = z.object({ responseId: z.string().trim().min(1).max(200), rating: flashcardRatingSchema, observedAt: z.string().datetime(), activeSeconds: z.number().int().nonnegative().max(86400).nullable().optional(), expectedCardRevision: z.number().int().positive() });
export const reviewFlashcardSchema=z.object({observedAt:z.string().datetime(),outcome:flashcardRatingSchema,answer:z.string().max(20000).nullable().default(null),hintsUsed:z.number().int().nonnegative().max(1000).nullable().default(null),elapsedMs:z.number().int().nonnegative().max(86_400_000).nullable().default(null)}).strict();
export const flashcardReviewSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, responseId: z.string(), cardId: idSchema, cardRevision: z.number().int().positive(), rating: flashcardRatingSchema, observedAt: z.string().datetime(), activeSeconds: z.number().int().nonnegative().nullable(), reviewPolicyVersion: z.literal("omega-review-v1"), computedNextDue: z.string().datetime(), createdAt: z.string().datetime() });
export const flashcardReviewReceiptSchema=flashcardReviewSchema.extend({answer:z.string().nullable(),hintsUsed:z.number().int().nonnegative().nullable(),elapsedMs:z.number().int().nonnegative().nullable()});
export const flashcardReviewItemSchema = z.object({ card: flashcardSchema, dueBasis: z.enum(["new", "scheduled"]), dueAt: z.string().datetime().nullable(), policyVersion: z.literal("omega-review-v1") });
export const schedulerWindowSchema = z.object({ days: z.array(z.number().int().min(0).max(6)).min(1).max(7), startLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), endLocal: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), label: z.string().trim().min(1).max(120) }).superRefine((value, context) => { if (value.startLocal >= value.endLocal) context.addIssue({ code: "custom", message: "Window end must be after start on the same local day" }); });
const schedulerPreferenceBaseSchema = z.object({ timezone: z.string().trim().min(1).max(100), protectedWindows: z.array(schedulerWindowSchema).max(100), preferredWindows: z.array(schedulerWindowSchema).max(100), dailyLimitMinutes: z.number().int().min(0).max(1440), breakMinutes: z.number().int().min(0).max(240), minBlockMinutes: z.number().int().min(1).max(1440), maxBlockMinutes: z.number().int().min(1).max(1440), allowSplit: z.boolean(), replanPolicy: z.enum(["manual_only", "preview_on_conflict"]), algorithmVersion: z.literal("deterministic-scheduler-v1") });
const validateSchedulerBounds = (value: { minBlockMinutes: number; maxBlockMinutes: number }, context: z.RefinementCtx) => { if (value.minBlockMinutes > value.maxBlockMinutes) context.addIssue({ code: "custom", message: "Minimum block cannot exceed maximum block" }); };
const schedulerPreferenceFieldsSchema = schedulerPreferenceBaseSchema.superRefine(validateSchedulerBounds);
export const schedulerPreferencesSchema = schedulerPreferenceBaseSchema.extend({ vaultId: vaultIdSchema, revision: z.number().int().nonnegative(), createdAt: z.string().datetime().nullable(), updatedAt: z.string().datetime().nullable() }).superRefine(validateSchedulerBounds);
export const setSchedulerPreferencesSchema = z.object({ preferences: schedulerPreferenceFieldsSchema, expectedRevision: z.number().int().nonnegative() });
export const schedulingConstraintsSchema=schedulerPreferencesSchema.and(z.object({freezeHorizonMinutes:z.number().int().min(0).max(10080),movementPolicy:z.enum(["preserve_locked","minimize_disruption","allow_reflow"]),fixedEventsSource:z.literal("canonical_calendar"),deadlinesEnforced:z.literal(true),calendarRevision:sha256Schema}));
export const setSchedulingConstraintsSchema=z.object({timezone:z.string().trim().min(1).max(100),protectedWindows:z.array(schedulerWindowSchema).max(100),preferredWindows:z.array(schedulerWindowSchema).max(100),dailyLimits:z.object({defaultMinutes:z.number().int().min(0).max(1440)}).strict(),breaks:z.object({betweenBlocksMinutes:z.number().int().min(0).max(240),minBlockMinutes:z.number().int().min(1).max(1440),maxBlockMinutes:z.number().int().min(1).max(1440)}).strict(),freezeHorizonMinutes:z.number().int().min(0).max(10080),movementPolicy:z.enum(["preserve_locked","minimize_disruption","allow_reflow"]),allowSplit:z.boolean()}).strict().superRefine((value,context)=>{if(value.breaks.minBlockMinutes>value.breaks.maxBlockMinutes)context.addIssue({code:"custom",path:["breaks"],message:"Minimum block cannot exceed maximum"});});
export const proposeScheduleSchema=z.object({taskIds:z.array(idSchema).min(1).max(100),window:z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime()}).strict(),constraintsRevision:z.number().int().nonnegative(),calendarRevision:sha256Schema,allowSplit:z.boolean(),objectiveParameters:z.object({strategy:z.literal("deadline_priority_v1")}).strict().optional()}).strict().superRefine((value,context)=>{if(new Set(value.taskIds).size!==value.taskIds.length)context.addIssue({code:"custom",path:["taskIds"],message:"Task IDs must be unique"});const span=Date.parse(value.window.endsAt)-Date.parse(value.window.startsAt);if(span<=0||span>31*86_400_000)context.addIssue({code:"custom",path:["window"],message:"Schedule window must be positive and at most 31 days"});});
export const schedulePreviewRequestSchema = z.object({ taskIds: z.array(idSchema).min(1).max(100).optional(), studyPlanId: idSchema.optional(), horizon: z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime() }), constraintOverrides: z.object({ dailyLimitMinutes: z.number().int().min(0).max(1440).optional(), breakMinutes: z.number().int().min(0).max(240).optional(), minBlockMinutes: z.number().int().min(1).max(1440).optional(), maxBlockMinutes: z.number().int().min(1).max(1440).optional(), allowSplit: z.boolean().optional() }).optional(), expectedInputRevisions: z.record(z.number().int().nonnegative()) }).superRefine((value, context) => { if (!value.taskIds?.length && !value.studyPlanId) context.addIssue({ code: "custom", message: "Task IDs or a study plan are required" }); if (Date.parse(value.horizon.endsAt) <= Date.parse(value.horizon.startsAt)) context.addIssue({ code: "custom", message: "Schedule horizon end must follow start" }); if (value.constraintOverrides?.minBlockMinutes && value.constraintOverrides?.maxBlockMinutes && value.constraintOverrides.minBlockMinutes > value.constraintOverrides.maxBlockMinutes) context.addIssue({ code: "custom", message: "Override minimum block cannot exceed maximum" }); });
export const preparationPlanInputSchema=z.object({taskIds:z.array(idSchema).max(100).default([]),studyPlanId:idSchema.nullable().default(null),window:z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime()}).strict(),limits:z.object({dailyLimitMinutes:z.number().int().min(0).max(1440).optional(),breakMinutes:z.number().int().min(0).max(240).optional(),minBlockMinutes:z.number().int().min(1).max(1440).optional(),maxBlockMinutes:z.number().int().min(1).max(1440).optional(),allowSplit:z.boolean().optional()}).strict().default({}),estimates:z.record(z.number().int().positive().nullable()).default({}),lockedEventIds:z.array(idSchema).max(100).default([]),expectedInputRevisions:z.record(z.number().int().nonnegative())}).strict().superRefine((value,context)=>{if(!value.taskIds.length&&!value.studyPlanId)context.addIssue({code:"custom",message:"Task IDs or a study plan are required"});const span=Date.parse(value.window.endsAt)-Date.parse(value.window.startsAt);if(span<=0||span>31*86_400_000)context.addIssue({code:"custom",message:"Preparation window must be positive and at most 31 days"});if(value.limits.minBlockMinutes&&value.limits.maxBlockMinutes&&value.limits.minBlockMinutes>value.limits.maxBlockMinutes)context.addIssue({code:"custom",message:"Minimum block cannot exceed maximum"});if(new Set(value.taskIds).size!==value.taskIds.length||new Set(value.lockedEventIds).size!==value.lockedEventIds.length)context.addIssue({code:"custom",message:"Task and locked event IDs must be unique"});});
export const scheduleReplanRequestSchema = z.object({trigger:z.enum(["missed_work","new_assignment","assessment_changed","availability_changed","event_changed","work_overrun","owner_requested"]),affectedTaskIds:z.array(idSchema).min(1).max(100),priorProposalId:idSchema.nullable().default(null),horizon:z.object({startsAt:z.string().datetime(),endsAt:z.string().datetime()}),remainingWork:z.record(z.number().int().nonnegative()).default({}),expectedInputRevisions:z.record(z.number().int().nonnegative())}).superRefine((value,context)=>{if(Date.parse(value.horizon.endsAt)<=Date.parse(value.horizon.startsAt))context.addIssue({code:"custom",message:"Replan horizon end must follow start"});const ids=new Set(value.affectedTaskIds);if(Object.keys(value.remainingWork).some(id=>!ids.has(id)))context.addIssue({code:"custom",message:"Remaining work must belong to an affected task"});});
export const proposalStatusSchema = z.enum(["draft", "approved", "rejected", "withdrawn", "superseded", "expired"]);
export const scheduleProposalSchema = z.object({ id: idSchema, vaultId: vaultIdSchema, kind: z.literal("schedule_plan"), status: proposalStatusSchema, revision: z.number().int().positive(), diff: z.object({ horizon: z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime() }), placements: z.array(schedulePlacementSchema), unscheduled: z.array(unscheduledWorkSchema), unknownAvailability: z.array(z.string()), writesApplied: z.boolean() }), expectedRevisions: z.record(z.number().int().positive()), constraintsRevision: z.number().int().nonnegative(), calendarDigest: z.string().length(64), affectedRecordIds: z.array(idSchema), requiredPermissions: z.array(z.string()), stale: z.boolean(), expiresAt: z.string().datetime().nullable(), rejectionReason: z.string().nullable(), createdAt: z.string().datetime(), updatedAt: z.string().datetime() });
export const providerCalendarActionKindSchema=z.enum(["create","update","delete","respond"]);
export const providerCalendarRecipientSchema=z.object({address:z.string().email().max(320),displayName:z.string().trim().min(1).max(240).nullable().default(null)});
const providerCalendarPublicFieldsBaseSchema=z.object({title:z.string().trim().min(1).max(500),startsAt:z.string().datetime(),endsAt:z.string().datetime(),timezone:z.string().min(1).max(100),description:z.string().max(5000).nullable().default(null),location:z.string().max(1000).nullable().default(null)}).strict();
export const providerCalendarPublicFieldsSchema=providerCalendarPublicFieldsBaseSchema.superRefine((value,context)=>{if(Date.parse(value.endsAt)<=Date.parse(value.startsAt))context.addIssue({code:"custom",message:"Provider event end must follow start"});});
export const previewProviderCalendarActionSchema=z.object({connectionId:idSchema,kind:providerCalendarActionKindSchema,targetCalendarId:z.string().trim().min(1).max(500),recipients:z.array(providerCalendarRecipientSchema).max(100).default([]),publicFields:providerCalendarPublicFieldsBaseSchema.partial().optional(),response:z.enum(["accepted","declined","tentative"]).nullable().default(null)}).superRefine((value,context)=>{if(value.kind==="respond"&&!value.response)context.addIssue({code:"custom",message:"A calendar response is required"});if(value.kind!=="respond"&&value.response)context.addIssue({code:"custom",message:"Response is valid only for respond actions"});});
export const providerCalendarProposalSchema=z.object({id:idSchema,vaultId:vaultIdSchema,kind:z.literal("provider_calendar_action"),status:proposalStatusSchema,revision:z.number().int().positive(),diff:z.object({eventId:idSchema,connectionId:idSchema,actionKind:providerCalendarActionKindSchema,targetCalendarId:z.string(),recipients:z.array(providerCalendarRecipientSchema),publicFields:providerCalendarPublicFieldsSchema,response:z.enum(["accepted","declined","tentative"]).nullable(),privateFieldsExcluded:z.array(z.string()),writesApplied:z.boolean()}),expectedRevisions:z.object({event:z.number().int().positive(),connection:z.number().int().positive()}),affectedRecordIds:z.array(idSchema),requiredPermissions:z.array(z.string()),stale:z.boolean(),expiresAt:z.string().datetime().nullable(),rejectionReason:z.string().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const entityMergeProposalSchema=z.object({id:idSchema,vaultId:vaultIdSchema,kind:z.literal("entity_merge"),status:proposalStatusSchema,revision:z.number().int().positive(),diff:z.object({targetEntityId:idSchema,sourceEntityIds:z.array(idSchema).min(1),reason:z.string(),affectedEventIds:z.array(idSchema),affectedCommitmentIds:z.array(idSchema),writesApplied:z.boolean()}),expectedRevisions:z.record(z.number().int().positive()),affectedRecordIds:z.array(idSchema),requiredPermissions:z.array(z.string()),stale:z.boolean(),expiresAt:z.string().datetime().nullable(),rejectionReason:z.string().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
const contentProposalEnvelopeSchema=z.object({id:idSchema,vaultId:vaultIdSchema,status:proposalStatusSchema,revision:z.number().int().positive(),expectedRevisions:z.record(z.number().int().positive()),affectedRecordIds:z.array(idSchema),requiredPermissions:z.array(z.string()),stale:z.boolean(),expiresAt:z.string().datetime().nullable(),rejectionReason:z.string().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});
export const mergeNotesProposalSchema=contentProposalEnvelopeSchema.extend({kind:z.literal("merge_notes"),diff:z.object({targetNoteId:idSchema,sourceNoteIds:z.array(idSchema).min(1),mergedTitle:z.string().min(1).max(500),mergedBody:z.string().max(1_000_000),sourcePreviews:z.array(z.object({noteId:idSchema,title:z.string(),revision:z.number().int().positive()})),writesApplied:z.boolean()})});
export const splitNoteProposalSchema=contentProposalEnvelopeSchema.extend({kind:z.literal("split_note"),diff:z.object({sourceNoteId:idSchema,parts:z.array(z.object({title:z.string().min(1).max(500),body:z.string().max(1_000_000)})).min(2).max(50),preserveSourceAsTrashed:z.literal(true),writesApplied:z.boolean()})});
export const mergeLabelsProposalSchema=contentProposalEnvelopeSchema.extend({kind:z.literal("merge_labels"),diff:z.object({targetLabelId:idSchema,sourceLabelIds:z.array(idSchema).min(1),affectedNoteIds:z.array(idSchema),writesApplied:z.boolean()})});
export const bulkReassignProposalSchema=contentProposalEnvelopeSchema.extend({kind:z.literal("bulk_reassign"),diff:z.object({noteIds:z.array(idSchema).min(1),addLabelIds:z.array(idSchema),removeLabelIds:z.array(idSchema),lockedRemovalConflicts:z.array(z.object({noteId:idSchema,labelId:idSchema})),writesApplied:z.boolean()})});
export const ideaPromotionProposalSchema=contentProposalEnvelopeSchema.extend({kind:z.literal("idea_promotion"),diff:z.object({ideaId:idSchema,relatedIdeaIds:z.array(idSchema).default([]),targetProjectId:idSchema.nullable(),newProjectName:z.string().min(1).max(500).nullable(),proposedTitle:z.string().min(1).max(500).nullable().default(null),action:z.enum(["link_existing_project","create_project"]),originalIdeaRetained:z.literal(true),writesApplied:z.boolean()})});
export const proposalSchema=z.discriminatedUnion("kind",[scheduleProposalSchema,providerCalendarProposalSchema,entityMergeProposalSchema,studyWithdrawalProposalSchema,mergeNotesProposalSchema,splitNoteProposalSchema,mergeLabelsProposalSchema,bulkReassignProposalSchema,ideaPromotionProposalSchema]);
export const proposalKindSchema=z.enum(["merge_notes","split_note","merge_labels","bulk_reassign","idea_promotion"]);
export const proposalInputSchema=z.discriminatedUnion("kind",[
  z.object({kind:z.literal("merge_notes"),inputs:z.object({targetNoteId:idSchema,sourceNoteIds:z.array(idSchema).min(1).max(100),mergedTitle:z.string().trim().min(1).max(500),mergedBody:z.string().max(1_000_000)}).strict(),expectedRevisions:z.record(z.number().int().positive())}).strict(),
  z.object({kind:z.literal("split_note"),inputs:z.object({sourceNoteId:idSchema,parts:z.array(z.object({title:z.string().trim().min(1).max(500),body:z.string().max(1_000_000)}).strict()).min(2).max(50)}).strict(),expectedRevisions:z.record(z.number().int().positive())}).strict(),
  z.object({kind:z.literal("merge_labels"),inputs:z.object({targetLabelId:idSchema,sourceLabelIds:z.array(idSchema).min(1).max(100)}).strict(),expectedRevisions:z.record(z.number().int().positive())}).strict(),
  z.object({kind:z.literal("bulk_reassign"),inputs:z.object({noteIds:z.array(idSchema).min(1).max(500),addLabelIds:z.array(idSchema).max(100).default([]),removeLabelIds:z.array(idSchema).max(100).default([])}).strict(),expectedRevisions:z.record(z.number().int().positive())}).strict(),
  z.object({kind:z.literal("idea_promotion"),inputs:z.object({ideaId:idSchema,relatedIdeaIds:z.array(idSchema).max(100).default([]),targetProjectId:idSchema.optional(),newProjectName:z.string().trim().min(1).max(500).optional(),proposedTitle:z.string().trim().min(1).max(500).optional()}).strict(),expectedRevisions:z.record(z.number().int().positive())}).strict()
]).superRefine((value,context)=>{const input=value.inputs as Record<string,unknown>;if(value.kind==="idea_promotion"&&Boolean(input.targetProjectId)===Boolean(input.newProjectName))context.addIssue({code:"custom",message:"Choose exactly one existing project or new project name"});if(value.kind==="idea_promotion"){const ideaId=input.ideaId as string,related=(input.relatedIdeaIds??[]) as string[];if(related.includes(ideaId)||new Set(related).size!==related.length)context.addIssue({code:"custom",path:["inputs","relatedIdeaIds"],message:"Related ideas must be unique and exclude the primary idea"});}});
export const previewIdeaPromotionSchema=z.object({targetProjectId:idSchema.optional(),newProjectName:z.string().trim().min(1).max(500).optional(),expectedRevisions:z.record(z.number().int().positive())}).strict().superRefine((value,context)=>{if(Boolean(value.targetProjectId)===Boolean(value.newProjectName))context.addIssue({code:"custom",message:"Choose exactly one existing project or new project name"});});
export const proposeIdeaProjectSchema=z.object({relatedIdeaIds:z.array(idSchema).max(100).default([]),proposedTitle:z.string().trim().min(1).max(500),existingProjectId:idSchema.optional()}).strict().superRefine((value,context)=>{if(new Set(value.relatedIdeaIds).size!==value.relatedIdeaIds.length)context.addIssue({code:"custom",path:["relatedIdeaIds"],message:"Related idea IDs must be unique"});});
export const rejectProposalSchema = z.object({ expectedProposalRevision: z.number().int().positive(), reason: z.string().trim().min(1).max(1000).nullable().optional() });
export const acceptProposalSchema = z.discriminatedUnion("confirmation",[z.object({ expectedProposalRevision: z.number().int().positive(), confirmation: z.literal("apply_schedule") }),z.object({expectedProposalRevision:z.number().int().positive(),confirmation:z.literal("queue_provider_calendar_action")}),z.object({expectedProposalRevision:z.number().int().positive(),confirmation:z.literal("merge_entities")}),z.object({expectedProposalRevision:z.number().int().positive(),confirmation:z.literal("apply_content_proposal")}),z.object({expectedProposalRevision:z.number().int().positive(),confirmation:z.literal("apply_study_withdrawal")})]);
export const providerCalendarActionStateSchema=z.enum(["pending","in_flight","delivery_unknown","acknowledged","rejected","cancelled"]);
export const providerCalendarActionSchema=z.object({id:idSchema,vaultId:vaultIdSchema,proposalId:idSchema,eventId:idSchema,connectionId:idSchema,provider:z.enum(["microsoft","google_calendar"]),actionKind:providerCalendarActionKindSchema,targetCalendarId:z.string(),recipients:z.array(providerCalendarRecipientSchema),publicFields:providerCalendarPublicFieldsSchema,response:z.enum(["accepted","declined","tentative"]).nullable(),state:providerCalendarActionStateSchema,idempotencyKey:z.string(),providerOperationId:z.string().nullable(),acknowledgement:z.record(z.unknown()).nullable(),attemptCount:z.number().int().nonnegative(),reconciliationRequired:z.boolean(),sendsDisabledAfterRestore:z.boolean(),lastErrorCode:z.string().nullable(),revision:z.number().int().positive(),sentAt:z.string().datetime().nullable(),acknowledgedAt:z.string().datetime().nullable(),cancelledAt:z.string().datetime().nullable(),createdAt:z.string().datetime(),updatedAt:z.string().datetime()});

export const nativeWorkspaceSchema=z.enum(["inbox","today","calendar","tasks","brain","search","settings","school","life"]);
export const nativeWorkspaceTargetSchema=z.object({workspace:nativeWorkspaceSchema,recordId:idSchema.nullable().default(null)}).strict();
export const nativeEventSourceKindSchema=z.enum(["note","task","calendar_event","commitment"]);
export const nativeEventSourceTargetSchema=z.object({kind:nativeEventSourceKindSchema,recordId:idSchema}).strict();
export const nativeHostPreflightSchema=z.object({platform:z.literal("windows"),architecture:z.enum(["x86_64","aarch64","x86","unknown"]),checks:z.array(z.object({kind:z.enum(["desktop_runtime","docker_cli","tailscale_cli","ollama_cli","node_runtime","pnpm_runtime","rust_toolchain","hardware_inventory","service_state"]),status:z.enum(["pass","fail","unknown"]),detail:z.string().min(1).max(300)}).strict()).length(9),mutationsApplied:z.literal(false),secretsIncluded:z.literal(false)}).strict();
export const nativeModelInspectionSchema=z.object({runtimes:z.array(z.object({backend:z.enum(["openai_compatible","ollama"]),endpoint:z.enum(["http://127.0.0.1:8000/v1/models","http://127.0.0.1:11434/api/tags"]),status:z.enum(["available","unavailable","invalid_response"]),models:z.array(z.object({id:z.string().min(1).max(300),digest:z.string().min(1).max(300).nullable()}).strict()).max(200),limitation:z.string().min(1).max(300)}).strict()).length(2),mutationsApplied:z.literal(false),credentialsSent:z.literal(false)}).strict();
export const nativeModelTestSchema=z.object({tests:z.array(z.object({backend:z.enum(["openai_compatible","ollama"]),capability:z.enum(["generation","embedding"]),model:z.enum(["Qwen/Qwen3.8-Flash-Next","qwen3-embedding:0.6b"]),status:z.enum(["passed","failed","unavailable"]),durationMs:z.number().int().min(0).max(300_000),outputTokens:z.number().int().min(0).max(10_000).nullable(),embeddingDimensions:z.number().int().min(0).max(100_000).nullable(),detail:z.string().min(1).max(300)}).strict()).length(2),measuredAt:z.string().datetime(),mutationsApplied:z.literal(false),credentialsSent:z.literal(false),resourceLimitation:z.string().min(1).max(300)}).strict();
export const nativeClipboardCaptureSchema=z.object({text:z.string().max(1_000_000),mimeType:z.literal("text/plain")}).strict();
export const nativeDesktopStatusSchema=z.object({shortcut:z.string().min(1).max(100),shortcutRegistered:z.boolean(),startAtLogin:z.boolean(),platform:z.literal("windows")}).strict();
export const nativePairingChallengeSchema=z.object({pairingId:idSchema,userCode:z.string().regex(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/),expiresAt:z.string().datetime()}).strict();
export const nativePairingStatusSchema=z.discriminatedUnion("status",[
  z.object({status:z.literal("pending"),retryAfterSeconds:z.number().int().min(1).max(60)}).strict(),
  z.object({status:z.literal("paired"),deviceId:idSchema,expiresAt:z.string().datetime(),refreshExpiresAt:z.string().datetime(),vaultIds:z.array(idSchema),scopes:z.array(deviceScopeSchema)}).strict()
]);
export const nativeAuthStatusSchema=z.object({paired:z.boolean(),deviceId:idSchema.nullable(),accessReady:z.boolean(),refreshExpiresAt:z.string().datetime().nullable(),vaultIds:z.array(idSchema),scopes:z.array(deviceScopeSchema)}).strict();
export const nativeApiMethodSchema=z.enum(["GET","POST","PUT","PATCH","DELETE"]);
export const nativeApiPathSchema=z.string().min(1).max(4096).refine(value=>value.startsWith("/api/v1/vaults/")&&!value.includes("\\")&&!value.includes("://")&&!value.includes("//")&&!value.includes("#")&&!/%2e|%2f|%5c/i.test(value),"Only canonical vault API paths are allowed");
export const nativeApiRequestSchema=z.object({method:nativeApiMethodSchema,path:nativeApiPathSchema,body:z.unknown().optional()}).strict();
export const nativeApiResponseSchema=z.object({status:z.number().int().min(100).max(599),body:z.unknown()}).strict();

export type Note = z.infer<typeof noteSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type SystemStatus = z.infer<typeof systemStatusSchema>;
export type Vault = z.infer<typeof vaultSchema>;
export type UploadSession = z.infer<typeof uploadSessionSchema>;
export type BlobSummary = z.infer<typeof blobSummarySchema>;
export type ExportManifest=z.infer<typeof exportManifestSchema>;
export type Capture = z.infer<typeof captureSchema>;
export type NoteRevision = z.infer<typeof noteRevisionSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Reminder=z.infer<typeof reminderSchema>;export type Notification=z.infer<typeof notificationSchema>;
export type Project=z.infer<typeof projectSchema>;export type Idea=z.infer<typeof ideaSchema>;export type Goal=z.infer<typeof goalSchema>;export type Memory=z.infer<typeof memorySchema>;export type PersonalProfile=z.infer<typeof personalProfileSchema>;
export type Calendar = z.infer<typeof calendarSchema>;
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type EventReminderPlan=z.infer<typeof eventReminderPlanSchema>;
export type CalendarBrief=z.infer<typeof calendarBriefSchema>;
export type CalendarImportPreview=z.infer<typeof calendarImportPreviewSchema>;
export type EventOccurrence=z.infer<typeof eventOccurrenceSchema>; export type OccurrenceException=z.infer<typeof occurrenceExceptionSchema>;
export type CalendarView = z.infer<typeof calendarViewSchema>;
export type CalendarEntity = z.infer<typeof calendarEntitySchema>;
export type EntityAlias = z.infer<typeof entityAliasSchema>;
export type CalendarPolicySet = z.infer<typeof calendarPolicySetSchema>;
export type AutomationDecision = z.infer<typeof automationDecisionSchema>;
export type Commitment = z.infer<typeof commitmentSchema>;
export type NoteCommitmentCandidate = z.infer<typeof noteCommitmentCandidateSchema>;
export type CommitmentDetail = z.infer<typeof commitmentDetailSchema>;
export type PrepItem = z.infer<typeof prepItemSchema>;
export type Label = z.infer<typeof labelSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type RelatedResult=z.infer<typeof relatedResultSchema>;
export type ResurfacingFeedback=z.infer<typeof resurfacingFeedbackSchema>;
export type RoutingRule = z.infer<typeof routingRuleSchema>;
export type RulePreviewResult = z.infer<typeof rulePreviewResultSchema>;
export type AiOperation = z.infer<typeof aiOperationSchema>;
export type UndoReceipt = z.infer<typeof undoReceiptSchema>;
export type ProposalUndoReceipt = z.infer<typeof proposalUndoReceiptSchema>;
export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchItem = z.infer<typeof searchItemSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AskHandle=z.infer<typeof askHandleSchema>; export type SearchSuggestions=z.infer<typeof searchSuggestionsSchema>; export type ResolvedCitation=z.infer<typeof resolvedCitationSchema>;
export type Job = z.infer<typeof jobSchema>;
export type JobHandle = z.infer<typeof jobHandleSchema>;
export type JobEvent = z.infer<typeof jobEventSchema>;
export type ToolDescriptor=z.infer<typeof toolDescriptorSchema>;
export type SourceObject=z.infer<typeof sourceObjectSchema>; export type SourceObjectDetail=z.infer<typeof sourceObjectDetailSchema>;
export type Transcript=z.infer<typeof transcriptSchema>; export type MeetilyImport=z.infer<typeof meetilyImportSchema>; export type MeetilyImportResult=z.infer<typeof meetilyImportResultSchema>;
export type WorkerSummary = z.infer<typeof workerSummarySchema>;
export type ModelProfile = z.infer<typeof modelProfileSchema>;
export type VaultAiPolicy=z.infer<typeof vaultAiPolicySchema>; export type AiDisclosurePreview=z.infer<typeof aiDisclosurePreviewSchema>;
export type AiStatus = z.infer<typeof aiStatusSchema>;
export type IndexStatus = z.infer<typeof indexStatusSchema>;
export type PasskeySummary = z.infer<typeof passkeySummarySchema>;
export type Today = z.infer<typeof todaySchema>;
export type TodayNextActionPlan = z.infer<typeof todayNextActionPlanSchema>;
export type NextActionSet = z.infer<typeof nextActionSetSchema>;
export type MomentumPreferences = z.infer<typeof momentumPreferencesSchema>; export type MomentumSummary = z.infer<typeof momentumSummarySchema>;
export type SchoolSubject = z.infer<typeof schoolSubjectSchema>;
export type SchoolCourse = z.infer<typeof schoolCourseSchema>;
export type SchoolAssignment = z.infer<typeof schoolAssignmentSchema>;
export type SchoolLesson = z.infer<typeof schoolLessonSchema>;
export type TeacherView=z.infer<typeof teacherViewSchema>; export type SchoolReadinessReport=z.infer<typeof schoolReadinessReportSchema>;
export type SchoolAssessment = z.infer<typeof schoolAssessmentSchema>;
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type CatchUpPlanResult = z.infer<typeof catchUpPlanResultSchema>;
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;
export type PerformanceGrade = z.infer<typeof performanceGradeSchema>; export type GradeRecord=z.infer<typeof gradeRecordSchema>; export type PerformanceTarget = z.infer<typeof performanceTargetSchema>; export type PerformanceSummary = z.infer<typeof performanceSummarySchema>;
export type StudyPlan = z.infer<typeof studyPlanSchema>; export type StudyPlanUnit = z.infer<typeof studyPlanUnitSchema>;
export type StudyExercise = z.infer<typeof studyExerciseSchema>; export type StudyAttempt = z.infer<typeof studyAttemptSchema>;
export type StudyMode = z.infer<typeof studyModeSchema>; export type StudySession = z.infer<typeof studySessionSchema>; export type StudySessionAction = z.infer<typeof studySessionActionSchema>;
export type ExecutionSession = z.infer<typeof executionSessionSchema>; export type TaskExecutionHistory = z.infer<typeof taskExecutionHistorySchema>;
export type VaultChangeEvent = z.infer<typeof vaultChangeEventSchema>; export type SyncBatch = z.infer<typeof syncBatchSchema>; export type SyncSnapshotEntry = z.infer<typeof syncSnapshotEntrySchema>; export type SyncSnapshotResult = z.infer<typeof syncSnapshotResultSchema>; export type SyncOperation = z.infer<typeof syncOperationSchema>; export type SyncConflict = z.infer<typeof syncConflictSchema>; export type SyncAck = z.infer<typeof syncAckSchema>; export type SyncSocketClientFrame=z.infer<typeof syncSocketClientFrameSchema>;export type SyncSocketServerFrame=z.infer<typeof syncSocketServerFrameSchema>;
export type KnowledgeGap = z.infer<typeof knowledgeGapSchema>;
export type FlashcardDeck = z.infer<typeof flashcardDeckSchema>; export type Flashcard = z.infer<typeof flashcardSchema>; export type FlashcardReview = z.infer<typeof flashcardReviewSchema>; export type FlashcardReviewItem = z.infer<typeof flashcardReviewItemSchema>;
export type SchedulerPreferences = z.infer<typeof schedulerPreferencesSchema>;
export type SchedulePreviewResult = z.infer<typeof schedulePreviewResultSchema>;
export type ScheduleExplanation = z.infer<typeof scheduleExplanationSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type ProviderCalendarAction=z.infer<typeof providerCalendarActionSchema>;
export type NativeWorkspace=z.infer<typeof nativeWorkspaceSchema>; export type NativeWorkspaceTarget=z.infer<typeof nativeWorkspaceTargetSchema>; export type NativeEventSourceKind=z.infer<typeof nativeEventSourceKindSchema>; export type NativeEventSourceTarget=z.infer<typeof nativeEventSourceTargetSchema>; export type NativeHostPreflight=z.infer<typeof nativeHostPreflightSchema>; export type NativeModelInspection=z.infer<typeof nativeModelInspectionSchema>; export type NativeModelTest=z.infer<typeof nativeModelTestSchema>; export type NativeClipboardCapture=z.infer<typeof nativeClipboardCaptureSchema>; export type NativeDesktopStatus=z.infer<typeof nativeDesktopStatusSchema>; export type NativePairingChallenge=z.infer<typeof nativePairingChallengeSchema>; export type NativePairingStatus=z.infer<typeof nativePairingStatusSchema>; export type NativeAuthStatus=z.infer<typeof nativeAuthStatusSchema>; export type NativeApiRequest=z.infer<typeof nativeApiRequestSchema>; export type NativeApiResponse=z.infer<typeof nativeApiResponseSchema>;
export type DeviceScope=z.infer<typeof deviceScopeSchema>; export type DeviceSummary=z.infer<typeof deviceSummarySchema>; export type TokenPair=z.infer<typeof tokenPairSchema>; export type ApiTokenSummary=z.infer<typeof apiTokenSummarySchema>;
export type DeviceCachePolicy=z.infer<typeof deviceCachePolicySchema>;
export { schoolWeatherSchema, type SchoolWeather } from "./weather.js";
