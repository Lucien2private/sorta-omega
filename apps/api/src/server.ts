import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import staticFiles from "@fastify/static";
import websocket from "@fastify/websocket";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ZodError } from "zod";
import { safeFetchText } from "./safe-fetch.js";
import { registerSchoolWeatherRoutes } from "./school-weather.js";
import { decodeNotesCursor, encodeNotesCursor } from "./notes-cursor.js";
import { focusGroundedEvidence, isAssessmentQuestion } from "./grounded-evidence.js";
import { validateReminderProposal } from "./assistant-reminder.js";
import {
  activityEventSchema,
  preferencesSchema,
  updatePreferencesSchema,
  systemStatusSchema,
  vaultSchema,
  createVaultSchema,
  updateVaultSchema,
  purgeRequestSchema,
  notePurgeResultSchema,
  createUploadSchema,
  uploadSessionSchema,
  completeUploadSchema,
  blobSummarySchema,
  createExportSchema,
  exportManifestSchema,
  planImportSchema,
  importManifestSchema,
  applyImportSchema,
  importPlanResultSchema,
  importApplyResultSchema,
  calendarExportInputSchema,
  calendarImportInputSchema,
  calendarImportPreviewSchema,
  aiStatusSchema,
  aiOperationSchema,
  aiTestRequestSchema,
  calendarSchema,
  createCalendarSchema,
  updateCalendarSchema,
  calendarEventSchema,
  calendarViewQuerySchema,
  calendarViewSchema,
  calendarBriefQuerySchema,
  calendarBriefSchema,
  chatMessageAcceptedSchema,
  chatMessageSchema,
  askHandleSchema,
  chatSchema,
  claimWorkerJobRequestSchema,
  calendarEntitySchema,
  personSummarySchema,
  personContextSchema,
  proposeSocialTimeSchema,
  socialTimeProposalResultSchema,
  authorizationRequestSchema,
  reauthorizationRequestSchema,
  authorizationStartSchema,
  calendarConflictSchema,
  commitmentSchema,
  configureWorkerSchema,
  collectionSchema,
  correctNoteClassificationSchema,
  correctionReceiptSchema,
  createCalendarEventSchema,
  refreshPrivateEventContextSchema,
  setEventReminderPlanSchema,
  eventReminderPlanSchema,
  createCalendarEntitySchema,
  updateCalendarEntitySchema,
  entityAliasSchema,
  addEntityAliasSchema,
  previewEntityMergeSchema,
  calendarPolicySetInputSchema,
  calendarPolicySetSchema,
  policyDryRunInputSchema,
  calendarPolicyDryRunResultSchema,
  automationDecisionSchema,
  undoCalendarDecisionSchema,
  calendarDecisionUndoResultSchema,
  createCommitmentSchema,
  updateCommitmentSchema,
  rematchCommitmentSchema,
  commitmentDetailSchema,
  commitmentStatusSchema,
  createPrepItemSchema,
  createRoutingRuleSchema,
  createRelationshipSchema,
  createReminderSchema,
  createLabelSchema,
  createCollectionSchema,
  createCaptureSchema,
  createUrlCaptureSchema,
  generateArtifactSchema,
  captureSchema,
  createNoteSchema,
  createChatMessageSchema,
  createChatSchema,
  createTaskSchema,
  acceptNoteTaskSchema,
  decideCommitmentCandidateSchema,
  noteCommitmentCandidateSchema,
  updateTaskSchema,
  documentRepresentationSchema,
  editNoteSchema,
  expectedNoteRevisionSchema,
  expectedTaskRevisionSchema,
  eventOccurrenceSchema,
  freeBusyQuerySchema,
  freeBusyResultSchema,
  idSchema,
  indexStatusSchema,
  jobHandleSchema,
  jobEventSchema,
  jobSchema,
  systemJobHandleSchema,
  systemJobListSchema,
  systemJobSchema,
  createBackupSchema,
  backupSummarySchema,
  backupManifestSchema,
  createRestorePlanSchema,
  applyRestoreSchema,
  hostResourceReportSchema,
  deploymentProfileSchema,
  checkDeploymentSchema,
  resourcePolicySchema,
  setHostResourcePolicySchema,
  previewRemoteAccessSetupSchema,
  labelSchema,
  modelProfileSchema,
  vaultAiPolicySchema,
  aiDisclosurePreviewInputSchema,
  aiDisclosurePreviewSchema,
  setVaultAiPolicySchema,
  noteSchema,
  noteRevisionSchema,
  noteOrganizationSchema,
  notificationSchema,
  occurrenceExceptionInputSchema,
  prepItemSchema,
  reminderSchema,
  reminderStatusSchema,
  searchRequestSchema,
  searchResultSchema,
  searchSuggestionsSchema,
  resolvedCitationSchema,
  schoolSubjectSchema,
  createSchoolSubjectSchema,
  schoolCourseSchema,
  courseMaterialLinkSchema,
  linkCourseMaterialSchema,
  archiveSchoolAssignmentOverlaySchema,
  teacherViewSchema,
  schoolReadinessReportSchema,
  createSchoolCourseSchema,
  schoolAssignmentSchema,
  createSchoolAssignmentSchema,
  schoolLessonSchema,
  createSchoolLessonSchema,
  schoolAssessmentSchema,
  createSchoolAssessmentSchema,
  attendanceRecordSchema,
  createAttendanceRecordSchema,
  attendanceSummarySchema,
  createCatchUpPlanSchema,
  previewAttendanceCatchUpSchema,
  catchUpPlanResultSchema,
  performanceGradeSchema,
  createPerformanceGradeSchema,
  gradeRecordSchema,
  createGradeRecordSchema,
  updateGradeRecordSchema,
  archiveGradeRecordSchema,
  performanceTargetSchema,
  setPerformanceTargetSchema,
  performanceSummarySchema,
  generatePerformanceRecommendationsSchema,
  performanceRecommendationsResultSchema,
  proposeTaskBreakdownSchema,
  taskBreakdownProposalResultSchema,
  studyPlanSchema,
  createStudyPlanSchema,
  updateStudyPlanSchema,
  withdrawStudyPlanSchema,
  studyWithdrawalProposalSchema,
  studyPlanGenerationResultSchema,
  studyExerciseSchema,
  createStudyExerciseSchema,
  studyAttemptSchema,
  createStudyAttemptSchema,
  requestStudyFeedbackSchema,
  correctStudyFeedbackSchema,
  studyActivitySchema,
  createStudyActivitySchema,
  submitStudyResponseSchema,
  studyExerciseGenerationResultSchema,
  studyAttemptFeedbackResultSchema,
  studySessionSchema,
  createStudySessionSchema,
  studySessionActionSchema,
  knowledgeGapSchema,
  createReportedKnowledgeGapSchema,
  updateKnowledgeGapSchema,
  correctKnowledgeGapSchema,
  flashcardDeckSchema,
  createFlashcardDeckSchema,
  updateFlashcardDeckSchema,
  flashcardSchema,
  createFlashcardSchema,
  updateFlashcardSchema,
  recordFlashcardReviewSchema,
  reviewFlashcardSchema,
  flashcardReviewReceiptSchema,
  flashcardReviewSchema,
  flashcardReviewItemSchema,
  schedulerPreferencesSchema,
  setSchedulerPreferencesSchema,
  schedulingConstraintsSchema,
  setSchedulingConstraintsSchema,
  proposeScheduleSchema,
  schedulePreviewRequestSchema,
  preparationPlanInputSchema,
  scheduleReplanRequestSchema,
  schedulePreviewResultSchema,
  scheduleExplanationSchema,
  proposalSchema,
  proposalInputSchema,
  previewIdeaPromotionSchema,
  proposeIdeaProjectSchema,
  previewProviderCalendarActionSchema,
  providerCalendarActionSchema,
  providerCalendarActionApplyResultSchema,
  entityMergeApplyResultSchema,
  contentProposalApplyResultSchema,
  urlCaptureResultSchema,
  artifactGenerationResultSchema,
  rejectProposalSchema,
  acceptProposalSchema,
  proposalApplyResultSchema,
  undoProposalSchema,
  proposalUndoReceiptSchema,
  setNoteLabelsSchema,
  rebuildIndexRequestSchema,
  reprocessNoteSchema,
  restoreNoteRevisionSchema,
  relationshipSchema,
  relatedResultSchema,
  resurfacingFeedbackInputSchema,
  resurfacingFeedbackSchema,
  routingRulePreviewSchema,
  routingRuleSchema,
  rulePreviewResultSchema,
  taskSchema,
  projectSchema,createProjectSchema,updateProjectSchema,ideaSchema,createIdeaSchema,updateIdeaSchema,goalSchema,createGoalSchema,updateGoalSchema,memorySchema,createMemorySchema,updateMemorySchema,personalProfileSchema,integrationConnectionSchema,createIntegrationConnectionSchema,integrationCapabilityListSchema,integrationProviderSchema,integrationProviderDescriptorSchema,connectorResourceSchema,resourceSelectionSchema,resourceSelectionInputSchema,connectorScheduleSchema,connectorSyncStatusSchema,disconnectIntegrationSchema,previewConnectionDisconnectSchema,connectionDisconnectPreviewSchema,connectionMappingSchema,setConnectionMappingSchema,insightSchema,generateInsightSchema,updateInsightSchema,insightGenerationResultSchema,personalDataItemSchema,personalDataPoliciesSchema,setPersonalDataPoliciesSchema,previewPersonalDataImportSchema,personalDataImportPreviewSchema,applyPersonalDataImportSchema,interestSchema,interestEvidenceSchema,refreshPersonalProfileSchema,rebuildPersonalProfileSchema,profileRebuildProposalResultSchema,syncSelectedPersonalDataSchema,updateInterestSchema,decideInterestClaimSchema,profileRefreshResultSchema,
  todaySchema,
  nextActionQuerySchema,
  nextActionSetSchema,
  taskExecutionHistorySchema,
  startExecutionSessionSchema,
  transitionExecutionSessionSchema,
  executionSessionRecordSchema,
  createSyncSnapshotSchema,
  pushSyncSchema,
  syncBatchSchema,
  syncAckSchema,
  syncSocketClientFrameSchema,
  syncSocketServerFrameSchema,
  type SyncOperation,
  syncSnapshotResultSchema,
  vaultChangeEventSchema,
  momentumSummaryQuerySchema,
  momentumSummarySchema,
  momentumPreferencesSchema,
  updateMomentumPreferencesSchema,
  updateNotificationSchema,
  undoAiOperationSchema,
  undoReceiptSchema,
  workerCompleteSchema,
  workerEvidencePacketSchema,
  workerEvidenceRequestSchema,
  workerFailSchema,
  toolDescriptorSchema,
  runDomainToolSchema,
  toolPolicySetSchema,
  setToolPoliciesSchema,
  executeNaturalLanguageCommandSchema,
  sourceObjectSchema,
  sourceObjectDetailSchema,
  refreshSourceObjectSchema,
  sourceExclusionInputSchema,
  sourceExclusionSchema,
  transcriptSchema,
  transcriptAssociationSchema,
  meetilyImportSchema,
  meetilyImportResultSchema,
  correctTranscriptSchema,
  associateTranscriptSchema,
  analyzeTranscriptSchema,
  schoolOverviewSchema,
  previewSchoolImportSchema,
  schoolImportPreviewResultSchema,
  applySchoolImportSchema,
  schoolImportApplyResultSchema,
  workerHeartbeatRequestSchema,
  workerIndexBatchSchema,
  workerJobInputSchema,
  workerLeaseHeartbeatSchema,
  workerLeaseSchema,
  workerProgressEventsSchema,
  workerSourceInputSchema,
  workerSummarySchema,
  updateCalendarEventSchema,
  updateOccurrenceExceptionSchema,
  updateNoteMetadataSchema,
  updateLabelSchema,
  updateCollectionSchema,
  updatePrepItemSchema,
  updateRoutingRuleSchema
  ,updateReminderSchema
  ,updateSchoolSubjectSchema,
  updateSchoolCourseSchema
  ,updateSchoolAssignmentSchema,
  updateSchoolLessonSchema,
  updateSchoolAssessmentSchema
  ,updateAttendanceRecordSchema,
  updatePerformanceGradeSchema
  ,isDirectReminderRequest
} from "@sorta/contracts";
import { config } from "./config.js";
import { pool, query, transaction } from "./db.js";
import { getOwnerSession, getVaultListAccess, hasCurrentVaultReadAccess, hasRecentStrongAuthentication, registerAuthRoutes, requireOwner, requireVaultOwner, syncDeviceMatchesRequest } from "./auth.js";
import { appendDocumentText, createDocumentState, editorDocumentToMarkdown, mergeDocumentUpdate, readDocumentText, readEditorDocument, replaceDocumentText, replaceEditorDocument, restoreDocumentRevision } from "./note-document.js";
import { commitmentPrepText, commitmentTransitionError, matchesEvent } from "./commitment-matcher.js";
import { buildExcerpt } from "./search.js";
import { configuredModelProfiles } from "./ollama.js";
import { getWorkerIdentity, hashWorkerSecret, leaseSecretMatches, requireWorker } from "./worker-auth.js";
import { reciprocalRankFusion, type RankedCandidate } from "./rank-fusion.js";
import { expandOccurrences, instantFromWallClock, isSupportedTimezone } from "./recurrence.js";
import { calendarSourceStaleness, validateCalendarViewRange } from "./calendar-view.js";
import { attendanceForClass, type ClassAttendanceLink } from "./calendar-attendance.js";
import { assignmentSubmission } from "./assignment-submission.js";
import { explicitCapturedTaskTitle } from "./captured-task.js";
import { groundedReturnCandidates } from "./commitment-candidates.js";
import { prepStatusTransition } from "./prep-item.js";
import { applyClassificationResult, classificationUndoConflict, type NoteClassification } from "./classification.js";
import { compileNoteFilter, filterLabelIds } from "./note-filter.js";
import { decodeActivityCursor, encodeActivityCursor } from "./activity.js";
import { summarizeAttendance, type AttendanceAggregation } from "./attendance-summary.js";
import { summarizeGrades } from "./performance-summary.js";
import { applyStudySessionTransition, observedActiveSeconds, type ActiveTimeSegment, type StudySessionAction, type StudySessionState } from "./study-session.js";
import { FLASHCARD_REVIEW_POLICY_VERSION, nextReviewAt } from "./flashcard-review.js";
import { buildSchedulePreview, explainScheduleReasons, selectNextActionCandidates, selectNextActionPlacement } from "./scheduler.js";
import { initialIntegration } from "./integration-capabilities.js";
import { parseInSchoolSnapshot } from "./school-snapshot.js";
import { applyInSchoolSnapshot } from "./school-snapshot-store.js";
import { schoolImportPreview, schoolSnapshotOutsidePeriod } from "./school-import-preview.js";
import { buildWeeklyReview } from "./weekly-review.js";
import { summarizePersonalDataRecords } from "./personal-data-import.js";
import { analyzeApprovedTopics } from "./interest-analysis.js";
import { buildProviderPublicFields, providerWriteReadiness } from "./provider-calendar-action.js";
import { buildMomentumSummary } from "./momentum.js";
import { decodeSyncCursor, encodeSyncCursor, syncAckCursor, syncCursorDecision, syncOperationReplayDecision } from "./sync-feed.js";
import { dueReminderStatus, reminderUpdateDecision } from "./reminder.js";
import { blobPath, contentDisposition, parseResponseRange, parseUploadPartRange, responseMediaType, uploadDirectory, uploadPartPath, UPLOAD_PART_SIZE } from "./upload-storage.js";
import { buildTar, serializeMinimalCalendar, type TarEntry } from "./export-artifact.js";
import { parseCalendarImport } from "./ics-import.js";
import { rankRelatedNotes } from "./related-notes.js";
import { systemJobCancellationDecision, systemJobRetryDecision } from "./system-job.js";
import { noOAuthCredentialRevocation, revokeGoogleOAuthToken, selectOAuthRevocationToken, unsupportedOAuthRevocation, type OAuthRevocationResult } from "./oauth-revocation.js";
import { collectMicrosoftGraph, type GraphSource } from "./microsoft-graph.js";
import { collectGmail } from "./gmail.js";
import { projectMicrosoftSchoolSource } from "./microsoft-school-projection.js";
import { mapStoredSourceRevision } from "./source-object-revision.js";

const DEFAULT_VAULT = "00000000-0000-4000-8000-000000000001";
const localChatModel = config.LOCAL_CHAT_BACKEND === "openai_compatible" ? config.OPENAI_COMPATIBLE_CHAT_MODEL : config.OLLAMA_CHAT_MODEL;
const localAiBaseUrl = config.LOCAL_CHAT_BACKEND === "openai_compatible" ? config.OPENAI_COMPATIBLE_BASE_URL : config.OLLAMA_BASE_URL;
const localModelProfiles = (installed: ReadonlyMap<string, string | null> = new Map()) =>
  configuredModelProfiles(localChatModel, config.OLLAMA_EMBEDDING_MODEL, installed, config.LOCAL_CHAT_BACKEND);
const app = Fastify({ logger: true, bodyLimit: 25 * 1024 * 1024 });
const blobStorageRoot = path.resolve(config.BLOB_STORAGE_DIR);
const execFileAsync=promisify(execFile);

async function collectHostResources(){let windowsHardware:"available"|"unavailable"|"not_applicable"=process.platform==="win32"?"unavailable":"not_applicable",physicalCores:number|null=null,gpus:Array<{name:string;driverVersion:string|null;adapterRamBytes:number|null}>=[],disks:Array<{name:string;sizeBytes:number;freeBytes:number;fileSystem:string|null}>=[],limitations:string[]=[];if(process.platform==="win32"){try{const script=`$cpu=(Get-CimInstance Win32_Processor|Measure-Object -Property NumberOfCores -Sum).Sum;$gpu=@(Get-CimInstance Win32_VideoController|ForEach-Object{[pscustomobject]@{name=$_.Name;driverVersion=$_.DriverVersion}});$disks=@(Get-CimInstance Win32_LogicalDisk -Filter \"DriveType=3\"|ForEach-Object{[pscustomobject]@{name=$_.DeviceID;sizeBytes=[double]$_.Size;freeBytes=[double]$_.FreeSpace;fileSystem=$_.FileSystem}});[pscustomobject]@{physicalCores=$cpu;gpus=$gpu;disks=$disks}|ConvertTo-Json -Depth 5 -Compress`;const {stdout}=await execFileAsync("powershell.exe",["-NoLogo","-NoProfile","-NonInteractive","-Command",script],{timeout:5000,windowsHide:true,maxBuffer:1024*1024}),value=JSON.parse(stdout);physicalCores=Number(value.physicalCores)||null;gpus=(Array.isArray(value.gpus)?value.gpus:value.gpus?[value.gpus]:[]).map((item:any)=>({name:String(item.name),driverVersion:item.driverVersion?String(item.driverVersion):null,adapterRamBytes:null}));disks=(Array.isArray(value.disks)?value.disks:value.disks?[value.disks]:[]).map((item:any)=>({name:String(item.name),sizeBytes:Number(item.sizeBytes),freeBytes:Number(item.freeBytes),fileSystem:item.fileSystem?String(item.fileSystem):null}));windowsHardware="available";limitations.push("Windows VideoController does not reliably report large dedicated VRAM, so adapterRamBytes remains unknown until the model runtime reports it.");}catch{limitations.push("The fixed Windows CIM hardware probe failed; GPU, physical-core, and disk details are unknown.");}}else limitations.push("Windows CIM hardware probing is not applicable on this host.");const cpus=os.cpus();return hostResourceReportSchema.parse({cpu:{model:cpus[0]?.model??"unknown",logicalProcessors:Math.max(1,cpus.length),physicalCores},memory:{totalBytes:os.totalmem(),freeBytes:os.freemem()},gpus,disks,runtime:{osPlatform:os.platform(),osRelease:os.release(),architecture:os.arch(),nodeVersion:process.versions.node,localAiBackend:config.LOCAL_CHAT_BACKEND,configuredModel:config.LOCAL_CHAT_BACKEND==="openai_compatible"?config.OPENAI_COMPATIBLE_CHAT_MODEL:config.OLLAMA_CHAT_MODEL,endpointOrigin:new URL(localAiBaseUrl).origin},probeState:{windowsHardware,limitations},observedAt:new Date().toISOString()});}

const defaultHostResourcePolicy=()=>resourcePolicySchema.parse({maxInferenceConcurrency:1,backgroundBudget:{maxConcurrentJobs:1,maxCpuPercent:50,maxGpuMemoryPercent:80},quietHours:{startsAt:"22:00",endsAt:"07:00",timezone:"Europe/Oslo"},pauseBackground:false,modelProfileIds:[],interactivePriority:"preempt_background",modelResidency:"unload_when_idle",revision:0,createdAt:null,updatedAt:null});
const mapHostResourcePolicy=(row?:Record<string,any>)=>row?resourcePolicySchema.parse({maxInferenceConcurrency:row.max_inference_concurrency,backgroundBudget:row.background_budget,quietHours:row.quiet_hours,pauseBackground:row.pause_background,modelProfileIds:row.model_profile_ids,interactivePriority:row.interactive_priority,modelResidency:row.model_residency,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)}):defaultHostResourcePolicy();
async function executableAvailable(name:"tailscale"|"cloudflared"){try{await execFileAsync(process.platform==="win32"?"where.exe":"which",[name],{timeout:3000,windowsHide:true,maxBuffer:64*1024});return true;}catch{return false;}}

const hashFile = (file: string) => new Promise<string>((resolve, reject) => {
  const hash = createHash("sha256");
  const stream = createReadStream(file);
  stream.on("data", (chunk) => hash.update(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(hash.digest("hex")));
});

function parseNoteImport(bytes:Buffer,format:"markdown"|"plain_text"|"omega_notes_json_v1",filename:string,options:{defaultTitle:string|null;stripFrontmatter:boolean}){if(bytes.length>25*1024*1024)throw new Error("import_too_large");let text:string;try{text=new TextDecoder("utf-8",{fatal:true}).decode(bytes);}catch{throw new Error("import_not_utf8");}const clean=(value:string)=>options.stripFrontmatter?value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/,""):value,validate=(items:Array<{sourcePath:string;title:string;body:string;sourceId:string|null}>)=>{if(!items.length||items.length>500)throw new Error("import_item_count_out_of_range");for(const item of items)if(!item.title.trim()||item.title.length>240||Buffer.byteLength(item.body)>1024*1024)throw new Error("import_item_invalid_or_too_large");return items;};if(format!=="omega_notes_json_v1"){const body=clean(text),heading=format==="markdown"?body.match(/^#\s+(.+)$/m)?.[1]?.trim():undefined,title=options.defaultTitle??heading??(path.parse(filename).name||"Imported note");return validate([{sourcePath:filename,title,body,sourceId:null}]);}let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw new Error("import_json_invalid");}if(!Array.isArray(parsed))throw new Error("import_json_must_be_array");return validate(parsed.map((item,index)=>{if(!item||typeof item!=="object"||Array.isArray(item))throw new Error("import_json_item_invalid");const value=item as Record<string,unknown>,keys=Object.keys(value);if(keys.some(key=>!["id","title","body","path"].includes(key))||typeof value.title!=="string"||typeof value.body!=="string"||value.id!==undefined&&typeof value.id!=="string"||value.path!==undefined&&typeof value.path!=="string")throw new Error("import_json_item_invalid");return{sourcePath:typeof value.path==="string"?value.path:`notes/${index+1}.json`,title:value.title,body:clean(value.body),sourceId:typeof value.id==="string"?value.id:null};}));}

type OAuthProvider="microsoft"|"google_calendar";
const oauthHash=(value:string)=>createHash("sha256").update(value).digest("hex");
function oauthKey(){return config.OAUTH_CREDENTIAL_KEY_HEX?Buffer.from(config.OAUTH_CREDENTIAL_KEY_HEX,"hex"):null;}
function encryptOAuthSecret(value:string){const key=oauthKey();if(!key)throw new Error("oauth_credential_encryption_not_configured");const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",key,iv),ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]),tag=cipher.getAuthTag();return`v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;}
function decryptOAuthSecret(value:string){const key=oauthKey(),parts=value.split(".");if(!key||parts.length!==4||parts[0]!=="v1")throw new Error("oauth_credential_unavailable");const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(parts[1],"base64url"));decipher.setAuthTag(Buffer.from(parts[2],"base64url"));return Buffer.concat([decipher.update(Buffer.from(parts[3],"base64url")),decipher.final()]).toString("utf8");}
async function revokeConnectionCredential(provider:OAuthProvider,encryptedCredentials:string|null):Promise<OAuthRevocationResult>{if(!encryptedCredentials)return noOAuthCredentialRevocation();if(provider!=="google_calendar")return unsupportedOAuthRevocation();let token:string|null=null;try{token=selectOAuthRevocationToken(decryptOAuthSecret(encryptedCredentials));}catch{return{attempted:false,succeeded:false,cleanupMayBeIncomplete:true,errorCode:"provider_revocation_credential_unavailable"};}return token?revokeGoogleOAuthToken(token):{attempted:false,succeeded:false,cleanupMayBeIncomplete:true,errorCode:"provider_revocation_token_missing"};}
function oauthRegistration(provider:OAuthProvider){if(provider==="microsoft"){if(!config.MICROSOFT_CLIENT_ID||!config.MICROSOFT_TENANT_ID||!oauthKey())return null;return{clientId:config.MICROSOFT_CLIENT_ID,clientSecret:config.MICROSOFT_CLIENT_SECRET,authorizeUrl:`https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize`,tokenUrl:`https://login.microsoftonline.com/${config.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`,redirectUri:new URL("/api/v1/oauth/microsoft/callback",config.APP_ORIGIN).toString(),scopes:{"calendar.read":"Calendars.Read","calendar.write":"Calendars.ReadWrite","teams.read":"Chat.Read","teams.channels.read":"Team.ReadBasic.All Channel.ReadBasic.All ChannelMessage.Read.All","classes.read":"EduRoster.ReadBasic","assignments.read":"EduAssignments.Read","mail.read":"Mail.Read","files.read":"Files.Read","files.read.all":"Files.Read.All","sites.read":"Sites.Read.All","tasks.read":"Tasks.Read","notes.read":"Notes.Read","contacts.read":"Contacts.Read","offline.access":"offline_access"} as Record<string,string>};}if(!config.GOOGLE_CLIENT_ID||!oauthKey())return null;return{clientId:config.GOOGLE_CLIENT_ID,clientSecret:config.GOOGLE_CLIENT_SECRET,authorizeUrl:"https://accounts.google.com/o/oauth2/v2/auth",tokenUrl:"https://oauth2.googleapis.com/token",redirectUri:new URL("/api/v1/oauth/google_calendar/callback",config.APP_ORIGIN).toString(),scopes:{"calendar.read":"https://www.googleapis.com/auth/calendar.readonly","calendar.write":"https://www.googleapis.com/auth/calendar","mail.read":"https://www.googleapis.com/auth/gmail.readonly"} as Record<string,string>};}
const oauthReturnPath=(target:string,connectionId:string)=>target==="connection_detail"?`/settings/connections/${connectionId}`:"/settings/connections";

app.addContentTypeParser("application/octet-stream", { parseAs: "buffer", bodyLimit: UPLOAD_PART_SIZE }, (_request, body, done) => done(null, body));

await app.register(websocket,{options:{maxPayload:2*1024*1024}});
await app.register(cors, { origin: config.APP_ORIGIN, credentials: true });
await app.register(cookie);

app.addHook("onRequest", async (request, reply) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  const origin = request.headers.origin;
  if (origin && origin !== config.APP_ORIGIN) return reply.code(403).send({ error: "origin_not_allowed" });
});

app.addHook("preHandler", async (request, reply) => {
  if (/^\/api\/v1\/vaults\/[^/?]+\/blobs\/[^/?]+\/content(?:[/?]|$)/.test(request.url)) return;
  if (request.url.startsWith("/api/v1/vaults/")) return requireVaultOwner(request, reply);
  if (request.url === "/api/v1/vaults" && request.method === "POST") return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/preferences") || request.url.startsWith("/api/v1/status")) return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/system-jobs") || request.url.startsWith("/api/v1/backups") || request.url.startsWith("/api/v1/restore-plans")) return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/host/") || request.url.startsWith("/api/v1/deployment")) return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/resource-policy")) return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/ai/")) return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/integration-providers")) return requireOwner(request, reply);
  if (request.url.startsWith("/api/v1/workers")) return requireOwner(request, reply);
});

const iso = (value: Date | string) => new Date(value).toISOString();
const mapPreferences = (row: Record<string, any>) => preferencesSchema.parse({
  locale: row.locale,
  timezone: row.timezone,
  notificationChannels: row.notification_channels,
  protectFocusTime: row.protect_focus_time,
  defaultFocusMinutes: row.default_focus_minutes,
  profileInferenceEnabled: row.profile_inference_enabled,
  expandedDataEgressEnabled: row.expanded_data_egress_enabled,
  defaultPersonalDataSync: row.default_personal_data_sync,
  sensitiveSchoolCategories: row.sensitive_school_categories,
  revision: row.revision,
  updatedAt: iso(row.updated_at)
});
const mapVault = (row: Record<string, any>) => vaultSchema.parse({
  id: row.id,
  name: row.name,
  locale: row.locale,
  timezone: row.timezone,
  storageMode: row.storage_mode,
  remoteAuthorized: row.remote_authorized,
  revision: row.revision,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at)
});
const mapBlob = (row: Record<string, any>) => blobSummarySchema.parse({
  id: row.id,
  vaultId: row.vault_id,
  filename: row.filename,
  mediaType: row.media_type,
  byteLength: Number(row.byte_length),
  sha256: row.sha256,
  createdAt: iso(row.created_at)
});
const mapExport=(row:Record<string,any>)=>exportManifestSchema.parse({id:row.id,vaultId:row.vault_id,kind:row.kind,status:new Date(row.expires_at).getTime()<=Date.now()?"expired":row.status,format:row.format,privacy:row.privacy,byteLength:row.byte_length===null?null:Number(row.byte_length),sha256:row.sha256,expiresAt:iso(row.expires_at),createdAt:iso(row.created_at)});
const mapCalendarImportPreview=(row:Record<string,any>)=>calendarImportPreviewSchema.parse({id:row.id,vaultId:row.vault_id,attachmentId:row.attachment_blob_id,targetCalendarId:row.target_calendar_id,status:new Date(row.expires_at).getTime()<=Date.now()?"expired":row.status,timezone:row.timezone,items:row.items,warnings:row.warnings,counts:row.counts,invitationsSent:false,writesApplied:false,revision:row.revision,expiresAt:iso(row.expires_at),createdAt:iso(row.created_at)});

async function persistBlobBytes(vaultId:string,filename:string,mediaType:string,bytes:Buffer){
  const sha256=createHash("sha256").update(bytes).digest("hex"),destination=blobPath(blobStorageRoot,sha256);
  await mkdir(path.dirname(destination),{recursive:true});
  if(existsSync(destination)){if(await hashFile(destination)!==sha256)throw new Error("existing_blob_integrity_failure");}
  else{const temporary=`${destination}.${randomUUID()}.tmp`;await writeFile(temporary,bytes,{flag:"wx"});try{await rename(temporary,destination);}catch(error){await rm(temporary,{force:true});if(!existsSync(destination)||await hashFile(destination)!==sha256)throw error;}}
  const stored=await query("INSERT INTO blobs(vault_id,filename,media_type,byte_length,sha256,storage_key) VALUES ($1,$2,$3,$4,$5,$5) ON CONFLICT(vault_id,sha256) DO UPDATE SET filename=excluded.filename RETURNING *",[vaultId,filename,mediaType,bytes.length,sha256]);
  return{blob:stored.rows[0],sha256,byteLength:bytes.length};
}

const exportTablesByDomain={
  notes:["sources","notes","labels","collections","routing_rules","note_relationships","ai_operations"],
  tasks:["tasks","reminders","notifications"],
  calendar:["calendars","calendar_events","calendar_entities","commitments","prep_items","event_reminder_plans","calendar_policy_sets","calendar_automation_decisions","calendar_archive_tombstones","calendar_briefs","schedule_proposals"],
  school:["school_subjects","school_courses","school_assignments","school_lessons","school_assessments","attendance_records","performance_grades","performance_targets"],
  study:["study_plans","study_plan_units","study_exercises","study_attempts","study_sessions","study_session_actions","knowledge_gaps","flashcard_decks","flashcards","flashcard_reviews","scheduler_preferences","momentum_preferences"],
  profile:["projects","ideas","goals","memories","insights","personal_data_items","interests"],
} as const;
type ExportDomain=keyof typeof exportTablesByDomain;

async function buildVaultExport(vaultId:string,input:{scope:"all"|{domains:ExportDomain[]};format:"markdown_bundle"|"full_fidelity";includeHistory:boolean}){
  const domains=input.scope==="all"?Object.keys(exportTablesByDomain) as ExportDomain[]:input.scope.domains;
  const snapshot=await transaction(async client=>{
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const vault=(await client.query("SELECT id,name,locale,timezone,storage_mode,revision,created_at,updated_at FROM vaults WHERE id=$1",[vaultId])).rows[0];
    if(!vault)return null;
    const records:Record<string,unknown[]>={};
    for(const domain of domains)for(const table of exportTablesByDomain[domain])records[table]=(await client.query(`SELECT * FROM "${table}" t WHERE vault_id=$1 ORDER BY to_jsonb(t)::text`,[vaultId])).rows;
    if(input.includeHistory&&domains.includes("notes"))records.note_revisions=(await client.query("SELECT r.* FROM note_revisions r JOIN notes n ON n.id=r.note_id WHERE n.vault_id=$1 ORDER BY r.note_id,r.revision",[vaultId])).rows;
    if(domains.includes("notes")){records.note_labels=(await client.query("SELECT x.* FROM note_labels x JOIN notes n ON n.id=x.note_id WHERE n.vault_id=$1 ORDER BY x.note_id,x.label_id",[vaultId])).rows;if(input.includeHistory)records.note_corrections=(await client.query("SELECT x.* FROM note_corrections x JOIN notes n ON n.id=x.note_id WHERE n.vault_id=$1 ORDER BY x.note_id,x.created_at",[vaultId])).rows;}
    if(domains.includes("calendar")){records.calendar_event_exceptions=(await client.query("SELECT x.* FROM calendar_event_exceptions x JOIN calendar_events e ON e.id=x.event_id WHERE e.vault_id=$1 ORDER BY x.event_id,x.original_starts_at",[vaultId])).rows;records.calendar_entity_aliases=(await client.query("SELECT x.* FROM calendar_entity_aliases x JOIN calendar_entities e ON e.id=x.entity_id WHERE e.vault_id=$1 ORDER BY x.entity_id,x.id",[vaultId])).rows;records.event_entity_links=(await client.query("SELECT x.* FROM event_entity_links x JOIN calendar_events e ON e.id=x.event_id WHERE e.vault_id=$1 ORDER BY x.event_id,x.entity_id,x.role",[vaultId])).rows;records.prep_item_suppressions=(await client.query("SELECT x.* FROM prep_item_suppressions x JOIN calendar_events e ON e.id=x.event_id WHERE e.vault_id=$1 ORDER BY x.event_id,x.fingerprint",[vaultId])).rows;if(input.includeHistory){records.calendar_event_revisions=(await client.query("SELECT r.* FROM calendar_event_revisions r JOIN calendar_events e ON e.id=r.event_id WHERE e.vault_id=$1 ORDER BY r.event_id,r.revision",[vaultId])).rows;records.commitment_status_history=(await client.query("SELECT h.* FROM commitment_status_history h JOIN commitments c ON c.id=h.commitment_id WHERE c.vault_id=$1 ORDER BY h.commitment_id,h.created_at,h.id",[vaultId])).rows;}}
    if(domains.includes("profile"))records.interest_evidence=(await client.query("SELECT x.* FROM interest_evidence x JOIN interests i ON i.id=x.interest_id WHERE i.vault_id=$1 ORDER BY x.interest_id,x.personal_data_item_id",[vaultId])).rows;
    const originalBlobs=domains.includes("notes")?(await client.query("SELECT DISTINCT b.*,sb.source_id,sb.position FROM blobs b JOIN source_blobs sb ON sb.blob_id=b.id JOIN sources s ON s.id=sb.source_id WHERE s.vault_id=$1 ORDER BY b.sha256",[vaultId])).rows:[];
    return{vault,records,originalBlobs,capturedAt:new Date().toISOString()};
  });
  if(!snapshot)return null;
  const manifest={version:1,kind:"vault_export",format:input.format,scope:domains,includeHistory:input.includeHistory,capturedAt:snapshot.capturedAt,vault:snapshot.vault,recordCounts:Object.fromEntries(Object.entries(snapshot.records).map(([name,rows])=>[name,rows.length])),originalBlobs:snapshot.originalBlobs.map(row=>({id:row.id,sourceId:row.source_id,position:row.position,filename:row.filename,mediaType:row.media_type,byteLength:Number(row.byte_length),sha256:row.sha256,path:`blobs/${row.sha256}`}))};
  const entries:TarEntry[]=[{name:"manifest.json",content:Buffer.from(JSON.stringify(manifest,null,2))}];
  for(const [table,rows] of Object.entries(snapshot.records))entries.push({name:`records/${table}.json`,content:Buffer.from(JSON.stringify(rows,null,2))});
  if(input.format==="markdown_bundle")for(const row of snapshot.records.notes??[])entries.push({name:`notes/${String((row as any).id)}.md`,content:Buffer.from(`# ${String((row as any).title)}\n\n${String((row as any).body??"")}\n`)});
  for(const row of snapshot.originalBlobs){const file=blobPath(blobStorageRoot,row.storage_key);if(!existsSync(file))throw new Error(`source_blob_unavailable:${row.id}`);const bytes=await readFile(file);if(bytes.length!==Number(row.byte_length)||createHash("sha256").update(bytes).digest("hex")!==row.sha256)throw new Error(`source_blob_integrity_failure:${row.id}`);entries.push({name:`blobs/${row.sha256}`,content:bytes});}
  return{bytes:buildTar(entries,new Date(snapshot.capturedAt)),sourceManifest:Object.entries(snapshot.records).flatMap(([recordType,rows])=>rows.map((row:any)=>({recordType,recordId:row.id??null,revision:row.revision??null}))),capturedAt:snapshot.capturedAt};
}
const revisionFromIfMatch = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = raw?.match(/^(?:W\/)?"?(\d+)"?$/);
  return match ? Number(match[1]) : null;
};
const mapNote = (row: Record<string, any>) => noteSchema.parse({
  id: row.id, vaultId: row.vault_id, title: row.title, body: row.body,
  status: row.status, sourceId: row.source_id, originalSha256: row.original_sha256 ?? null, revision: row.revision,
  classification: row.classification, classificationLocked: row.classification_locked, suggestedTitle: row.suggested_title,
  classifiedRevision: row.classified_revision, organizationRevision: row.organization_revision,
  createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
});
const mapRevision = (row: Record<string, any>) => noteRevisionSchema.parse({
  id: row.id, noteId: row.note_id, revision: row.revision, title: row.title,
  text: row.body, actorKind: row.actor_kind, createdAt: iso(row.created_at)
});
const aiBlockStart="<!-- sorta:ai-block:main:start -->",aiBlockEnd="<!-- sorta:ai-block:main:end -->";
const wrapAiBlock=(content:string)=>`${aiBlockStart}\n${content.trim()}\n${aiBlockEnd}`;
function replaceAiBlock(body:string,content:string){const start=body.indexOf(aiBlockStart),end=body.indexOf(aiBlockEnd,start+aiBlockStart.length);if(start<0||end<0||body.indexOf(aiBlockStart,start+1)>=0||body.indexOf(aiBlockEnd,end+1)>=0)return null;return `${body.slice(0,start)}${wrapAiBlock(content)}${body.slice(end+aiBlockEnd.length)}`;}
function dependencyGraphHasCycle(steps:Array<{stepId:string;dependsOnStepIds:string[]}>){const byId=new Map(steps.map(step=>[step.stepId,step])),visiting=new Set<string>(),visited=new Set<string>();const visit=(id:string):boolean=>{if(visiting.has(id))return true;if(visited.has(id))return false;visiting.add(id);for(const dependency of byId.get(id)?.dependsOnStepIds??[])if(visit(dependency))return true;visiting.delete(id);visited.add(id);return false;};return steps.some(step=>visit(step.stepId));}
const mapTask = (row: Record<string, any>) => taskSchema.parse({
  id: row.id, vaultId: row.vault_id, title: row.title, sourceNoteId:row.source_note_id??null, completed: row.completed,
  dueAt: row.due_at ? iso(row.due_at) : null, estimatedMinutes: row.estimated_minutes, remainingMinutes: row.remaining_minutes,
  earliestStart: row.earliest_start ? iso(row.earliest_start) : null, priority: row.priority, allowSplit: row.allow_split,
  minBlockMinutes: row.min_block_minutes, maxBlockMinutes: row.max_block_minutes, revision: row.revision,
  createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
});
const mapReminder=(row:Record<string,any>)=>reminderSchema.parse({id:row.id,vaultId:row.vault_id,taskId:row.task_id,sourceAnchorId:row.source_anchor_id,calendarEventId:row.calendar_event_id??null,title:row.title??null,remindAt:iso(row.remind_at),timezone:row.timezone,channel:row.channel,status:row.status,revision:row.revision,deliveredAt:row.delivered_at?iso(row.delivered_at):null,dismissedAt:row.dismissed_at?iso(row.dismissed_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapNotification=(row:Record<string,any>)=>notificationSchema.parse({id:row.id,vaultId:row.vault_id,reminderId:row.reminder_id,taskId:row.task_id,channel:row.channel,title:row.title,body:row.body,state:row.state,revision:row.revision,deliveredAt:iso(row.delivered_at),readAt:row.read_at?iso(row.read_at):null,dismissedAt:row.dismissed_at?iso(row.dismissed_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
async function materializeDueReminders(vaultId:string){return transaction(async client=>{const due=await client.query(`SELECT r.*,t.title AS task_title FROM reminders r LEFT JOIN tasks t ON t.id=r.task_id AND t.deleted_at IS NULL WHERE r.vault_id=$1 AND r.deleted_at IS NULL AND r.status IN ('scheduled','snoozed') AND r.remind_at<=now() ORDER BY r.remind_at,r.id LIMIT 100 FOR UPDATE OF r SKIP LOCKED`,[vaultId]);const now=new Date();for(const reminder of due.rows){const status=dueReminderStatus(reminder.remind_at,now);if(!status)continue;const deliveredAt=now.toISOString();await client.query("UPDATE reminders SET status=$3,delivered_at=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,reminder.id,status,deliveredAt]);await client.query(`INSERT INTO notifications(vault_id,reminder_id,task_id,channel,title,body,delivered_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(reminder_id) DO NOTHING`,[vaultId,reminder.id,reminder.task_id,reminder.channel,reminder.title??reminder.task_title??"Reminder",status==="missed"?`Missed reminder scheduled for ${iso(reminder.remind_at)}.`:`Reminder due at ${iso(reminder.remind_at)}.`,deliveredAt]);}return due.rowCount;});}
const mapEvent = (row: Record<string, any>) => calendarEventSchema.parse({
  id: row.id, vaultId: row.vault_id, calendarId:row.calendar_id, title: row.title,
  startsAt: iso(row.starts_at), endsAt: iso(row.ends_at),
  privateContext: row.private_context, revision: row.revision, timezone: row.timezone, recurrence: row.recurrence,
  trashedAt: row.trashed_at ? iso(row.trashed_at) : null, createdAt: iso(row.created_at)
});
const mapCalendar=(row:Record<string,any>)=>calendarSchema.parse({id:row.id,vaultId:row.vault_id,name:row.name,timezone:row.timezone,origin:row.origin,ownership:row.ownership,capabilities:{read:row.can_read,write:row.can_write},selectedVisible:row.selected_visible,displayPreferences:row.display_preferences,providerMapping:row.connection_id&&row.provider_calendar_id?{connectionId:row.connection_id,providerCalendarId:row.provider_calendar_id}:null,freshness:{state:row.freshness_state,lastSyncedAt:row.last_synced_at?iso(row.last_synced_at):null},revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
function mapEventReminderPlan(event:Record<string,any>,row?:Record<string,any>){const occurrenceScope=row?.occurrence_scope??"series",occurrenceId=row?.occurrence_id??null,schedules=(row?.schedules??[]) as Array<{minutesBefore:number}>,channels=(row?.channels??["in_app"]) as Array<"in_app"|"windows_native">;let starts:string[]=[];if(occurrenceScope==="occurrence"&&occurrenceId?.startsWith(`${event.id}:`)){const value=occurrenceId.slice(event.id.length+1);if(!Number.isNaN(Date.parse(value)))starts=[new Date(value).toISOString()];}else{const now=new Date(),to=new Date(now.getTime()+366*86_400_000);starts=expandOccurrences({eventId:event.id,title:event.title,startsAt:iso(event.starts_at),endsAt:iso(event.ends_at),recurrence:event.recurrence,from:now.toISOString(),to:to.toISOString(),limit:100}).map(item=>item.startsAt);}const nextTriggers=starts.flatMap(start=>schedules.map(schedule=>({scheduledFor:new Date(Date.parse(start)-schedule.minutesBefore*60_000).toISOString(),minutesBefore:schedule.minutesBefore,channels}))).filter(item=>Date.parse(item.scheduledFor)>Date.now()).sort((a,b)=>a.scheduledFor.localeCompare(b.scheduledFor)).slice(0,20);return eventReminderPlanSchema.parse({eventId:event.id,vaultId:event.vault_id,eventRevision:event.revision,occurrenceScope,occurrenceId,schedules,channels,revision:row?.revision??0,nextTriggers,deliverability:{inApp:"durable_queue",windowsNative:channels.includes("windows_native")?"unverified_host_delivery":"not_requested",guaranteedOsDelivery:false,quietHoursApplied:false},createdAt:row?.created_at?iso(row.created_at):null,updatedAt:row?.updated_at?iso(row.updated_at):null});}
const mapEntity = (row: Record<string, any>) => calendarEntitySchema.parse({
  id: row.id, vaultId: row.vault_id, kind: row.kind, name: row.name,
  mergedIntoEntityId: row.merged_into_entity_id ?? null, archivedAt: row.archived_at ? iso(row.archived_at) : null,
  revision: row.revision, createdAt: iso(row.created_at),aliases:row.aliases??[],sourceLinks:row.source_links??[],dependencies:row.dependencies??{eventCount:0,activeCommitmentCount:0,otherCommitmentCount:0}
});
const mapEntityAlias = (row: Record<string, any>) => entityAliasSchema.parse({ id: row.id, entityId: row.entity_id, alias: row.alias, scope: row.scope, evidenceNoteId: row.evidence_note_id, revision: row.revision, createdAt: iso(row.created_at) });
const calendarPolicyEffects=(rules:Array<{id:string;enabled:boolean;action:string;confirmation:string}>,previousRules:Array<{id:string;enabled:boolean}>=[])=>{const previouslyEnabled=new Set(previousRules.filter(rule=>rule.enabled).map(rule=>rule.id));return{enabledLocalActions:rules.filter(rule=>rule.enabled&&rule.action!=="queue_external_calendar_action").length,reviewOnlyActions:rules.filter(rule=>rule.enabled&&rule.confirmation==="always_review").length,newlyEnabledRuleIds:rules.filter(rule=>rule.enabled&&!previouslyEnabled.has(rule.id)).map(rule=>rule.id),externalActionsAlwaysReviewed:true as const};};
const mapCalendarPolicySet=(vaultId:string,row?:Record<string,any>,previousRules:Array<{id:string;enabled:boolean}>=row?.rules??[])=>{const rules=row?.rules??[];return calendarPolicySetSchema.parse({vaultId,rules,revision:row?.revision??0,effectSummary:calendarPolicyEffects(rules,previousRules),createdAt:row?.created_at?iso(row.created_at):null,updatedAt:row?.updated_at?iso(row.updated_at):null});};
const mapAutomationDecision=(row:Record<string,any>)=>automationDecisionSchema.parse({id:row.id,vaultId:row.vault_id,policyRuleId:row.policy_rule_id,sourceId:row.source_id,eventId:row.event_id,action:row.action,outcome:row.outcome,reasonCodes:row.reason_codes,evidence:row.evidence,policyRevision:row.policy_revision,reversible:row.reversible,undoneAt:row.undone_at?iso(row.undone_at):null,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapCommitment = (row: Record<string, any>) => commitmentSchema.parse({
  id: row.id, vaultId: row.vault_id, text: row.text, personEntityId: row.person_entity_id,
  objectEntityId: row.object_entity_id, objectLabel: row.object_label, sourceNoteId: row.source_note_id,
  sourceNoteRevision: row.source_note_revision ?? null, sourceQuote: row.source_quote ?? null,
  conditionKind: row.condition_kind, status: row.status, revision: row.revision, createdAt: iso(row.created_at)
});
const mapNoteCommitmentCandidate = (row: Record<string, any>) => noteCommitmentCandidateSchema.parse({
  id: row.id, noteId: row.note_id, noteRevision: row.note_revision, evidenceQuote: row.evidence_quote,
  personName: row.person_name, objectLabel: row.object_label, kind: row.kind,
  conditionKind: row.condition_kind, state: row.state, commitmentId: row.commitment_id,
  createdAt: iso(row.created_at)
});
const mapPrepItem = (row: Record<string, any>) => prepItemSchema.parse({
  id: row.id, eventId: row.event_id, commitmentId: row.commitment_id, text: row.text,
  occurrenceId: row.occurrence_id, type: row.type, status: row.status, evidenceNoteId: row.evidence_note_id,
  provenance: row.provenance, revision: row.revision, createdAt: iso(row.created_at)
});
const mapLabel = (row: Record<string, any>) => labelSchema.parse({
  id: row.id, vaultId: row.vault_id, kind: row.kind, name: row.name, aliases: row.aliases ?? [],
  parentId: row.parent_id, status: row.status, pinned: row.pinned, revision: row.revision,
  supportedNoteCount: Number(row.supported_note_count ?? 0), createdAt: iso(row.created_at)
});
const mapCollection = (row: Record<string, any>) => collectionSchema.parse({
  id: row.id, vaultId: row.vault_id, name: row.name, filter: row.filter, sort: row.sort,
  view: row.view, system: row.system, revision: row.revision, createdAt: iso(row.created_at)
});
const mapRoutingRule = (row: Record<string, any>) => routingRuleSchema.parse({
  id: row.id, vaultId: row.vault_id, name: row.name, condition: row.condition, targetLabelIds: row.target_label_ids,
  priority: row.priority, enabled: row.enabled, provenance: row.provenance, revision: row.revision, createdAt: iso(row.created_at)
});
const mapAiOperation = (row: Record<string, any>) => aiOperationSchema.parse({
  id: row.id, vaultId: row.vault_id, noteId: row.note_id, jobId: row.job_id, kind: row.kind,
  sourceRevision: row.source_revision, modelProfileId: row.model_profile_id, modelDigest: row.model_digest,
  promptVersion: row.prompt_version, result: row.result, inverse: row.inverse ?? {}, applied: row.applied,
  effectOrganizationRevision: row.effect_organization_revision ?? null,
  undoneAt: row.undone_at ? iso(row.undone_at) : null, createdAt: iso(row.created_at)
});
const mapSchoolSubject = (row: Record<string, any>) => schoolSubjectSchema.parse({ id: row.id, vaultId: row.vault_id, name: row.name, code: row.code, academicPeriod: row.academic_period, sourceAnchorIds: row.source_anchor_ids, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapSchoolCourse = (row: Record<string, any>) => schoolCourseSchema.parse({ id: row.id, vaultId: row.vault_id, subjectId: row.subject_id, name: row.name, academicPeriod: row.academic_period, teacherEntityIds: row.teacher_entity_ids, classEntityIds: row.class_entity_ids, sourceAnchorIds: row.source_anchor_ids, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapSchoolAssignment = (row: Record<string, any>) => schoolAssignmentSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, title: row.title, instructionsSourceIds: row.instructions_source_ids, due: row.due, materialSourceIds: row.material_source_ids, taskIds: row.task_ids, preparationStatus: row.preparation_status, origin: row.origin, providerListSection: row.provider_list_section ?? null, providerDetailState: row.provider_detail_state ?? null, providerSeenInLatestSnapshot: row.provider_seen_in_latest_snapshot ?? null, sourceObjectId: row.source_object_id ?? null, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at), submission: assignmentSubmission(row.submission_record,row.submission_timestamp?iso(row.submission_timestamp):null,row.due) });
const mapCourseMaterialLink=(row:Record<string,any>)=>courseMaterialLinkSchema.parse({id:row.id,vaultId:row.vault_id,courseId:row.course_id,sourceId:row.source_object_id,revisionId:row.source_revision_id,chapter:row.chapter,lessonId:row.lesson_id,mappingOrigin:row.mapping_origin,evidenceAnchorIds:row.evidence_anchor_ids,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapSchoolLesson = (row: Record<string, any>) => schoolLessonSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, calendarEventId: row.calendar_event_id, timeSpec: row.time_spec, room: row.room, sourceAnchorIds: row.source_anchor_ids, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapSchoolAssessment = (row: Record<string, any>) => schoolAssessmentSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, title: row.title, kind: row.kind, timeSpec: row.time_spec, materialScope: row.material_scope, officialWeight: row.official_weight, sourceAnchorIds: row.source_anchor_ids, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapAttendanceRecord = (row: Record<string, any>) => attendanceRecordSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, lessonId: row.lesson_id, date: typeof row.record_date === "string" ? row.record_date.slice(0, 10) : iso(row.record_date).slice(0, 10), timeSpec: row.time_spec, rawStatus: row.raw_status, normalizedStatus: row.normalized_status, excusalStatus: row.excusal_status, duration: row.duration === null ? null : Number(row.duration), units: row.units, sourceAnchorIds: row.source_anchor_ids, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapPerformanceGrade = (row: Record<string, any>) => performanceGradeSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, assessmentId: row.assessment_id, gradeValue: row.grade_value, gradeScale: row.grade_scale, date: typeof row.grade_date === "string" ? row.grade_date.slice(0,10) : iso(row.grade_date).slice(0,10), officialWeight: row.official_weight, sourceAnchorIds: row.source_anchor_ids, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapGradeRecord=(row:Record<string,any>)=>gradeRecordSchema.parse({id:row.id,vaultId:row.vault_id,courseId:row.course_id,assessmentId:row.assessment_id,rawGrade:row.grade_value,scale:row.grade_scale,date:typeof row.grade_date==="string"?row.grade_date.slice(0,10):iso(row.grade_date).slice(0,10),officialOrManual:row.record_kind,weight:row.official_weight,sourceAnchorIds:row.source_anchor_ids,feedbackSourceId:row.feedback_source_id,origin:row.origin,sourceOwned:row.origin==="provider",archivedAt:row.archived_at?iso(row.archived_at):null,archiveReason:row.archive_reason,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapPerformanceTarget = (row: Record<string, any>) => performanceTargetSchema.parse({ courseId: row.course_id, vaultId: row.vault_id, targetValue: row.target_value, scale: row.scale, effectivePeriod: row.effective_period, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapProject=(row:Record<string,any>)=>projectSchema.parse({id:row.id,vaultId:row.vault_id,title:row.title,descriptionNoteId:row.description_note_id,status:row.status,goalIds:row.goal_ids,noteIds:row.note_ids,taskIds:row.task_ids,ideaIds:row.idea_ids,sourceAnchorIds:row.source_anchor_ids,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapIdea=(row:Record<string,any>)=>ideaSchema.parse({id:row.id,vaultId:row.vault_id,sourceId:row.source_id,title:row.title,projectId:row.project_id,state:row.state,sourceAnchorIds:row.source_anchor_ids,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapGoal=(row:Record<string,any>)=>goalSchema.parse({id:row.id,vaultId:row.vault_id,title:row.title,kind:row.kind,target:row.target,scale:row.scale,targetDate:row.target_date?(typeof row.target_date==="string"?row.target_date.slice(0,10):iso(row.target_date).slice(0,10)):null,courseId:row.course_id,projectId:row.project_id,constraints:row.constraints,sourceAnchorIds:row.source_anchor_ids,status:row.status,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapMemory=(row:Record<string,any>)=>memorySchema.parse({id:row.id,vaultId:row.vault_id,kind:row.kind,content:row.content,sourceAnchorIds:row.source_anchor_ids,origin:row.origin,validFrom:row.valid_from?iso(row.valid_from):null,expiresAt:row.expires_at?iso(row.expires_at):null,userConfirmed:row.user_confirmed,status:row.status,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapIntegrationConnection=(row:Record<string,any>)=>integrationConnectionSchema.parse({id:row.id,vaultId:row.vault_id,provider:row.provider,label:row.label,state:row.state,capabilities:row.capabilities,credentialConfigured:!!row.credential_reference,lastSuccessAt:row.last_success_at?iso(row.last_success_at):null,lastFailureAt:row.last_failure_at?iso(row.last_failure_at):null,nextScheduledAt:row.next_scheduled_at?iso(row.next_scheduled_at):null,importedCount:Number(row.imported_count),coverage:row.coverage,lastErrorCode:row.last_error_code,schedule:row.schedule,revision:row.revision,disconnectedAt:row.disconnected_at?iso(row.disconnected_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapConnectionMapping=(row:Record<string,any>)=>connectionMappingSchema.parse({connectionId:row.connection_id,provider:row.provider,schemaVersion:row.schema_version,datasets:row.datasets,timezone:row.timezone,entityMapping:row.entity_mapping,extractionProfile:row.extraction_profile,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapConnectorResource=(row:Record<string,any>)=>connectorResourceSchema.parse({id:row.id,connectionId:row.connection_id,providerResourceId:row.provider_resource_id,kind:row.kind,parentId:row.parent_id,name:row.name,accessState:row.access_state,selected:row.selected,metadata:row.metadata,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
function nextConnectorRun(schedule:{enabled:boolean;intervalMinutes:number;windows:Array<{weekday:number;start:string;end:string;timezone:string}>},now=new Date()){
  if(!schedule.enabled)return null;let best:Date|null=null;
  for(const window of schedule.windows){const parts=new Intl.DateTimeFormat("en-CA",{timeZone:window.timezone,year:"numeric",month:"2-digit",day:"2-digit",hourCycle:"h23"}).formatToParts(now);const number=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find(part=>part.type===type)?.value);const localBase=new Date(Date.UTC(number("year"),number("month")-1,number("day")));const[startHour,startMinute]=window.start.split(":").map(Number),[endHour,endMinute]=window.end.split(":").map(Number);for(let offset=0;offset<8;offset++){const localDay=new Date(localBase);localDay.setUTCDate(localDay.getUTCDate()+offset);const weekday=((localDay.getUTCDay()+6)%7)+1;if(weekday!==window.weekday)continue;const start=instantFromWallClock(new Date(Date.UTC(localDay.getUTCFullYear(),localDay.getUTCMonth(),localDay.getUTCDate(),startHour,startMinute)),window.timezone);const end=instantFromWallClock(new Date(Date.UTC(localDay.getUTCFullYear(),localDay.getUTCMonth(),localDay.getUTCDate(),endHour,endMinute)),window.timezone);let candidate=start;if(candidate<now){const steps=Math.ceil((now.getTime()-start.getTime())/(schedule.intervalMinutes*60_000));candidate=new Date(start.getTime()+steps*schedule.intervalMinutes*60_000);}if(candidate<end&&(!best||candidate<best))best=candidate;}}
  return best?.toISOString()??null;
}
const mapSourceObject=(row:Record<string,any>)=>sourceObjectSchema.parse({id:row.id,vaultId:row.vault_id,connectionId:row.connection_id,providerObjectId:row.provider_object_id,containerId:row.container_id,kind:row.kind,title:row.title,accessState:row.access_state,freshness:row.freshness,currentRevision:row.current_revision,deepLink:row.deep_link,excluded:row.excluded,exclusionReason:row.exclusion_reason,lastAttemptAt:row.last_attempt_at?iso(row.last_attempt_at):null,lastSuccessAt:row.last_success_at?iso(row.last_success_at):null,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
async function mapTranscript(source:Record<string,any>,revision:Record<string,any>){const [associationResult,artifacts]=await Promise.all([query("SELECT * FROM transcript_lesson_associations WHERE vault_id=$1 AND source_object_id=$2",[source.vault_id,source.id]),query("SELECT id,scope,source_revision,created_at FROM transcript_analysis_artifacts WHERE vault_id=$1 AND source_object_id=$2 ORDER BY created_at DESC,id DESC",[source.vault_id,source.id])]);const association=associationResult.rows[0];const metadata=revision.metadata as Record<string,any>,segments=Array.isArray(metadata.segments)?metadata.segments:[];return transcriptSchema.parse({id:source.id,vaultId:source.vault_id,sourceObject:mapSourceObject(source),sourceRevisionId:revision.id,revision:revision.revision,originalBlobIds:revision.attachment_blob_ids,segments,exactText:revision.exact_content??segments.map((item:any)=>item.text).join("\n"),association:association?{id:association.id,transcriptId:association.source_object_id,lessonId:association.lesson_id,transcriptRevision:association.transcript_revision,evidenceRefs:association.evidence_refs,origin:association.origin,revision:association.revision,createdAt:iso(association.created_at),updatedAt:iso(association.updated_at)}:null,correctionOfRevision:metadata.correctionOfRevision??null,analysisArtifacts:artifacts.rows.map(item=>({id:item.id,scope:item.scope,sourceRevision:item.source_revision,createdAt:iso(item.created_at)})),createdAt:iso(revision.fetched_at)});}
const mapVaultAiPolicy=(vaultId:string,row?:Record<string,any>)=>vaultAiPolicySchema.parse({vaultId,local:{enabled:row?.local_enabled??true,profileId:row?.local_profile_id??"local-qwen-general",backend:"local_worker"},cloud:{enabled:row?.cloud_enabled??false,providerConnectionId:row?.cloud_connection_id??null},purposes:row?.purposes??["note_classification","grounded_qa","study_generation"],limits:row?.limits??{maxSourceBytesPerRequest:200_000,maxRequestsPerDay:500},disclosure:row?.disclosure??{cloudContentEgressEnabled:false,statement:"Local inference stays on the enrolled worker. Cloud inference is disabled."},revision:row?.revision??0,createdAt:row?.created_at?iso(row.created_at):null,updatedAt:row?.updated_at?iso(row.updated_at):null});
const mapInsight=(row:Record<string,any>)=>insightSchema.parse({id:row.id,vaultId:row.vault_id,kind:row.kind,window:{from:typeof row.window_start==="string"?row.window_start.slice(0,10):iso(row.window_start).slice(0,10),to:typeof row.window_end==="string"?row.window_end.slice(0,10):iso(row.window_end).slice(0,10)},title:row.title,facts:row.facts,coverage:row.coverage,suggestions:row.suggestions,sourceManifest:row.source_manifest,generator:row.generator,state:row.state,annotation:row.annotation,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapPersonalDataItem=(row:Record<string,any>)=>personalDataItemSchema.parse({id:row.id,vaultId:row.vault_id,provider:row.provider,accountLabel:row.account_label,sourceItemId:row.source_item_id,actionKind:row.action_kind,observedAt:row.observed_at?iso(row.observed_at):null,title:row.title,contentReference:row.content_reference,url:row.url,metadata:row.metadata,coverage:row.coverage,importPreviewId:row.import_preview_id,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapPersonalDataPolicies=(vaultId:string,row?:Record<string,any>)=>personalDataPoliciesSchema.parse({vaultId,enabledProviders:row?.enabled_providers??[],analysisTypes:row?.analysis_types??[],retentionDays:row?.retention_days??90,weeklySync:row?.weekly_sync??{enabled:false,weekday:1,localTime:"03:00",timezone:"Europe/Oslo"},privacy:row?.privacy??{includeRawTitles:false,includeUrls:false,allowProfileInference:false},revision:row?.revision??0,createdAt:row?.created_at?iso(row.created_at):null,updatedAt:row?.updated_at?iso(row.updated_at):null});
const mapPersonalDataPreview=(row:Record<string,any>)=>personalDataImportPreviewSchema.parse({id:row.id,vaultId:row.vault_id,provider:row.provider,accountLabel:row.account_label,exportFormat:row.export_format,summary:row.summary,sample:(row.records as unknown[]).slice(0,20),status:row.status,revision:row.revision,expiresAt:iso(row.expires_at),createdAt:iso(row.created_at)});
async function mapInterest(row:Record<string,any>){const evidence=await query("SELECT personal_data_item_id FROM interest_evidence WHERE interest_id=$1 ORDER BY created_at,personal_data_item_id",[row.id]);return interestSchema.parse({id:row.id,vaultId:row.vault_id,label:row.label,origin:row.origin,status:row.status,metric:row.metric,confidenceSemantics:row.confidence_semantics,methodVersion:row.method_version,firstObservedAt:row.first_observed_at?iso(row.first_observed_at):null,lastObservedAt:row.last_observed_at?iso(row.last_observed_at):null,evidenceItemIds:evidence.rows.map(item=>item.personal_data_item_id),ownerCorrection:row.owner_correction,suppression:row.suppression,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
async function currentAnchorsValid(client:any,vaultId:string,ids:string[]){const unique=[...new Set(ids)];if(!unique.length)return true;const result=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,unique]);return result.rowCount===unique.length;}
async function vaultIdsValid(client:any,vaultId:string,table:"notes"|"tasks"|"goals"|"ideas"|"projects"|"school_courses"|"sources",ids:string[]){const unique=[...new Set(ids)];if(!unique.length)return true;const result=await client.query(`SELECT id FROM ${table} WHERE vault_id=$1 AND id=ANY($2::uuid[])`,[vaultId,unique]);return result.rowCount===unique.length;}
async function mapStudyPlan(row:Record<string,any>){const [units,currentSources,scheduledBlocks]=await Promise.all([query("SELECT * FROM study_plan_units WHERE plan_id=$1 ORDER BY sequence,id",[row.id]),query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[row.vault_id,row.material_source_ids]),query("SELECT DISTINCT e.id FROM study_plan_units u JOIN scheduled_task_event_links l ON l.task_id=u.task_id JOIN calendar_events e ON e.id=l.event_id JOIN calendars c ON c.id=e.calendar_id WHERE u.vault_id=$1 AND u.plan_id=$2 AND e.trashed_at IS NULL AND e.starts_at>now() AND c.origin='sorta' AND NOT EXISTS(SELECT 1 FROM study_sessions s WHERE s.vault_id=$1 AND s.calendar_event_id=e.id AND s.state IN ('active','paused','interrupted','completed')) AND NOT EXISTS(SELECT 1 FROM provider_calendar_actions a WHERE a.vault_id=$1 AND a.event_id=e.id AND a.state IN ('queued','running','succeeded','reconciling')) ORDER BY e.id",[row.vault_id,row.id])]);const current=new Map(currentSources.rows.map(item=>[item.id,item.content_hash]));const snapshots=row.material_snapshots as Array<{sourceId:string;contentHash:string}>;const staleSourceIds=snapshots.filter(item=>current.get(item.sourceId)!==item.contentHash).map(item=>item.sourceId);const mappedUnits=units.rows.map(unit=>({id:unit.id,planId:unit.plan_id,sequence:unit.sequence,title:unit.title,objective:unit.objective,kind:unit.kind,materialSourceIds:unit.material_source_ids,estimatedMinutes:unit.estimated_minutes,estimateOrigin:unit.estimate_origin,taskId:unit.task_id,status:unit.status,revision:unit.revision,createdAt:iso(unit.created_at),updatedAt:iso(unit.updated_at)}));return studyPlanSchema.parse({id:row.id,vaultId:row.vault_id,courseId:row.course_id,assessmentId:row.assessment_id,generationJobId:row.generation_job_id,status:row.status,goals:row.goals,deadline:row.deadline,materialSourceIds:row.material_source_ids,materialSnapshots:snapshots,taskIds:row.task_ids,scheduleProposalIds:row.schedule_proposal_ids,scheduledBlockIds:scheduledBlocks.rows.map(item=>item.id),constraints:row.constraints,units:mappedUnits,progress:{completedUnits:mappedUnits.filter(unit=>unit.status==="completed").length,totalUnits:mappedUnits.length,completedMinutes:mappedUnits.filter(unit=>unit.status==="completed").reduce((sum,unit)=>sum+unit.estimatedMinutes,0),totalMinutes:mappedUnits.reduce((sum,unit)=>sum+unit.estimatedMinutes,0)},staleSourceIds,archivedAt:row.archived_at?iso(row.archived_at):null,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
async function mapStudyExercise(row:Record<string,any>){const snapshots=row.source_snapshots as Array<{sourceId:string;contentHash:string}>;const current=await query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[row.vault_id,row.material_source_ids]);const hashes=new Map(current.rows.map(item=>[item.id,item.content_hash]));return studyExerciseSchema.parse({id:row.id,vaultId:row.vault_id,courseId:row.course_id,generationJobId:row.generation_job_id,mode:row.mode,difficulty:row.difficulty,status:row.status,prompt:row.prompt,answer:row.answer,explanation:row.explanation,materialSourceIds:row.material_source_ids,sourceSnapshots:snapshots,sourceStale:snapshots.some(item=>hashes.get(item.sourceId)!==item.contentHash),modelProfileId:row.model_profile_id,promptVersion:row.prompt_version,ownerCorrection:row.owner_correction,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
const mapStudyAttempt=(row:Record<string,any>)=>studyAttemptSchema.parse({id:row.id,vaultId:row.vault_id,exerciseId:row.exercise_id,response:row.response,responseKind:row.response_kind,startedAt:row.started_at?iso(row.started_at):null,completedAt:iso(row.completed_at),hintsUsed:row.hints_used,confidenceSelfReport:row.confidence_self_report,feedbackStatus:row.feedback_status,feedbackJobId:row.feedback_job_id,feedback:row.feedback,ownerCorrection:row.owner_correction,revision:row.revision,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
async function mapStudyActivity(row:Record<string,any>){const [exerciseRows,currentSources]=await Promise.all([row.generation_job_id?query("SELECT * FROM study_exercises WHERE vault_id=$1 AND generation_job_id=$2 ORDER BY created_at,id",[row.vault_id,row.generation_job_id]):Promise.resolve({rows:[] as Record<string,any>[]}),query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[row.vault_id,row.material_source_ids])]);const exerciseIds=exerciseRows.rows.map(item=>item.id);const attemptRows=exerciseIds.length?await query("SELECT * FROM study_attempts WHERE vault_id=$1 AND exercise_id=ANY($2::uuid[]) ORDER BY completed_at,id",[row.vault_id,exerciseIds]):{rows:[] as Record<string,any>[]};const attemptsByExercise=new Map<string,Record<string,any>[]>();for(const attempt of attemptRows.rows){const items=attemptsByExercise.get(attempt.exercise_id)??[];items.push(attempt);attemptsByExercise.set(attempt.exercise_id,items);}const items=[];for(const exercise of exerciseRows.rows)items.push({...await mapStudyExercise(exercise),responses:(attemptsByExercise.get(exercise.id)??[]).map(mapStudyAttempt)});const hashes=new Map(currentSources.rows.map(item=>[item.id,item.content_hash]));const snapshots=row.source_snapshots as Array<{sourceId:string;contentHash:string}>;return studyActivitySchema.parse({id:row.id,vaultId:row.vault_id,sessionId:row.session_id,generationJobId:row.generation_job_id,mode:row.mode,difficulty:row.difficulty,requestedLength:row.requested_length,language:row.language,materialSourceIds:row.material_source_ids,sourceSnapshots:snapshots,staleSourceIds:snapshots.filter(item=>hashes.get(item.sourceId)!==item.contentHash).map(item=>item.sourceId),state:row.state,items,responseCount:attemptRows.rows.length,revision:row.revision,archivedAt:row.archived_at?iso(row.archived_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
const mapStudySession = (row: Record<string, any>) => { const segments = row.active_time_segments as ActiveTimeSegment[]; return studySessionSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, planId: row.plan_id, unitIds: row.unit_ids, taskIds: row.task_ids, materialSourceIds: row.material_source_ids, calendarEventId: row.calendar_event_id, mode: row.mode, state: row.state, estimatedMinutes: row.estimated_minutes, activeTimeSegments: segments, observedActiveSeconds: observedActiveSeconds(segments, row.state === "active" ? new Date().toISOString() : undefined), outcome: row.outcome, actualProgress: row.actual_progress === null ? null : Number(row.actual_progress), sourceSnapshots: row.source_snapshots, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) }); };
const mapExecutionSession=(row:Record<string,any>)=>{const segments=row.active_time_segments as ActiveTimeSegment[];return executionSessionRecordSchema.parse({id:row.id,vaultId:row.vault_id,taskId:row.task_id,studySessionId:row.study_session_id,plannedMinutes:row.planned_minutes,mode:row.mode,state:row.state,activeTimeSegments:segments,observedActiveSeconds:observedActiveSeconds(segments,row.state==="active"?new Date().toISOString():undefined),actualMinutesCorrection:row.actual_minutes_correction,completedWork:row.completed_work,remainingWork:row.remaining_work,referenceSourceIds:row.reference_source_ids,clientOperationId:row.client_operation_id,revision:row.revision,startedAt:iso(row.started_at),updatedAt:iso(row.updated_at),finishedAt:row.finished_at?iso(row.finished_at):null});};
const mapKnowledgeGap = (row: Record<string, any>) => knowledgeGapSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, concept: row.concept, materialSourceIds: row.material_source_ids, statement: row.statement, evidenceAnchorIds: row.evidence_anchor_ids, origin: row.origin, status: row.status, uncertainty: row.uncertainty, correction: row.correction, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapFlashcardDeck = (row: Record<string, any>) => flashcardDeckSchema.parse({ id: row.id, vaultId: row.vault_id, courseId: row.course_id, name: row.name, materialSourceIds: row.material_source_ids, sourceSnapshots: row.source_snapshots, origin: row.origin, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapFlashcard = (row: Record<string, any>) => flashcardSchema.parse({ id: row.id, vaultId: row.vault_id, deckId: row.deck_id, prompt: row.prompt, answer: row.answer, sourceAnchorIds: row.source_anchor_ids, sourceStale: Boolean(row.source_stale), origin: row.origin, approvalStatus: row.approval_status, reviewPolicyVersion: row.review_policy_version, nextDue: row.next_due ? iso(row.next_due) : null, reviewCount: row.review_count, archivedAt: row.archived_at ? iso(row.archived_at) : null, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const mapFlashcardReview = (row: Record<string, any>) => flashcardReviewSchema.parse({ id: row.id, vaultId: row.vault_id, responseId: row.response_id, cardId: row.card_id, cardRevision: row.card_revision, rating: row.rating, observedAt: iso(row.observed_at), activeSeconds: row.active_seconds, reviewPolicyVersion: row.review_policy_version, computedNextDue: iso(row.computed_next_due), createdAt: iso(row.created_at) });
const flashcardProjection = `SELECT f.*,EXISTS(SELECT 1 FROM unnest(f.source_anchor_ids) AS a(anchor_id) WHERE NOT EXISTS(SELECT 1 FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=f.vault_id AND c.id=a.anchor_id)) AS source_stale FROM flashcards f`;
const mapSchedulerPreferences = (row: Record<string, any>) => schedulerPreferencesSchema.parse({ vaultId: row.vault_id, timezone: row.timezone, protectedWindows: row.protected_windows, preferredWindows: row.preferred_windows, dailyLimitMinutes: row.daily_limit_minutes, breakMinutes: row.break_minutes, minBlockMinutes: row.min_block_minutes, maxBlockMinutes: row.max_block_minutes, allowSplit: row.allow_split, replanPolicy: row.replan_policy, algorithmVersion: row.algorithm_version, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const defaultSchedulerPreferences = (vaultId: string) => schedulerPreferencesSchema.parse({ vaultId, timezone: "Europe/Oslo", protectedWindows: [], preferredWindows: [], dailyLimitMinutes: 180, breakMinutes: 10, minBlockMinutes: 25, maxBlockMinutes: 90, allowSplit: true, replanPolicy: "manual_only", algorithmVersion: "deterministic-scheduler-v1", revision: 0, createdAt: null, updatedAt: null });
async function calendarConstraintRevision(vaultId:string){const [events,exceptions]=await Promise.all([query("SELECT id,revision FROM calendar_events WHERE vault_id=$1 AND trashed_at IS NULL ORDER BY id",[vaultId]),query("SELECT x.id,x.revision FROM calendar_occurrence_exceptions x JOIN calendar_events e ON e.id=x.event_id WHERE e.vault_id=$1 AND e.trashed_at IS NULL ORDER BY x.id",[vaultId])]);return createHash("sha256").update(JSON.stringify({events:events.rows,exceptions:exceptions.rows})).digest("hex");}
async function mapSchedulingConstraints(vaultId:string,row?:Record<string,any>){const preferences=row?mapSchedulerPreferences(row):defaultSchedulerPreferences(vaultId);return schedulingConstraintsSchema.parse({...preferences,freezeHorizonMinutes:row?.freeze_horizon_minutes??120,movementPolicy:row?.movement_policy??"minimize_disruption",fixedEventsSource:"canonical_calendar",deadlinesEnforced:true,calendarRevision:await calendarConstraintRevision(vaultId)});}
const mapMomentumPreferences = (row: Record<string, any>) => momentumPreferencesSchema.parse({ vaultId: row.vault_id, enabled: row.enabled, evidenceWindowDays: row.evidence_window_days, minObservations: row.min_observations, userLockedParameters: row.user_locked_parameters, revision: row.revision, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at) });
const defaultMomentumPreferences = (vaultId: string) => momentumPreferencesSchema.parse({ vaultId, enabled: false, evidenceWindowDays: 28, minObservations: 5, userLockedParameters: [], revision: 0, createdAt: null, updatedAt: null });
const mapVaultChangeEvent = (row: Record<string, any>) => { const eventId=String(row.id);return vaultChangeEventSchema.parse({eventId,vaultId:row.vault_id,recordType:row.record_type,recordId:row.record_id,changeKind:row.change_kind,revision:row.revision,changedAt:iso(row.changed_at),cursor:encodeSyncCursor({vaultId:row.vault_id,eventId})}); };
async function syncBounds(vaultId:string){const result=await query(`SELECT COALESCE((SELECT minimum_event_id FROM sync_retention_floors WHERE vault_id=$1),0)::text AS retention_floor_event_id,COALESCE(max(id),0)::text AS latest_event_id FROM vault_change_events WHERE vault_id=$1`,[vaultId]);return {retentionFloorEventId:String(result.rows[0].retention_floor_event_id),latestEventId:String(result.rows[0].latest_event_id)};}
const syncSnapshotSources = [
  ["notes","note","id","trashed_at"], ["tasks","task","id","deleted_at"], ["reminders","reminder","id","deleted_at"], ["notifications","notification","id",null], ["calendars","calendar","id","archived_at"], ["calendar_events","calendar_event","id","trashed_at"], ["event_reminder_plans","event_reminder_plan","event_id",null],
  ["calendar_entities","calendar_entity","id",null], ["commitments","commitment","id",null], ["school_subjects","school_subject","id","archived_at"],
  ["school_courses","school_course","id","archived_at"], ["school_assignments","school_assignment","id","archived_at"], ["school_lessons","school_lesson","id","archived_at"],
  ["school_assessments","school_assessment","id","archived_at"], ["attendance_records","attendance_record","id",null], ["performance_grades","performance_grade","id",null],
  ["performance_targets","performance_target","course_id",null], ["study_sessions","study_session","id","archived_at"], ["knowledge_gaps","knowledge_gap","id",null],
  ["flashcard_decks","flashcard_deck","id","archived_at"], ["flashcards","flashcard","id","archived_at"], ["scheduler_preferences","scheduler_preferences","vault_id",null],
  ["momentum_preferences","momentum_preferences","vault_id",null], ["projects","project","id","archived_at"], ["ideas","idea","id","archived_at"],
  ["goals","goal","id","archived_at"], ["memories","memory","id","archived_at"], ["integration_connections","integration_connection","id",null],
  ["insights","insight","id","archived_at"], ["personal_data_items","personal_data_item","id","archived_at"], ["interests","interest","id","archived_at"],
  ["provider_calendar_actions","provider_calendar_action","id",null]
] as const;
type SyncConflict = { operationId: string; code: "stale_revision"|"record_not_found"|"record_tombstoned"|"record_already_exists"|"invalid_command"|"operation_id_reused"; currentRevision: number|null; tombstoned: boolean };
const rejectedSyncOperation = (operationId:string,code:SyncConflict["code"],currentRevision:number|null=null,tombstoned=false) => ({ accepted:false as const, conflict:{operationId,code,currentRevision,tombstoned} });
async function deletedSyncRecord(client:any,vaultId:string,recordType:string,recordId:string){const result=await client.query("SELECT revision FROM sync_tombstones WHERE vault_id=$1 AND record_type=$2 AND record_id=$3",[vaultId,recordType,recordId]);return result.rows[0]?.revision as number|undefined;}
async function applySyncOperation(client:any,vaultId:string,operation:SyncOperation):Promise<{accepted:true}|{accepted:false;conflict:SyncConflict}>{
  if(operation.type==="note_yjs_update"){
    const current=await client.query("SELECT * FROM notes WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,operation.noteId]);const note=current.rows[0];
    if(!note){const deleted=await deletedSyncRecord(client,vaultId,"note",operation.noteId);return rejectedSyncOperation(operation.operationId,deleted===undefined?"record_not_found":"record_tombstoned",deleted??null,deleted!==undefined);}
    if(note.trashed_at)return rejectedSyncOperation(operation.operationId,"record_tombstoned",note.revision,true);
    if(operation.baseRevision>note.revision)return rejectedSyncOperation(operation.operationId,"stale_revision",note.revision,false);
    let changed;try{changed=mergeDocumentUpdate(note.yjs_state,operation.updateBase64,note.body);}catch{return rejectedSyncOperation(operation.operationId,"invalid_command",note.revision,false);}
    const nextRevision=note.revision+1;
    await client.query("UPDATE notes SET body=$3,yjs_state=$4,revision=$5,status='saved',updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,operation.noteId,changed.text,changed.state,nextRevision]);
    await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,$2,$3,$4,$5,'owner')",[operation.noteId,nextRevision,note.title,changed.text,changed.state]);
    const jobId=randomUUID();const jobInput={type:"note_processing",noteId:operation.noteId,sourceId:note.source_id,revision:nextRevision,stages:["classify"]};const serialized=JSON.stringify(jobInput);
    await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,input,input_hash) VALUES ($1,$2,'note_process','waiting_for_worker','awaiting_local_worker',$3::jsonb,$4)",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);
    await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[jobId,JSON.stringify({status:"waiting_for_worker"})]);
    return {accepted:true};
  }
  if(operation.type==="task_create"){
    const deleted=await deletedSyncRecord(client,vaultId,"task",operation.taskId);if(deleted!==undefined)return rejectedSyncOperation(operation.operationId,"record_tombstoned",deleted,true);
    const existing=await client.query("SELECT revision,deleted_at FROM tasks WHERE vault_id=$1 AND id=$2",[vaultId,operation.taskId]);if(existing.rows[0])return rejectedSyncOperation(operation.operationId,existing.rows[0].deleted_at?"record_tombstoned":"record_already_exists",existing.rows[0].revision,Boolean(existing.rows[0].deleted_at));
    const command=operation.command;
    await client.query("INSERT INTO tasks(id,vault_id,title,due_at,estimated_minutes,remaining_minutes,earliest_start,priority,allow_split,min_block_minutes,max_block_minutes) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10)",[operation.taskId,vaultId,command.title,command.dueAt??null,command.estimatedMinutes??null,command.earliestStart??null,command.priority,command.allowSplit,command.minBlockMinutes??null,command.maxBlockMinutes??null]);
    return {accepted:true};
  }
  if(operation.type==="task_update"){
    const current=await client.query("SELECT * FROM tasks WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL FOR UPDATE",[vaultId,operation.taskId]);const item=current.rows[0];
    if(!item){const deleted=await deletedSyncRecord(client,vaultId,"task",operation.taskId);return rejectedSyncOperation(operation.operationId,deleted===undefined?"record_not_found":"record_tombstoned",deleted??null,deleted!==undefined);}
    if(item.revision!==operation.expectedRevision)return rejectedSyncOperation(operation.operationId,"stale_revision",item.revision,false);
    const patch=operation.patch,minBlock=patch.minBlockMinutes===undefined?item.min_block_minutes:patch.minBlockMinutes,maxBlock=patch.maxBlockMinutes===undefined?item.max_block_minutes:patch.maxBlockMinutes;
    if(minBlock!==null&&maxBlock!==null&&minBlock>maxBlock)return rejectedSyncOperation(operation.operationId,"invalid_command",item.revision,false);
    const completed=patch.completed??item.completed,estimated=patch.estimatedMinutes===undefined?item.estimated_minutes:patch.estimatedMinutes,remaining=patch.remainingMinutes===undefined?(completed?0:item.completed&&!completed?estimated:item.remaining_minutes):patch.remainingMinutes;
    await client.query("UPDATE tasks SET title=$3,completed=$4,due_at=$5,estimated_minutes=$6,remaining_minutes=$7,earliest_start=$8,priority=$9,allow_split=$10,min_block_minutes=$11,max_block_minutes=$12,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,operation.taskId,patch.title??item.title,completed,patch.dueAt===undefined?item.due_at:patch.dueAt,estimated,remaining,patch.earliestStart===undefined?item.earliest_start:patch.earliestStart,patch.priority??item.priority,patch.allowSplit??item.allow_split,minBlock,maxBlock]);
    return {accepted:true};
  }
  if(operation.type==="calendar_event_create"){
    const deleted=await deletedSyncRecord(client,vaultId,"calendar_event",operation.eventId);if(deleted!==undefined)return rejectedSyncOperation(operation.operationId,"record_tombstoned",deleted,true);
    const existing=await client.query("SELECT revision FROM calendar_events WHERE vault_id=$1 AND id=$2",[vaultId,operation.eventId]);if(existing.rows[0])return rejectedSyncOperation(operation.operationId,"record_already_exists",existing.rows[0].revision,false);
    const command=operation.command;
    if(!isSupportedTimezone(command.timezone)||command.recurrence&&(!isSupportedTimezone(command.recurrence.timezone)||command.recurrence.timezone!==command.timezone))return rejectedSyncOperation(operation.operationId,"invalid_command",null,false);
    if(command.entityIds.length){const entities=await client.query("SELECT id FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,command.entityIds]);if(entities.rowCount!==new Set(command.entityIds).size)return rejectedSyncOperation(operation.operationId,"invalid_command",null,false);}
    const calendarId=await writableCalendarId(client,vaultId,command.calendarId,command.timezone);if(!calendarId)return rejectedSyncOperation(operation.operationId,"invalid_command");
    const result=await client.query("INSERT INTO calendar_events(id,vault_id,calendar_id,title,starts_at,ends_at,private_context,timezone,recurrence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *",[operation.eventId,vaultId,calendarId,command.title,command.startsAt,command.endsAt,command.privateContext??null,command.timezone,command.recurrence?JSON.stringify(command.recurrence):null]);const event=result.rows[0];
    await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,changed_fields) VALUES ($1,1,$2,$3,$4,$5,$6::jsonb,ARRAY['created'])",[event.id,event.title,event.starts_at,event.ends_at,event.timezone,event.recurrence?JSON.stringify(event.recurrence):null]);
    for(const entityId of new Set(command.entityIds))await client.query("INSERT INTO event_entity_links(event_id,entity_id,role) VALUES ($1,$2,'participant')",[event.id,entityId]);
    if(command.entityIds.length){const commitments=await client.query("SELECT * FROM commitments WHERE vault_id=$1 AND status='active' AND archived_at IS NULL AND person_entity_id=ANY($2::uuid[])",[vaultId,command.entityIds]);for(const row of commitments.rows){const candidate={id:row.id,status:row.status,personEntityId:row.person_entity_id,objectLabel:row.object_label,conditionKind:row.condition_kind} as const;if(!matchesEvent(candidate,command.entityIds))continue;const prepText=commitmentPrepText(candidate),fingerprint=createHash("sha256").update(`commitment:${row.id}`).digest("hex");const suppressed=await client.query("SELECT 1 FROM prep_item_suppressions WHERE event_id=$1 AND fingerprint=$2",[event.id,fingerprint]);if(!suppressed.rowCount)await client.query("INSERT INTO prep_items(event_id,commitment_id,type,text,evidence_note_id,provenance) VALUES ($1,$2,'bring',$3,$4,$5::jsonb) ON CONFLICT DO NOTHING",[event.id,row.id,prepText,row.source_note_id,JSON.stringify({origin:"commitment_rule",sourceId:row.source_note_id})]);}}
    return {accepted:true};
  }
  const current=await client.query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,operation.eventId]);const event=current.rows[0];
  if(!event){const deleted=await deletedSyncRecord(client,vaultId,"calendar_event",operation.eventId);return rejectedSyncOperation(operation.operationId,deleted===undefined?"record_not_found":"record_tombstoned",deleted??null,deleted!==undefined);}
  if(event.trashed_at)return rejectedSyncOperation(operation.operationId,"record_tombstoned",event.revision,true);
  if(operation.type==="calendar_event_trash"){
    if(event.revision!==operation.expectedRevision)return rejectedSyncOperation(operation.operationId,"stale_revision",event.revision,false);
    const result=await client.query("UPDATE calendar_events SET trashed_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,operation.eventId]);const row=result.rows[0];
    await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,ARRAY['trashed_at'])",[row.id,row.revision,row.title,row.starts_at,row.ends_at,row.timezone,row.recurrence?JSON.stringify(row.recurrence):null]);
    return {accepted:true};
  }
  const command=operation.command;if(event.revision!==command.expectedRevision)return rejectedSyncOperation(operation.operationId,"stale_revision",event.revision,false);
  if(command.timezone&&!isSupportedTimezone(command.timezone)||command.recurrence&&!isSupportedTimezone(command.recurrence.timezone))return rejectedSyncOperation(operation.operationId,"invalid_command",event.revision,false);
  const startsAt=command.startsAt??iso(event.starts_at),endsAt=command.endsAt??iso(event.ends_at),timezone=command.timezone??event.timezone,recurrence=command.recurrence===undefined?event.recurrence:command.recurrence;
  if(Date.parse(endsAt)<=Date.parse(startsAt)||(recurrence&&recurrence.timezone!==timezone))return rejectedSyncOperation(operation.operationId,"invalid_command",event.revision,false);
  const changedFields=Object.keys(command).filter(key=>key!=="expectedRevision"&&key!=="scope");
  const result=await client.query("UPDATE calendar_events SET title=$3,starts_at=$4,ends_at=$5,timezone=$6,recurrence=$7::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,operation.eventId,command.title??event.title,startsAt,endsAt,timezone,recurrence?JSON.stringify(recurrence):null]);const row=result.rows[0];
  await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)",[operation.eventId,row.revision,row.title,row.starts_at,row.ends_at,row.timezone,row.recurrence?JSON.stringify(row.recurrence):null,changedFields]);
  return {accepted:true};
}
type PushSyncInput=ReturnType<typeof pushSyncSchema.parse>;
async function executeSyncPush(vaultId:string,input:PushSyncInput){
  let suppliedCursor;try{suppliedCursor=decodeSyncCursor(input.lastCursor,vaultId);}catch{return {error:"invalid_sync_cursor" as const};}
  return transaction(async client=>{
    const device=await client.query("SELECT id FROM devices WHERE id=$1 AND revoked_at IS NULL AND $2::uuid=ANY(vault_ids) AND 'sync:write'=ANY(scopes) FOR SHARE",[input.deviceId,vaultId]);
    if(!device.rowCount)return {error:"sync_device_not_found_or_unauthorized" as const};
    const boundsResult=await client.query(`SELECT COALESCE((SELECT minimum_event_id FROM sync_retention_floors WHERE vault_id=$1),0)::text AS retention_floor_event_id,COALESCE(max(id),0)::text AS latest_event_id FROM vault_change_events WHERE vault_id=$1`,[vaultId]);
    const bounds={retentionFloorEventId:String(boundsResult.rows[0].retention_floor_event_id),latestEventId:String(boundsResult.rows[0].latest_event_id)};
    const decision=syncCursorDecision({suppliedEventId:suppliedCursor.eventId,...bounds});
    if(decision!=="pull")return {error:decision as "snapshot_required"|"cursor_ahead",...bounds};
    const acceptedOperationIds:string[]=[];const conflicts:SyncConflict[]=[];
    for(const operation of input.operations){
      const serialized=JSON.stringify(operation),payloadHash=createHash("sha256").update(serialized).digest("hex");
      const existing=await client.query("SELECT payload_hash,outcome FROM sync_operations WHERE device_id=$1 AND operation_id=$2",[input.deviceId,operation.operationId]);
      if(existing.rows[0]){
        if(syncOperationReplayDecision(existing.rows[0].payload_hash,payloadHash)==="operation_id_reused"){conflicts.push({operationId:operation.operationId,code:"operation_id_reused",currentRevision:null,tombstoned:false});continue;}
        const prior=existing.rows[0].outcome as {accepted:boolean;conflict?:SyncConflict};if(prior.accepted)acceptedOperationIds.push(operation.operationId);else if(prior.conflict)conflicts.push(prior.conflict);continue;
      }
      const applied=await applySyncOperation(client,vaultId,operation);
      if(applied.accepted)acceptedOperationIds.push(operation.operationId);else conflicts.push(applied.conflict);
      await client.query("INSERT INTO sync_operations(device_id,operation_id,vault_id,payload_hash,outcome) VALUES ($1,$2,$3,$4,$5::jsonb)",[input.deviceId,operation.operationId,vaultId,payloadHash,JSON.stringify(applied)]);
    }
    return {ack:syncAckSchema.parse({acceptedOperationIds,cursor:syncAckCursor(input.lastCursor),conflicts})};
  });
}
async function mapScheduleProposal(row: Record<string,any>) { const expected=row.input_revisions as Record<string,number>;const ids=Object.keys(expected).filter(id=>!id.startsWith("study_plan:"));const planEntry=Object.entries(expected).find(([id])=>id.startsWith("study_plan:"));const [tasks,plan,prefs,occurrences]=await Promise.all([ids.length?query("SELECT id,revision FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[])",[row.vault_id,ids]):Promise.resolve({rows:[] as Record<string,any>[]}),planEntry?query("SELECT revision,status FROM study_plans WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[row.vault_id,planEntry[0].slice("study_plan:".length)]):Promise.resolve({rows:[] as Record<string,any>[]}),query("SELECT revision FROM scheduler_preferences WHERE vault_id=$1",[row.vault_id]),loadCalendarOccurrences(row.vault_id,iso(row.horizon_start),iso(row.horizon_end))]);const currentTasks=new Map(tasks.rows.map(item=>[item.id,item.revision]));const digest=createHash("sha256").update(JSON.stringify(occurrences.sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id)).map(item=>({id:item.id,startsAt:item.startsAt,endsAt:item.endsAt})))).digest("hex");const currentPreferenceRevision=prefs.rows[0]?.revision??0;const stale=ids.some(id=>currentTasks.get(id)!==expected[id])||Boolean(planEntry&&(!plan.rows[0]||plan.rows[0].revision!==planEntry[1]||plan.rows[0].status!=="active"))||currentPreferenceRevision!==row.constraints_revision||digest!==row.calendar_digest||Boolean(row.expires_at&&new Date(row.expires_at)<=new Date());return proposalSchema.parse({id:row.id,vaultId:row.vault_id,kind:"schedule_plan",status:row.status,revision:row.revision,diff:{horizon:{startsAt:iso(row.horizon_start),endsAt:iso(row.horizon_end)},placements:row.placements,unscheduled:row.unscheduled,unknownAvailability:row.unknown_availability,writesApplied:row.status==="approved"},expectedRevisions:expected,constraintsRevision:row.constraints_revision,calendarDigest:row.calendar_digest,affectedRecordIds:row.affected_record_ids?.length?row.affected_record_ids:ids,requiredPermissions:row.required_permissions,stale,expiresAt:row.expires_at?iso(row.expires_at):null,rejectionReason:row.rejection_reason,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
async function mapProviderCalendarProposal(row:Record<string,any>){const [event,connection]=await Promise.all([query("SELECT revision,trashed_at FROM calendar_events WHERE vault_id=$1 AND id=$2",[row.vault_id,row.event_id]),query("SELECT revision,state,provider,capabilities FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[row.vault_id,row.connection_id])]);const currentConnection=connection.rows[0];const stale=!event.rows[0]||event.rows[0].trashed_at||event.rows[0].revision!==row.event_revision||!currentConnection||currentConnection.revision!==row.connection_revision||Boolean(row.expires_at&&new Date(row.expires_at)<=new Date());return proposalSchema.parse({id:row.id,vaultId:row.vault_id,kind:"provider_calendar_action",status:row.status,revision:row.revision,diff:{eventId:row.event_id,connectionId:row.connection_id,actionKind:row.action_kind,targetCalendarId:row.target_calendar_id,recipients:row.recipients,publicFields:row.public_fields,response:row.response,privateFieldsExcluded:["privateContext","prepItems","commitments","attendance","grades","profile","sourceExcerpts"],writesApplied:row.status==="approved"},expectedRevisions:{event:row.event_revision,connection:row.connection_revision},affectedRecordIds:[row.event_id],requiredPermissions:["calendar:external_write"],stale,expiresAt:row.expires_at?iso(row.expires_at):null,rejectionReason:row.rejection_reason,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
async function mapEntityMergeProposal(row:Record<string,any>){const expected=row.entity_revisions as Record<string,number>;const ids=Object.keys(expected);const current=await query("SELECT id,revision,archived_at,merged_into_entity_id FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[])",[row.vault_id,ids]);const byId=new Map(current.rows.map(item=>[item.id,item]));const stale=ids.some(id=>{const item=byId.get(id);return !item||item.revision!==expected[id]||item.archived_at||item.merged_into_entity_id;})||Boolean(row.expires_at&&new Date(row.expires_at)<=new Date());return proposalSchema.parse({id:row.id,vaultId:row.vault_id,kind:"entity_merge",status:row.status,revision:row.revision,diff:{targetEntityId:row.target_entity_id,sourceEntityIds:row.source_entity_ids,reason:row.reason,affectedEventIds:row.affected_event_ids,affectedCommitmentIds:row.affected_commitment_ids,writesApplied:row.status==="approved"},expectedRevisions:expected,affectedRecordIds:[row.target_entity_id,...row.source_entity_ids,...row.affected_event_ids,...row.affected_commitment_ids],requiredPermissions:["identity:merge"],stale,expiresAt:row.expires_at?iso(row.expires_at):null,rejectionReason:row.rejection_reason,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
async function contentProposalIsStale(client:any,row:Record<string,any>){
  if(row.expires_at&&new Date(row.expires_at)<=new Date())return true;
  const input=row.inputs as Record<string,any>,expected=row.expected_revisions as Record<string,number>;
  const checks:Array<{table:string;ids:string[];active?:string}>=[];
  if(row.kind==="merge_notes")checks.push({table:"notes",ids:[input.targetNoteId,...input.sourceNoteIds],active:"trashed_at IS NULL"});
  else if(row.kind==="split_note")checks.push({table:"notes",ids:[input.sourceNoteId],active:"trashed_at IS NULL"});
  else if(row.kind==="merge_labels")checks.push({table:"labels",ids:[input.targetLabelId,...input.sourceLabelIds],active:"archived_at IS NULL"});
  else if(row.kind==="bulk_reassign"){checks.push({table:"notes",ids:input.noteIds,active:"trashed_at IS NULL"});checks.push({table:"labels",ids:[...input.addLabelIds,...input.removeLabelIds],active:"archived_at IS NULL"});}
  else if(row.kind==="idea_promotion"){checks.push({table:"ideas",ids:[input.ideaId,...(input.relatedIdeaIds??[])],active:"archived_at IS NULL"});if(input.targetProjectId)checks.push({table:"projects",ids:[input.targetProjectId],active:"archived_at IS NULL"});}
  for(const check of checks){const ids=[...new Set(check.ids)];if(!ids.length)continue;const result=await client.query(`SELECT id,revision FROM ${check.table} WHERE vault_id=$1 AND id=ANY($2::uuid[])${check.active?` AND ${check.active}`:""}`,[row.vault_id,ids]);if(result.rowCount!==ids.length||result.rows.some((item:Record<string,any>)=>expected[item.id]!==item.revision))return true;}
  return false;
}
async function mapContentProposal(row:Record<string,any>){const stale=await contentProposalIsStale({query},row);return proposalSchema.parse({id:row.id,vaultId:row.vault_id,kind:row.kind,status:row.status,revision:row.revision,diff:{...row.diff,writesApplied:row.status==="approved"},expectedRevisions:row.expected_revisions,affectedRecordIds:row.affected_record_ids,requiredPermissions:row.required_permissions,stale,expiresAt:row.expires_at?iso(row.expires_at):null,rejectionReason:row.rejection_reason,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});}
async function mapStudyWithdrawalProposal(row:Record<string,any>){
  const [plan,events]=await Promise.all([
    query<Record<string,any>>("SELECT revision,status,archived_at FROM study_plans WHERE vault_id=$1 AND id=$2",[row.vault_id,row.study_plan_id]),
    query<Record<string,any>>("SELECT e.id,e.starts_at,e.trashed_at,c.origin,EXISTS(SELECT 1 FROM study_sessions s WHERE s.vault_id=$1 AND s.calendar_event_id=e.id AND s.state IN ('active','paused','interrupted','completed')) AS started,EXISTS(SELECT 1 FROM provider_calendar_actions a WHERE a.vault_id=$1 AND a.event_id=e.id AND a.state IN ('queued','running','succeeded','reconciling')) AS external_action FROM calendar_events e JOIN calendars c ON c.id=e.calendar_id WHERE e.vault_id=$1 AND e.id=ANY($2::uuid[])",[row.vault_id,row.selected_event_ids])
  ]);
  const currentPlan=plan.rows[0];
  const stale=!currentPlan||currentPlan.archived_at||currentPlan.revision!==row.study_plan_revision||!['draft','active'].includes(currentPlan.status)||events.rowCount!==row.selected_event_ids.length||events.rows.some(event=>event.trashed_at||event.started||event.origin!=="sorta"||event.external_action||new Date(event.starts_at).getTime()<=Date.now())||new Date(row.expires_at)<=new Date();
  return proposalSchema.parse({id:row.id,vaultId:row.vault_id,studyPlanId:row.study_plan_id,studyPlanRevision:row.study_plan_revision,kind:"study_plan_withdrawal",status:row.status,revision:row.revision,diff:{selectedUnstartedBlockIds:row.selected_event_ids,affectedTaskIds:row.affected_task_ids,historyDeleted:false,fixedOrExternalEventsDeleted:false,writesApplied:row.status==="approved"},reason:row.reason,stale,expiresAt:iso(row.expires_at),rejectionReason:row.rejection_reason,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
}
async function createContentProposal(client:any,vaultId:string,rawInput:unknown){
  const input=proposalInputSchema.parse(rawInput),payload=input.inputs as Record<string,any>;
  const expected=input.expectedRevisions,required=new Map<string,{revision:number;data:Record<string,any>}>();
  const load=async(table:string,ids:string[],active:string)=>{const unique=[...new Set(ids)];if(unique.length!==ids.length)return "duplicate_proposal_input" as const;if(!unique.length)return null;const result=await client.query(`SELECT * FROM ${table} WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND ${active} FOR SHARE`,[vaultId,unique]);if(result.rowCount!==unique.length)return "proposal_input_not_found" as const;for(const row of result.rows)required.set(row.id,{revision:row.revision,data:row});return null;};
  let error:null|string=null,diff:Record<string,any>,affected:string[],permissions=["notes:write"];
  if(input.kind==="merge_notes"){
    if(payload.sourceNoteIds.includes(payload.targetNoteId))return "proposal_input_overlap" as const;
    error=await load("notes",[payload.targetNoteId,...payload.sourceNoteIds],"trashed_at IS NULL");if(error)return error;
    diff={targetNoteId:payload.targetNoteId,sourceNoteIds:payload.sourceNoteIds,mergedTitle:payload.mergedTitle,mergedBody:payload.mergedBody,sourcePreviews:[payload.targetNoteId,...payload.sourceNoteIds].map((id:string)=>({noteId:id,title:required.get(id)!.data.title,revision:required.get(id)!.revision})),writesApplied:false};affected=[payload.targetNoteId,...payload.sourceNoteIds];
  }else if(input.kind==="split_note"){
    error=await load("notes",[payload.sourceNoteId],"trashed_at IS NULL");if(error)return error;diff={sourceNoteId:payload.sourceNoteId,parts:payload.parts,preserveSourceAsTrashed:true,writesApplied:false};affected=[payload.sourceNoteId];
  }else if(input.kind==="merge_labels"){
    if(payload.sourceLabelIds.includes(payload.targetLabelId))return "proposal_input_overlap" as const;
    error=await load("labels",[payload.targetLabelId,...payload.sourceLabelIds],"archived_at IS NULL");if(error)return error;
    const kinds=new Set([payload.targetLabelId,...payload.sourceLabelIds].map((id:string)=>required.get(id)!.data.kind));if(kinds.size!==1)return "cross_kind_label_merge_forbidden" as const;
    const linked=await client.query("SELECT DISTINCT note_id FROM note_labels WHERE label_id=ANY($1::uuid[]) ORDER BY note_id",[payload.sourceLabelIds]);const affectedNoteIds=linked.rows.map((row:Record<string,any>)=>row.note_id);diff={targetLabelId:payload.targetLabelId,sourceLabelIds:payload.sourceLabelIds,affectedNoteIds,writesApplied:false};affected=[payload.targetLabelId,...payload.sourceLabelIds,...affectedNoteIds];
  }else if(input.kind==="bulk_reassign"){
    const labelIds=[...payload.addLabelIds,...payload.removeLabelIds];if(new Set(labelIds).size!==labelIds.length)return "proposal_input_overlap" as const;
    error=await load("notes",payload.noteIds,"trashed_at IS NULL");if(error)return error;error=await load("labels",labelIds,"archived_at IS NULL");if(error)return error;
    const locked=payload.removeLabelIds.length?await client.query("SELECT note_id,label_id FROM note_labels WHERE note_id=ANY($1::uuid[]) AND label_id=ANY($2::uuid[]) AND locked=true ORDER BY note_id,label_id",[payload.noteIds,payload.removeLabelIds]):{rows:[]};diff={noteIds:payload.noteIds,addLabelIds:payload.addLabelIds,removeLabelIds:payload.removeLabelIds,lockedRemovalConflicts:locked.rows.map((row:Record<string,any>)=>({noteId:row.note_id,labelId:row.label_id})),writesApplied:false};affected=[...payload.noteIds,...labelIds];
  }else{
    const ideaIds=[payload.ideaId,...(payload.relatedIdeaIds??[])];error=await load("ideas",ideaIds,"archived_at IS NULL");if(error)return error;if(ideaIds.some((id:string)=>required.get(id)!.data.state==="dismissed"))return "dismissed_idea_cannot_be_promoted" as const;
    if(payload.targetProjectId){error=await load("projects",[payload.targetProjectId],"archived_at IS NULL");if(error)return error;}
    diff={ideaId:payload.ideaId,relatedIdeaIds:payload.relatedIdeaIds??[],targetProjectId:payload.targetProjectId??null,newProjectName:payload.newProjectName??null,proposedTitle:payload.proposedTitle??payload.newProjectName??null,action:payload.targetProjectId?"link_existing_project":"create_project",originalIdeaRetained:true,writesApplied:false};affected=[...ideaIds,...(payload.targetProjectId?[payload.targetProjectId]:[])];permissions=["notes:write","profile:write"];
  }
  const ids=[...required.keys()].sort(),expectedIds=Object.keys(expected).sort();if(JSON.stringify(ids)!==JSON.stringify(expectedIds)||ids.some(id=>expected[id]!==required.get(id)!.revision))return "proposal_expected_revisions_mismatch" as const;
  const created=await client.query("INSERT INTO content_proposals(vault_id,kind,inputs,diff,expected_revisions,affected_record_ids,required_permissions,expires_at) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::uuid[],$7::text[],now()+interval '7 days') RETURNING *",[vaultId,input.kind,JSON.stringify(payload),JSON.stringify(diff!),JSON.stringify(expected),[...new Set(affected!)],permissions]);return created.rows[0];
}
const mapProviderCalendarAction=(row:Record<string,any>)=>providerCalendarActionSchema.parse({id:row.id,vaultId:row.vault_id,proposalId:row.proposal_id,eventId:row.event_id,connectionId:row.connection_id,provider:row.provider,actionKind:row.action_kind,targetCalendarId:row.target_calendar_id,recipients:row.recipients,publicFields:row.public_fields,response:row.response,state:row.state,idempotencyKey:row.idempotency_key,providerOperationId:row.provider_operation_id,acknowledgement:row.acknowledgement,attemptCount:row.attempt_count,reconciliationRequired:row.reconciliation_required,sendsDisabledAfterRestore:row.sends_disabled_after_restore,lastErrorCode:row.last_error_code,revision:row.revision,sentAt:row.sent_at?iso(row.sent_at):null,acknowledgedAt:row.acknowledged_at?iso(row.acknowledged_at):null,cancelledAt:row.cancelled_at?iso(row.cancelled_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapRelationship = (row: Record<string, any>) => relationshipSchema.parse({
  id: row.id, vaultId: row.vault_id, fromNoteId: row.from_note_id, toNoteId: row.to_note_id, kind: row.kind,
  evidenceAnchorIds: row.evidence_anchor_ids ?? [], status: row.status, authoredBy: row.authored_by,
  revision: row.revision, createdAt: iso(row.created_at)
});
const mapJob = (row: Record<string, any>) => jobSchema.parse({
  id: row.id,
  vaultId: row.vault_id,
  kind: row.kind,
  status: row.status,
  stage: row.stage,
  progress: row.progress === null ? null : Number(row.progress),
  result: row.result,
  error: row.error_code ? { code: row.error_code, detail: row.safe_error_detail ?? "", retryable: row.retryable } : null,
  cancelRequested: row.cancel_requested,
  attempts: row.attempts,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at)
});
const mapJobHandle = (row: Record<string, any>) => jobHandleSchema.parse({
  id: row.id, kind: row.kind, status: row.status, createdAt: iso(row.created_at)
});
const mapSystemJobHandle=(row:Record<string,any>)=>systemJobHandleSchema.parse({id:row.id,kind:row.kind,status:row.status,createdAt:iso(row.created_at)});
const mapSystemJobSummary=(row:Record<string,any>)=>({id:row.id,kind:row.kind,status:row.status,stage:row.stage,progress:row.progress===null?null:Number(row.progress),retryable:row.retryable,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const mapSystemJob=(row:Record<string,any>)=>systemJobSchema.parse({...mapSystemJobSummary(row),result:row.result,error:row.error_code?{code:row.error_code,detail:row.safe_error_detail??"",retryable:row.retryable}:null,cancelRequested:row.cancel_requested,attempts:row.attempts});
const mapBackupSummary=(row:Record<string,any>)=>backupSummarySchema.parse({id:row.id,destinationId:row.destination_id,encryptionProfileId:row.encryption_profile_id,state:row.state,manifestSha256:row.manifest_sha256,bundleSha256:row.bundle_sha256,byteLength:row.byte_length===null?null:Number(row.byte_length),verifiedAt:row.verified_at?iso(row.verified_at):null,retentionUntil:row.retention_until?iso(row.retention_until):null,systemJobId:row.system_job_id,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});
const defaultToolPolicies=()=>[{toolName:"search_notes" as const,enabled:true,scope:{kind:"vault" as const,noteIds:[]},confirmation:"none" as const,quota:{maxRunsPerHour:100,maxResultBytes:262144}},{toolName:"get_note_summary" as const,enabled:true,scope:{kind:"vault" as const,noteIds:[]},confirmation:"none" as const,quota:{maxRunsPerHour:100,maxResultBytes:262144}}];
const mapToolPolicySet=(vaultId:string,row?:Record<string,any>)=>toolPolicySetSchema.parse({vaultId,policies:row?.policies??defaultToolPolicies(),policyVersion:"tool-policy-v1",revision:row?.revision??0,createdAt:row?.created_at?iso(row.created_at):null,updatedAt:row?.updated_at?iso(row.updated_at):null,invariants:{unrestrictedShell:false,unrestrictedFilesystem:false,unrestrictedNetwork:false,externalAndDestructiveAlwaysReviewed:true}});
const mapWorker = (row: Record<string, any>) => workerSummarySchema.parse({
  id: row.id,
  name: row.name,
  role: row.role,
  vaultIds: row.vault_ids ?? [],
  allowedJobTypes: row.allowed_job_types,
  paused: row.paused,
  resourcePolicy: row.resource_policy,
  runtimeStatus: row.runtime_status,
  installedProfiles: row.installed_profiles,
  lastSeenAt: row.last_seen_at ? iso(row.last_seen_at) : null,
  revision: row.config_revision
});
const mapChat = (row: Record<string, any>) => chatSchema.parse({
  id: row.id, vaultId: row.vault_id, title: row.title, defaultMode: row.default_mode,
  defaultScope: row.default_scope, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
});
const mapChatMessage = (row: Record<string, any>) => chatMessageSchema.parse({
  id: row.id, chatId: row.chat_id, clientMessageId: row.client_message_id, role: row.role,
  text: row.text, mode: row.answer_mode, status: row.status, answerToId: row.answer_to_id,
  jobId: row.job_id, citations: row.citations ?? [], createdAt: iso(row.created_at), updatedAt: iso(row.updated_at)
});

async function ensureDefaultCalendar(client:any,vaultId:string,timezone?:string){
  const existing=await client.query("SELECT id FROM calendars WHERE vault_id=$1 AND origin='sorta' AND archived_at IS NULL ORDER BY created_at,id LIMIT 1",[vaultId]);
  if(existing.rows[0])return existing.rows[0].id as string;
  const vault=timezone?{timezone}:((await client.query("SELECT timezone FROM vaults WHERE id=$1",[vaultId])).rows[0]);
  if(!vault)return null;
  const created=await client.query("INSERT INTO calendars(vault_id,name,timezone,origin,ownership,can_read,can_write,selected_visible,display_preferences) VALUES ($1,'Personal',$2,'sorta','owner',true,true,true,$3::jsonb) RETURNING id",[vaultId,vault.timezone,JSON.stringify({color:"#6366f1",showWeekends:true})]);
  return created.rows[0].id as string;
}
async function writableCalendarId(client:any,vaultId:string,calendarId?:string,timezone?:string){
  const id=calendarId??await ensureDefaultCalendar(client,vaultId,timezone);if(!id)return null;
  const result=await client.query("SELECT id FROM calendars WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL AND can_write=true",[vaultId,id]);
  return result.rows[0]?.id as string|undefined;
}
async function loadCalendarOccurrences(vaultId: string, from: string, to: string, calendarIds?:string[]) {
  const events = await query("SELECT * FROM calendar_events WHERE vault_id = $1 AND trashed_at IS NULL AND ($4::uuid[] IS NULL OR calendar_id=ANY($4::uuid[])) AND (recurrence IS NOT NULL OR ends_at >= $2) AND starts_at <= $3", [vaultId, from, to,calendarIds===undefined?null:calendarIds]);
  const eventIds = events.rows.map((row) => row.id);
  const exceptions = eventIds.length ? await query("SELECT * FROM calendar_event_exceptions WHERE event_id = ANY($1::uuid[])", [eventIds]) : { rows: [] as Record<string, any>[] };
  const byEvent = new Map<string, Record<string, any>[]>();
  for (const row of exceptions.rows) byEvent.set(row.event_id, [...(byEvent.get(row.event_id) ?? []), row]);
  return events.rows.flatMap((event) => expandOccurrences({
    eventId: event.id, title: event.title, startsAt: iso(event.starts_at), endsAt: iso(event.ends_at), recurrence: event.recurrence,
    from, to, exceptions: (byEvent.get(event.id) ?? []).map((row) => ({ id: row.id, originalStartsAt: iso(row.original_starts_at), cancelled: row.cancelled, title: row.title, startsAt: row.starts_at ? iso(row.starts_at) : null, endsAt: row.ends_at ? iso(row.ends_at) : null }))
  }));
}
async function computeCalendarBrief(vaultId:string,date:string,timezone:string,cached?:Record<string,any>){const wallStart=new Date(`${date}T00:00:00.000Z`),wallEnd=new Date(wallStart.getTime()+86_400_000);const from=instantFromWallClock(wallStart,timezone).toISOString(),to=instantFromWallClock(wallEnd,timezone).toISOString();const calendars=await query("SELECT id FROM calendars WHERE vault_id=$1 AND archived_at IS NULL AND can_read=true AND selected_visible=true ORDER BY id",[vaultId]);const calendarIds=calendars.rows.map(row=>row.id as string);const occurrences=(await loadCalendarOccurrences(vaultId,from,to,calendarIds)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));const eventIds=[...new Set(occurrences.map(item=>item.eventId))];const [events,counts]=await Promise.all([eventIds.length?query("SELECT id,calendar_id,revision FROM calendar_events WHERE vault_id=$1 AND id=ANY($2::uuid[]) ORDER BY id",[vaultId,eventIds]):Promise.resolve({rows:[] as Record<string,any>[]}),eventIds.length?query("SELECT p.event_id,count(*)::int AS prep_count,count(DISTINCT p.commitment_id)::int AS commitment_count FROM prep_items p WHERE p.event_id=ANY($1::uuid[]) AND p.invalidated_at IS NULL GROUP BY p.event_id",[eventIds]):Promise.resolve({rows:[] as Record<string,any>[]})]);const eventById=new Map(events.rows.map(row=>[row.id,row])),countByEvent=new Map(counts.rows.map(row=>[row.event_id,row]));const items=occurrences.map(item=>{const event=eventById.get(item.eventId)!,count=countByEvent.get(item.eventId);return{occurrenceId:item.id,eventId:item.eventId,calendarId:event.calendar_id,title:item.title,startsAt:item.startsAt,endsAt:item.endsAt,eventRevision:event.revision,prepItemCount:Number(count?.prep_count??0),linkedCommitmentCount:Number(count?.commitment_count??0)};});const sourceManifest=events.rows.map(row=>({recordType:"calendar_event" as const,recordId:row.id,revision:row.revision}));const manifestMatches=Boolean(cached)&&JSON.stringify(cached!.source_manifest)===JSON.stringify(sourceManifest);const state=!cached?"missing":manifestMatches?"fresh":"stale";const deterministicSummary=[`${items.length} timed item${items.length===1?"":"s"} on ${date}.`,`${items.reduce((sum,item)=>sum+item.prepItemCount,0)} active preparation item${items.reduce((sum,item)=>sum+item.prepItemCount,0)===1?"":"s"}.`];return calendarBriefSchema.parse({vaultId,date,timezone,state,revision:cached?.revision??0,generatedAt:cached?.generated_at?iso(cached.generated_at):null,items,deterministicSummary:cached?.deterministic_summary??deterministicSummary,sourceManifest,generation:{method:"deterministic-calendar-brief-v1",sourceCount:sourceManifest.length,cached:Boolean(cached)}});}

app.get("/health/live", async () => ({ status: "ok" }));
app.get("/health/ready", async (_request, reply) => {
  try {
    await query("SELECT 1");
    return { status: "ready", database: "available" };
  } catch {
    return reply.code(503).send({ status: "not_ready", database: "unavailable" });
  }
});

app.get("/api/v1/meta", async () => ({ api_version: "1.0.0", client_min_version: "0.1.0", schema_version: 93 }));
await registerAuthRoutes(app);

app.get("/api/v1/vaults", async (request, reply) => {
  const access = await getVaultListAccess(request);
  if (!access) return reply.code(401).send({ error: "authentication_required" });
  const result = await query(
    `SELECT * FROM vaults WHERE owner_id=$1 AND remote_authorized=true
     AND ($2::uuid[] IS NULL OR id=ANY($2::uuid[])) ORDER BY created_at,id LIMIT 100`,
    [access.ownerId, access.vaultIds]
  );
  return { items: result.rows.map(mapVault) };
});

app.post("/api/v1/vaults", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session) return reply.code(401).send({ error: "authentication_required" });
  const input = createVaultSchema.parse(request.body);
  const created=await transaction(async client=>{const result=await client.query(
    `INSERT INTO vaults(name,owner_id,locale,timezone,storage_mode,remote_authorized)
     VALUES ($1,$2,$3,$4,'host_synced',true) RETURNING *`,
    [input.name, session.owner_id, input.locale, input.timezone]
  );await ensureDefaultCalendar(client,result.rows[0].id,input.timezone);return result.rows[0];});
  return reply.code(201).send(mapVault(created));
});

app.get("/api/v1/vaults/:vaultId", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const result = await query("SELECT * FROM vaults WHERE id=$1", [vaultId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "vault_not_found" });
  return mapVault(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = updateVaultSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const currentResult = await client.query("SELECT * FROM vaults WHERE id=$1 FOR UPDATE", [vaultId]);
    const current = currentResult.rows[0];
    if (!current || current.revision !== input.expectedRevision) return null;
    const updated = await client.query(
      `UPDATE vaults SET name=$2,locale=$3,timezone=$4,revision=revision+1,updated_at=now()
       WHERE id=$1 RETURNING *`,
      [vaultId, input.patch.name ?? current.name, input.patch.locale ?? current.locale, input.patch.timezone ?? current.timezone]
    );
    return updated.rows[0];
  });
  if (!result) return reply.code(409).send({ error: "revision_conflict" });
  return mapVault(result);
});

app.post("/api/v1/vaults/:vaultId/purge",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=purgeRequestSchema.parse(request.body),targetIdHash=createHash("sha256").update(vaultId).digest("hex");const outcome=await transaction(async client=>{const vault=(await client.query<Record<string,any>>("SELECT id,revision FROM vaults WHERE id=$1 AND owner_id=$2 FOR UPDATE",[vaultId,session.owner_id])).rows[0];if(!vault)return"vault_not_found" as const;if(vault.revision!==input.expectedRevision)return"stale_vault_revision" as const;const blobs=await client.query<Record<string,any>>("SELECT storage_key FROM blobs WHERE vault_id=$1 ORDER BY id",[vaultId]),active=await client.query<{count:number}>("SELECT count(*)::int AS count FROM jobs WHERE vault_id=$1 AND status IN ('queued','waiting_for_worker','running')",[vaultId]);const revokedJobs=Number(active.rows[0].count),payload=JSON.stringify({type:"vault_purge",targetIdHash}),created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,progress,input,input_hash,attempts,started_at) VALUES ($1,'vault_purge','running','database_purge',0.5,$2::jsonb,$3,1,now()) RETURNING *",[session.owner_id,payload,createHash("sha256").update(payload).digest("hex")]);await client.query("INSERT INTO deletion_ledger(owner_id,target_kind,target_id_hash,revoked_jobs) VALUES ($1,'vault',$2,$3)",[session.owner_id,targetIdHash,revokedJobs]);await client.query("DELETE FROM vaults WHERE id=$1",[vaultId]);return{job:created.rows[0],storageKeys:blobs.rows.map(row=>row.storage_key as string),revokedJobs};});if(typeof outcome==="string")return reply.code(outcome==="vault_not_found"?404:409).send({error:outcome});let blobFilesDeleted=0,blobFileDeleteFailures=0;for(const storageKey of outcome.storageKeys){try{await rm(blobPath(blobStorageRoot,storageKey),{force:true});blobFilesDeleted++;}catch{blobFileDeleteFailures++;}}const result={type:"vault_purge" as const,targetIdHash,revokedJobs:outcome.revokedJobs,blobFilesDeleted,blobFileDeleteFailures,minimalLedgerRetained:true as const,writesApplied:true as const};const completed=(await query<Record<string,any>>("UPDATE system_jobs SET status='succeeded',stage='purge_complete',progress=1,result=$2::jsonb,finished_at=now(),updated_at=now() WHERE id=$1 RETURNING *",[outcome.job.id,JSON.stringify(result)])).rows[0];await query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[completed.id,JSON.stringify({targetIdHash}),JSON.stringify(result)]);return reply.code(202).send(mapSystemJobHandle(completed));});

app.post("/api/v1/vaults/:vaultId/uploads", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createUploadSchema.parse(request.body);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000);
  const result = await query(
    `INSERT INTO uploads(vault_id,filename,media_type,byte_length,sha256,part_size,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,part_size,expires_at`,
    [vaultId, input.filename, input.mediaType, input.byteLength, input.sha256, UPLOAD_PART_SIZE, expiresAt]
  );
  const row = result.rows[0];
  return reply.code(201).send(uploadSessionSchema.parse({ uploadId: row.id, partSize: row.part_size, expiresAt: iso(row.expires_at) }));
});

app.put("/api/v1/vaults/:vaultId/uploads/:uploadId/parts/:partNumber", async (request, reply) => {
  const { vaultId, uploadId, partNumber: rawPartNumber } = request.params as { vaultId: string; uploadId: string; partNumber: string };
  idSchema.parse(vaultId); idSchema.parse(uploadId);
  if (!/^\d+$/.test(rawPartNumber)) return reply.code(400).send({ error: "invalid_part_number" });
  const partNumber = Number(rawPartNumber);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 512) return reply.code(400).send({ error: "invalid_part_number" });
  if (!Buffer.isBuffer(request.body)) return reply.code(415).send({ error: "binary_body_required" });
  const body = request.body;
  const expectedPartHash = request.headers["x-part-sha256"];
  if (typeof expectedPartHash !== "string" || !/^[0-9a-f]{64}$/.test(expectedPartHash)) return reply.code(400).send({ error: "part_sha256_required" });
  const actualPartHash = createHash("sha256").update(body).digest("hex");
  if (actualPartHash !== expectedPartHash) return reply.code(422).send({ error: "part_hash_mismatch" });
  const outcome = await transaction(async (client) => {
    const uploadResult = await client.query("SELECT * FROM uploads WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, uploadId]);
    const upload = uploadResult.rows[0];
    if (!upload) return { code: 404, error: "upload_not_found" };
    if (upload.status !== "open") return { code: 409, error: `upload_${upload.status}` };
    if (new Date(upload.expires_at).getTime() <= Date.now()) return { code: 410, error: "upload_expired" };
    const range = parseUploadPartRange(request.headers["content-range"], Number(upload.byte_length), partNumber, body.length, upload.part_size);
    if (!range) return { code: 400, error: "invalid_content_range" };
    const prior = await client.query("SELECT * FROM upload_parts WHERE upload_id=$1 AND part_number=$2", [uploadId, partNumber]);
    if (prior.rows[0]) {
      const same = prior.rows[0].sha256 === actualPartHash && Number(prior.rows[0].byte_length) === body.length && Number(prior.rows[0].start_offset) === range.start && Number(prior.rows[0].end_offset) === range.end;
      return same ? { code: 204 } : { code: 409, error: "upload_part_conflict" };
    }
    const directory = uploadDirectory(blobStorageRoot, vaultId, uploadId);
    await mkdir(directory, { recursive: true });
    const destination = uploadPartPath(blobStorageRoot, vaultId, uploadId, partNumber);
    const temporary = path.join(directory, `${partNumber}.${randomUUID()}.tmp`);
    await writeFile(temporary, body, { flag: "wx" });
    await rename(temporary, destination);
    await client.query(
      "INSERT INTO upload_parts(upload_id,part_number,start_offset,end_offset,byte_length,sha256) VALUES ($1,$2,$3,$4,$5,$6)",
      [uploadId, partNumber, range.start, range.end, body.length, actualPartHash]
    );
    return { code: 204 };
  });
  return outcome.code === 204 ? reply.code(204).send() : reply.code(outcome.code).send({ error: outcome.error });
});

app.post("/api/v1/vaults/:vaultId/uploads/:uploadId/complete", async (request, reply) => {
  const { vaultId, uploadId } = request.params as { vaultId: string; uploadId: string };
  idSchema.parse(vaultId); idSchema.parse(uploadId);
  const input = completeUploadSchema.parse(request.body);
  const prepared = await transaction(async (client) => {
    const uploadResult = await client.query("SELECT * FROM uploads WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, uploadId]);
    const upload = uploadResult.rows[0];
    if (!upload) return { code: 404, error: "upload_not_found" } as const;
    if (upload.status === "completed" && upload.completed_blob_id) {
      const blob = await client.query("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2", [vaultId, upload.completed_blob_id]);
      return { code: 200, blob: blob.rows[0] } as const;
    }
    if (upload.status !== "open") return { code: 409, error: `upload_${upload.status}` } as const;
    if (new Date(upload.expires_at).getTime() <= Date.now()) return { code: 410, error: "upload_expired" } as const;
    if (input.sha256 !== upload.sha256) return { code: 422, error: "upload_hash_mismatch" } as const;
    const parts = await client.query("SELECT * FROM upload_parts WHERE upload_id=$1 ORDER BY part_number", [uploadId]);
    if (parts.rowCount !== input.partCount || input.partCount !== Math.ceil(Number(upload.byte_length) / upload.part_size)) return { code: 409, error: "upload_incomplete" } as const;
    let offset = 0;
    for (let index = 0; index < parts.rows.length; index += 1) {
      const part = parts.rows[index];
      if (part.part_number !== index + 1 || Number(part.start_offset) !== offset || Number(part.end_offset) - Number(part.start_offset) + 1 !== Number(part.byte_length)) return { code: 409, error: "upload_parts_invalid" } as const;
      offset += Number(part.byte_length);
    }
    if (offset !== Number(upload.byte_length)) return { code: 409, error: "upload_incomplete" } as const;
    await client.query("UPDATE uploads SET status='finalizing',updated_at=now() WHERE id=$1", [uploadId]);
    return { code: 201, upload, parts: parts.rows } as const;
  });
  if ("blob" in prepared) return reply.code(201).send(mapBlob(prepared.blob));
  if (!("upload" in prepared)) return reply.code(prepared.code).send({ error: prepared.error });
  const finalizingUpload = prepared.upload;
  const finalizingParts = prepared.parts;
  if (!finalizingUpload || !finalizingParts) return reply.code(500).send({ error: "upload_finalization_state_invalid" });
  const directory = uploadDirectory(blobStorageRoot, vaultId, uploadId);
  const assembled = path.join(directory, `assembled.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(assembled, "wx");
    const hash = createHash("sha256"); let written = 0;
    for (const part of finalizingParts) {
      const bytes = await readFile(uploadPartPath(blobStorageRoot, vaultId, uploadId, part.part_number));
      if (bytes.length !== Number(part.byte_length) || createHash("sha256").update(bytes).digest("hex") !== part.sha256) throw new Error("stored_part_integrity_failure");
      await handle.write(bytes); hash.update(bytes); written += bytes.length;
    }
    await handle.sync(); await handle.close(); handle = undefined;
    if (written !== Number(finalizingUpload.byte_length) || hash.digest("hex") !== input.sha256) throw new Error("assembled_upload_integrity_failure");
    const destination = blobPath(blobStorageRoot, input.sha256);
    await mkdir(path.dirname(destination), { recursive: true });
    if (existsSync(destination)) {
      if (await hashFile(destination) !== input.sha256) throw new Error("existing_blob_integrity_failure");
      await rm(assembled, { force: true });
    } else await rename(assembled, destination);
    const blob = await transaction(async (client) => {
      const current = await client.query("SELECT status FROM uploads WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, uploadId]);
      if (current.rows[0]?.status !== "finalizing") throw new Error("upload_finalization_state_changed");
      const result = await client.query(
        `INSERT INTO blobs(vault_id,filename,media_type,byte_length,sha256,storage_key) VALUES ($1,$2,$3,$4,$5,$5)
         ON CONFLICT(vault_id,sha256) DO UPDATE SET sha256=EXCLUDED.sha256 RETURNING *`,
        [vaultId, finalizingUpload.filename, finalizingUpload.media_type, finalizingUpload.byte_length, input.sha256]
      );
      await client.query("UPDATE uploads SET status='completed',completed_blob_id=$2,updated_at=now() WHERE id=$1", [uploadId, result.rows[0].id]);
      return result.rows[0];
    });
    await rm(directory, { recursive: true, force: true });
    return reply.code(201).send(mapBlob(blob));
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await rm(assembled, { force: true }).catch(() => undefined);
    await query("UPDATE uploads SET status='open',updated_at=now() WHERE vault_id=$1 AND id=$2 AND status='finalizing'", [vaultId, uploadId]);
    request.log.error({ error, uploadId }, "upload finalization failed");
    const integrityFailure = error instanceof Error && ["stored_part_integrity_failure", "assembled_upload_integrity_failure"].includes(error.message);
    return reply.code(integrityFailure ? 422 : 500).send({ error: integrityFailure ? "upload_integrity_failure" : "upload_finalization_failed" });
  }
});

app.delete("/api/v1/vaults/:vaultId/uploads/:uploadId", async (request, reply) => {
  const { vaultId, uploadId } = request.params as { vaultId: string; uploadId: string };
  idSchema.parse(vaultId); idSchema.parse(uploadId);
  const result = await query(
    `UPDATE uploads SET status='cancelled',updated_at=now() WHERE vault_id=$1 AND id=$2 AND status='open' RETURNING id`,
    [vaultId, uploadId]
  );
  if (!result.rowCount) {
    const current = await query("SELECT status FROM uploads WHERE vault_id=$1 AND id=$2", [vaultId, uploadId]);
    if (!current.rows[0]) return reply.code(404).send({ error: "upload_not_found" });
    if (current.rows[0].status === "cancelled") return reply.code(204).send();
    return reply.code(409).send({ error: `upload_${current.rows[0].status}` });
  }
  await rm(uploadDirectory(blobStorageRoot, vaultId, uploadId), { recursive: true, force: true });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/blobs/:blobId", async (request, reply) => {
  const { vaultId, blobId } = request.params as { vaultId: string; blobId: string };
  idSchema.parse(vaultId); idSchema.parse(blobId);
  const result = await query("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2", [vaultId, blobId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "blob_not_found" });
  return mapBlob(result.rows[0]);
});

app.get("/api/v1/vaults/:vaultId/blobs/:blobId/content", async (request, reply) => {
  const { vaultId, blobId } = request.params as { vaultId: string; blobId: string };
  const { download } = request.query as { download?: string };
  idSchema.parse(vaultId); idSchema.parse(blobId);
  const worker = await getWorkerIdentity(request);
  if (worker) {
    if (worker.paused) return reply.code(423).send({ error: "worker_paused" });
    const jobId = request.headers["x-job-id"], leaseToken = request.headers["x-job-lease-token"];
    if (typeof jobId !== "string" || !idSchema.safeParse(jobId).success || typeof leaseToken !== "string") return reply.code(401).send({ error: "job_lease_required" });
    const leased = await query(
      "SELECT * FROM jobs WHERE id=$1 AND vault_id=$2 AND assigned_worker_id=$3 AND status='running' AND lease_expires_at>now()",
      [jobId, vaultId, worker.id]
    );
    const job = leased.rows[0];
    if (!job?.lease_token_hash || !leaseSecretMatches(leaseToken, job.lease_token_hash)) return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
    const authorizedBlobIds = Array.isArray(job.input?.authorizedBlobIds) ? job.input.authorizedBlobIds : [];
    if (!authorizedBlobIds.includes(blobId)) return reply.code(404).send({ error: "blob_not_in_job_scope" });
  } else {
    await requireVaultOwner(request, reply);
    if (reply.sent) return;
  }
  if (download !== undefined && download !== "true" && download !== "false") return reply.code(400).send({ error: "invalid_download_option" });
  const result = await query("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2", [vaultId, blobId]);
  const blob = result.rows[0];
  if (!blob) return reply.code(404).send({ error: "blob_not_found" });
  const file = blobPath(blobStorageRoot, blob.storage_key);
  if (!existsSync(file)) return reply.code(503).send({ error: "blob_storage_unavailable" });
  const total = Number(blob.byte_length);
  const range = parseResponseRange(request.headers.range, total);
  if (range === "invalid") return reply.code(416).header("content-range", `bytes */${total}`).send({ error: "range_not_satisfiable" });
  const start = range?.start ?? 0, end = range?.end ?? total - 1;
  reply.header("accept-ranges", "bytes");
  reply.header("content-length", String(end - start + 1));
  reply.header("content-disposition", contentDisposition(blob.filename, download === "true", blob.media_type));
  reply.header("x-content-type-options", "nosniff");
  reply.header("content-security-policy", "sandbox; default-src 'none'");
  reply.header("cache-control", "private, no-store");
  if (range) reply.code(206).header("content-range", `bytes ${start}-${end}/${total}`);
  return reply.type(responseMediaType(blob.media_type)).send(createReadStream(file, { start, end }));
});

app.post("/api/v1/vaults/:vaultId/imports",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=planImportSchema.parse(request.body),blob=(await query<Record<string,any>>("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2",[vaultId,input.blobId])).rows[0];if(!blob)return reply.code(404).send({error:"import_blob_not_found"});if(Number(blob.byte_length)>25*1024*1024)return reply.code(413).send({error:"import_blob_too_large"});const file=blobPath(blobStorageRoot,blob.storage_key);if(!existsSync(file))return reply.code(503).send({error:"blob_storage_unavailable"});if(await hashFile(file)!==blob.sha256)return reply.code(503).send({error:"blob_integrity_failure"});let items:Array<{sourcePath:string;title:string;body:string;sourceId:string|null}>;try{items=parseNoteImport(await readFile(file),input.format,blob.filename,input.options);}catch(error){return reply.code((error as Error).message==="import_too_large"?413:400).send({error:(error as Error).message});}const duplicateTitles=new Set<string>(),seen=new Set<string>(),warnings:string[]=[];for(const item of items){const key=item.title.trim().toLocaleLowerCase();if(seen.has(key))duplicateTitles.add(key);seen.add(key);}if(duplicateTitles.size)warnings.push(`${duplicateTitles.size} duplicate title(s) exist inside the import; apply collision policy is evaluated against the vault separately.`);const job=await transaction(async client=>{const createdImport=await client.query("INSERT INTO note_imports(vault_id,blob_id,format,options,counts,warnings) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb) RETURNING *",[vaultId,input.blobId,input.format,JSON.stringify(input.options),JSON.stringify({total:items.length,create:items.length,skip:0,created:0,skipped:0,failed:0}),JSON.stringify(warnings)]),importRow=createdImport.rows[0];for(let index=0;index<items.length;index++){const item=items[index];await client.query("INSERT INTO note_import_items(import_id,sequence,source_path,title,body,source_id,content_sha256,planned_action) VALUES ($1,$2,$3,$4,$5,$6,$7,'create')",[importRow.id,index+1,item.sourcePath,item.title.trim(),item.body,item.sourceId,createHash("sha256").update(item.body).digest("hex")]);}const result=importPlanResultSchema.parse({type:"import_plan",importId:importRow.id,itemCount:items.length,warningCount:warnings.length,writesApplied:false}),payload=JSON.stringify({type:"import_plan",importId:importRow.id,blobId:input.blobId,format:input.format}),createdJob=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'import_plan','succeeded','manifest_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);await client.query("UPDATE note_imports SET planning_job_id=$2 WHERE id=$1",[importRow.id,createdJob.rows[0].id]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[createdJob.rows[0].id,JSON.stringify({importId:importRow.id}),JSON.stringify(result)]);return createdJob.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/imports/:importId",async(request,reply)=>{const {vaultId,importId}=request.params as {vaultId:string;importId:string};idSchema.parse(vaultId);idSchema.parse(importId);const [found,items]=await Promise.all([query<Record<string,any>>("SELECT * FROM note_imports WHERE vault_id=$1 AND id=$2",[vaultId,importId]),query<Record<string,any>>("SELECT id,sequence,source_path,title,octet_length(body)::int AS byte_length,content_sha256,planned_action,apply_status,applied_note_id,warning FROM note_import_items WHERE import_id=$1 ORDER BY sequence",[importId])]);const row=found.rows[0];if(!row)return reply.code(404).send({error:"import_not_found"});const statuses={created:0,skipped:0,failed:0};for(const item of items.rows)if(item.apply_status in statuses)statuses[item.apply_status as keyof typeof statuses]++;return importManifestSchema.parse({id:row.id,vaultId:row.vault_id,blobId:row.blob_id,format:row.format,status:row.status,options:row.options,warnings:row.warnings,counts:{...row.counts,...statuses},items:items.rows.map(item=>({id:item.id,sequence:item.sequence,sourcePath:item.source_path,title:item.title,byteLength:item.byte_length,contentSha256:item.content_sha256,plannedAction:item.planned_action,applyStatus:item.apply_status,appliedNoteId:item.applied_note_id,warning:item.warning})),planRevision:row.plan_revision,appliedAt:row.applied_at?iso(row.applied_at):null,createdAt:iso(row.created_at),updatedAt:iso(row.updated_at)});});

app.post("/api/v1/vaults/:vaultId/imports/:importId/apply",async(request,reply)=>{const {vaultId,importId}=request.params as {vaultId:string;importId:string};idSchema.parse(vaultId);idSchema.parse(importId);const input=applyImportSchema.parse(request.body);const outcome=await transaction(async client=>{await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`note-import:${importId}`]);const importRow=(await client.query<Record<string,any>>("SELECT * FROM note_imports WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,importId])).rows[0];if(!importRow)return"not_found" as const;if(importRow.plan_revision!==input.planRevision)return"stale_import_plan" as const;if(importRow.status==="applied"&&importRow.apply_job_id)return(await client.query("SELECT * FROM jobs WHERE vault_id=$1 AND id=$2",[vaultId,importRow.apply_job_id])).rows[0];if(importRow.status!=="planned")return"import_not_applicable" as const;await client.query("UPDATE note_imports SET status='applying',updated_at=now() WHERE id=$1",[importId]);const items=(await client.query<Record<string,any>>("SELECT * FROM note_import_items WHERE import_id=$1 ORDER BY sequence FOR UPDATE",[importId])).rows,createdNoteIds:string[]=[],skippedItemIds:string[]=[],idRemapping:Record<string,string>={};for(const item of items){if(input.collisionPolicy==="skip_existing_title"){const existing=await client.query("SELECT id FROM notes WHERE vault_id=$1 AND lower(title)=lower($2) AND trashed_at IS NULL LIMIT 1",[vaultId,item.title]);if(existing.rows[0]){skippedItemIds.push(item.id);await client.query("UPDATE note_import_items SET apply_status='skipped',warning='Existing active note has the same title.' WHERE id=$1",[item.id]);continue;}}const noteId=randomUUID(),state=createDocumentState(item.body);await client.query("INSERT INTO notes(id,vault_id,title,body,status,revision,yjs_state) VALUES ($1,$2,$3,$4,'saved',1,$5)",[noteId,vaultId,item.title,item.body,state]);await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,1,$2,$3,$4,'import')",[noteId,item.title,item.body,state]);await client.query("UPDATE note_import_items SET apply_status='created',applied_note_id=$2 WHERE id=$1",[item.id,noteId]);createdNoteIds.push(noteId);if(item.source_id)idRemapping[item.source_id]=noteId;}const result=importApplyResultSchema.parse({type:"import_apply",importId,createdNoteIds,skippedItemIds,idRemapping,writesApplied:true}),payload=JSON.stringify({type:"import_apply",importId,planRevision:input.planRevision,collisionPolicy:input.collisionPolicy}),job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'import_apply','succeeded','import_applied',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);await client.query("UPDATE note_imports SET status='applied',apply_job_id=$2,applied_at=now(),updated_at=now() WHERE id=$1",[importId,job.rows[0].id]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[job.rows[0].id,JSON.stringify({importId}),JSON.stringify(result)]);return job.rows[0];});if(outcome==="not_found")return reply.code(404).send({error:"import_not_found"});if(typeof outcome==="string")return reply.code(409).send({error:outcome});return reply.code(202).send(mapJobHandle(outcome));});

app.post("/api/v1/vaults/:vaultId/exports",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createExportSchema.parse(request.body);
  const artifact=await buildVaultExport(vaultId,input as any);if(!artifact)return reply.code(404).send({error:"vault_not_found"});
  const filename=`sorta-${input.format}-${artifact.capturedAt.slice(0,10)}.tar`,stored=await persistBlobBytes(vaultId,filename,"application/x-tar",artifact.bytes),exportId=randomUUID(),expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
  const job=await transaction(async client=>{await client.query("INSERT INTO exports(id,vault_id,kind,status,format,privacy,scope,source_manifest,blob_id,byte_length,sha256,expires_at) VALUES ($1,$2,'vault','ready',$3,'authorized_full',$4::jsonb,$5::jsonb,$6,$7,$8,$9)",[exportId,vaultId,input.format,JSON.stringify(input.scope),JSON.stringify(artifact.sourceManifest),stored.blob.id,stored.byteLength,stored.sha256,expiresAt]);const payload=JSON.stringify({type:"export_generate",source:"vault",exportId,scope:input.scope,format:input.format,includeHistory:input.includeHistory});const result={type:"export_generate" as const,exportId,format:input.format,byteLength:stored.byteLength,sha256:stored.sha256,expiresAt,writesApplied:true as const};const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'export_generate','succeeded','artifact_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({exportId,format:input.format}),JSON.stringify(result)]);return created.rows[0];});
  return reply.code(202).send(mapJobHandle(job));
});

app.get("/api/v1/vaults/:vaultId/exports/:exportId",async(request,reply)=>{const {vaultId,exportId}=request.params as {vaultId:string;exportId:string};idSchema.parse(vaultId);idSchema.parse(exportId);const found=await query("SELECT * FROM exports WHERE vault_id=$1 AND id=$2",[vaultId,exportId]);if(!found.rows[0])return reply.code(404).send({error:"export_not_found"});return mapExport(found.rows[0]);});

app.get("/api/v1/vaults/:vaultId/exports/:exportId/download",async(request,reply)=>{const {vaultId,exportId}=request.params as {vaultId:string;exportId:string};idSchema.parse(vaultId);idSchema.parse(exportId);const found=await query("SELECT e.*,b.filename,b.media_type,b.storage_key FROM exports e LEFT JOIN blobs b ON b.id=e.blob_id AND b.vault_id=e.vault_id WHERE e.vault_id=$1 AND e.id=$2",[vaultId,exportId]);const artifact=found.rows[0];if(!artifact)return reply.code(404).send({error:"export_not_found"});if(new Date(artifact.expires_at).getTime()<=Date.now())return reply.code(410).send({error:"export_expired"});if(artifact.status!=="ready"||!artifact.storage_key)return reply.code(409).send({error:"export_not_ready"});const file=blobPath(blobStorageRoot,artifact.storage_key);if(!existsSync(file))return reply.code(503).send({error:"export_storage_unavailable"});if(await hashFile(file)!==artifact.sha256)return reply.code(503).send({error:"export_integrity_failure"});reply.header("content-length",String(artifact.byte_length)).header("content-disposition",contentDisposition(artifact.filename,true,artifact.media_type)).header("x-checksum-sha256",artifact.sha256).header("cache-control","private, no-store").header("x-content-type-options","nosniff").header("content-security-policy","sandbox; default-src 'none'");return reply.type(artifact.media_type).send(createReadStream(file));});

app.post("/api/v1/vaults/:vaultId/calendar-export",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=calendarExportInputSchema.parse(request.body);const rawKey=request.headers["idempotency-key"],idempotencyKey=Array.isArray(rawKey)?rawKey[0]:rawKey;if(!idempotencyKey||idempotencyKey.length<8||idempotencyKey.length>128)return reply.code(400).send({error:"idempotency_key_required"});
  const payload={type:"export_generate",source:"calendar",...input,idempotencyKey},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='export_generate' AND input->>'source'='calendar' AND input->>'idempotencyKey'=$2",[vaultId,idempotencyKey]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"idempotency_key_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}
  const calendars=await query("SELECT id,name,revision FROM calendars WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL AND can_read=true ORDER BY id",[vaultId,input.calendarIds]);if(calendars.rowCount!==input.calendarIds.length)return reply.code(400).send({error:"calendar_not_found_or_unreadable"});
  const occurrences=await loadCalendarOccurrences(vaultId,input.from,input.to,input.calendarIds);const generatedAt=new Date().toISOString(),ics=serializeMinimalCalendar({name:calendars.rows.map(row=>row.name).join(" + ")||"Sorta calendar",generatedAt,occurrences}),bytes=Buffer.from(ics,"utf8"),stored=await persistBlobBytes(vaultId,`sorta-calendar-${input.from.slice(0,10)}-${input.to.slice(0,10)}.ics`,"text/calendar; charset=utf-8",bytes),eventIds=[...new Set(occurrences.map(item=>item.eventId))],events=eventIds.length?await query("SELECT id,revision FROM calendar_events WHERE vault_id=$1 AND id=ANY($2::uuid[]) ORDER BY id",[vaultId,eventIds]):{rows:[] as Record<string,any>[]},sourceManifest=[...calendars.rows.map(row=>({recordType:"calendar",recordId:row.id,revision:row.revision})),...events.rows.map(row=>({recordType:"calendar_event",recordId:row.id,revision:row.revision}))],exportId=randomUUID(),expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
  const job=await transaction(async client=>{await client.query("INSERT INTO exports(id,vault_id,kind,status,format,privacy,scope,source_manifest,blob_id,byte_length,sha256,expires_at) VALUES ($1,$2,'calendar','ready','ics','minimal',$3::jsonb,$4::jsonb,$5,$6,$7,$8)",[exportId,vaultId,JSON.stringify({calendarIds:input.calendarIds,from:input.from,to:input.to}),JSON.stringify(sourceManifest),stored.blob.id,stored.byteLength,stored.sha256,expiresAt]);const result={type:"export_generate" as const,exportId,format:"ics" as const,byteLength:stored.byteLength,sha256:stored.sha256,expiresAt,writesApplied:true as const};const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'export_generate','succeeded','artifact_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({exportId,privacy:"minimal"}),JSON.stringify(result)]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));
});

app.post("/api/v1/vaults/:vaultId/calendar-import-preview",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=calendarImportInputSchema.parse(request.body);if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});
  const [blobResult,calendarResult]=await Promise.all([query("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2",[vaultId,input.attachmentId]),query("SELECT id,revision FROM calendars WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL AND can_write=true",[vaultId,input.targetCalendarId])]);const blob=blobResult.rows[0],calendar=calendarResult.rows[0];if(!blob)return reply.code(404).send({error:"calendar_import_attachment_not_found"});if(!calendar)return reply.code(400).send({error:"target_calendar_not_writable"});if(Number(blob.byte_length)>10*1024*1024)return reply.code(413).send({error:"calendar_import_too_large"});const file=blobPath(blobStorageRoot,blob.storage_key);if(!existsSync(file))return reply.code(503).send({error:"blob_storage_unavailable"});if(await hashFile(file)!==blob.sha256)return reply.code(503).send({error:"blob_integrity_failure"});
  const payload={type:"calendar_import_preview",...input,sourceSha256:blob.sha256,targetCalendarRevision:calendar.revision},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='calendar_import_preview' AND input_hash=$2 AND status='succeeded' ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]);if(prior.rows[0])return reply.code(202).send(mapJobHandle(prior.rows[0]));
  let parsed:ReturnType<typeof parseCalendarImport>;try{parsed=parseCalendarImport((await readFile(file)).toString("utf8"),input.timezone);}catch(error){const code=error instanceof Error&&/^[a-z_]+$/.test(error.message)?error.message:"invalid_ics_calendar";return reply.code(code.includes("too_large")?413:422).send({error:code});}
  const validRanges=parsed.items.filter(item=>item.startsAt&&item.endsAt),from=validRanges.map(item=>item.startsAt!).sort()[0]??new Date().toISOString(),to=validRanges.map(item=>item.endsAt!).sort().at(-1)??from;const existing=validRanges.length?await query("SELECT id,title,starts_at,ends_at,recurrence,revision FROM calendar_events WHERE vault_id=$1 AND calendar_id=$2 AND trashed_at IS NULL AND starts_at<=$4 AND ends_at>=$3",[vaultId,input.targetCalendarId,from,to]):{rows:[] as Record<string,any>[]};const seen=new Set<string>();const items=parsed.items.map(item=>{const key=`${item.sourceUid}\u0000${item.startsAt??""}`;if(seen.has(key))return{...item,action:"duplicate" as const,reasonCodes:[...item.reasonCodes,"duplicate_in_attachment"]};seen.add(key);if(item.action==="blocked")return item;const match=existing.rows.find(row=>row.title===item.title&&iso(row.starts_at)===item.startsAt&&iso(row.ends_at)===item.endsAt);if(item.sourceStatus==="cancelled")return match?{...item,action:"cancel" as const,reasonCodes:[...item.reasonCodes,`matches_event:${match.id}`,`expected_revision:${match.revision}`]}:{...item,action:"blocked" as const,reasonCodes:[...item.reasonCodes,"cancellation_target_not_found"]};if(match)return{...item,action:"duplicate" as const,reasonCodes:[...item.reasonCodes,`matches_event:${match.id}`]};return item;});const counts={create:items.filter(item=>item.action==="create").length,createSeries:items.filter(item=>item.action==="create_series").length,cancel:items.filter(item=>item.action==="cancel").length,duplicate:items.filter(item=>item.action==="duplicate").length,blocked:items.filter(item=>item.action==="blocked").length};
  const created=await transaction(async client=>{const preview=await client.query("INSERT INTO calendar_import_previews(vault_id,attachment_blob_id,target_calendar_id,timezone,source_sha256,items,warnings,counts) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb) ON CONFLICT(vault_id,attachment_blob_id,target_calendar_id,timezone,source_sha256) DO UPDATE SET updated_at=calendar_import_previews.updated_at RETURNING *",[vaultId,input.attachmentId,input.targetCalendarId,input.timezone,blob.sha256,JSON.stringify(items),JSON.stringify(parsed.warnings),JSON.stringify(counts)]);const result={type:"calendar_import_preview" as const,proposalId:preview.rows[0].id,counts,warnings:parsed.warnings,invitationsSent:false as const,writesApplied:false as const};const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'calendar_import_preview','succeeded','proposal_ready_no_writes',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[job.rows[0].id,JSON.stringify({attachmentId:input.attachmentId,targetCalendarId:input.targetCalendarId}),JSON.stringify(result)]);return job.rows[0];});return reply.code(202).send(mapJobHandle(created));
});

app.get("/api/v1/preferences", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session) return reply.code(401).send({ error: "authentication_required" });
  await query("INSERT INTO owner_preferences(owner_id) VALUES ($1) ON CONFLICT (owner_id) DO NOTHING", [session.owner_id]);
  const result = await query("SELECT * FROM owner_preferences WHERE owner_id=$1", [session.owner_id]);
  return mapPreferences(result.rows[0]);
});

app.patch("/api/v1/preferences", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session) return reply.code(401).send({ error: "authentication_required" });
  const input = updatePreferencesSchema.parse(request.body);
  const result = await transaction(async (client) => {
    await client.query("INSERT INTO owner_preferences(owner_id) VALUES ($1) ON CONFLICT (owner_id) DO NOTHING", [session.owner_id]);
    const currentResult = await client.query("SELECT * FROM owner_preferences WHERE owner_id=$1 FOR UPDATE", [session.owner_id]);
    const current = currentResult.rows[0];
    if (current.revision !== input.expectedRevision) return null;
    const patch = input.patch;
    const updated = await client.query(
      `UPDATE owner_preferences SET locale=$2, timezone=$3, notification_channels=$4,
       protect_focus_time=$5, default_focus_minutes=$6, profile_inference_enabled=$7,
       expanded_data_egress_enabled=$8, default_personal_data_sync=$9,
       sensitive_school_categories=$10, revision=revision+1, updated_at=now()
       WHERE owner_id=$1 RETURNING *`,
      [session.owner_id, patch.locale ?? current.locale, patch.timezone ?? current.timezone,
       patch.notificationChannels ?? current.notification_channels, patch.protectFocusTime ?? current.protect_focus_time,
       patch.defaultFocusMinutes ?? current.default_focus_minutes, patch.profileInferenceEnabled ?? current.profile_inference_enabled,
       patch.expandedDataEgressEnabled ?? current.expanded_data_egress_enabled,
       patch.defaultPersonalDataSync ?? current.default_personal_data_sync,
       patch.sensitiveSchoolCategories ?? current.sensitive_school_categories]
    );
    return updated.rows[0];
  });
  if (!result) return reply.code(409).send({ error: "revision_conflict" });
  return mapPreferences(result);
});

app.get("/api/v1/status", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session) return reply.code(401).send({ error: "authentication_required" });
  const [storage, sync, devices, workers, backupState] = await Promise.all([
    query<{ database_bytes: string; vault_count: string }>(
      "SELECT pg_database_size(current_database())::text AS database_bytes,(SELECT count(*)::text FROM vaults WHERE owner_id=$1) AS vault_count",
      [session.owner_id]
    ),
    query<{ latest_event_id: string; retention_floor_event_id: string }>(
      `SELECT COALESCE((SELECT max(e.id) FROM vault_change_events e JOIN vaults v ON v.id=e.vault_id WHERE v.owner_id=$1),0)::text AS latest_event_id,
       COALESCE((SELECT min(f.minimum_event_id) FROM sync_retention_floors f JOIN vaults v ON v.id=f.vault_id WHERE v.owner_id=$1),0)::text AS retention_floor_event_id`,
      [session.owner_id]
    ),
    query<{ active_devices: string }>("SELECT count(*)::text AS active_devices FROM devices WHERE owner_id=$1 AND revoked_at IS NULL", [session.owner_id]),
    query<{ enrolled: string; online: string; last_seen_at: Date | null }>(
      `SELECT count(*) FILTER (WHERE revoked_at IS NULL)::text AS enrolled,
       count(*) FILTER (WHERE revoked_at IS NULL AND last_seen_at>now()-interval '2 minutes')::text AS online,
       max(last_seen_at) FILTER (WHERE revoked_at IS NULL) AS last_seen_at FROM workers WHERE owner_id=$1`,
      [session.owner_id]
    ),
    query<{destination_count:number;last_verified_at:Date|null;failed_count:number}>("SELECT (SELECT count(*)::int FROM backup_destinations WHERE active=true) AS destination_count,(SELECT max(verified_at) FROM backups WHERE owner_id=$1 AND state='ready') AS last_verified_at,(SELECT count(*)::int FROM system_jobs WHERE owner_id=$1 AND kind IN ('backup_create','backup_verify') AND status='failed' AND created_at>now()-interval '7 days') AS failed_count",[session.owner_id])
  ]);
  const storageRow = storage.rows[0];
  const syncRow = sync.rows[0];
  const workerRow = workers.rows[0];
  const backupRow=backupState.rows[0],backupStatus=backupRow.last_verified_at?"verified":backupRow.failed_count>0?"failed":backupRow.destination_count>0?"configured_unverified":"not_configured";
  return systemStatusSchema.parse({
    storage: { database: "available", databaseBytes: Number(storageRow.database_bytes), vaultCount: Number(storageRow.vault_count) },
    sync: { activeDevices: Number(devices.rows[0].active_devices), latestEventId: syncRow.latest_event_id, retentionFloorEventId: syncRow.retention_floor_event_id },
    workers: { enrolled: Number(workerRow.enrolled), online: Number(workerRow.online), lastSeenAt: workerRow.last_seen_at ? iso(workerRow.last_seen_at) : null },
    backup: { status: backupStatus, lastVerifiedAt: backupRow.last_verified_at?iso(backupRow.last_verified_at):null, limitation: backupStatus==="verified"?"A backup has passed complete encrypted-bundle verification; clean-host restore evidence is still tracked separately.":backupStatus==="failed"?"A backup job failed in the last seven days; inspect its safe job error before retrying.":backupStatus==="configured_unverified"?"A destination is configured, but no backup has passed verification yet.":"No active backup destination is configured." },
    versions: { api: "1.0.0", schema: 93, clientMinimum: "0.1.0" },
    checkedAt: new Date().toISOString()
  });
});

app.get("/api/v1/system-jobs",async(request,reply)=>{
  const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});
  const raw=request.query as {status?:string;cursor?:string;limit?:string},limit=raw.limit===undefined?50:Number(raw.limit),statuses=["queued","running","succeeded","failed","cancelled","superseded"];
  if(!Number.isInteger(limit)||limit<1||limit>100||raw.status&&!statuses.includes(raw.status))return reply.code(400).send({error:"invalid_system_job_query"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_system_job_cursor"});}}
  const result=await query("SELECT * FROM system_jobs WHERE owner_id=$1 AND ($2::text IS NULL OR status=$2) AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $5",[session.owner_id,raw.status??null,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),last=rows.at(-1);
  return systemJobListSchema.parse({items:rows.map(mapSystemJobSummary),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null});
});

app.get("/api/v1/system-jobs/:jobId",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {jobId}=request.params as {jobId:string};idSchema.parse(jobId);const result=await query("SELECT * FROM system_jobs WHERE owner_id=$1 AND id=$2",[session.owner_id,jobId]);if(!result.rows[0])return reply.code(404).send({error:"system_job_not_found"});return mapSystemJob(result.rows[0]);});

app.post("/api/v1/system-jobs/:jobId/cancel",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {jobId}=request.params as {jobId:string};idSchema.parse(jobId);const result=await transaction(async client=>{const locked=await client.query("SELECT * FROM system_jobs WHERE owner_id=$1 AND id=$2 FOR UPDATE",[session.owner_id,jobId]),job=locked.rows[0];if(!job)return"missing" as const;const decision=systemJobCancellationDecision({kind:job.kind,status:job.status,stage:job.stage,retryable:job.retryable,attempts:job.attempts,maxAttempts:job.max_attempts});if(decision==="terminal"||decision==="restore_commit_boundary")return decision;const immediate=decision==="cancel_now";const updated=await client.query("UPDATE system_jobs SET status=CASE WHEN $3 THEN 'cancelled' ELSE status END,stage=CASE WHEN $3 THEN 'cancelled' ELSE 'cancellation_requested' END,cancel_requested=true,finished_at=CASE WHEN $3 THEN now() ELSE finished_at END,updated_at=now() WHERE owner_id=$1 AND id=$2 RETURNING *",[session.owner_id,jobId,immediate]);const next=await client.query<{sequence:number}>("SELECT coalesce(max(sequence),0)::int+1 AS sequence FROM system_job_events WHERE job_id=$1",[jobId]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,$2,$3,$4::jsonb)",[jobId,next.rows[0].sequence,immediate?"cancelled":"status",JSON.stringify({status:immediate?"cancelled":job.status,cancelRequested:true})]);return updated.rows[0];});if(result==="missing")return reply.code(404).send({error:"system_job_not_found"});if(result==="terminal"||result==="restore_commit_boundary")return reply.code(409).send({error:result});return mapSystemJob(result);});

app.post("/api/v1/system-jobs/:jobId/retry",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {jobId}=request.params as {jobId:string};idSchema.parse(jobId);const result=await transaction(async client=>{const locked=await client.query("SELECT * FROM system_jobs WHERE owner_id=$1 AND id=$2 FOR UPDATE",[session.owner_id,jobId]),job=locked.rows[0];if(!job)return"missing" as const;const existing=await client.query("SELECT * FROM system_jobs WHERE retry_of_job_id=$1",[jobId]);if(existing.rows[0])return existing.rows[0];if(systemJobRetryDecision({kind:job.kind,status:job.status,stage:job.stage,retryable:job.retryable,attempts:job.attempts,maxAttempts:job.max_attempts})!=="retry")return"not_retryable" as const;const created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,input,input_hash,max_attempts,retry_of_job_id) VALUES ($1,$2,'queued','queued_retry',$3::jsonb,$4,$5,$6) RETURNING *",[session.owner_id,job.kind,JSON.stringify(job.input),job.input_hash,job.max_attempts,jobId]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[created.rows[0].id,JSON.stringify({retryOfJobId:jobId})]);return created.rows[0];});if(result==="missing")return reply.code(404).send({error:"system_job_not_found"});if(result==="not_retryable")return reply.code(409).send({error:"system_job_not_retryable"});return reply.code(202).send(mapSystemJobHandle(result));});

app.get("/api/v1/system-jobs/:jobId/events",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {jobId}=request.params as {jobId:string};idSchema.parse(jobId);const exists=await query("SELECT status FROM system_jobs WHERE owner_id=$1 AND id=$2",[session.owner_id,jobId]);if(!exists.rows[0])return reply.code(404).send({error:"system_job_not_found"});const header=request.headers["last-event-id"];let sequence=typeof header==="string"&&/^\d+$/.test(header)?Number(header):0,closed=false;request.raw.on("close",()=>{closed=true;});reply.hijack();reply.raw.writeHead(200,{"content-type":"text/event-stream; charset=utf-8","cache-control":"no-store",connection:"keep-alive","x-accel-buffering":"no"});const deadline=Date.now()+25_000;while(!closed&&Date.now()<deadline){const events=await query("SELECT sequence,kind,data,created_at FROM system_job_events WHERE job_id=$1 AND sequence>$2 ORDER BY sequence LIMIT 100",[jobId,sequence]);for(const row of events.rows){const event=jobEventSchema.parse({jobId,sequence:row.sequence,kind:row.kind,data:row.data,createdAt:iso(row.created_at)});reply.raw.write(`id: ${event.sequence}\nevent: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`);sequence=event.sequence;}const state=await query<{status:string}>("SELECT status FROM system_jobs WHERE owner_id=$1 AND id=$2",[session.owner_id,jobId]);if(!state.rows[0]){reply.raw.write("event: access_revoked\ndata: {\"error\":\"access_revoked\"}\n\n");break;}if(["succeeded","failed","cancelled","superseded"].includes(state.rows[0].status))break;if(!events.rowCount)reply.raw.write(": keep-alive\n\n");await new Promise(resolve=>setTimeout(resolve,750));}if(!closed)reply.raw.end();});

app.get("/api/v1/host/resources",async()=>collectHostResources());

app.get("/api/v1/deployment",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(403).send({error:"owner_session_required"});const [backups,workers,tests]=await Promise.all([query("SELECT count(*)::int AS count FROM backup_destinations WHERE active=true"),query("SELECT count(*)::int AS count FROM workers WHERE owner_id=$1 AND revoked_at IS NULL",[session.owner_id]),query("SELECT count(*)::int AS count FROM jobs j JOIN vaults v ON v.id=j.vault_id WHERE v.owner_id=$1 AND j.kind='ai_setup_test' AND j.status='succeeded'",[session.owner_id])]);const origin=new URL(config.APP_ORIGIN),loopback=['127.0.0.1','localhost','[::1]'].includes(origin.hostname),blobAvailable=existsSync(blobStorageRoot);return deploymentProfileSchema.parse({profileId:"home-host",canonicalOrigin:origin.toString().replace(/\/$/,""),apiBind:{host:config.API_HOST,port:config.API_PORT},accessMode:loopback?"local_only":"unknown",remoteAccessConfigured:false,database:"available",blobStorage:{configuredPath:blobStorageRoot,available:blobAvailable},backupDestinationCount:Number(backups.rows[0].count),workerCount:Number(workers.rows[0].count),localAi:{backend:config.LOCAL_CHAT_BACKEND,model:config.LOCAL_CHAT_BACKEND==="openai_compatible"?config.OPENAI_COMPATIBLE_CHAT_MODEL:config.OLLAMA_CHAT_MODEL,endpointOrigin:new URL(localAiBaseUrl).origin,liveVerified:Number(tests.rows[0].count)>0},diagnostics:[...(loopback?["Canonical origin is loopback-only."]:['Remote access mode is not verified from configuration.']),...(blobAvailable?[]:["Configured blob-storage path is unavailable."]),...(Number(backups.rows[0].count)?[]:["No active backup destination is configured."]),...(Number(tests.rows[0].count)?[]:["No successful local-model setup test is recorded."])],checkedAt:new Date().toISOString()});});

app.post("/api/v1/deployment/checks",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=checkDeploymentSchema.parse(request.body),checks:Array<{kind:"database"|"blob_storage"|"canonical_origin"|"local_ai_endpoint"|"backup_destination";status:"pass"|"fail"|"unknown";detail:string}>=[];for(const kind of input.checkKinds){if(kind==="database"){try{await query("SELECT 1");checks.push({kind,status:"pass",detail:"Database accepted a registered health query."});}catch{checks.push({kind,status:"fail",detail:"Database health query failed."});}}else if(kind==="blob_storage")checks.push({kind,status:existsSync(blobStorageRoot)?"pass":"fail",detail:existsSync(blobStorageRoot)?"Configured blob-storage directory exists.":"Configured blob-storage directory does not exist."});else if(kind==="canonical_origin"){const origin=new URL(config.APP_ORIGIN);checks.push({kind,status:"pass",detail:`Configured canonical origin uses ${origin.protocol} on registered host ${origin.hostname}.`});}else if(kind==="backup_destination"){const count=await query("SELECT count(*)::int AS count FROM backup_destinations WHERE active=true");checks.push({kind,status:Number(count.rows[0].count)>0?"pass":"fail",detail:Number(count.rows[0].count)>0?`${count.rows[0].count} active configured backup destination(s).`:"No active backup destination is configured."});}else{const base=new URL(localAiBaseUrl),loopback=base.protocol==="http:"&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)&&!base.username&&!base.password;if(!loopback)checks.push({kind,status:"fail",detail:"Configured AI probe origin is not an approved loopback HTTP origin."});else{const probe=new URL(config.LOCAL_CHAT_BACKEND==="ollama"?"/api/tags":"/v1/models",base);try{const response=await fetch(probe,{signal:AbortSignal.timeout(3000),headers:{accept:"application/json"}});checks.push({kind,status:response.ok?"pass":"fail",detail:response.ok?`Registered loopback AI endpoint responded with HTTP ${response.status}.`:`Registered AI endpoint responded with HTTP ${response.status}.`});}catch{checks.push({kind,status:"fail",detail:"Registered local AI endpoint did not respond within the bounded probe."});}}}}const result={type:"deployment_checked" as const,profileId:"home-host" as const,checks,writesApplied:false as const},payload={type:"deployment_check",...input},serialized=JSON.stringify(payload),job=await transaction(async client=>{const created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'deployment_check','succeeded','checks_complete',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[session.owner_id,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({checkKinds:input.checkKinds}),JSON.stringify(result)]);return created.rows[0];});return reply.code(202).send(mapSystemJobHandle(job));});

app.get("/api/v1/resource-policy",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});const row=(await query("SELECT * FROM host_resource_policies WHERE owner_id=$1",[session.owner_id])).rows[0];return mapHostResourcePolicy(row);});

app.put("/api/v1/resource-policy",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=setHostResourcePolicySchema.parse(request.body);if(input.quietHours&&!isSupportedTimezone(input.quietHours.timezone))return reply.code(400).send({error:"unsupported_timezone"});const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM host_resource_policies WHERE owner_id=$1 FOR UPDATE",[session.owner_id]);if((current.rows[0]?.revision??0)!==expectedRevision)return null;const values=[session.owner_id,input.maxInferenceConcurrency,JSON.stringify(input.backgroundBudget),input.quietHours?JSON.stringify(input.quietHours):null,input.pauseBackground,input.modelProfileIds,input.interactivePriority,input.modelResidency];if(!current.rows[0])return(await client.query("INSERT INTO host_resource_policies(owner_id,max_inference_concurrency,background_budget,quiet_hours,pause_background,model_profile_ids,interactive_priority,model_residency) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6::text[],$7,$8) RETURNING *",values)).rows[0];return(await client.query("UPDATE host_resource_policies SET max_inference_concurrency=$2,background_budget=$3::jsonb,quiet_hours=$4::jsonb,pause_background=$5,model_profile_ids=$6::text[],interactive_priority=$7,model_residency=$8,revision=revision+1,updated_at=now() WHERE owner_id=$1 RETURNING *",values)).rows[0];});if(!updated)return reply.code(409).send({error:"stale_resource_policy"});return mapHostResourcePolicy(updated);});

app.post("/api/v1/deployment/access-preview",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=previewRemoteAccessSetupSchema.parse(request.body),providerBinary=input.mode==="tailscale_private"?"tailscale":"cloudflared",binaryAvailable=await executableAvailable(providerBinary),apiLoopback=["127.0.0.1","localhost","::1"].includes(config.API_HOST),origin=new URL(input.canonicalOriginCandidate);const prerequisites=[{kind:"https_origin" as const,status:origin.protocol==="https:"?"pass" as const:"fail" as const,detail:"Candidate canonical origin is an HTTPS origin without embedded credentials."},{kind:"loopback_service" as const,status:apiLoopback?"pass" as const:"fail" as const,detail:apiLoopback?"The application API is configured on a loopback interface.":"The application API is not configured on a loopback interface; review exposure before adding a proxy."},{kind:"provider_binary" as const,status:binaryAvailable?"pass" as const:"fail" as const,detail:binaryAvailable?`${providerBinary} is discoverable on this host.`:`${providerBinary} is not discoverable on this host.`},{kind:"owner_configuration" as const,status:"unknown" as const,detail:`Owner configuration reference '${input.ownerConfigReference}' was recorded but not dereferenced, so secrets cannot enter the job result.`}],reviewedActions=input.mode==="tailscale_private"?[{sequence:1,action:"Install or update Tailscale and sign in to the intended private tailnet.",ownerConfirmationRequired:true},{sequence:2,action:`Configure Tailscale Serve HTTPS for the loopback application service on port ${config.API_PORT}; keep Funnel disabled.`,ownerConfirmationRequired:true},{sequence:3,action:`Set the canonical application origin to ${origin.origin}, restart the application, and re-run deployment checks.`,ownerConfirmationRequired:true},{sequence:4,action:"From an enrolled second device, verify owner authentication, streaming, upload recovery, cache policy, and host-off behavior.",ownerConfirmationRequired:true}]:[{sequence:1,action:"Create and verify a Cloudflare Access application and owner-only identity policy before publishing a route.",ownerConfirmationRequired:true},{sequence:2,action:"Install or update cloudflared and create a named tunnel whose credential remains outside application logs and job results.",ownerConfirmationRequired:true},{sequence:3,action:`Route the Access-protected hostname to the loopback application service on port ${config.API_PORT}; do not expose database, model, or debug ports.`,ownerConfirmationRequired:true},{sequence:4,action:`Set the canonical application origin to ${origin.origin}, restart the application, and verify Access plus application authentication from the second device.`,ownerConfirmationRequired:true}];const risks=input.mode==="tailscale_private"?["Access depends on the host being powered on and connected to the private tailnet.","Persistent client caches are separate copies and require an explicit device cache policy."]:["Cloudflare receives connection metadata and terminates the public edge connection; document this transport boundary.","Publishing the route before Access protection would expose the application origin.","Access depends on the host and tunnel process remaining online."];const result={type:"access_setup_planned" as const,mode:input.mode,canonicalOriginCandidate:origin.origin,prerequisites,reviewedActions,risks,publicationApplied:false as const,secretsIncluded:false as const,writesApplied:false as const},payload={type:"access_setup_preview",...input},serialized=JSON.stringify(payload),job=await transaction(async client=>{const created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'access_setup_preview','succeeded','preview_complete',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[session.owner_id,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({mode:input.mode,canonicalOriginCandidate:origin.origin}),JSON.stringify(result)]);return created.rows[0];});return reply.code(202).send(mapSystemJobHandle(job));});

app.get("/api/v1/backups",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const raw=request.query as {cursor?:string;limit?:string};const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_backup_limit"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_backup_cursor"});}}const result=await query("SELECT * FROM backups WHERE owner_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4",[session.owner_id,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),last=rows.at(-1);return{items:rows.map(mapBackupSummary),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});

app.post("/api/v1/backups",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=createBackupSchema.parse(request.body),destination=(await query("SELECT id,encryption_profile_id FROM backup_destinations WHERE id=$1 AND active=true",[input.destinationId])).rows[0];if(!destination)return reply.code(409).send({error:"backup_destination_not_configured"});if(destination.encryption_profile_id!==input.encryptionProfileId)return reply.code(409).send({error:"backup_encryption_profile_mismatch"});if(destination.encryption_profile_id!=="aes-256-gcm-host-v1")return reply.code(409).send({error:"backup_encryption_profile_not_executable"});const created=await transaction(async client=>{const backupId=randomUUID(),payload={type:"backup_create",backupId,destinationId:input.destinationId,encryptionProfileId:input.encryptionProfileId},serialized=JSON.stringify(payload),job=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,input,input_hash) VALUES ($1,'backup_create','queued','queued',$2::jsonb,$3) RETURNING *",[session.owner_id,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("INSERT INTO backups(id,owner_id,destination_id,encryption_profile_id,system_job_id) VALUES ($1,$2,$3,$4,$5)",[backupId,session.owner_id,input.destinationId,input.encryptionProfileId,job.rows[0].id]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({backupId,destinationId:input.destinationId})]);return job.rows[0];});return reply.code(202).send(mapSystemJobHandle(created));});

app.get("/api/v1/backups/:backupId",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {backupId}=request.params as {backupId:string};idSchema.parse(backupId);const row=(await query("SELECT * FROM backups WHERE owner_id=$1 AND id=$2",[session.owner_id,backupId])).rows[0];if(!row)return reply.code(404).send({error:"backup_not_found"});const manifest=row.manifest as Record<string,unknown>|null;return backupManifestSchema.parse({backup:mapBackupSummary(row),format:manifest?.format==="sorta-omega-backup-v2"?manifest.format:null,manifest,complete:Boolean(manifest&&row.manifest_sha256&&row.bundle_sha256&&row.byte_length!==null),restorePrerequisites:["Matching Sorta Omega schema/runtime","Configured encryption-key access","Maintenance mode for replacement restore","Separate passkey and provider credential recovery"],encrypted:true,downloadReady:row.state==="ready"&&Boolean(row.verified_at&&row.bundle_path)});});

app.get("/api/v1/backups/:backupId/download",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {backupId}=request.params as {backupId:string};idSchema.parse(backupId);const row=(await query("SELECT b.*,d.storage_root FROM backups b JOIN backup_destinations d ON d.id=b.destination_id WHERE b.owner_id=$1 AND b.id=$2",[session.owner_id,backupId])).rows[0];if(!row)return reply.code(404).send({error:"backup_not_found"});if(row.state!=="ready"||!row.verified_at||!row.bundle_path||!row.bundle_sha256)return reply.code(409).send({error:"backup_not_verified_or_downloadable"});if(path.isAbsolute(row.bundle_path))return reply.code(500).send({error:"unsafe_backup_registry_path"});const root=path.resolve(row.storage_root),file=path.resolve(root,row.bundle_path),relative=path.relative(root,file);if(relative.startsWith("..")||path.isAbsolute(relative)||!existsSync(file))return reply.code(409).send({error:"backup_bundle_unavailable"});if(await hashFile(file)!==row.bundle_sha256)return reply.code(409).send({error:"backup_bundle_integrity_failure"});await query("INSERT INTO backup_download_audit(backup_id,owner_id,bundle_sha256) VALUES ($1,$2,$3)",[backupId,session.owner_id,row.bundle_sha256]);reply.header("content-type","application/octet-stream").header("content-disposition",`attachment; filename="omega-backup-${backupId}.enc"`).header("cache-control","no-store").header("x-content-type-options","nosniff");return reply.send(createReadStream(file));});

app.post("/api/v1/backups/:backupId/verify",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {backupId}=request.params as {backupId:string};idSchema.parse(backupId);const backup=(await query("SELECT id,state,bundle_path FROM backups WHERE owner_id=$1 AND id=$2",[session.owner_id,backupId])).rows[0];if(!backup)return reply.code(404).send({error:"backup_not_found"});if(!backup.bundle_path||!['ready','verification_failed'].includes(backup.state))return reply.code(409).send({error:"backup_not_ready_for_verification"});const payload={type:"backup_verify",backupId},serialized=JSON.stringify(payload),job=await transaction(async client=>{const created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,input,input_hash) VALUES ($1,'backup_verify','queued','queued',$2::jsonb,$3) RETURNING *",[session.owner_id,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[created.rows[0].id,JSON.stringify({backupId})]);return created.rows[0];});return reply.code(202).send(mapSystemJobHandle(job));});

app.post("/api/v1/restore-plans",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=createRestorePlanSchema.parse(request.body),backup=(await query("SELECT id FROM backups WHERE owner_id=$1 AND id=$2 AND state='ready' AND verified_at IS NOT NULL",[session.owner_id,input.backupId])).rows[0];if(!backup)return reply.code(409).send({error:"verified_backup_required"});const job=await transaction(async client=>{const restorePlanId=randomUUID(),payload={type:"restore_plan",restorePlanId,backupId:input.backupId,targetMode:input.targetMode},serialized=JSON.stringify(payload),created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,input,input_hash) VALUES ($1,'restore_plan','queued','queued',$2::jsonb,$3) RETURNING *",[session.owner_id,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("INSERT INTO restore_plans(id,owner_id,backup_id,target_mode,planning_job_id) VALUES ($1,$2,$3,$4,$5)",[restorePlanId,session.owner_id,input.backupId,input.targetMode,created.rows[0].id]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[created.rows[0].id,JSON.stringify({restorePlanId,backupId:input.backupId,targetMode:input.targetMode})]);return created.rows[0];});return reply.code(202).send(mapSystemJobHandle(job));});

app.post("/api/v1/restore-plans/:restorePlanId/apply",async(request,reply)=>{const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const {restorePlanId}=request.params as {restorePlanId:string};idSchema.parse(restorePlanId);const input=applyRestoreSchema.parse(request.body);const outcome=await transaction(async client=>{const plan=(await client.query("SELECT * FROM restore_plans WHERE owner_id=$1 AND id=$2 FOR UPDATE",[session.owner_id,restorePlanId])).rows[0];if(!plan)return"not_found" as const;if(plan.state!=="ready"||plan.plan_revision!==input.planRevision||plan.compatibility?.compatible!==true)return"restore_plan_not_ready_compatible_or_current" as const;if(plan.applied_job_id){const prior=(await client.query("SELECT * FROM system_jobs WHERE owner_id=$1 AND id=$2",[session.owner_id,plan.applied_job_id])).rows[0];return prior;}const payload={type:"restore_apply",restorePlanId,backupId:plan.backup_id,targetMode:plan.target_mode,planRevision:plan.plan_revision},serialized=JSON.stringify(payload),created=await client.query("INSERT INTO system_jobs(owner_id,kind,status,stage,input,input_hash,max_attempts) VALUES ($1,'restore_apply','queued','queued',$2::jsonb,$3,1) RETURNING *",[session.owner_id,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("UPDATE restore_plans SET state='applying',applied_job_id=$3,updated_at=now() WHERE owner_id=$1 AND id=$2",[session.owner_id,restorePlanId,created.rows[0].id]);await client.query("INSERT INTO system_job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[created.rows[0].id,JSON.stringify({restorePlanId,targetMode:plan.target_mode,maintenanceModeRequired:true})]);return created.rows[0];});if(outcome==="not_found")return reply.code(404).send({error:"restore_plan_not_found"});if(typeof outcome==="string")return reply.code(409).send({error:outcome});return reply.code(202).send(mapSystemJobHandle(outcome));});

app.get("/api/v1/vaults/:vaultId/notes", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const rawCursor = (request.query as { cursor?: unknown }).cursor;
  if (rawCursor !== undefined && typeof rawCursor !== "string") return reply.code(400).send({ error: "invalid_cursor" });
  let cursor: ReturnType<typeof decodeNotesCursor> | null = null;
  if (rawCursor) {
    try { cursor = decodeNotesCursor(rawCursor); }
    catch { return reply.code(400).send({ error: "invalid_cursor" }); }
  }
  const result = await query(`SELECT notes.*, originals.original_sha256,
      to_char(notes.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_updated_at
    FROM notes
    LEFT JOIN LATERAL (
      SELECT CASE WHEN count(*) = 1 AND bool_and(b.media_type IN (
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf'
      ))
        THEN min(b.sha256) ELSE NULL END AS original_sha256
      FROM source_blobs sb JOIN blobs b ON b.id = sb.blob_id AND b.vault_id = notes.vault_id
      WHERE sb.source_id = notes.source_id
    ) originals ON notes.source_id IS NOT NULL
    WHERE notes.vault_id = $1 AND notes.trashed_at IS NULL
    AND ($2::timestamptz IS NULL OR (notes.updated_at,notes.id) < ($2::timestamptz,$3::uuid))
    ORDER BY notes.updated_at DESC,notes.id DESC LIMIT 101`, [vaultId, cursor?.updatedAt ?? null, cursor?.id ?? null]);
  const rows = result.rows.slice(0, 100);
  const last = rows.at(-1);
  return { items: rows.map(mapNote), nextCursor: result.rows.length > 100 && last ? encodeNotesCursor({ updatedAt: last.cursor_updated_at, id: last.id }) : null };
});

app.post("/api/v1/vaults/:vaultId/notes",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);
  const input=createNoteSchema.parse(request.body);
  const noteId=input.id??randomUUID();
  const changed=input.content.kind==="text"
    ? {text:input.content.text,state:createDocumentState(input.content.text)}
    : replaceEditorDocument(null,input.content.document);
  const title=input.title??changed.text.split(/\r?\n/).map(line=>line.trim()).find(Boolean)?.slice(0,240)??"Untitled note";
  try{
    const created=await transaction(async client=>{
      const note=await client.query(
        "INSERT INTO notes(id,vault_id,title,body,status,revision,yjs_state) VALUES ($1,$2,$3,$4,'saved',1,$5) RETURNING *",
        [noteId,vaultId,title,changed.text,changed.state]
      );
      await client.query(
        "INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,1,$2,$3,$4,'owner')",
        [noteId,title,changed.text,changed.state]
      );
      return note.rows[0];
    });
    return reply.code(201).send(mapNote(created));
  }catch(error:any){
    if(error?.code==="23505")return reply.code(409).send({error:"note_id_already_exists"});
    throw error;
  }
});

app.get("/api/v1/vaults/:vaultId/notes/:noteId", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const result = await query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL", [vaultId, noteId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "note_not_found" });
  return mapNote(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId/notes/:noteId", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const input = updateNoteMetadataSchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, noteId]);
    const note = current.rows[0];
    if (!note) return null;
    if (note.revision !== input.expectedRevision) return "conflict" as const;
    const nextRevision = note.revision + 1;
    const result = await client.query(
      "UPDATE notes SET title = $3, revision = $4, updated_at = now() WHERE vault_id = $1 AND id = $2 RETURNING *",
      [vaultId, noteId, input.title ?? note.title, nextRevision]
    );
    await client.query(
      "INSERT INTO note_revisions(note_id, revision, title, body, yjs_state, actor_kind) VALUES ($1, $2, $3, $4, $5, 'owner')",
      [noteId, nextRevision, input.title ?? note.title, note.body, note.yjs_state]
    );
    return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "note_not_found" });
  if (updated === "conflict") return reply.code(409).send({ error: "stale_revision" });
  return mapNote(updated);
});

app.delete("/api/v1/vaults/:vaultId/notes/:noteId",async(request,reply)=>{
  const {vaultId,noteId}=request.params as {vaultId:string;noteId:string};idSchema.parse(vaultId);idSchema.parse(noteId);
  const input=expectedNoteRevisionSchema.parse(request.body);
  const outcome=await transaction(async client=>{
    const current=await client.query("SELECT * FROM notes WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,noteId]);
    const note=current.rows[0];if(!note)return "missing" as const;if(note.trashed_at)return "already_trashed" as const;
    if(note.revision!==input.expectedRevision)return "stale_revision" as const;
    const nextRevision=note.revision+1;
    await client.query("UPDATE notes SET trashed_at=now(),revision=$3,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,noteId,nextRevision]);
    await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,$2,$3,$4,$5,'owner')",[noteId,nextRevision,note.title,note.body,note.yjs_state]);
    return "trashed" as const;
  });
  if(outcome==="missing")return reply.code(404).send({error:"note_not_found"});
  if(outcome!=="trashed")return reply.code(409).send({error:outcome});
  return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/purge",async(request,reply)=>{const {vaultId,noteId}=request.params as {vaultId:string;noteId:string};idSchema.parse(vaultId);idSchema.parse(noteId);const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=purgeRequestSchema.parse(request.body),targetIdHash=createHash("sha256").update(noteId).digest("hex");const outcome=await transaction(async client=>{const note=(await client.query<Record<string,any>>("SELECT * FROM notes WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,noteId])).rows[0];if(!note)return"note_not_found" as const;if(note.revision!==input.expectedRevision)return"stale_note_revision" as const;if(!note.trashed_at)return"note_must_be_trashed_before_purge" as const;const chunks=await client.query<{id:string}>("SELECT id FROM semantic_chunks WHERE vault_id=$1 AND note_id=$2",[vaultId,noteId]),chunkIds=chunks.rows.map(row=>row.id);let deletedDerivedRecords=0;const evidence=await client.query("DELETE FROM job_evidence WHERE note_id=$1",[noteId]);deletedDerivedRecords+=evidence.rowCount??0;if(chunkIds.length){const inferred=await client.query("DELETE FROM memories WHERE vault_id=$1 AND origin='inferred' AND source_anchor_ids&&$2::uuid[]",[vaultId,chunkIds]);deletedDerivedRecords+=inferred.rowCount??0;await client.query("UPDATE memories SET source_anchor_ids=ARRAY(SELECT unnest(source_anchor_ids) EXCEPT SELECT unnest($2::uuid[])),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND origin='explicit' AND source_anchor_ids&&$2::uuid[]",[vaultId,chunkIds]);await client.query("UPDATE projects SET source_anchor_ids=ARRAY(SELECT unnest(source_anchor_ids) EXCEPT SELECT unnest($2::uuid[])),note_ids=array_remove(note_ids,$3::uuid),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND (source_anchor_ids&&$2::uuid[] OR $3::uuid=ANY(note_ids))",[vaultId,chunkIds,noteId]);await client.query("UPDATE goals SET source_anchor_ids=ARRAY(SELECT unnest(source_anchor_ids) EXCEPT SELECT unnest($2::uuid[])),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND source_anchor_ids&&$2::uuid[]",[vaultId,chunkIds]);}const prep=await client.query("UPDATE prep_items SET invalidated_at=now(),revision=revision+1,updated_at=now() WHERE evidence_note_id=$1 AND invalidated_at IS NULL",[noteId]);deletedDerivedRecords+=prep.rowCount??0;const revoked=await client.query("UPDATE jobs SET status='cancelled',stage='cancelled_by_note_purge',cancel_requested=true,finished_at=now(),updated_at=now() WHERE vault_id=$1 AND status IN ('queued','waiting_for_worker','running') AND (input->>'noteId'=$2 OR input->'noteIds' ? $2)",[vaultId,noteId]),revokedJobs=revoked.rowCount??0;if(note.source_id){const dependent=(await client.query<{count:number}>("SELECT count(*)::int AS count FROM notes WHERE source_id=$1 AND id<>$2",[note.source_id,noteId])).rows[0];if(Number(dependent.count)===0){await client.query("UPDATE sources SET original_text=NULL WHERE id=$1",[note.source_id]);const plans=await client.query("UPDATE study_plans SET archived_at=COALESCE(archived_at,now()),updated_at=now() WHERE vault_id=$1 AND $2::uuid=ANY(material_source_ids) AND archived_at IS NULL",[vaultId,note.source_id]);deletedDerivedRecords+=plans.rowCount??0;}}await client.query("DELETE FROM notes WHERE vault_id=$1 AND id=$2",[vaultId,noteId]);const result=notePurgeResultSchema.parse({type:"note_purge",targetIdHash,deletedDerivedRecords,revokedJobs,sourceDeleted:false,blobFilesDeleted:0,blobFileDeleteFailures:0,minimalLedgerRetained:true,writesApplied:true}),payload=JSON.stringify({type:"note_purge",targetIdHash}),created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'note_purge','succeeded','purge_complete',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({targetIdHash}),JSON.stringify(result)]);await client.query("INSERT INTO deletion_ledger(owner_id,target_kind,target_id_hash,deleted_derived_records,revoked_jobs) VALUES ($1,'note',$2,$3,$4)",[session.owner_id,targetIdHash,deletedDerivedRecords,revokedJobs]);return created.rows[0];});if(typeof outcome==="string")return reply.code(outcome==="note_not_found"?404:409).send({error:outcome});return reply.code(202).send(mapJobHandle(outcome));});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/restore",async(request,reply)=>{
  const {vaultId,noteId}=request.params as {vaultId:string;noteId:string};idSchema.parse(vaultId);idSchema.parse(noteId);
  const input=expectedNoteRevisionSchema.parse(request.body);
  const outcome=await transaction(async client=>{
    const current=await client.query("SELECT * FROM notes WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,noteId]);
    const note=current.rows[0];if(!note)return null;if(!note.trashed_at)return "not_trashed" as const;
    if(note.revision!==input.expectedRevision)return "stale_revision" as const;
    const nextRevision=note.revision+1;
    const restored=await client.query("UPDATE notes SET trashed_at=NULL,revision=$3,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,noteId,nextRevision]);
    await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,$2,$3,$4,$5,'restore')",[noteId,nextRevision,note.title,note.body,note.yjs_state]);
    return restored.rows[0];
  });
  if(!outcome)return reply.code(404).send({error:"note_not_found"});
  if(typeof outcome==="string")return reply.code(409).send({error:outcome});
  return mapNote(outcome);
});

app.get("/api/v1/vaults/:vaultId/notes/:noteId/document", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  const { format = "text" } = request.query as { format?: "editor_json" | "markdown" | "text" | "yjs_update" };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  if (!["editor_json", "markdown", "text", "yjs_update"].includes(format)) return reply.code(400).send({ error: "unsupported_format" });
  const result = await query(
    `SELECT n.*, r.id AS revision_id FROM notes n
     JOIN note_revisions r ON r.note_id = n.id AND r.revision = n.revision
     WHERE n.vault_id = $1 AND n.id = $2 AND n.trashed_at IS NULL`,
    [vaultId, noteId]
  );
  const note = result.rows[0];
  if (!note) return reply.code(404).send({ error: "note_not_found" });
  const text = readDocumentText(note.yjs_state, note.body);
  const editorDocument = readEditorDocument(note.yjs_state, note.body);
  if (format === "yjs_update" && !note.yjs_state?.length) return reply.code(409).send({ error: "canonical_snapshot_missing" });
  return documentRepresentationSchema.parse({
    format,
    content: format === "yjs_update" ? Buffer.from(note.yjs_state ?? []).toString("base64") : format === "editor_json" ? editorDocument : format === "markdown" ? editorDocumentToMarkdown(editorDocument) : text,
    revisionId: note.revision_id,
    sourceMap: [{ start: 0, end: text.length, sourceId: note.source_id }]
  });
});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/edits", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const input = editNoteSchema.parse(request.body);
  const revision = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, noteId]);
    const note = current.rows[0];
    if (!note) return null;
    if (note.revision !== input.expectedRevision) return "conflict" as const;
    const changed = input.edit.kind === "replace_document"
      ? { state: replaceDocumentText(note.yjs_state, input.edit.text, note.body), text: input.edit.text }
      : input.edit.kind === "replace_editor_document"
        ? replaceEditorDocument(note.yjs_state, input.edit.document, note.body)
        : appendDocumentText(note.yjs_state, input.edit.markdown, note.body);
    const nextRevision = note.revision + 1;
    await client.query(
      "UPDATE notes SET body = $3, yjs_state = $4, revision = $5, status = 'saved', updated_at = now() WHERE vault_id = $1 AND id = $2",
      [vaultId, noteId, changed.text, changed.state, nextRevision]
    );
    const inserted = await client.query(
      "INSERT INTO note_revisions(note_id, revision, title, body, yjs_state, actor_kind) VALUES ($1, $2, $3, $4, $5, 'owner') RETURNING *",
      [noteId, nextRevision, note.title, changed.text, changed.state]
    );
    const jobId = randomUUID();
    const jobInput = { type: "note_processing", noteId, sourceId: note.source_id, revision: nextRevision, stages: ["classify"] };
    const serialized = JSON.stringify(jobInput);
    await client.query(
      `INSERT INTO jobs(id, vault_id, kind, status, stage, input, input_hash)
       VALUES ($1,$2,'note_process','waiting_for_worker','awaiting_local_worker',$3::jsonb,$4)`,
      [jobId, vaultId, serialized, createHash("sha256").update(serialized).digest("hex")]
    );
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1,1,'accepted',$2::jsonb)", [jobId, JSON.stringify({ status: "waiting_for_worker" })]);
    return inserted.rows[0];
  });
  if (!revision) return reply.code(404).send({ error: "note_not_found" });
  if (revision === "conflict") return reply.code(409).send({ error: "stale_revision" });
  return reply.code(201).send(mapRevision(revision));
});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/reprocess", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const input = reprocessNoteSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, noteId]);
    const note = current.rows[0];
    if (!note) return null;
    if (note.revision !== input.expectedRevision) return "stale_revision" as const;
    const jobInput = { type: "note_processing", noteId, sourceId: note.source_id, revision: note.revision, stages: [...new Set(input.stages)] };
    const serialized = JSON.stringify(jobInput);
    const inputHash = createHash("sha256").update(serialized).digest("hex");
    const duplicate = await client.query(
      `SELECT * FROM jobs WHERE vault_id = $1 AND kind = 'note_process' AND input_hash = $2
       AND status IN ('queued','waiting_for_worker','running') ORDER BY created_at DESC LIMIT 1`, [vaultId, inputHash]
    );
    if (duplicate.rows[0]) return duplicate.rows[0];
    const jobId = randomUUID();
    const inserted = await client.query(
      `INSERT INTO jobs(id, vault_id, kind, status, stage, input, input_hash)
       VALUES ($1,$2,'note_process','waiting_for_worker','awaiting_local_worker',$3::jsonb,$4) RETURNING *`,
      [jobId, vaultId, serialized, inputHash]
    );
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1,1,'accepted',$2::jsonb)", [jobId, JSON.stringify({ status: "waiting_for_worker", stages: jobInput.stages })]);
    return inserted.rows[0];
  });
  if (!result) return reply.code(404).send({ error: "note_not_found" });
  if (result === "stale_revision") return reply.code(409).send({ error: result });
  return reply.code(202).send(mapJobHandle(result));
});

app.get("/api/v1/vaults/:vaultId/notes/:noteId/revisions", async (request) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const result = await query(
    `SELECT r.* FROM note_revisions r JOIN notes n ON n.id = r.note_id
     WHERE n.vault_id = $1 AND n.id = $2 ORDER BY r.revision DESC LIMIT 100`,
    [vaultId, noteId]
  );
  return { items: result.rows.map(mapRevision) };
});

app.get("/api/v1/vaults/:vaultId/notes/:noteId/revisions/:revisionId",async(request,reply)=>{
  const {vaultId,noteId,revisionId}=request.params as {vaultId:string;noteId:string;revisionId:string};
  idSchema.parse(vaultId);idSchema.parse(noteId);idSchema.parse(revisionId);
  const result=await query("SELECT r.* FROM note_revisions r JOIN notes n ON n.id=r.note_id WHERE n.vault_id=$1 AND n.id=$2 AND r.id=$3",[vaultId,noteId,revisionId]);
  if(!result.rows[0])return reply.code(404).send({error:"note_revision_not_found"});
  return mapRevision(result.rows[0]);
});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/revisions/:revisionId/restore",async(request,reply)=>{
  const {vaultId,noteId,revisionId}=request.params as {vaultId:string;noteId:string;revisionId:string};
  idSchema.parse(vaultId);idSchema.parse(noteId);idSchema.parse(revisionId);
  const input=restoreNoteRevisionSchema.parse(request.body);
  const outcome=await transaction(async client=>{
    const current=await client.query("SELECT * FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL FOR UPDATE",[vaultId,noteId]);
    const note=current.rows[0];if(!note)return "note_not_found" as const;
    if(note.revision!==input.expectedCurrentRevision)return "stale_revision" as const;
    const historical=await client.query("SELECT * FROM note_revisions WHERE note_id=$1 AND id=$2",[noteId,revisionId]);
    const source=historical.rows[0];if(!source)return "note_revision_not_found" as const;
    const restored=restoreDocumentRevision(note.yjs_state,source.yjs_state,note.body,source.body);
    const nextRevision=note.revision+1;
    await client.query("UPDATE notes SET title=$3,body=$4,yjs_state=$5,revision=$6,status='saved',classified_revision=NULL,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,noteId,source.title,restored.text,restored.state,nextRevision]);
    const inserted=await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,$2,$3,$4,$5,'restore') RETURNING *",[noteId,nextRevision,source.title,restored.text,restored.state]);
    const jobId=randomUUID();const jobInput={type:"note_processing",noteId,sourceId:note.source_id,revision:nextRevision,stages:["classify"]};const serialized=JSON.stringify(jobInput);
    await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,input,input_hash) VALUES ($1,$2,'note_process','waiting_for_worker','awaiting_local_worker',$3::jsonb,$4)",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);
    await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[jobId,JSON.stringify({status:"waiting_for_worker",restoredFromRevisionId:revisionId})]);
    return inserted.rows[0];
  });
  if(outcome==="note_not_found"||outcome==="note_revision_not_found")return reply.code(404).send({error:outcome});
  if(outcome==="stale_revision")return reply.code(409).send({error:outcome});
  return reply.code(201).send(mapRevision(outcome));
});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/corrections", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const input = correctNoteClassificationSchema.parse(request.body);
  const receipt = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, noteId]);
    const note = current.rows[0];
    if (!note) return null;
    if (note.revision !== input.expectedRevision) return "stale_revision" as const;
    const correction = await client.query(
      `INSERT INTO note_corrections(note_id, source_note_revision, previous_classification, corrected_classification, reason, locked)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [noteId, note.revision, note.classification, input.classification, input.reason ?? null, input.lock]
    );
    const updated = await client.query(
      `UPDATE notes SET classification = $2, classification_locked = $3, classified_revision = revision,
       organization_revision = organization_revision + 1, updated_at = now() WHERE id = $1 RETURNING organization_revision`,
      [noteId, input.classification, input.lock]
    );
    return { ...correction.rows[0], organization_revision: updated.rows[0].organization_revision };
  });
  if (!receipt) return reply.code(404).send({ error: "note_not_found" });
  if (receipt === "stale_revision") return reply.code(409).send({ error: receipt });
  return reply.code(201).send(correctionReceiptSchema.parse({ id: receipt.id, noteId: receipt.note_id, sourceNoteRevision: receipt.source_note_revision, previousClassification: receipt.previous_classification, correctedClassification: receipt.corrected_classification, locked: receipt.locked, organizationRevision: receipt.organization_revision, createdAt: iso(receipt.created_at) }));
});

app.get("/api/v1/vaults/:vaultId/labels", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  const { kind } = request.query as { kind?: string };
  idSchema.parse(vaultId);
  const result = await query(
    `SELECT l.*, count(nl.note_id)::int AS supported_note_count FROM labels l LEFT JOIN note_labels nl ON nl.label_id = l.id
     WHERE l.vault_id = $1 AND l.archived_at IS NULL AND ($2::text IS NULL OR l.kind = $2) GROUP BY l.id ORDER BY l.pinned DESC, l.kind, lower(l.name) LIMIT 500`,
    [vaultId, kind ?? null]
  );
  return { items: result.rows.map(mapLabel) };
});

app.post("/api/v1/vaults/:vaultId/labels", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createLabelSchema.parse(request.body);
  if (input.parentId) {
    const parent = await query("SELECT 1 FROM labels WHERE vault_id = $1 AND id = $2 AND kind = $3", [vaultId, input.parentId, input.kind]);
    if (!parent.rowCount) return reply.code(400).send({ error: "label_parent_not_found" });
  }
  try {
    const result = await query(
      `INSERT INTO labels(vault_id, kind, name, aliases, parent_id) VALUES ($1,$2,$3,$4,$5) RETURNING *, 0::int AS supported_note_count`,
      [vaultId, input.kind, input.name, [...new Set(input.aliases)], input.parentId ?? null]
    );
    return reply.code(201).send(mapLabel(result.rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") return reply.code(409).send({ error: "label_already_exists" });
    throw error;
  }
});

app.patch("/api/v1/vaults/:vaultId/labels/:labelId", async (request, reply) => {
  const { vaultId, labelId } = request.params as { vaultId: string; labelId: string };
  idSchema.parse(vaultId); idSchema.parse(labelId);
  const input = updateLabelSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM labels WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, labelId]);
    const label = current.rows[0];
    if (!label) return null;
    if (label.revision !== input.expectedRevision) return "stale_revision" as const;
    if (input.parentId === labelId) return "label_parent_cycle" as const;
    if (input.parentId) {
      const parent = await client.query(
        `WITH RECURSIVE ancestors AS (SELECT id, parent_id, kind FROM labels WHERE vault_id = $1 AND id = $2
          UNION ALL SELECT l.id, l.parent_id, l.kind FROM labels l JOIN ancestors a ON l.id = a.parent_id)
         SELECT id, kind FROM ancestors`, [vaultId, input.parentId]
      );
      if (!parent.rows[0]) return "label_parent_not_found" as const;
      if (parent.rows.some((row) => row.id === labelId)) return "label_parent_cycle" as const;
      if (parent.rows[0].kind !== label.kind) return "label_parent_kind_mismatch" as const;
    }
    try {
      const updated = await client.query(
        `UPDATE labels SET name = $3, aliases = $4, parent_id = $5, pinned = $6, revision = revision + 1, updated_at = now()
         WHERE vault_id = $1 AND id = $2 RETURNING *, (SELECT count(*)::int FROM note_labels WHERE label_id = $2) AS supported_note_count`,
        [vaultId, labelId, input.name ?? label.name, input.aliases ?? label.aliases, input.parentId === undefined ? label.parent_id : input.parentId, input.pinned ?? label.pinned]
      );
      return updated.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") return "label_already_exists" as const;
      throw error;
    }
  });
  if (!result) return reply.code(404).send({ error: "label_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return mapLabel(result);
});

app.delete("/api/v1/vaults/:vaultId/labels/:labelId", async (request, reply) => {
  const { vaultId, labelId } = request.params as { vaultId: string; labelId: string };
  const { expectedRevision, removeAssociations } = request.query as { expectedRevision?: string; removeAssociations?: string };
  idSchema.parse(vaultId); idSchema.parse(labelId);
  if (!Number.isInteger(Number(expectedRevision)) || removeAssociations !== "true") return reply.code(400).send({ error: "expected_revision_and_remove_associations_required" });
  const result = await transaction(async (client) => {
    const referenced = await client.query(
      `SELECT 1 FROM routing_rules WHERE vault_id = $1 AND ($2::uuid = ANY(target_label_ids) OR condition @> $3::jsonb)
       UNION ALL SELECT 1 FROM collections WHERE vault_id = $1 AND filter @> $3::jsonb LIMIT 1`,
      [vaultId, labelId, JSON.stringify({ conditions: [{ type: "label", labelId }] })]
    );
    if (referenced.rowCount) return "label_in_use" as const;
    const deleted = await client.query("DELETE FROM labels WHERE vault_id = $1 AND id = $2 AND revision = $3 RETURNING id", [vaultId, labelId, Number(expectedRevision)]);
    return deleted.rowCount ? true : null;
  });
  if (result === "label_in_use") return reply.code(409).send({ error: result });
  if (!result) return reply.code(409).send({ error: "label_not_found_or_stale" });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/notes/:noteId/labels", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const note = await query("SELECT revision, organization_revision FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL", [vaultId, noteId]);
  if (!note.rows[0]) return reply.code(404).send({ error: "note_not_found" });
  const labels = await query(
    `SELECT l.*, count(all_nl.note_id)::int AS supported_note_count, nl.locked, nl.provenance
     FROM labels l JOIN note_labels nl ON nl.label_id = l.id AND nl.note_id = $2
     LEFT JOIN note_labels all_nl ON all_nl.label_id = l.id WHERE l.vault_id = $1 GROUP BY l.id, nl.locked, nl.provenance ORDER BY l.kind, lower(l.name)`, [vaultId, noteId]
  );
  return noteOrganizationSchema.parse({ noteId, noteRevision: note.rows[0].revision, organizationRevision: note.rows[0].organization_revision, labels: labels.rows.map((row) => ({ ...mapLabel(row), locked: row.locked, provenance: row.provenance })) });
});

app.put("/api/v1/vaults/:vaultId/notes/:noteId/labels", async (request, reply) => {
  const { vaultId, noteId } = request.params as { vaultId: string; noteId: string };
  idSchema.parse(vaultId); idSchema.parse(noteId);
  const input = setNoteLabelsSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, noteId]);
    const note = current.rows[0];
    if (!note) return null;
    if (note.revision !== input.expectedRevision) return "stale_revision" as const;
    const uniqueIds = [...new Set(input.labelIds)];
    if (uniqueIds.length) {
      const labels = await client.query("SELECT id FROM labels WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, uniqueIds]);
      if (labels.rowCount !== uniqueIds.length) return "label_not_found" as const;
    }
    await client.query("DELETE FROM note_labels WHERE note_id = $1", [noteId]);
    const locked = new Set(input.lockedLabelIds);
    for (const labelId of uniqueIds) await client.query(
      "INSERT INTO note_labels(note_id, label_id, locked, provenance) VALUES ($1,$2,$3,'owner')", [noteId, labelId, locked.has(labelId)]
    );
    const revision = await client.query("UPDATE notes SET organization_revision = organization_revision + 1, updated_at = now() WHERE id = $1 RETURNING organization_revision", [noteId]);
    const labels = uniqueIds.length ? await client.query(
      `SELECT l.*, count(all_nl.note_id)::int AS supported_note_count, nl.locked, nl.provenance
       FROM labels l JOIN note_labels nl ON nl.label_id = l.id AND nl.note_id = $2
       LEFT JOIN note_labels all_nl ON all_nl.label_id = l.id WHERE l.vault_id = $1 GROUP BY l.id, nl.locked, nl.provenance ORDER BY l.kind, lower(l.name)`, [vaultId, noteId]
    ) : { rows: [] as Record<string, any>[] };
    return { noteRevision: note.revision, organizationRevision: revision.rows[0].organization_revision, labels: labels.rows };
  });
  if (!result) return reply.code(404).send({ error: "note_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return noteOrganizationSchema.parse({ noteId, noteRevision: result.noteRevision, organizationRevision: result.organizationRevision, labels: result.labels.map((row) => ({ ...mapLabel(row), locked: row.locked, provenance: row.provenance })) });
});

app.get("/api/v1/vaults/:vaultId/collections", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const result = await query("SELECT * FROM collections WHERE vault_id = $1 ORDER BY system DESC, lower(name) LIMIT 250", [vaultId]);
  return { items: result.rows.map(mapCollection) };
});

app.post("/api/v1/vaults/:vaultId/collections", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createCollectionSchema.parse(request.body);
  const labelIds = filterLabelIds(input.filter);
  if (labelIds.length) {
    const labels = await query("SELECT id FROM labels WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, labelIds]);
    if (labels.rowCount !== labelIds.length) return reply.code(400).send({ error: "collection_label_not_found" });
  }
  try {
    const result = await query("INSERT INTO collections(vault_id, name, filter, sort, view) VALUES ($1,$2,$3::jsonb,$4,$5) RETURNING *", [vaultId, input.name, JSON.stringify(input.filter), input.sort, input.view]);
    return reply.code(201).send(mapCollection(result.rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") return reply.code(409).send({ error: "collection_already_exists" });
    throw error;
  }
});

app.patch("/api/v1/vaults/:vaultId/collections/:collectionId", async (request, reply) => {
  const { vaultId, collectionId } = request.params as { vaultId: string; collectionId: string };
  idSchema.parse(vaultId); idSchema.parse(collectionId);
  const input = updateCollectionSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM collections WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, collectionId]);
    const collection = current.rows[0];
    if (!collection) return null;
    if (collection.revision !== input.expectedRevision) return "stale_revision" as const;
    if (collection.system && (input.name !== undefined || input.filter !== undefined)) return "system_collection_filter_locked" as const;
    const filter = input.filter ?? collection.filter;
    const labelIds = filterLabelIds(filter);
    if (labelIds.length) {
      const labels = await client.query("SELECT id FROM labels WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, labelIds]);
      if (labels.rowCount !== labelIds.length) return "collection_label_not_found" as const;
    }
    try {
      const updated = await client.query(
        `UPDATE collections SET name = $3, filter = $4::jsonb, sort = $5, view = $6, revision = revision + 1, updated_at = now()
         WHERE vault_id = $1 AND id = $2 RETURNING *`,
        [vaultId, collectionId, input.name ?? collection.name, JSON.stringify(filter), input.sort ?? collection.sort, input.view ?? collection.view]
      );
      return updated.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") return "collection_already_exists" as const;
      throw error;
    }
  });
  if (!result) return reply.code(404).send({ error: "collection_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return mapCollection(result);
});

app.delete("/api/v1/vaults/:vaultId/collections/:collectionId", async (request, reply) => {
  const { vaultId, collectionId } = request.params as { vaultId: string; collectionId: string };
  const expectedRevision = Number((request.query as { expectedRevision?: string }).expectedRevision);
  idSchema.parse(vaultId); idSchema.parse(collectionId);
  if (!Number.isInteger(expectedRevision)) return reply.code(400).send({ error: "expected_revision_required" });
  const result = await query("DELETE FROM collections WHERE vault_id = $1 AND id = $2 AND revision = $3 AND system = false RETURNING id", [vaultId, collectionId, expectedRevision]);
  if (!result.rowCount) return reply.code(409).send({ error: "collection_not_found_stale_or_system" });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/collections/:collectionId/items", async (request, reply) => {
  const { vaultId, collectionId } = request.params as { vaultId: string; collectionId: string };
  const requestedLimit = Number((request.query as { limit?: string }).limit ?? 100);
  idSchema.parse(vaultId); idSchema.parse(collectionId);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 100;
  const collection = await query("SELECT * FROM collections WHERE vault_id = $1 AND id = $2", [vaultId, collectionId]);
  if (!collection.rows[0]) return reply.code(404).send({ error: "collection_not_found" });
  const compiled = compileNoteFilter(collection.rows[0].filter, 2);
  const order = collection.rows[0].sort === "title_asc" ? "lower(n.title), n.id" : collection.rows[0].sort === "created_desc" ? "n.created_at DESC, n.id" : "n.updated_at DESC, n.id";
  const result = await query(`SELECT n.* FROM notes n WHERE n.vault_id = $1 AND n.trashed_at IS NULL AND ${compiled.sql} ORDER BY ${order} LIMIT $${2 + compiled.values.length}`, [vaultId, ...compiled.values, limit]);
  return { collection: mapCollection(collection.rows[0]), items: result.rows.map(mapNote), nextCursor: null };
});

app.get("/api/v1/vaults/:vaultId/rules", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const result = await query("SELECT * FROM routing_rules WHERE vault_id = $1 ORDER BY priority, created_at LIMIT 250", [vaultId]);
  return { items: result.rows.map(mapRoutingRule) };
});

app.post("/api/v1/vaults/:vaultId/rules", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createRoutingRuleSchema.parse(request.body);
  const referenced = [...new Set([...input.targetLabelIds, ...filterLabelIds(input.condition)])];
  const labels = await query("SELECT id FROM labels WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, referenced]);
  if (labels.rowCount !== referenced.length) return reply.code(400).send({ error: "routing_rule_label_not_found" });
  try {
    const result = await query(
      `INSERT INTO routing_rules(vault_id, name, condition, target_label_ids, priority, enabled)
       VALUES ($1,$2,$3::jsonb,$4::uuid[],$5,$6) RETURNING *`,
      [vaultId, input.name, JSON.stringify(input.condition), [...new Set(input.targetLabelIds)], input.priority, input.enabled]
    );
    return reply.code(201).send(mapRoutingRule(result.rows[0]));
  } catch (error: any) {
    if (error?.code === "23505") return reply.code(409).send({ error: "routing_rule_already_exists" });
    throw error;
  }
});

app.patch("/api/v1/vaults/:vaultId/rules/:ruleId", async (request, reply) => {
  const { vaultId, ruleId } = request.params as { vaultId: string; ruleId: string };
  idSchema.parse(vaultId); idSchema.parse(ruleId);
  const input = updateRoutingRuleSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM routing_rules WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, ruleId]);
    const rule = current.rows[0];
    if (!rule) return null;
    if (rule.revision !== input.expectedRevision) return "stale_revision" as const;
    const condition = input.condition ?? rule.condition; const targets = input.targetLabelIds ?? rule.target_label_ids;
    const referenced = [...new Set([...targets, ...filterLabelIds(condition)])];
    const labels = await client.query("SELECT id FROM labels WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, referenced]);
    if (labels.rowCount !== referenced.length) return "routing_rule_label_not_found" as const;
    try {
      const updated = await client.query(
        `UPDATE routing_rules SET name = $3, condition = $4::jsonb, target_label_ids = $5::uuid[], priority = $6,
         enabled = $7, revision = revision + 1, updated_at = now() WHERE vault_id = $1 AND id = $2 RETURNING *`,
        [vaultId, ruleId, input.name ?? rule.name, JSON.stringify(condition), [...new Set(targets)], input.priority ?? rule.priority, input.enabled ?? rule.enabled]
      );
      return updated.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") return "routing_rule_already_exists" as const;
      throw error;
    }
  });
  if (!result) return reply.code(404).send({ error: "routing_rule_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return mapRoutingRule(result);
});

app.delete("/api/v1/vaults/:vaultId/rules/:ruleId", async (request, reply) => {
  const { vaultId, ruleId } = request.params as { vaultId: string; ruleId: string };
  const expectedRevision = Number((request.query as { expectedRevision?: string }).expectedRevision);
  idSchema.parse(vaultId); idSchema.parse(ruleId);
  if (!Number.isInteger(expectedRevision)) return reply.code(400).send({ error: "expected_revision_required" });
  const result = await query("DELETE FROM routing_rules WHERE vault_id = $1 AND id = $2 AND revision = $3 RETURNING id", [vaultId, ruleId, expectedRevision]);
  if (!result.rowCount) return reply.code(409).send({ error: "routing_rule_not_found_or_stale" });
  return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/rules/preview", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = routingRulePreviewSchema.parse(request.body);
  const referenced = [...new Set([...input.targetLabelIds, ...filterLabelIds(input.condition)])];
  const labels = await query("SELECT id FROM labels WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, referenced]);
  if (labels.rowCount !== referenced.length) return reply.code(400).send({ error: "routing_rule_label_not_found" });
  const compiled = compileNoteFilter(input.condition, 2);
  const [count, sample] = await Promise.all([
    query<{ count: string }>(`SELECT count(*)::text AS count FROM notes n WHERE n.vault_id = $1 AND n.trashed_at IS NULL AND ${compiled.sql}`, [vaultId, ...compiled.values]),
    query(`SELECT n.id FROM notes n WHERE n.vault_id = $1 AND n.trashed_at IS NULL AND ${compiled.sql} ORDER BY n.updated_at DESC LIMIT $${2 + compiled.values.length}`, [vaultId, ...compiled.values, input.sampleLimit])
  ]);
  return rulePreviewResultSchema.parse({ affectedCount: Number(count.rows[0]?.count ?? 0), sampleNoteIds: sample.rows.map((row) => row.id), conflicts: [] });
});

app.get("/api/v1/vaults/:vaultId/relationships", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  const { noteId, kind } = request.query as { noteId?: string; kind?: string };
  idSchema.parse(vaultId); if (noteId) idSchema.parse(noteId);
  const result = await query(
    `SELECT * FROM note_relationships WHERE vault_id = $1
     AND ($2::uuid IS NULL OR from_note_id = $2 OR to_note_id = $2) AND ($3::text IS NULL OR kind = $3)
     ORDER BY created_at DESC LIMIT 500`, [vaultId, noteId ?? null, kind ?? null]
  );
  return { items: result.rows.map(mapRelationship) };
});

app.post("/api/v1/vaults/:vaultId/relationships", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createRelationshipSchema.parse(request.body);
  const symmetric = input.kind === "related" || input.kind === "duplicate_candidate";
  const [fromNoteId, toNoteId] = symmetric && input.fromNoteId > input.toNoteId ? [input.toNoteId, input.fromNoteId] : [input.fromNoteId, input.toNoteId];
  const created = await transaction(async (client) => {
    const notes = await client.query("SELECT id FROM notes WHERE vault_id = $1 AND id = ANY($2::uuid[]) AND trashed_at IS NULL", [vaultId, [fromNoteId, toNoteId]]);
    if (notes.rowCount !== 2) return "relationship_note_not_found" as const;
    const anchors = [...new Set(input.evidenceAnchorIds)];
    if (anchors.length) {
      const evidence = await client.query(
        `SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id = c.note_id AND n.revision = c.note_revision
         WHERE c.vault_id = $1 AND c.id = ANY($2::uuid[]) AND c.note_id = ANY($3::uuid[])`, [vaultId, anchors, [fromNoteId, toNoteId]]
      );
      if (evidence.rowCount !== anchors.length) return "relationship_evidence_not_resolvable" as const;
    }
    try {
      const result = await client.query(
        `INSERT INTO note_relationships(vault_id, from_note_id, to_note_id, kind, evidence_anchor_ids, status, authored_by)
         VALUES ($1,$2,$3,$4,$5::uuid[],'confirmed','owner') RETURNING *`, [vaultId, fromNoteId, toNoteId, input.kind, anchors]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") return "relationship_already_exists" as const;
      throw error;
    }
  });
  if (typeof created === "string") return reply.code(created === "relationship_note_not_found" ? 404 : 409).send({ error: created });
  return reply.code(201).send(mapRelationship(created));
});

app.delete("/api/v1/vaults/:vaultId/relationships/:relationshipId", async (request, reply) => {
  const { vaultId, relationshipId } = request.params as { vaultId: string; relationshipId: string };
  const expectedRevision = Number((request.query as { expectedRevision?: string }).expectedRevision);
  idSchema.parse(vaultId); idSchema.parse(relationshipId);
  if (!Number.isInteger(expectedRevision)) return reply.code(400).send({ error: "expected_revision_required" });
  const result = await query("DELETE FROM note_relationships WHERE vault_id = $1 AND id = $2 AND revision = $3 RETURNING id", [vaultId, relationshipId, expectedRevision]);
  if (!result.rowCount) return reply.code(409).send({ error: "relationship_not_found_or_stale" });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/notes/:noteId/related",async(request,reply)=>{
  const {vaultId,noteId}=request.params as {vaultId:string;noteId:string};const {limit:rawLimit}=request.query as {limit?:string};idSchema.parse(vaultId);idSchema.parse(noteId);const limit=rawLimit===undefined?10:Number(rawLimit);
  if(!Number.isInteger(limit)||limit<1||limit>50)return reply.code(400).send({error:"invalid_related_limit"});
  const note=await query("SELECT id FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL",[vaultId,noteId]);if(!note.rowCount)return reply.code(404).send({error:"note_not_found"});
  const [links,sourceLabels]=await Promise.all([query("SELECT * FROM note_relationships WHERE vault_id=$1 AND status='confirmed' AND (from_note_id=$2 OR to_note_id=$2) ORDER BY created_at DESC,id LIMIT 500",[vaultId,noteId]),query("SELECT label_id FROM note_labels WHERE note_id=$1 ORDER BY label_id",[noteId])]);
  const labelIds=sourceLabels.rows.map(row=>row.label_id as string),linked=new Set(links.rows.flatMap(row=>[row.from_note_id,row.to_note_id]));linked.add(noteId);let suggestedLinks:Array<{noteId:string;title:string;score:number;reasonCodes:["shared_label"];sharedLabelIds:string[]}>=[];
  if(labelIds.length){const candidates=await query("WITH candidate_ids AS (SELECT DISTINCT n.id FROM notes n JOIN note_labels matched ON matched.note_id=n.id WHERE n.vault_id=$1 AND n.trashed_at IS NULL AND n.id<>ALL($2::uuid[]) AND matched.label_id=ANY($3::uuid[]) LIMIT 500) SELECT n.id,n.title,array_agg(all_labels.label_id ORDER BY all_labels.label_id) AS label_ids FROM candidate_ids c JOIN notes n ON n.id=c.id JOIN note_labels all_labels ON all_labels.note_id=n.id GROUP BY n.id,n.title ORDER BY n.id",[vaultId,[...linked],labelIds]);suggestedLinks=rankRelatedNotes(labelIds,candidates.rows.map(row=>({noteId:row.id,title:row.title,labelIds:row.label_ids})),limit);}
  return relatedResultSchema.parse({explicitLinks:links.rows.map(mapRelationship),suggestedLinks,suggestionMethod:"confirmed-shared-label-jaccard-v1",suggestionsAreConfirmed:false});
});

app.post("/api/v1/vaults/:vaultId/resurfacing/feedback",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=resurfacingFeedbackInputSchema.parse(request.body);const [note,label]=await Promise.all([query("SELECT id FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL",[vaultId,input.noteId]),input.labelId?query("SELECT id FROM labels WHERE vault_id=$1 AND id=$2",[vaultId,input.labelId]):Promise.resolve({rows:[] as Record<string,any>[],rowCount:0})]);if(!note.rowCount)return reply.code(404).send({error:"note_not_found"});if(input.labelId&&!label.rowCount)return reply.code(404).send({error:"resurfacing_label_not_found"});const created=await query("INSERT INTO resurfacing_feedback(vault_id,note_id,action,label_id,until_at) VALUES ($1,$2,$3,$4,$5) RETURNING *",[vaultId,input.noteId,input.action,input.labelId??null,input.until??null]);const row=created.rows[0];return reply.code(201).send(resurfacingFeedbackSchema.parse({id:row.id,vaultId:row.vault_id,noteId:row.note_id,action:row.action,labelId:row.label_id,until:row.until_at?iso(row.until_at):null,createdAt:iso(row.created_at)}));
});

app.get("/api/v1/vaults/:vaultId/ai-operations", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  const { noteId } = request.query as { noteId?: string };
  idSchema.parse(vaultId); if (noteId) idSchema.parse(noteId);
  const result = await query("SELECT * FROM ai_operations WHERE vault_id = $1 AND ($2::uuid IS NULL OR note_id = $2) ORDER BY created_at DESC LIMIT 250", [vaultId, noteId ?? null]);
  return { items: result.rows.map(mapAiOperation) };
});

app.get("/api/v1/vaults/:vaultId/ai-operations/:operationId", async (request, reply) => {
  const { vaultId, operationId } = request.params as { vaultId: string; operationId: string };
  idSchema.parse(vaultId); idSchema.parse(operationId);
  const result = await query("SELECT * FROM ai_operations WHERE vault_id = $1 AND id = $2", [vaultId, operationId]);
  const row = result.rows[0];
  if (!row) return reply.code(404).send({ error: "ai_operation_not_found" });
  return mapAiOperation(row);
});

app.post("/api/v1/vaults/:vaultId/ai-operations/:operationId/undo", async (request, reply) => {
  const { vaultId, operationId } = request.params as { vaultId: string; operationId: string };
  idSchema.parse(vaultId); idSchema.parse(operationId);
  const input = undoAiOperationSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const operation = await client.query("SELECT * FROM ai_operations WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, operationId]);
    const item = operation.rows[0];
    if (!item) return null;
    if (!item.applied || item.undone_at) return "operation_not_undoable" as const;
    const note = await client.query("SELECT * FROM notes WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, item.note_id]);
    const current = note.rows[0];
    if (!current) return "note_not_found" as const;
    const conflict = classificationUndoConflict(
      { revision: current.revision, classification: current.classification, classifiedRevision: current.classified_revision, organizationRevision: current.organization_revision, locked: current.classification_locked },
      { sourceRevision: item.source_revision, resultClassification: item.result.classification, effectOrganizationRevision: item.effect_organization_revision ?? null },
      input.expectedCurrentRevision
    );
    if (conflict) return conflict;
    const inverse = item.inverse as { classification?: NoteClassification | null; suggestedTitle?: string | null; classifiedRevision?: number | null };
    const removed = await client.query("DELETE FROM note_labels WHERE note_id = $1 AND source_operation_id = $2 AND locked = false RETURNING label_id", [item.note_id, operationId]);
    await client.query("UPDATE note_commitment_candidates SET state='dismissed',updated_at=now() WHERE vault_id=$1 AND source_operation_id=$2 AND state='proposed'",[vaultId,operationId]);
    const updated = await client.query(
      `UPDATE notes SET classification = $2, suggested_title = $3, classified_revision = $4,
       organization_revision = organization_revision + 1, updated_at = now() WHERE id = $1 RETURNING organization_revision`,
      [item.note_id, inverse.classification ?? null, inverse.suggestedTitle ?? null, inverse.classifiedRevision ?? null]
    );
    const undone = await client.query("UPDATE ai_operations SET undone_at = now() WHERE id = $1 RETURNING undone_at", [operationId]);
    return { noteId: item.note_id, classification: inverse.classification ?? null, removed: removed.rowCount ?? 0, organizationRevision: updated.rows[0].organization_revision, undoneAt: undone.rows[0].undone_at };
  });
  if (!result) return reply.code(404).send({ error: "ai_operation_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return undoReceiptSchema.parse({ operationId, noteId: result.noteId, restoredClassification: result.classification, removedRuleLabels: result.removed, organizationRevision: result.organizationRevision, undoneAt: iso(result.undoneAt) });
});

app.get("/api/v1/vaults/:vaultId/activity", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  const { noteId, cursor, limit: rawLimit } = request.query as { noteId?: string; cursor?: string; limit?: string };
  idSchema.parse(vaultId); if (noteId) idSchema.parse(noteId);
  const limit = rawLimit === undefined ? 50 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return reply.code(400).send({ error: "invalid_activity_limit" });
  let before: { createdAt: string; id: string } | null = null;
  try {
    if (cursor) before = decodeActivityCursor(cursor);
  } catch { return reply.code(400).send({ error: "invalid_activity_cursor" }); }
  const result = await query(
    `SELECT * FROM (
       SELECT r.id AS source_id, 'note_revision'::text AS kind, n.id AS note_id, 'note'::text AS object_type, n.id AS object_id,
         CASE WHEN r.actor_kind = 'owner' THEN 'owner' ELSE 'system' END AS actor,
         CASE WHEN r.actor_kind = 'capture' THEN 'Note captured' WHEN r.actor_kind = 'restore' THEN 'Note revision restored' ELSE 'Note edited' END AS summary,
         jsonb_build_object('revision', r.revision) AS metadata, r.created_at
       FROM note_revisions r JOIN notes n ON n.id = r.note_id WHERE n.vault_id = $1
       UNION ALL
       SELECT c.id, 'classification_correction', n.id, 'note', n.id, 'owner', 'Classification corrected',
         jsonb_build_object('sourceRevision', c.source_note_revision, 'locked', c.locked), c.created_at
       FROM note_corrections c JOIN notes n ON n.id = c.note_id WHERE n.vault_id = $1
       UNION ALL
       SELECT o.id, 'ai_operation', o.note_id, 'ai_operation', o.id, 'model',
         CASE WHEN o.applied THEN 'Model classification applied' ELSE 'Model classification recorded without applying' END,
         jsonb_build_object('sourceRevision', o.source_revision, 'applied', o.applied), o.created_at
       FROM ai_operations o WHERE o.vault_id = $1
       UNION ALL
       SELECT o.id, 'ai_undo', o.note_id, 'ai_operation', o.id, 'owner', 'Model-authored change undone',
         jsonb_build_object('sourceRevision', o.source_revision), o.undone_at
       FROM ai_operations o WHERE o.vault_id = $1 AND o.undone_at IS NOT NULL
       UNION ALL
       SELECT r.id, 'relationship_created', r.from_note_id, 'relationship', r.id,
         CASE WHEN r.authored_by = 'owner' THEN 'owner' ELSE 'system' END, 'Note relationship created',
         jsonb_build_object('kind', r.kind, 'toNoteId', r.to_note_id), r.created_at
       FROM note_relationships r WHERE r.vault_id = $1
       UNION ALL
       SELECT r.id, 'routing_rule_created', NULL::uuid, 'routing_rule', r.id, 'owner', 'Routing rule created',
         jsonb_build_object('enabled', r.enabled, 'priority', r.priority), r.created_at
       FROM routing_rules r WHERE r.vault_id = $1
     ) events
     WHERE ($2::uuid IS NULL OR note_id = $2)
       AND ($3::timestamptz IS NULL OR (created_at, source_id) < ($3::timestamptz, $4::uuid))
     ORDER BY created_at DESC, source_id DESC LIMIT $5`,
    [vaultId, noteId ?? null, before?.createdAt ?? null, before?.id ?? null, limit]
  );
  const items = result.rows.map((row) => activityEventSchema.parse({
    id: `${row.kind}:${row.source_id}`, vaultId, noteId: row.note_id, kind: row.kind, actor: row.actor,
    objectType: row.object_type, objectId: row.object_id, summary: row.summary, metadata: row.metadata, createdAt: iso(row.created_at)
  }));
  const last = result.rows.at(-1);
  return { items, nextCursor: items.length === limit && last ? encodeActivityCursor({ createdAt: iso(last.created_at), id: last.source_id }) : null };
});

app.get("/api/v1/vaults/:vaultId/school/subjects", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  const { status = "active", limit: rawLimit } = request.query as { status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId);
  const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !["active", "archived", "all"].includes(status)) return reply.code(400).send({ error: "invalid_subject_filter" });
  const result = await query(
    `SELECT * FROM school_subjects WHERE vault_id = $1
     AND ($2 = 'all' OR ($2 = 'active' AND archived_at IS NULL) OR ($2 = 'archived' AND archived_at IS NOT NULL))
     ORDER BY archived_at NULLS FIRST, lower(name), id LIMIT $3`, [vaultId, status, limit]
  );
  return { items: result.rows.map(mapSchoolSubject), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/school/subjects", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId); const input = createSchoolSubjectSchema.parse(request.body);
  const anchors = [...new Set(input.sourceAnchorIds)];
  if (anchors.length) {
    const valid = await query(
      `SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id = c.note_id AND n.revision = c.note_revision
       WHERE c.vault_id = $1 AND c.id = ANY($2::uuid[])`, [vaultId, anchors]
    );
    if (valid.rowCount !== anchors.length) return reply.code(400).send({ error: "subject_source_anchor_not_current" });
  }
  try {
    const result = await query(
      `INSERT INTO school_subjects(vault_id,name,code,academic_period,source_anchor_ids,origin)
       VALUES ($1,$2,$3,$4,$5::uuid[],'owner') RETURNING *`, [vaultId, input.name, input.code ?? null, input.academicPeriod ?? null, anchors]
    );
    return reply.code(201).send(mapSchoolSubject(result.rows[0]));
  } catch (error: any) { if (error?.code === "23505") return reply.code(409).send({ error: "subject_already_exists" }); throw error; }
});

app.get("/api/v1/vaults/:vaultId/school/subjects/:subjectId", async (request, reply) => {
  const { vaultId, subjectId } = request.params as { vaultId: string; subjectId: string };
  idSchema.parse(vaultId); idSchema.parse(subjectId);
  const result = await query("SELECT * FROM school_subjects WHERE vault_id = $1 AND id = $2", [vaultId, subjectId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "subject_not_found" });
  return mapSchoolSubject(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId/school/subjects/:subjectId", async (request, reply) => {
  const { vaultId, subjectId } = request.params as { vaultId: string; subjectId: string };
  idSchema.parse(vaultId); idSchema.parse(subjectId); const input = updateSchoolSubjectSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM school_subjects WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, subjectId]);
    const subject = current.rows[0]; if (!subject) return null;
    if (subject.revision !== input.expectedRevision) return "stale_revision" as const;
    if (subject.origin !== "owner") return "source_owned_subject" as const;
    const anchors = input.patch.sourceAnchorIds === undefined ? subject.source_anchor_ids : [...new Set(input.patch.sourceAnchorIds)];
    if (anchors.length) {
      const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id = c.note_id AND n.revision = c.note_revision WHERE c.vault_id = $1 AND c.id = ANY($2::uuid[])`, [vaultId, anchors]);
      if (valid.rowCount !== anchors.length) return "subject_source_anchor_not_current" as const;
    }
    try {
      const updated = await client.query(
        `UPDATE school_subjects SET name=$3, code=$4, academic_period=$5, source_anchor_ids=$6::uuid[], revision=revision+1, updated_at=now()
         WHERE vault_id=$1 AND id=$2 RETURNING *`, [vaultId, subjectId, input.patch.name ?? subject.name, input.patch.code === undefined ? subject.code : input.patch.code, input.patch.academicPeriod === undefined ? subject.academic_period : input.patch.academicPeriod, anchors]
      ); return updated.rows[0];
    } catch (error: any) { if (error?.code === "23505") return "subject_already_exists" as const; throw error; }
  });
  if (!result) return reply.code(404).send({ error: "subject_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return mapSchoolSubject(result);
});

app.delete("/api/v1/vaults/:vaultId/school/subjects/:subjectId", async (request, reply) => {
  const { vaultId, subjectId } = request.params as { vaultId: string; subjectId: string };
  idSchema.parse(vaultId); idSchema.parse(subjectId); const revision = revisionFromIfMatch(request.headers["if-match"]);
  if (revision === null) return reply.code(428).send({ error: "if_match_required" });
  const result = await query(
    `UPDATE school_subjects SET archived_at=now(), revision=revision+1, updated_at=now()
     WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`, [vaultId, subjectId, revision]
  );
  if (!result.rowCount) return reply.code(409).send({ error: "subject_not_found_stale_source_owned_or_archived" });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/school/courses", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  const { subjectId, status = "active", limit: rawLimit } = request.query as { subjectId?: string; status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId); if (subjectId) idSchema.parse(subjectId);
  const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !["active", "archived", "all"].includes(status)) return reply.code(400).send({ error: "invalid_course_filter" });
  const result = await query(
    `SELECT * FROM school_courses WHERE vault_id=$1 AND ($2::uuid IS NULL OR subject_id=$2)
     AND ($3='all' OR ($3='active' AND archived_at IS NULL) OR ($3='archived' AND archived_at IS NOT NULL))
     ORDER BY archived_at NULLS FIRST, lower(name), id LIMIT $4`, [vaultId, subjectId ?? null, status, limit]
  );
  return { items: result.rows.map(mapSchoolCourse), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/school/courses", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId);
  const input = createSchoolCourseSchema.parse(request.body);
  const created = await transaction(async (client) => {
    const subject = await client.query("SELECT id FROM school_subjects WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.subjectId]);
    if (!subject.rowCount) return "course_subject_not_found" as const;
    const teachers = [...new Set(input.teacherEntityIds)]; const classes = [...new Set(input.classEntityIds)]; const anchors = [...new Set(input.sourceAnchorIds)];
    if (teachers.length) { const valid = await client.query("SELECT id FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND kind='person'", [vaultId, teachers]); if (valid.rowCount !== teachers.length) return "course_teacher_not_found" as const; }
    if (classes.length) { const valid = await client.query("SELECT id FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND kind='class'", [vaultId, classes]); if (valid.rowCount !== classes.length) return "course_class_not_found" as const; }
    if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "course_source_anchor_not_current" as const; }
    try { const result = await client.query(
      `INSERT INTO school_courses(vault_id,subject_id,name,academic_period,teacher_entity_ids,class_entity_ids,source_anchor_ids,origin)
       VALUES ($1,$2,$3,$4,$5::uuid[],$6::uuid[],$7::uuid[],'owner') RETURNING *`, [vaultId, input.subjectId, input.name, input.academicPeriod ?? null, teachers, classes, anchors]
    ); return result.rows[0]; } catch (error: any) { if (error?.code === "23505") return "course_already_exists" as const; throw error; }
  });
  if (typeof created === "string") return reply.code(created.endsWith("not_found") ? 400 : 409).send({ error: created });
  return reply.code(201).send(mapSchoolCourse(created));
});

app.get("/api/v1/vaults/:vaultId/school/courses/:courseId", async (request, reply) => {
  const { vaultId, courseId } = request.params as { vaultId: string; courseId: string }; idSchema.parse(vaultId); idSchema.parse(courseId);
  const result = await query("SELECT * FROM school_courses WHERE vault_id=$1 AND id=$2", [vaultId, courseId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "course_not_found" });
  return mapSchoolCourse(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId/school/courses/:courseId", async (request, reply) => {
  const { vaultId, courseId } = request.params as { vaultId: string; courseId: string }; idSchema.parse(vaultId); idSchema.parse(courseId);
  const input = updateSchoolCourseSchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM school_courses WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, courseId]); const course = current.rows[0];
    if (!course) return null; if (course.revision !== input.expectedRevision) return "stale_revision" as const; if (course.origin !== "owner") return "source_owned_course" as const;
    const subjectId = input.patch.subjectId ?? course.subject_id; const subject = await client.query("SELECT id FROM school_subjects WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, subjectId]); if (!subject.rowCount) return "course_subject_not_found" as const;
    const teachers = input.patch.teacherEntityIds === undefined ? course.teacher_entity_ids : [...new Set(input.patch.teacherEntityIds)]; const classes = input.patch.classEntityIds === undefined ? course.class_entity_ids : [...new Set(input.patch.classEntityIds)]; const anchors = input.patch.sourceAnchorIds === undefined ? course.source_anchor_ids : [...new Set(input.patch.sourceAnchorIds)];
    if (teachers.length) { const valid = await client.query("SELECT id FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND kind='person'", [vaultId, teachers]); if (valid.rowCount !== teachers.length) return "course_teacher_not_found" as const; }
    if (classes.length) { const valid = await client.query("SELECT id FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND kind='class'", [vaultId, classes]); if (valid.rowCount !== classes.length) return "course_class_not_found" as const; }
    if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "course_source_anchor_not_current" as const; }
    try { const result = await client.query(
      `UPDATE school_courses SET subject_id=$3,name=$4,academic_period=$5,teacher_entity_ids=$6::uuid[],class_entity_ids=$7::uuid[],source_anchor_ids=$8::uuid[],revision=revision+1,updated_at=now()
       WHERE vault_id=$1 AND id=$2 RETURNING *`, [vaultId, courseId, subjectId, input.patch.name ?? course.name, input.patch.academicPeriod === undefined ? course.academic_period : input.patch.academicPeriod, teachers, classes, anchors]
    ); return result.rows[0]; } catch (error: any) { if (error?.code === "23505") return "course_already_exists" as const; throw error; }
  });
  if (!updated) return reply.code(404).send({ error: "course_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapSchoolCourse(updated);
});

app.delete("/api/v1/vaults/:vaultId/school/courses/:courseId", async (request, reply) => {
  const { vaultId, courseId } = request.params as { vaultId: string; courseId: string }; idSchema.parse(vaultId); idSchema.parse(courseId);
  const revision = revisionFromIfMatch(request.headers["if-match"]); if (revision === null) return reply.code(428).send({ error: "if_match_required" });
  const result = await query(`UPDATE school_courses SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`, [vaultId, courseId, revision]);
  if (!result.rowCount) return reply.code(409).send({ error: "course_not_found_stale_source_owned_or_archived" }); return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/school/courses/:courseId/materials",async(request,reply)=>{const {vaultId,courseId}=request.params as {vaultId:string;courseId:string};const raw=request.query as {cursor?:string;limit?:string;chapter?:string;lesson_id?:string;kind?:string};idSchema.parse(vaultId);idSchema.parse(courseId);if(raw.lesson_id)idSchema.parse(raw.lesson_id);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100||raw.chapter&&raw.chapter.length>240||raw.kind&&raw.kind.length>120)return reply.code(400).send({error:"invalid_course_material_filter"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_course_material_cursor"});}}const course=await query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2",[vaultId,courseId]);if(!course.rows[0])return reply.code(404).send({error:"course_not_found"});const result=await query("SELECT l.* FROM course_material_links l JOIN source_objects s ON s.id=l.source_object_id WHERE l.vault_id=$1 AND l.course_id=$2 AND l.archived_at IS NULL AND ($3::text IS NULL OR l.chapter=$3) AND ($4::uuid IS NULL OR l.lesson_id=$4) AND ($5::text IS NULL OR s.kind=$5) AND ($6::timestamptz IS NULL OR (l.created_at,l.id)<($6::timestamptz,$7::uuid)) ORDER BY l.created_at DESC,l.id DESC LIMIT $8",[vaultId,courseId,raw.chapter??null,raw.lesson_id??null,raw.kind??null,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),last=rows.at(-1);return{items:rows.map(mapCourseMaterialLink),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});

app.post("/api/v1/vaults/:vaultId/school/courses/:courseId/materials",async(request,reply)=>{const {vaultId,courseId}=request.params as {vaultId:string;courseId:string};idSchema.parse(vaultId);idSchema.parse(courseId);const input=linkCourseMaterialSchema.parse(request.body);const result=await transaction(async client=>{const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR SHARE",[vaultId,courseId]);if(!course.rows[0])return"course_not_found" as const;const source=await client.query("SELECT id,current_revision,excluded,access_state FROM source_objects WHERE vault_id=$1 AND id=$2 FOR SHARE",[vaultId,input.sourceId]);if(!source.rows[0]||source.rows[0].excluded||source.rows[0].access_state!=="available")return"course_material_source_unavailable" as const;const revision=input.revisionId?await client.query("SELECT id FROM source_object_revisions WHERE source_object_id=$1 AND id=$2",[input.sourceId,input.revisionId]):await client.query("SELECT id FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2",[input.sourceId,source.rows[0].current_revision]);if(!revision.rows[0])return"course_material_revision_not_found" as const;if(input.lessonId){const lesson=await client.query("SELECT id FROM school_lessons WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL",[vaultId,input.lessonId,courseId]);if(!lesson.rows[0])return"course_material_lesson_not_found" as const;}const evidence=[...new Set(input.evidenceAnchorIds)];if(evidence.length){const valid=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,evidence]);if(valid.rowCount!==evidence.length)return"course_material_evidence_not_current" as const;}try{const created=await client.query("INSERT INTO course_material_links(vault_id,course_id,source_object_id,source_revision_id,chapter,lesson_id,mapping_origin,evidence_anchor_ids) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid[]) RETURNING *",[vaultId,courseId,input.sourceId,revision.rows[0].id,input.chapter,input.lessonId,input.mappingOrigin,evidence]);return created.rows[0];}catch(error:any){if(error?.code==="23505")return"course_material_already_linked" as const;throw error;}});if(typeof result==="string")return reply.code(result==="course_not_found"?404:409).send({error:result});return reply.code(201).send(mapCourseMaterialLink(result));});

app.delete("/api/v1/vaults/:vaultId/school/courses/:courseId/materials/:materialLinkId",async(request,reply)=>{const {vaultId,courseId,materialLinkId}=request.params as {vaultId:string;courseId:string;materialLinkId:string};idSchema.parse(vaultId);idSchema.parse(courseId);idSchema.parse(materialLinkId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE course_material_links SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND course_id=$2 AND id=$3 AND revision=$4 AND archived_at IS NULL RETURNING id",[vaultId,courseId,materialLinkId,revision]);if(!result.rows[0])return reply.code(409).send({error:"course_material_not_found_or_stale"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/school/teachers",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const {course_id:courseId,cursor,limit:rawLimit}=request.query as {course_id?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);if(cursor)idSchema.parse(cursor);
  const limit=rawLimit===undefined?50:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_teacher_limit"});
  const rows=await query(`SELECT e.id,e.name,e.revision,e.updated_at,c.id AS course_id,c.source_anchor_ids,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('alias',a.alias,'scope',a.scope) ORDER BY lower(a.alias),a.id) FROM calendar_entity_aliases a WHERE a.entity_id=e.id AND a.archived_at IS NULL),'[]'::jsonb) AS aliases
    FROM school_courses c CROSS JOIN LATERAL unnest(c.teacher_entity_ids) teacher_id JOIN calendar_entities e ON e.id=teacher_id
    WHERE c.vault_id=$1 AND c.archived_at IS NULL AND e.vault_id=$1 AND e.kind='person' AND e.archived_at IS NULL AND ($2::uuid IS NULL OR c.id=$2) AND ($3::uuid IS NULL OR e.id>$3)
    ORDER BY e.id,c.id`,[vaultId,courseId??null,cursor??null]);
  type TeacherProjection={id:string;name:string;role:"teacher";aliases:Array<{alias:string;scope:"all"|"event_matching"|"search_only"}>;courseIds:string[];sourceAnchorIds:string[];revision:number;updatedAt:string};
  const grouped=new Map<string,TeacherProjection>();
  for(const row of rows.rows){const item:TeacherProjection=grouped.get(row.id)??{id:row.id,name:row.name,role:"teacher",aliases:row.aliases,courseIds:[],sourceAnchorIds:[],revision:row.revision,updatedAt:iso(row.updated_at)};item.courseIds.push(String(row.course_id));item.sourceAnchorIds.push(...(row.source_anchor_ids as string[]));grouped.set(row.id,item);}
  const all=[...grouped.values()].map(item=>({...item,courseIds:[...new Set(item.courseIds)],sourceAnchorIds:[...new Set(item.sourceAnchorIds)]}));const hasMore=all.length>limit,items=all.slice(0,limit).map(item=>teacherViewSchema.parse(item));
  return {items,nextCursor:hasMore?items.at(-1)!.id:null};
});

app.post("/api/v1/vaults/:vaultId/school/import-preview",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);
  const input=previewSchoolImportSchema.parse(request.body);
  if(input.mapping!==null)return reply.code(400).send({error:"school_import_mapping_apply_not_supported"});
  if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});
  const blob=(await query<Record<string,any>>("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2",[vaultId,input.attachmentId])).rows[0];
  if(!blob)return reply.code(404).send({error:"school_import_attachment_not_found"});
  if(Number(blob.byte_length)>20*1024*1024)return reply.code(413).send({error:"school_import_too_large"});
  const file=blobPath(blobStorageRoot,blob.storage_key);
  if(!existsSync(file))return reply.code(503).send({error:"blob_storage_unavailable"});
  if(await hashFile(file)!==blob.sha256)return reply.code(503).send({error:"blob_integrity_failure"});
  let snapshot;
  try{snapshot=parseInSchoolSnapshot(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await readFile(file))));}
  catch{return reply.code(400).send({error:"school_import_snapshot_not_applicable"});}
  if(snapshot.source_timestamp!==input.sourceTimestamp||snapshot.timezone!==input.timezone)return reply.code(409).send({error:"school_import_preview_snapshot_mismatch"});
  if(input.period&&schoolSnapshotOutsidePeriod(snapshot,input.period))return reply.code(409).send({error:"school_import_record_outside_preview_period"});
  const {counts,sample}=schoolImportPreview(snapshot);
  const warnings=["This is a dated browser snapshot, not a live InSchool connection.","Only the record categories counted here will be applied; missing categories are not inferred."];
  const result=schoolImportPreviewResultSchema.parse({type:"school_import_preview",detectedFormat:"omega_school_json_v1",sourceTimestamp:input.sourceTimestamp,timezone:input.timezone,period:input.period,counts,sample,warnings,snapshotOnly:true,liveConnectionCreated:false,writesApplied:false});
  const payload=JSON.stringify({type:"school_import_preview",attachmentId:input.attachmentId,sourceTimestamp:input.sourceTimestamp,timezone:input.timezone,period:input.period,mapping:null});
  const job=await transaction(async client=>{
    const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'school_import_preview','succeeded','proposal_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);
    await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({attachmentId:input.attachmentId,recordCount:snapshot.records.length}),JSON.stringify(result)]);
    return created.rows[0];
  });
  return reply.code(202).send(mapJobHandle(job));
});

app.post("/api/v1/vaults/:vaultId/school/import-apply",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);
  const input=applySchoolImportSchema.parse(request.body);
  const preview=(await query<Record<string,any>>("SELECT * FROM jobs WHERE vault_id=$1 AND id=$2 AND kind='school_import_preview' AND status='succeeded'",[vaultId,input.previewJobId])).rows[0];
  if(!preview)return reply.code(404).send({error:"school_import_preview_not_found"});
  const previewInput=preview.input as Record<string,unknown>;
  if(previewInput.mapping!==null)return reply.code(400).send({error:"school_import_mapping_apply_not_supported"});
  const attachmentId=String(previewInput.attachmentId??"");
  const blob=(await query<Record<string,any>>("SELECT * FROM blobs WHERE vault_id=$1 AND id=$2",[vaultId,attachmentId])).rows[0];
  if(!blob)return reply.code(404).send({error:"school_import_attachment_not_found"});
  if(Number(blob.byte_length)>20*1024*1024)return reply.code(413).send({error:"school_import_too_large"});
  const file=blobPath(blobStorageRoot,blob.storage_key);
  if(!existsSync(file)||await hashFile(file)!==blob.sha256)return reply.code(503).send({error:"school_import_blob_unavailable_or_changed"});
  let snapshot;
  try{snapshot=parseInSchoolSnapshot(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await readFile(file))));}
  catch{return reply.code(400).send({error:"school_import_snapshot_not_applicable"});}
  if(snapshot.source_timestamp!==previewInput.sourceTimestamp||snapshot.timezone!==previewInput.timezone)return reply.code(409).send({error:"school_import_preview_snapshot_mismatch"});
  const period=previewInput.period as {from:string;to:string}|null;
  if(period&&schoolSnapshotOutsidePeriod(snapshot,period))return reply.code(409).send({error:"school_import_record_outside_preview_period"});
  let job:Record<string,any>;
  try{job=await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))",[vaultId,input.previewJobId]);
    const prior=await client.query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='school_import_apply' AND input->>'previewJobId'=$2",[vaultId,input.previewJobId]);
    if(prior.rows[0])return prior.rows[0];
    const counts=await applyInSchoolSnapshot(client,vaultId,snapshot);
    const limitations=["This is a dated browser snapshot, not continuous InSchool synchronization.","Categories absent from this capture were not imported."];
    if(!snapshot.records.some(record=>record.kind==="attendance"))limitations.push("Attendance was not captured in this snapshot.");
    if(!snapshot.records.some(record=>record.kind==="grade"))limitations.push("Grades were not captured in this snapshot.");
    limitations.push("Assignments and assessments were not captured in this snapshot.");
    const result=schoolImportApplyResultSchema.parse({type:"school_import_apply",previewJobId:input.previewJobId,sourceTimestamp:snapshot.source_timestamp,counts,snapshotOnly:true,liveConnectionCreated:false,writesApplied:true,limitations});
    const payload=JSON.stringify({type:"school_import_apply",previewJobId:input.previewJobId,attachmentId}),created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'school_import_apply','succeeded','snapshot_applied',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);
    await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({previewJobId:input.previewJobId}),JSON.stringify(result)]);
    return created.rows[0];
  });}catch(error){if(error instanceof Error&&error.message==="school_snapshot_linked_record_unavailable")return reply.code(409).send({error:error.message});throw error;}
  return reply.code(202).send(mapJobHandle(job));
});

app.get("/api/v1/vaults/:vaultId/school/overview",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const raw=request.query as {from?:string;to?:string;connection_ids?:string};idSchema.parse(vaultId);if(!raw.from||!raw.to||Number.isNaN(Date.parse(raw.from))||Number.isNaN(Date.parse(raw.to))||Date.parse(raw.to)<=Date.parse(raw.from)||Date.parse(raw.to)-Date.parse(raw.from)>366*86_400_000)return reply.code(400).send({error:"invalid_school_overview_window"});const requestedIds=raw.connection_ids?[...new Set(raw.connection_ids.split(",").filter(Boolean))]:[];for(const id of requestedIds)idSchema.parse(id);const [subjects,courses,lessons,assignments,assessments,connections,materials,plans,sessions]=await Promise.all([query("SELECT * FROM school_subjects WHERE vault_id=$1 AND archived_at IS NULL ORDER BY lower(name),id",[vaultId]),query("SELECT * FROM school_courses WHERE vault_id=$1 AND archived_at IS NULL ORDER BY lower(name),id",[vaultId]),query("SELECT * FROM school_lessons WHERE vault_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC,id",[vaultId]),query("SELECT * FROM school_assignments WHERE vault_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC,id",[vaultId]),query("SELECT * FROM school_assessments WHERE vault_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC,id",[vaultId]),query("SELECT * FROM integration_connections WHERE vault_id=$1 AND disconnected_at IS NULL AND ($2::uuid[] IS NULL OR id=ANY($2::uuid[])) ORDER BY id",[vaultId,requestedIds.length?requestedIds:null]),query("SELECT * FROM source_objects WHERE vault_id=$1 AND excluded=false AND access_state='available' AND ($2::uuid[] IS NULL OR connection_id=ANY($2::uuid[])) ORDER BY updated_at DESC,id LIMIT 500",[vaultId,requestedIds.length?requestedIds:null]),query("SELECT id FROM study_plans WHERE vault_id=$1 AND archived_at IS NULL AND status IN ('draft','active') ORDER BY id",[vaultId]),query("SELECT id FROM study_sessions WHERE vault_id=$1 AND archived_at IS NULL AND created_at<$3 AND updated_at>=$2 ORDER BY id",[vaultId,raw.from,raw.to])]);if(requestedIds.length&&connections.rows.length!==requestedIds.length)return reply.code(400).send({error:"school_overview_connection_not_found"});const instantFor=(spec:any)=>spec?.kind==="exact"?spec.dueAt??spec.startsAt:spec?.kind==="date_only"?`${spec.date}T00:00:00.000Z`:null,within=(spec:any)=>{const value=instantFor(spec);return value!==null&&value>=raw.from!&&value<raw.to!;};const mappedLessons=lessons.rows.filter(row=>within(row.time_spec)).map(mapSchoolLesson),mappedAssignments=assignments.rows.filter(row=>within(row.due)).map(mapSchoolAssignment),mappedAssessments=assessments.rows.filter(row=>within(row.time_spec)).map(mapSchoolAssessment);const approvals=new Set<string>(connections.rows.flatMap(row=>(row.selection_approvals?.sensitiveDataOptIns??[]) as string[]));const explicitSensitive=requestedIds.length>0;const [attendanceCount,gradeCount,coverageRows]=await Promise.all([explicitSensitive&&approvals.has("attendance")?query("SELECT count(*)::int AS count FROM attendance_records WHERE vault_id=$1 AND archived_at IS NULL AND record_date>=$2::timestamptz::date AND record_date<$3::timestamptz::date",[vaultId,raw.from,raw.to]):Promise.resolve({rows:[{count:0}]}),explicitSensitive&&approvals.has("grades")?query("SELECT count(*)::int AS count FROM performance_grades WHERE vault_id=$1 AND archived_at IS NULL AND grade_date>=$2::timestamptz::date AND grade_date<$3::timestamptz::date",[vaultId,raw.from,raw.to]):Promise.resolve({rows:[{count:0}]}),connections.rows.length?query("SELECT connection_id,freshness,count(*)::int AS count FROM source_objects WHERE vault_id=$1 AND connection_id=ANY($2::uuid[]) GROUP BY connection_id,freshness",[vaultId,connections.rows.map(row=>row.id)]):Promise.resolve({rows:[] as Record<string,any>[]})]);const coverage=connections.rows.map(row=>{const counts={current:0,stale:0,unverified:0,tombstoned:0};for(const item of coverageRows.rows.filter(item=>item.connection_id===row.id))counts[item.freshness as keyof typeof counts]=Number(item.count);const limitations:string[]=[];if(row.state!=="connected"&&row.state!=="import_only")limitations.push(`Connection state is ${row.state}.`);if(row.state==="import_only")limitations.push("Snapshot/import-only coverage can be incomplete and stale.");if(!row.last_success_at)limitations.push("No successful source refresh has been recorded.");return{connectionId:row.id,state:row.state,lastSuccessAt:row.last_success_at?iso(row.last_success_at):null,freshness:counts,limitations};});return schoolOverviewSchema.parse({window:{from:new Date(raw.from).toISOString(),to:new Date(raw.to).toISOString()},subjects:subjects.rows.map(mapSchoolSubject),courses:courses.rows.map(mapSchoolCourse),lessons:mappedLessons,assignments:mappedAssignments,assessments:mappedAssessments,materials:materials.rows.map(mapSourceObject),studyLinks:{activePlanIds:plans.rows.map(row=>row.id),sessionIds:sessions.rows.map(row=>row.id)},sensitiveData:{attendance:explicitSensitive&&approvals.has("attendance")?{recordCount:Number(attendanceCount.rows[0].count),coverage:"explicit_opt_in"}:null,grades:explicitSensitive&&approvals.has("grades")?{recordCount:Number(gradeCount.rows[0].count),coverage:"explicit_opt_in"}:null,reason:explicitSensitive?"Sensitive summaries appear only for separately selected and approved datasets.":"Grades and attendance are excluded by default; pass explicit approved connection_ids to include summaries."},coverage,generatedAt:new Date().toISOString()});
});

app.get("/api/v1/vaults/:vaultId/school/connections/:connectionId/readiness",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const result=await query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]);if(!result.rows[0])return reply.code(404).send({error:"connection_not_found"});
  const connection=mapIntegrationConnection(result.rows[0]);const schoolCapabilities=connection.capabilities.filter(capability=>capability.key.startsWith("visma")||capability.key.includes("school"));const live=schoolCapabilities.some(capability=>capability.enabled&&capability.verifiedAt&&capability.mode==="live_read");const snapshot=connection.provider==="visma_inschool"&&!live;const routeKind=live?"live_adapter" as const:snapshot?"import_snapshot" as const:"unsupported" as const;
  const limitations=[...schoolCapabilities.map(capability=>capability.limitation).filter((value):value is string=>Boolean(value)),...(!schoolCapabilities.length?["This connection has no registered school-data capability."]:[]),...(snapshot?["Only owner-provided InSchool export snapshots are approved; this is not a live connection."]:[]),...(live&&connection.state!=="connected"?[`The verified adapter is currently ${connection.state}.`]:[])];
  return schoolReadinessReportSchema.parse({connectionId,provider:connection.provider,state:connection.state,route:{kind:routeKind,approved:live||snapshot,registeredReturnTargetRequired:live},consent:{credentialConfigured:connection.credentialConfigured,resourceSelectionRecorded:false},capabilityTests:schoolCapabilities.map(capability=>({...capability,passed:Boolean(capability.enabled&&capability.verifiedAt)})),readyForLiveSync:live&&connection.state==="connected",snapshotOnly:snapshot,lastSuccessAt:connection.lastSuccessAt,limitations:[...new Set(limitations)]});
});

app.get("/api/v1/vaults/:vaultId/school/assignments", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  const { courseId, status = "active", limit: rawLimit } = request.query as { courseId?: string; status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !["active", "archived", "all"].includes(status)) return reply.code(400).send({ error: "invalid_assignment_filter" });
  const result = await query(
    `SELECT a.*,l.source_object_id,seen.source_record AS submission_record,seen.source_timestamp AS submission_timestamp,
      CASE WHEN seen.source_timestamp IS NULL THEN NULL ELSE seen.source_timestamp=latest.source_timestamp END AS provider_seen_in_latest_snapshot
     FROM school_assignments a LEFT JOIN school_microsoft_links l ON l.assignment_id=a.id AND l.vault_id=a.vault_id
     LEFT JOIN LATERAL (SELECT source_origin,source_timestamp,source_record FROM school_snapshot_links WHERE vault_id=a.vault_id AND assignment_id=a.id AND record_kind='assignment' AND source_origin='https://assignments.edu.cloud.microsoft' ORDER BY source_timestamp DESC LIMIT 1) seen ON true
     LEFT JOIN LATERAL (SELECT max(source_timestamp) AS source_timestamp FROM school_snapshot_links WHERE vault_id=a.vault_id AND source_origin=seen.source_origin AND record_kind='assignment') latest ON true
     WHERE a.vault_id=$1 AND ($2::uuid IS NULL OR a.course_id=$2)
     AND ($3='all' OR ($3='active' AND a.archived_at IS NULL) OR ($3='archived' AND a.archived_at IS NOT NULL))
     ORDER BY a.archived_at NULLS FIRST,
       CASE WHEN a.due->>'kind'='exact' THEN (a.due->>'dueAt')::timestamptz ELSE NULL END NULLS LAST,
       a.updated_at DESC, a.id LIMIT $4`, [vaultId, courseId ?? null, status, limit]
  );
  return { items: result.rows.map(mapSchoolAssignment), nextCursor: null };
});

app.get("/api/v1/vaults/:vaultId/school/assignments/:assignmentId", async (request, reply) => {
  const { vaultId, assignmentId } = request.params as { vaultId: string; assignmentId: string }; idSchema.parse(vaultId); idSchema.parse(assignmentId);
  const result = await query(`SELECT a.*,l.source_object_id,seen.source_record AS submission_record,seen.source_timestamp AS submission_timestamp,
    CASE WHEN seen.source_timestamp IS NULL THEN NULL ELSE seen.source_timestamp=latest.source_timestamp END AS provider_seen_in_latest_snapshot
    FROM school_assignments a LEFT JOIN school_microsoft_links l ON l.assignment_id=a.id AND l.vault_id=a.vault_id
    LEFT JOIN LATERAL (SELECT source_origin,source_timestamp,source_record FROM school_snapshot_links WHERE vault_id=a.vault_id AND assignment_id=a.id AND record_kind='assignment' AND source_origin='https://assignments.edu.cloud.microsoft' ORDER BY source_timestamp DESC LIMIT 1) seen ON true
    LEFT JOIN LATERAL (SELECT max(source_timestamp) AS source_timestamp FROM school_snapshot_links WHERE vault_id=a.vault_id AND source_origin=seen.source_origin AND record_kind='assignment') latest ON true
    WHERE a.vault_id=$1 AND a.id=$2`, [vaultId, assignmentId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "school_assignment_not_found" }); return mapSchoolAssignment(result.rows[0]);
});

app.get("/api/v1/vaults/:vaultId/school/assignments/:assignmentId/sources", async (request, reply) => {
  const { vaultId, assignmentId } = request.params as { vaultId: string; assignmentId: string };
  idSchema.parse(vaultId); idSchema.parse(assignmentId);
  const assignment = await query("SELECT instructions_source_ids,material_source_ids FROM school_assignments WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, assignmentId]);
  if (!assignment.rows[0]) return reply.code(404).send({ error: "school_assignment_not_found" });
  const instructionIds: string[] = assignment.rows[0].instructions_source_ids ?? [];
  const materialIds: string[] = assignment.rows[0].material_source_ids ?? [];
  const ids = [...new Set([...instructionIds, ...materialIds])];
  const sources = ids.length ? await query("SELECT id,kind,original_text,source_url,mime_type,created_at FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, ids]) : { rows: [] };
  const byId = new Map(sources.rows.map(row => [row.id, row]));
  reply.header("cache-control", "no-store");
  return { items: ids.map(id => {
    const source = byId.get(id);
    return { sourceId: id, role: instructionIds.includes(id) ? "instructions" : "material", kind: source?.kind ?? "unavailable", text: source?.original_text ?? null, sourceUrl: source?.source_url ?? null, mimeType: source?.mime_type ?? null, storedAt: source?.created_at ? iso(source.created_at) : null };
  }) };
});

app.post("/api/v1/vaults/:vaultId/school/assignments", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createSchoolAssignmentSchema.parse(request.body);
  if (input.due.kind !== "unknown" && !isSupportedTimezone(input.due.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const created = await transaction(async (client) => {
    const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.courseId]); if (!course.rowCount) return "assignment_course_not_found" as const;
    const instructionIds = [...new Set(input.instructionsSourceIds)]; const materialIds = [...new Set(input.materialSourceIds)]; const sourceIds = [...new Set([...instructionIds, ...materialIds])]; const taskIds = [...new Set(input.taskIds)];
    if (sourceIds.length) { const valid = await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]); if (valid.rowCount !== sourceIds.length) return "assignment_source_not_found" as const; }
    if (taskIds.length) { const valid = await client.query("SELECT id FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, taskIds]); if (valid.rowCount !== taskIds.length) return "assignment_task_not_found" as const; }
    const result = await client.query(
      `INSERT INTO school_assignments(vault_id,course_id,title,instructions_source_ids,due,material_source_ids,task_ids,origin)
       VALUES ($1,$2,$3,$4::uuid[],$5::jsonb,$6::uuid[],$7::uuid[],'owner') RETURNING *`, [vaultId, input.courseId, input.title, instructionIds, JSON.stringify(input.due), materialIds, taskIds]
    ); return result.rows[0];
  });
  if (typeof created === "string") return reply.code(400).send({ error: created }); return reply.code(201).send(mapSchoolAssignment(created));
});

app.patch("/api/v1/vaults/:vaultId/school/assignments/:assignmentId", async (request, reply) => {
  const { vaultId, assignmentId } = request.params as { vaultId: string; assignmentId: string }; idSchema.parse(vaultId); idSchema.parse(assignmentId); const input = updateSchoolAssignmentSchema.parse(request.body);
  if (input.patch.due && input.patch.due.kind !== "unknown" && !isSupportedTimezone(input.patch.due.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM school_assignments WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, assignmentId]); const assignment = current.rows[0];
    if (!assignment) return null; if (assignment.revision !== input.expectedRevision) return "stale_revision" as const; if (assignment.origin !== "owner") return "source_owned_assignment" as const;
    const courseId = input.patch.courseId ?? assignment.course_id; const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, courseId]); if (!course.rowCount) return "assignment_course_not_found" as const;
    const instructionIds = input.patch.instructionsSourceIds === undefined ? assignment.instructions_source_ids : [...new Set(input.patch.instructionsSourceIds)]; const materialIds = input.patch.materialSourceIds === undefined ? assignment.material_source_ids : [...new Set(input.patch.materialSourceIds)]; const sourceIds = [...new Set([...instructionIds, ...materialIds])]; const taskIds = input.patch.taskIds === undefined ? assignment.task_ids : [...new Set(input.patch.taskIds)];
    if (sourceIds.length) { const valid = await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]); if (valid.rowCount !== sourceIds.length) return "assignment_source_not_found" as const; }
    if (taskIds.length) { const valid = await client.query("SELECT id FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, taskIds]); if (valid.rowCount !== taskIds.length) return "assignment_task_not_found" as const; }
    const result = await client.query(
      `UPDATE school_assignments SET course_id=$3,title=$4,instructions_source_ids=$5::uuid[],due=$6::jsonb,material_source_ids=$7::uuid[],task_ids=$8::uuid[],preparation_status=$9,revision=revision+1,updated_at=now()
       WHERE vault_id=$1 AND id=$2 RETURNING *`, [vaultId, assignmentId, courseId, input.patch.title ?? assignment.title, instructionIds, JSON.stringify(input.patch.due ?? assignment.due), materialIds, taskIds, input.patch.preparationStatus ?? assignment.preparation_status]
    ); return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "school_assignment_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapSchoolAssignment(updated);
});

app.delete("/api/v1/vaults/:vaultId/school/assignments/:assignmentId", async (request, reply) => {
  const { vaultId, assignmentId } = request.params as { vaultId: string; assignmentId: string }; idSchema.parse(vaultId); idSchema.parse(assignmentId);
  const revision = revisionFromIfMatch(request.headers["if-match"]); if (revision === null) return reply.code(428).send({ error: "if_match_required" });
  const result = await query(`UPDATE school_assignments SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`, [vaultId, assignmentId, revision]);
  if (!result.rowCount) return reply.code(409).send({ error: "assignment_not_found_stale_source_owned_or_archived" }); return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/school/assignments/:assignmentId/archive",async(request,reply)=>{const {vaultId,assignmentId}=request.params as {vaultId:string;assignmentId:string};idSchema.parse(vaultId);idSchema.parse(assignmentId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=archiveSchoolAssignmentOverlaySchema.parse(request.body??{});const result=await query("UPDATE school_assignments SET archived_at=now(),archive_reason=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,assignmentId,expectedRevision,input.reason]);if(!result.rows[0])return reply.code(409).send({error:"assignment_not_found_stale_or_archived"});return mapSchoolAssignment(result.rows[0]);});

app.get("/api/v1/vaults/:vaultId/school/lessons", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { courseId, status = "active", limit: rawLimit } = request.query as { courseId?: string; status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !["active", "archived", "all"].includes(status)) return reply.code(400).send({ error: "invalid_lesson_filter" });
  const result = await query(`SELECT * FROM school_lessons WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3='all' OR ($3='active' AND archived_at IS NULL) OR ($3='archived' AND archived_at IS NOT NULL)) ORDER BY updated_at DESC,id LIMIT $4`, [vaultId, courseId ?? null, status, limit]);
  return { items: result.rows.map(mapSchoolLesson), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/school/lessons", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createSchoolLessonSchema.parse(request.body);
  if (input.timeSpec.kind === "exact" && !isSupportedTimezone(input.timeSpec.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const created = await transaction(async (client) => {
    const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.courseId]); if (!course.rowCount) return "lesson_course_not_found" as const;
    if (input.calendarEventId) { const event = await client.query("SELECT id FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL", [vaultId, input.calendarEventId]); if (!event.rowCount) return "lesson_calendar_event_not_found" as const; }
    const anchors = [...new Set(input.sourceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "lesson_source_anchor_not_current" as const; }
    try { const result = await client.query(`INSERT INTO school_lessons(vault_id,course_id,calendar_event_id,time_spec,room,source_anchor_ids,origin) VALUES ($1,$2,$3,$4::jsonb,$5,$6::uuid[],'owner') RETURNING *`, [vaultId, input.courseId, input.calendarEventId ?? null, JSON.stringify(input.calendarEventId ? { kind: "unknown" } : input.timeSpec), input.room ?? null, anchors]); return result.rows[0]; }
    catch (error: any) { if (error?.code === "23505") return "lesson_event_already_linked" as const; throw error; }
  });
  if (typeof created === "string") return reply.code(created === "lesson_event_already_linked" ? 409 : 400).send({ error: created }); return reply.code(201).send(mapSchoolLesson(created));
});

app.get("/api/v1/vaults/:vaultId/school/lessons/:schoolLessonId", async (request, reply) => {
  const { vaultId, schoolLessonId } = request.params as { vaultId: string; schoolLessonId: string }; idSchema.parse(vaultId); idSchema.parse(schoolLessonId);
  const result = await query("SELECT * FROM school_lessons WHERE vault_id=$1 AND id=$2", [vaultId, schoolLessonId]); if (!result.rows[0]) return reply.code(404).send({ error: "school_lesson_not_found" }); return mapSchoolLesson(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId/school/lessons/:schoolLessonId", async (request, reply) => {
  const { vaultId, schoolLessonId } = request.params as { vaultId: string; schoolLessonId: string }; idSchema.parse(vaultId); idSchema.parse(schoolLessonId); const input = updateSchoolLessonSchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM school_lessons WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, schoolLessonId]); const lesson = current.rows[0]; if (!lesson) return null;
    if (lesson.revision !== input.expectedRevision) return "stale_revision" as const; if (lesson.origin !== "owner") return "source_owned_lesson" as const;
    const courseId = input.patch.courseId ?? lesson.course_id; const eventId = input.patch.calendarEventId === undefined ? lesson.calendar_event_id : input.patch.calendarEventId; const timeSpec = input.patch.timeSpec ?? lesson.time_spec;
    if (eventId && timeSpec.kind !== "unknown") return "linked_event_owns_lesson_time" as const; if (timeSpec.kind === "exact" && !isSupportedTimezone(timeSpec.timezone)) return "unsupported_timezone" as const;
    const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, courseId]); if (!course.rowCount) return "lesson_course_not_found" as const;
    if (eventId) { const event = await client.query("SELECT id FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL", [vaultId, eventId]); if (!event.rowCount) return "lesson_calendar_event_not_found" as const; }
    const anchors = input.patch.sourceAnchorIds === undefined ? lesson.source_anchor_ids : [...new Set(input.patch.sourceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "lesson_source_anchor_not_current" as const; }
    try { const result = await client.query(`UPDATE school_lessons SET course_id=$3,calendar_event_id=$4,time_spec=$5::jsonb,room=$6,source_anchor_ids=$7::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *`, [vaultId, schoolLessonId, courseId, eventId, JSON.stringify(timeSpec), input.patch.room === undefined ? lesson.room : input.patch.room, anchors]); return result.rows[0]; }
    catch (error: any) { if (error?.code === "23505") return "lesson_event_already_linked" as const; throw error; }
  });
  if (!updated) return reply.code(404).send({ error: "school_lesson_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapSchoolLesson(updated);
});

app.delete("/api/v1/vaults/:vaultId/school/lessons/:schoolLessonId", async (request, reply) => {
  const { vaultId, schoolLessonId } = request.params as { vaultId: string; schoolLessonId: string }; idSchema.parse(vaultId); idSchema.parse(schoolLessonId); const revision = revisionFromIfMatch(request.headers["if-match"]);
  if (revision === null) return reply.code(428).send({ error: "if_match_required" }); const result = await query(`UPDATE school_lessons SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`, [vaultId, schoolLessonId, revision]);
  if (!result.rowCount) return reply.code(409).send({ error: "lesson_not_found_stale_source_owned_or_archived" }); return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/school/catch-up-plans",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createCatchUpPlanSchema.parse(request.body);const lessonIds=[...new Set(input.lessonIds)];const lessons=await query("SELECT id,revision,source_anchor_ids FROM school_lessons WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,lessonIds]);if(lessons.rowCount!==lessonIds.length)return reply.code(400).send({error:"catch_up_lesson_not_found"});for(const lesson of lessons.rows)if(input.expectedLessonRevisions[lesson.id]!==lesson.revision)return reply.code(409).send({error:"stale_lesson_revision",lessonId:lesson.id});const allowed=new Set(input.authorizedSourceIds);if(allowed.size){const valid=await query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,[...allowed]]);if(valid.rowCount!==allowed.size)return reply.code(400).send({error:"catch_up_source_not_found"});}const covered=[] as Array<{lessonId:string;sourceIds:string[];anchorIds:string[];suggestedActions:Array<{kind:"read_source";sourceId:string;label:string;estimatedMinutes:number|null}>}>;const uncovered:string[]=[];for(const lesson of lessons.rows){const anchorIds=[...new Set(lesson.source_anchor_ids as string[])];if(!anchorIds.length){uncovered.push(lesson.id);continue;}const sources=await query("SELECT DISTINCT n.source_id,n.title FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[]) AND n.source_id IS NOT NULL",[vaultId,anchorIds]);const rows=sources.rows.filter(row=>!allowed.size||allowed.has(row.source_id));if(!rows.length){uncovered.push(lesson.id);continue;}covered.push({lessonId:lesson.id,sourceIds:rows.map(row=>row.source_id),anchorIds,suggestedActions:rows.map(row=>({kind:"read_source" as const,sourceId:row.source_id,label:`Review source: ${row.title}`,estimatedMinutes:input.estimatePolicy==="bounded_default"?20:null}))});}const result=catchUpPlanResultSchema.parse({type:"catch_up_plan",lessonIds,coveredLessons:covered,uncoveredLessonIds:uncovered,message:uncovered.length?"Material for this lesson has not been found.":"Catch-up sources found. Review the linked originals; this does not claim complete class coverage.",writesApplied:false});const payload={type:"catch_up_plan",...input};const serialized=JSON.stringify(payload);const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'catch_up_plan','succeeded','evidence_review_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({lessonCount:lessonIds.length,writesApplied:false}),JSON.stringify({covered:covered.length,uncovered:uncovered.length,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/school/assessments", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { courseId, kind, status = "active", limit: rawLimit } = request.query as { courseId?: string; kind?: string; status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !["active", "archived", "all"].includes(status) || (kind && !["exam","test","quiz","presentation","project","other"].includes(kind))) return reply.code(400).send({ error: "invalid_assessment_filter" });
  const result = await query(`SELECT * FROM school_assessments WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3::text IS NULL OR kind=$3) AND ($4='all' OR ($4='active' AND archived_at IS NULL) OR ($4='archived' AND archived_at IS NOT NULL)) ORDER BY updated_at DESC,id LIMIT $5`, [vaultId, courseId ?? null, kind ?? null, status, limit]);
  return { items: result.rows.map(mapSchoolAssessment), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/school/assessments", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createSchoolAssessmentSchema.parse(request.body);
  if (input.timeSpec.kind !== "unknown" && !isSupportedTimezone(input.timeSpec.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const created = await transaction(async (client) => {
    const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.courseId]); if (!course.rowCount) return "assessment_course_not_found" as const;
    const sourceIds = [...new Set(input.materialScope?.sourceIds ?? [])]; if (sourceIds.length) { const valid = await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]); if (valid.rowCount !== sourceIds.length) return "assessment_material_source_not_found" as const; }
    const anchors = [...new Set(input.sourceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "assessment_source_anchor_not_current" as const; }
    const result = await client.query(`INSERT INTO school_assessments(vault_id,course_id,title,kind,time_spec,material_scope,official_weight,source_anchor_ids,origin) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::uuid[],'owner') RETURNING *`, [vaultId, input.courseId, input.title, input.kind, JSON.stringify(input.timeSpec), input.materialScope ? JSON.stringify({ ...input.materialScope, sourceIds }) : null, input.officialWeight, anchors]); return result.rows[0];
  });
  if (typeof created === "string") return reply.code(400).send({ error: created }); return reply.code(201).send(mapSchoolAssessment(created));
});

app.get("/api/v1/vaults/:vaultId/school/assessments/:assessmentId", async (request, reply) => {
  const { vaultId, assessmentId } = request.params as { vaultId: string; assessmentId: string }; idSchema.parse(vaultId); idSchema.parse(assessmentId); const result = await query("SELECT * FROM school_assessments WHERE vault_id=$1 AND id=$2", [vaultId, assessmentId]); if (!result.rows[0]) return reply.code(404).send({ error: "assessment_not_found" }); return mapSchoolAssessment(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId/school/assessments/:assessmentId", async (request, reply) => {
  const { vaultId, assessmentId } = request.params as { vaultId: string; assessmentId: string }; idSchema.parse(vaultId); idSchema.parse(assessmentId); const input = updateSchoolAssessmentSchema.parse(request.body);
  if (input.patch.timeSpec && input.patch.timeSpec.kind !== "unknown" && !isSupportedTimezone(input.patch.timeSpec.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT * FROM school_assessments WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, assessmentId]); const item = current.rows[0]; if (!item) return null; if (item.revision !== input.expectedRevision) return "stale_revision" as const; if (item.origin !== "owner") return "source_owned_assessment" as const;
    const courseId = input.patch.courseId ?? item.course_id; const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, courseId]); if (!course.rowCount) return "assessment_course_not_found" as const;
    const material = input.patch.materialScope === undefined ? item.material_scope : input.patch.materialScope; const sourceIds = [...new Set(material?.sourceIds ?? [])]; if (sourceIds.length) { const valid = await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]); if (valid.rowCount !== sourceIds.length) return "assessment_material_source_not_found" as const; }
    const anchors = input.patch.sourceAnchorIds === undefined ? item.source_anchor_ids : [...new Set(input.patch.sourceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "assessment_source_anchor_not_current" as const; }
    const result = await client.query(`UPDATE school_assessments SET course_id=$3,title=$4,kind=$5,time_spec=$6::jsonb,material_scope=$7::jsonb,official_weight=$8,source_anchor_ids=$9::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *`, [vaultId, assessmentId, courseId, input.patch.title ?? item.title, input.patch.kind ?? item.kind, JSON.stringify(input.patch.timeSpec ?? item.time_spec), material ? JSON.stringify({ ...material, sourceIds }) : null, input.patch.officialWeight === undefined ? item.official_weight : input.patch.officialWeight, anchors]); return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "assessment_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapSchoolAssessment(updated);
});

app.delete("/api/v1/vaults/:vaultId/school/assessments/:assessmentId", async (request, reply) => {
  const { vaultId, assessmentId } = request.params as { vaultId: string; assessmentId: string }; idSchema.parse(vaultId); idSchema.parse(assessmentId); const revision = revisionFromIfMatch(request.headers["if-match"]); if (revision === null) return reply.code(428).send({ error: "if_match_required" });
  const result = await query(`UPDATE school_assessments SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`, [vaultId, assessmentId, revision]); if (!result.rowCount) return reply.code(409).send({ error: "assessment_not_found_stale_source_owned_or_archived" }); return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/attendance/records", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { courseId, status = "active", limit: rawLimit } = request.query as { courseId?: string; status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !["active","archived","all"].includes(status)) return reply.code(400).send({ error: "invalid_attendance_filter" });
  const result = await query(`SELECT * FROM attendance_records WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3='all' OR ($3='active' AND archived_at IS NULL) OR ($3='archived' AND archived_at IS NOT NULL)) ORDER BY record_date DESC,updated_at DESC,id LIMIT $4`, [vaultId, courseId ?? null, status, limit]);
  return { items: result.rows.map(mapAttendanceRecord), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/attendance/records", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createAttendanceRecordSchema.parse(request.body);
  if (input.timeSpec.kind !== "unknown" && !isSupportedTimezone(input.timeSpec.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const created = await transaction(async (client) => {
    const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId,input.courseId]); if (!course.rowCount) return "attendance_course_not_found" as const;
    if (input.lessonId) { const lesson = await client.query("SELECT id FROM school_lessons WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL", [vaultId,input.lessonId,input.courseId]); if (!lesson.rowCount) return "attendance_lesson_not_found_or_wrong_course" as const; }
    const anchors=[...new Set(input.sourceAnchorIds)]; if(anchors.length){const valid=await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`,[vaultId,anchors]);if(valid.rowCount!==anchors.length)return "attendance_source_anchor_not_current" as const;}
    const result=await client.query(`INSERT INTO attendance_records(vault_id,course_id,lesson_id,record_date,time_spec,raw_status,normalized_status,excusal_status,duration,units,source_anchor_ids,origin) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11::uuid[],'owner') RETURNING *`,[vaultId,input.courseId,input.lessonId??null,input.date,JSON.stringify(input.timeSpec),input.rawStatus,input.normalizedStatus,input.excusalStatus,input.duration,input.units,anchors]);return result.rows[0];
  });
  if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapAttendanceRecord(created));
});

app.get("/api/v1/vaults/:vaultId/attendance/records/:attendanceRecordId", async(request,reply)=>{const {vaultId,attendanceRecordId}=request.params as {vaultId:string;attendanceRecordId:string};idSchema.parse(vaultId);idSchema.parse(attendanceRecordId);const result=await query("SELECT * FROM attendance_records WHERE vault_id=$1 AND id=$2",[vaultId,attendanceRecordId]);if(!result.rows[0])return reply.code(404).send({error:"attendance_record_not_found"});return mapAttendanceRecord(result.rows[0]);});

app.patch("/api/v1/vaults/:vaultId/attendance/records/:attendanceRecordId",async(request,reply)=>{const {vaultId,attendanceRecordId}=request.params as {vaultId:string;attendanceRecordId:string};idSchema.parse(vaultId);idSchema.parse(attendanceRecordId);const input=updateAttendanceRecordSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM attendance_records WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,attendanceRecordId]);const item=current.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;if(item.origin!=="owner")return "source_owned_attendance" as const;const courseId=input.patch.courseId??item.course_id;const lessonId=input.patch.lessonId===undefined?item.lesson_id:input.patch.lessonId;const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,courseId]);if(!course.rowCount)return "attendance_course_not_found" as const;if(lessonId){const lesson=await client.query("SELECT id FROM school_lessons WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL",[vaultId,lessonId,courseId]);if(!lesson.rowCount)return "attendance_lesson_not_found_or_wrong_course" as const;}const timeSpec=input.patch.timeSpec??item.time_spec;if(timeSpec.kind!=="unknown"&&!isSupportedTimezone(timeSpec.timezone))return "unsupported_timezone" as const;const anchors=input.patch.sourceAnchorIds===undefined?item.source_anchor_ids:[...new Set(input.patch.sourceAnchorIds)];if(anchors.length){const valid=await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`,[vaultId,anchors]);if(valid.rowCount!==anchors.length)return "attendance_source_anchor_not_current" as const;}const result=await client.query(`UPDATE attendance_records SET course_id=$3,lesson_id=$4,record_date=$5,time_spec=$6::jsonb,raw_status=$7,normalized_status=$8,excusal_status=$9,duration=$10,units=$11,source_anchor_ids=$12::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *`,[vaultId,attendanceRecordId,courseId,lessonId,input.patch.date??(typeof item.record_date==="string"?item.record_date.slice(0,10):iso(item.record_date).slice(0,10)),JSON.stringify(timeSpec),input.patch.rawStatus??item.raw_status,input.patch.normalizedStatus??item.normalized_status,input.patch.excusalStatus??item.excusal_status,input.patch.duration===undefined?item.duration:input.patch.duration,input.patch.units===undefined?item.units:input.patch.units,anchors]);return result.rows[0];});if(!updated)return reply.code(404).send({error:"attendance_record_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapAttendanceRecord(updated);});

app.delete("/api/v1/vaults/:vaultId/attendance/records/:attendanceRecordId",async(request,reply)=>{const {vaultId,attendanceRecordId}=request.params as {vaultId:string;attendanceRecordId:string};idSchema.parse(vaultId);idSchema.parse(attendanceRecordId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query(`UPDATE attendance_records SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`,[vaultId,attendanceRecordId,revision]);if(!result.rowCount)return reply.code(409).send({error:"attendance_not_found_stale_source_owned_or_archived"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/attendance/summary",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {courseId,from,to,aggregation}=request.query as {courseId?:string;from?:string;to?:string;aggregation?:AttendanceAggregation};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);if(!from||!to||!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to||!aggregation||!["lessons","minutes","source_defined"].includes(aggregation))return reply.code(400).send({error:"invalid_attendance_summary_range"});const result=await query(`SELECT normalized_status,excusal_status,duration,units,source_anchor_ids FROM attendance_records WHERE vault_id=$1 AND archived_at IS NULL AND ($2::uuid IS NULL OR course_id=$2) AND record_date BETWEEN $3::date AND $4::date`,[vaultId,courseId??null,from,to]);const summary=summarizeAttendance(result.rows.map(row=>({normalizedStatus:row.normalized_status,excusalStatus:row.excusal_status,duration:row.duration===null?null:Number(row.duration),units:row.units,sourceAnchorIds:row.source_anchor_ids})),aggregation);return attendanceSummarySchema.parse({from,to,aggregation,units:aggregation,...summary});});

app.post("/api/v1/vaults/:vaultId/attendance/catch-up-preview",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=previewAttendanceCatchUpSchema.parse(request.body);const records=await query("SELECT id,lesson_id,revision,normalized_status FROM attendance_records WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,input.attendanceRecordIds]);if(records.rows.length!==input.attendanceRecordIds.length)return reply.code(400).send({error:"attendance_record_not_found"});for(const record of records.rows){if(input.expectedRevisions[record.id]!==record.revision)return reply.code(409).send({error:"stale_attendance_revision",attendanceRecordId:record.id});if(!["absent","late"].includes(record.normalized_status))return reply.code(409).send({error:"attendance_record_not_catch_up_eligible",attendanceRecordId:record.id});}const allowedIds=[...new Set(input.materialScope?.sourceIds??[])];if(allowedIds.length){const valid=await query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,allowedIds]);if(valid.rows.length!==allowedIds.length)return reply.code(400).send({error:"catch_up_source_not_found"});}const lessonIds=[...new Set(records.rows.map(row=>row.lesson_id as string|null).filter((id):id is string=>Boolean(id)))],lessons=lessonIds.length?await query("SELECT id,source_anchor_ids FROM school_lessons WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,lessonIds]):{rows:[] as Record<string,any>[]};const allowed=new Set(allowedIds),scopeExplicit=input.materialScope!==null,covered=[] as Array<{lessonId:string;sourceIds:string[];anchorIds:string[];suggestedActions:Array<{kind:"read_source";sourceId:string;label:string;estimatedMinutes:number|null}>}>,uncovered:string[]=[];for(const lessonId of lessonIds){const lesson=lessons.rows.find(row=>row.id===lessonId);if(!lesson){uncovered.push(lessonId);continue;}const anchorIds=[...new Set(lesson.source_anchor_ids as string[])];const sources=anchorIds.length?await query("SELECT DISTINCT n.source_id,n.title FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[]) AND n.source_id IS NOT NULL",[vaultId,anchorIds]):{rows:[] as Record<string,any>[]};const permitted=sources.rows.filter(row=>!scopeExplicit||allowed.has(row.source_id));if(!permitted.length){uncovered.push(lessonId);continue;}covered.push({lessonId,sourceIds:permitted.map(row=>row.source_id),anchorIds,suggestedActions:permitted.map(row=>({kind:"read_source",sourceId:row.source_id,label:`Review source: ${row.title}`,estimatedMinutes:input.constraints.estimatePolicy==="bounded_default"?20:null}))});}const unassociatedCount=records.rows.filter(row=>!row.lesson_id).length;const result=catchUpPlanResultSchema.parse({type:"catch_up_plan",lessonIds,coveredLessons:covered,uncoveredLessonIds:uncovered,message:[unassociatedCount?`${unassociatedCount} attendance record(s) have no linked lesson and cannot be matched automatically.`:"",uncovered.length?"Some linked lessons have no permitted source evidence.":"",covered.length?"Review the linked originals; this preview does not claim complete class coverage.":"No evidenced catch-up material was found."].filter(Boolean).join(" "),writesApplied:false});const payload={type:"attendance_catch_up_preview",...input,lessonIds,unassociatedCount},serialized=JSON.stringify(payload);const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'catch_up_plan','succeeded','attendance_evidence_review_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({attendanceRecordCount:records.rows.length,writesApplied:false}),JSON.stringify({covered:covered.length,uncovered:uncovered.length,unassociatedCount,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));
});

app.get("/api/v1/vaults/:vaultId/performance/grades",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {courseId,status="active",limit:rawLimit}=request.query as {courseId?:string;status?:"active"|"archived"|"all";limit?:string};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200||!["active","archived","all"].includes(status))return reply.code(400).send({error:"invalid_grade_filter"});const result=await query(`SELECT * FROM performance_grades WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3='all' OR ($3='active' AND archived_at IS NULL) OR ($3='archived' AND archived_at IS NOT NULL)) ORDER BY grade_date DESC,id LIMIT $4`,[vaultId,courseId??null,status,limit]);return {items:result.rows.map(mapPerformanceGrade),nextCursor:null};});

app.post("/api/v1/vaults/:vaultId/performance/grades",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createPerformanceGradeSchema.parse(request.body);const created=await transaction(async client=>{const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.courseId]);if(!course.rowCount)return "grade_course_not_found" as const;if(input.assessmentId){const assessment=await client.query("SELECT id FROM school_assessments WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL",[vaultId,input.assessmentId,input.courseId]);if(!assessment.rowCount)return "grade_assessment_not_found_or_wrong_course" as const;}const anchors=[...new Set(input.sourceAnchorIds)];if(anchors.length){const valid=await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`,[vaultId,anchors]);if(valid.rowCount!==anchors.length)return "grade_source_anchor_not_current" as const;}const result=await client.query(`INSERT INTO performance_grades(vault_id,course_id,assessment_id,grade_value,grade_scale,grade_date,official_weight,source_anchor_ids,origin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid[],'owner') RETURNING *`,[vaultId,input.courseId,input.assessmentId??null,input.gradeValue,input.gradeScale,input.date,input.officialWeight,anchors]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapPerformanceGrade(created));});

app.get("/api/v1/vaults/:vaultId/performance/grades/:gradeId",async(request,reply)=>{const {vaultId,gradeId}=request.params as {vaultId:string;gradeId:string};idSchema.parse(vaultId);idSchema.parse(gradeId);const result=await query("SELECT * FROM performance_grades WHERE vault_id=$1 AND id=$2",[vaultId,gradeId]);if(!result.rows[0])return reply.code(404).send({error:"grade_not_found"});return mapPerformanceGrade(result.rows[0]);});

app.patch("/api/v1/vaults/:vaultId/performance/grades/:gradeId",async(request,reply)=>{const {vaultId,gradeId}=request.params as {vaultId:string;gradeId:string};idSchema.parse(vaultId);idSchema.parse(gradeId);const input=updatePerformanceGradeSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM performance_grades WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,gradeId]);const item=current.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;if(item.origin!=="owner")return "source_owned_grade" as const;const courseId=input.patch.courseId??item.course_id;const assessmentId=input.patch.assessmentId===undefined?item.assessment_id:input.patch.assessmentId;const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,courseId]);if(!course.rowCount)return "grade_course_not_found" as const;if(assessmentId){const assessment=await client.query("SELECT id FROM school_assessments WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL",[vaultId,assessmentId,courseId]);if(!assessment.rowCount)return "grade_assessment_not_found_or_wrong_course" as const;}const anchors=input.patch.sourceAnchorIds===undefined?item.source_anchor_ids:[...new Set(input.patch.sourceAnchorIds)];if(anchors.length){const valid=await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`,[vaultId,anchors]);if(valid.rowCount!==anchors.length)return "grade_source_anchor_not_current" as const;}const result=await client.query(`UPDATE performance_grades SET course_id=$3,assessment_id=$4,grade_value=$5,grade_scale=$6,grade_date=$7,official_weight=$8,source_anchor_ids=$9::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *`,[vaultId,gradeId,courseId,assessmentId,input.patch.gradeValue??item.grade_value,input.patch.gradeScale??item.grade_scale,input.patch.date??(typeof item.grade_date==="string"?item.grade_date.slice(0,10):iso(item.grade_date).slice(0,10)),input.patch.officialWeight===undefined?item.official_weight:input.patch.officialWeight,anchors]);return result.rows[0];});if(!updated)return reply.code(404).send({error:"grade_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapPerformanceGrade(updated);});

app.delete("/api/v1/vaults/:vaultId/performance/grades/:gradeId",async(request,reply)=>{const {vaultId,gradeId}=request.params as {vaultId:string;gradeId:string};idSchema.parse(vaultId);idSchema.parse(gradeId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query(`UPDATE performance_grades SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id`,[vaultId,gradeId,revision]);if(!result.rowCount)return reply.code(409).send({error:"grade_not_found_stale_source_owned_or_archived"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/school/grades",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const raw=request.query as {cursor?:string;limit?:string;course_id?:string;assessment_id?:string;official_or_manual?:string;origin?:string;status?:string};idSchema.parse(vaultId);if(raw.course_id)idSchema.parse(raw.course_id);if(raw.assessment_id)idSchema.parse(raw.assessment_id);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100||raw.official_or_manual&&!['official','manual'].includes(raw.official_or_manual)||raw.origin&&!['owner','provider'].includes(raw.origin)||raw.status&&!['active','archived','all'].includes(raw.status))return reply.code(400).send({error:"invalid_grade_record_filter"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_grade_record_cursor"});}}const status=raw.status??"active";const result=await query("SELECT * FROM performance_grades WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3::uuid IS NULL OR assessment_id=$3) AND ($4::text IS NULL OR record_kind=$4) AND ($5::text IS NULL OR origin=$5) AND ($6='all' OR ($6='active' AND archived_at IS NULL) OR ($6='archived' AND archived_at IS NOT NULL)) AND ($7::timestamptz IS NULL OR (created_at,id)<($7::timestamptz,$8::uuid)) ORDER BY created_at DESC,id DESC LIMIT $9",[vaultId,raw.course_id??null,raw.assessment_id??null,raw.official_or_manual??null,raw.origin??null,status,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),last=rows.at(-1);return{items:rows.map(mapGradeRecord),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});

app.post("/api/v1/vaults/:vaultId/school/grades",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createGradeRecordSchema.parse(request.body);const created=await transaction(async client=>{const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.courseId]);if(!course.rowCount)return"grade_course_not_found" as const;if(input.assessmentId){const assessment=await client.query("SELECT id FROM school_assessments WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL",[vaultId,input.assessmentId,input.courseId]);if(!assessment.rowCount)return"grade_assessment_not_found_or_wrong_course" as const;}if(input.sourceAnchorIds.length){const valid=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,input.sourceAnchorIds]);if(valid.rowCount!==input.sourceAnchorIds.length)return"grade_source_anchor_not_current" as const;}if(input.feedbackSourceId){const source=await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=$2",[vaultId,input.feedbackSourceId]);if(!source.rowCount)return"grade_feedback_source_not_found" as const;}const result=await client.query("INSERT INTO performance_grades(vault_id,course_id,assessment_id,grade_value,grade_scale,grade_date,official_weight,source_anchor_ids,origin,record_kind,feedback_source_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid[],'owner',$9,$10) RETURNING *",[vaultId,input.courseId,input.assessmentId??null,input.rawGrade,input.scale,input.date,input.weight,input.sourceAnchorIds,input.officialOrManual,input.feedbackSourceId]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapGradeRecord(created));});

app.get("/api/v1/vaults/:vaultId/school/grades/:gradeRecordId",async(request,reply)=>{const {vaultId,gradeRecordId}=request.params as {vaultId:string;gradeRecordId:string};idSchema.parse(vaultId);idSchema.parse(gradeRecordId);const result=await query("SELECT * FROM performance_grades WHERE vault_id=$1 AND id=$2",[vaultId,gradeRecordId]);if(!result.rows[0])return reply.code(404).send({error:"grade_record_not_found"});return mapGradeRecord(result.rows[0]);});

app.patch("/api/v1/vaults/:vaultId/school/grades/:gradeRecordId",async(request,reply)=>{const {vaultId,gradeRecordId}=request.params as {vaultId:string;gradeRecordId:string};idSchema.parse(vaultId);idSchema.parse(gradeRecordId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const patch=updateGradeRecordSchema.parse(request.body);const updated=await transaction(async client=>{const current=(await client.query("SELECT * FROM performance_grades WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,gradeRecordId])).rows[0];if(!current)return"not_found" as const;if(current.revision!==expectedRevision)return"stale_revision" as const;if(current.archived_at)return"grade_record_archived" as const;if(current.origin!=="owner")return"source_owned_grade_read_only" as const;const courseId=patch.courseId??current.course_id,assessmentId=patch.assessmentId===undefined?current.assessment_id:patch.assessmentId,anchors=patch.sourceAnchorIds??current.source_anchor_ids,feedbackSourceId=patch.feedbackSourceId===undefined?current.feedback_source_id:patch.feedbackSourceId;const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,courseId]);if(!course.rowCount)return"grade_course_not_found" as const;if(assessmentId){const assessment=await client.query("SELECT id FROM school_assessments WHERE vault_id=$1 AND id=$2 AND course_id=$3 AND archived_at IS NULL",[vaultId,assessmentId,courseId]);if(!assessment.rowCount)return"grade_assessment_not_found_or_wrong_course" as const;}if(anchors.length){const valid=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,anchors]);if(valid.rowCount!==anchors.length)return"grade_source_anchor_not_current" as const;}if(feedbackSourceId){const source=await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=$2",[vaultId,feedbackSourceId]);if(!source.rowCount)return"grade_feedback_source_not_found" as const;}const result=await client.query("UPDATE performance_grades SET course_id=$3,assessment_id=$4,grade_value=$5,grade_scale=$6,grade_date=$7,record_kind=$8,official_weight=$9,source_anchor_ids=$10::uuid[],feedback_source_id=$11,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,gradeRecordId,courseId,assessmentId,patch.rawGrade??current.grade_value,patch.scale??current.grade_scale,patch.date??(typeof current.grade_date==="string"?current.grade_date.slice(0,10):iso(current.grade_date).slice(0,10)),patch.officialOrManual??current.record_kind,patch.weight===undefined?current.official_weight:patch.weight,anchors,feedbackSourceId]);return result.rows[0];});if(updated==="not_found")return reply.code(404).send({error:"grade_record_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapGradeRecord(updated);});

app.delete("/api/v1/vaults/:vaultId/school/grades/:gradeRecordId",async(request,reply)=>{const {vaultId,gradeRecordId}=request.params as {vaultId:string;gradeRecordId:string};idSchema.parse(vaultId);idSchema.parse(gradeRecordId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=archiveGradeRecordSchema.parse(request.body??{});const result=await query("UPDATE performance_grades SET archived_at=now(),archive_reason=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,gradeRecordId,expectedRevision,input.reason]);if(!result.rows[0])return reply.code(409).send({error:"grade_record_not_found_stale_or_archived"});return mapGradeRecord(result.rows[0]);});

app.get("/api/v1/vaults/:vaultId/performance/targets",async request=>{const {vaultId}=request.params as {vaultId:string};const {courseId}=request.query as {courseId?:string};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);const result=await query("SELECT * FROM performance_targets WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) ORDER BY updated_at DESC LIMIT 200",[vaultId,courseId??null]);return {items:result.rows.map(mapPerformanceTarget),nextCursor:null};});

app.put("/api/v1/vaults/:vaultId/performance/targets/:courseId",async(request,reply)=>{const {vaultId,courseId}=request.params as {vaultId:string;courseId:string};idSchema.parse(vaultId);idSchema.parse(courseId);const input=setPerformanceTargetSchema.parse(request.body);const result=await transaction(async client=>{const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,courseId]);if(!course.rowCount)return null;const current=await client.query("SELECT * FROM performance_targets WHERE vault_id=$1 AND course_id=$2 FOR UPDATE",[vaultId,courseId]);if(!current.rows[0]){if(input.expectedRevision!==0)return "stale_revision" as const;const inserted=await client.query("INSERT INTO performance_targets(vault_id,course_id,target_value,scale,effective_period) VALUES ($1,$2,$3,$4,$5) RETURNING *",[vaultId,courseId,input.targetValue,input.scale,input.effectivePeriod??null]);return inserted.rows[0];}if(current.rows[0].revision!==input.expectedRevision)return "stale_revision" as const;const updated=await client.query("UPDATE performance_targets SET target_value=$3,scale=$4,effective_period=$5,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND course_id=$2 RETURNING *",[vaultId,courseId,input.targetValue,input.scale,input.effectivePeriod??null]);return updated.rows[0];});if(!result)return reply.code(404).send({error:"course_not_found"});if(result==="stale_revision")return reply.code(409).send({error:result});return mapPerformanceTarget(result);});

app.delete("/api/v1/vaults/:vaultId/performance/targets/:courseId",async(request,reply)=>{const {vaultId,courseId}=request.params as {vaultId:string;courseId:string};idSchema.parse(vaultId);idSchema.parse(courseId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("DELETE FROM performance_targets WHERE vault_id=$1 AND course_id=$2 AND revision=$3 RETURNING course_id",[vaultId,courseId,revision]);if(!result.rowCount)return reply.code(409).send({error:"performance_target_not_found_or_stale"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/performance/summary",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {courseId,from,to,formulaId}=request.query as {courseId?:string;from?:string;to?:string;formulaId?:string};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);if((from&&!/^\d{4}-\d{2}-\d{2}$/.test(from))||(to&&!/^\d{4}-\d{2}-\d{2}$/.test(to))||(from&&to&&from>to)||(formulaId&&formulaId!=="descriptive-v1"))return reply.code(400).send({error:"invalid_performance_summary_filter"});const grades=await query("SELECT grade_value,grade_scale,official_weight FROM performance_grades WHERE vault_id=$1 AND archived_at IS NULL AND ($2::uuid IS NULL OR course_id=$2) AND ($3::date IS NULL OR grade_date >= $3) AND ($4::date IS NULL OR grade_date <= $4)",[vaultId,courseId??null,from??null,to??null]);const target=courseId?await query("SELECT * FROM performance_targets WHERE vault_id=$1 AND course_id=$2",[vaultId,courseId]):{rows:[] as Record<string,any>[]};return performanceSummarySchema.parse({courseId:courseId??null,from:from??null,to:to??null,formulaId:"descriptive-v1",gradeCount:grades.rowCount??0,groups:summarizeGrades(grades.rows.map(row=>({gradeValue:row.grade_value,gradeScale:row.grade_scale,officialWeight:row.official_weight===null?null:Number(row.official_weight)}))),target:target.rows[0]?mapPerformanceTarget(target.rows[0]):null,disclaimer:"Descriptive records only. This is not an official or predicted grade."});});

app.post("/api/v1/vaults/:vaultId/performance/recommendations",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=generatePerformanceRecommendationsSchema.parse(request.body);const requestedCourseIds=input.courseIds;const courses=await query("SELECT id,name FROM school_courses WHERE vault_id=$1 AND archived_at IS NULL AND (cardinality($2::uuid[])=0 OR id=ANY($2::uuid[])) ORDER BY name,id LIMIT 50",[vaultId,requestedCourseIds]);if(requestedCourseIds.length&&courses.rowCount!==requestedCourseIds.length)return reply.code(404).send({error:"performance_course_not_found"});const courseIds=courses.rows.map(row=>row.id as string);const validSources=input.sourceScope.sourceIds.length?await query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,input.sourceScope.sourceIds]):{rowCount:0};if(input.sourceScope.sourceIds.length&&validSources.rowCount!==input.sourceScope.sourceIds.length)return reply.code(404).send({error:"performance_source_not_found"});const goals=input.goalIds.length?await query("SELECT id,title,course_id FROM goals WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL AND status='active'",[vaultId,input.goalIds]):{rows:[] as Record<string,any>[],rowCount:0};if(input.goalIds.length&&goals.rowCount!==input.goalIds.length)return reply.code(404).send({error:"performance_goal_not_found"});if(!courseIds.length){const result=performanceRecommendationsResultSchema.parse({type:"performance_recommendations",horizon:input.horizon,recommendations:[],coverage:{courseCount:0,assessmentCount:0,gapCount:0,tasksWithKnownEffort:0,tasksWithUnknownEffort:0},writesApplied:false});const serialized=JSON.stringify({type:"performance_recommendations",...input}),job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'performance_recommendations','succeeded','no_courses',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted','{}'::jsonb),($1,2,'completed',$2::jsonb)",[created.rows[0].id,JSON.stringify({courseCount:0,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));}
  const [targets,assessments,gaps,efforts]=await Promise.all([query("SELECT course_id,target_value,scale FROM performance_targets WHERE vault_id=$1 AND course_id=ANY($2::uuid[])",[vaultId,courseIds]),query("SELECT id,course_id,title,time_spec,material_scope FROM school_assessments WHERE vault_id=$1 AND course_id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,courseIds]),query("SELECT id,course_id,concept,statement,material_source_ids,uncertainty FROM knowledge_gaps WHERE vault_id=$1 AND course_id=ANY($2::uuid[]) AND status IN ('reported','confirmed')",[vaultId,courseIds]),query("SELECT a.course_id,t.id,t.title,t.remaining_minutes,t.estimated_minutes FROM school_assignments a CROSS JOIN LATERAL unnest(a.task_ids) task_id JOIN tasks t ON t.id=task_id AND t.vault_id=a.vault_id WHERE a.vault_id=$1 AND a.course_id=ANY($2::uuid[]) AND a.archived_at IS NULL AND t.completed=false AND t.deleted_at IS NULL",[vaultId,courseIds])]);const permitted=new Set(input.sourceScope.sourceIds);let assessmentCount=0,gapCount=0,known=0,unknown=0;const recommendations=courses.rows.map(course=>{const factors:Array<{kind:"target"|"assessment"|"knowledge_gap"|"remaining_effort"|"goal";recordId:string|null;summary:string}>=[],sourceIds=new Set<string>();const target=targets.rows.find(row=>row.course_id===course.id);if(target)factors.push({kind:"target",recordId:null,summary:`Owner target: ${target.target_value} (${target.scale}).`});const courseAssessments=assessments.rows.filter(row=>row.course_id===course.id&&(()=>{const spec=row.time_spec,value=spec?.kind==="date_only"?spec.date:spec?.kind==="exact"?String(spec.dueAt).slice(0,10):null;return value!==null&&value>=input.horizon.from&&value<=input.horizon.to;})());assessmentCount+=courseAssessments.length;for(const item of courseAssessments){factors.push({kind:"assessment",recordId:item.id,summary:`Upcoming ${item.title}: ${item.time_spec.kind==="date_only"?item.time_spec.date:item.time_spec.dueAt}.`});for(const id of item.material_scope?.sourceIds??[])if(!permitted.size||permitted.has(id))sourceIds.add(id);}const courseGaps=gaps.rows.filter(row=>row.course_id===course.id);gapCount+=courseGaps.length;for(const gap of courseGaps){factors.push({kind:"knowledge_gap",recordId:gap.id,summary:`Known gap: ${gap.concept}. ${gap.statement}${gap.uncertainty?` Uncertainty: ${gap.uncertainty}`:""}`});for(const id of gap.material_source_ids)if(!permitted.size||permitted.has(id))sourceIds.add(id);}const courseEfforts=efforts.rows.filter(row=>row.course_id===course.id),knownEfforts=courseEfforts.filter(row=>row.remaining_minutes!==null||row.estimated_minutes!==null),unknownEfforts=courseEfforts.length-knownEfforts.length;known+=knownEfforts.length;unknown+=unknownEfforts;const minutes=knownEfforts.reduce((sum,row)=>sum+Number(row.remaining_minutes??row.estimated_minutes),0);if(courseEfforts.length)factors.push({kind:"remaining_effort",recordId:null,summary:`${knownEfforts.length} open task(s) have ${minutes} known remaining minute(s); ${unknownEfforts} have unknown effort.`});for(const goal of goals.rows.filter(row=>row.course_id===null||row.course_id===course.id))factors.push({kind:"goal",recordId:goal.id,summary:`Active owner goal: ${goal.title}.`});return{courseId:course.id,title:`Evidence-based focus for ${course.name}`,rationale:factors.length?"Prioritize the evidenced assessment, target, gap, and remaining-effort factors shown below.":"No eligible target, assessment, knowledge-gap, task-effort, or selected-goal evidence was found for this course.",factors,uncertainty:`This is not a grade prediction. ${unknownEfforts?`${unknownEfforts} task estimate(s) are unknown. `:""}Calendar availability and unselected source content were not inferred.`,suggestedMinutes:minutes>0?Math.min(240,minutes):null,sourceIds:[...sourceIds]};});const result=performanceRecommendationsResultSchema.parse({type:"performance_recommendations",horizon:input.horizon,recommendations,coverage:{courseCount:courseIds.length,assessmentCount,gapCount,tasksWithKnownEffort:known,tasksWithUnknownEffort:unknown},writesApplied:false}),serialized=JSON.stringify({type:"performance_recommendations",...input,courseIds});const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'performance_recommendations','succeeded','evidence_review_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({courseCount:courseIds.length}),JSON.stringify(result.coverage)]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/study/plans",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {courseId,status="active",limit:rawLimit}=request.query as {courseId?:string;status?:"active"|"archived"|"all";limit?:string};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!["active","archived","all"].includes(status)||!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_study_plan_filter"});const result=await query("SELECT * FROM study_plans WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3='all' OR ($3='active' AND archived_at IS NULL) OR ($3='archived' AND archived_at IS NOT NULL)) ORDER BY updated_at DESC,id LIMIT $4",[vaultId,courseId??null,status,limit]);return {items:await Promise.all(result.rows.map(mapStudyPlan)),nextCursor:null};});

app.post("/api/v1/vaults/:vaultId/study/plans",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createStudyPlanSchema.parse(request.body);const created=await transaction(async client=>{const course=input.courseId?await client.query("SELECT id,name FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.courseId]):{rows:[] as Record<string,any>[],rowCount:0};if(input.courseId&&!course.rowCount)return "study_course_not_found" as const;const assessment=input.assessmentId?await client.query("SELECT id,title,course_id,time_spec FROM school_assessments WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.assessmentId]):{rows:[] as Record<string,any>[],rowCount:0};if(input.assessmentId&&!assessment.rowCount)return "study_assessment_not_found" as const;if(assessment.rows[0]&&input.courseId&&assessment.rows[0].course_id!==input.courseId)return "study_assessment_course_mismatch" as const;const taskIds=[...new Set(input.taskIds)];if(taskIds.length){const tasks=await client.query("SELECT id FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,taskIds]);if(tasks.rowCount!==taskIds.length)return "study_task_not_found" as const;}const sourceIds=[...new Set(input.materialSourceIds)];const sources=await client.query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,sourceIds]);if(sources.rowCount!==sourceIds.length)return "study_material_source_not_found" as const;if(sources.rows.some(row=>!row.original_text?.trim()))return "study_material_source_empty" as const;const byId=new Map(sources.rows.map(row=>[row.id,row]));const snapshots=sourceIds.map(sourceId=>({sourceId,contentHash:byId.get(sourceId).content_hash}));const deadline=input.deadline.kind==="unknown"&&assessment.rows[0]?.time_spec?assessment.rows[0].time_spec:input.deadline;const plan=await client.query("INSERT INTO study_plans(vault_id,course_id,assessment_id,goals,deadline,material_source_ids,material_snapshots,task_ids,constraints) VALUES ($1,$2,$3,$4,$5::jsonb,$6::uuid[],$7::jsonb,$8::uuid[],$9::jsonb) RETURNING *",[vaultId,input.courseId??assessment.rows[0]?.course_id??null,input.assessmentId??null,input.goals,JSON.stringify(deadline),sourceIds,JSON.stringify(snapshots),taskIds,JSON.stringify(input.constraints)]);const jobInput={type:"study_plan_generation",studyPlanId:plan.rows[0].id,courseTitle:course.rows[0]?.name??null,assessmentTitle:assessment.rows[0]?.title??null,goals:input.goals,deadline,sourceManifest:snapshots};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'study_plan_generate','waiting_for_worker','awaiting_study_plan_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("UPDATE study_plans SET generation_job_id=$2 WHERE id=$1",[plan.rows[0].id,job.rows[0].id]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({studyPlanId:plan.rows[0].id,sourceCount:sourceIds.length})]);return job.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(202).send(mapJobHandle(created));});

app.get("/api/v1/vaults/:vaultId/study/plans/:studyPlanId",async(request,reply)=>{const {vaultId,studyPlanId}=request.params as {vaultId:string;studyPlanId:string};idSchema.parse(vaultId);idSchema.parse(studyPlanId);const result=await query("SELECT * FROM study_plans WHERE vault_id=$1 AND id=$2",[vaultId,studyPlanId]);if(!result.rows[0])return reply.code(404).send({error:"study_plan_not_found"});return mapStudyPlan(result.rows[0]);});

app.patch("/api/v1/vaults/:vaultId/study/plans/:studyPlanId",async(request,reply)=>{const {vaultId,studyPlanId}=request.params as {vaultId:string;studyPlanId:string};idSchema.parse(vaultId);idSchema.parse(studyPlanId);const input=updateStudyPlanSchema.parse(request.body);const updated=await transaction(async client=>{const currentResult=await client.query("SELECT * FROM study_plans WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,studyPlanId]);const current=currentResult.rows[0];if(!current)return null;if(current.revision!==input.expectedRevision)return "stale_revision" as const;if(current.status==="generating")return "study_plan_still_generating" as const;if(current.status==="generation_failed")return "study_plan_generation_failed" as const;const requestedStatus=input.patch.status??current.status;const allowed=current.status===requestedStatus||(current.status==="draft"&&requestedStatus==="active")||(current.status==="active"&&requestedStatus==="completed");if(!allowed)return "invalid_study_plan_transition" as const;const planSources=new Set(current.material_source_ids as string[]);for(const change of input.patch.unitUpdates??[]){const unitResult=await client.query("SELECT * FROM study_plan_units WHERE vault_id=$1 AND plan_id=$2 AND id=$3 FOR UPDATE",[vaultId,studyPlanId,change.unitId]);const unit=unitResult.rows[0];if(!unit||unit.revision!==change.expectedRevision)return "stale_study_plan_unit" as const;if(change.patch.materialSourceIds?.some(id=>!planSources.has(id)))return "study_unit_source_outside_plan" as const;await client.query("UPDATE study_plan_units SET title=coalesce($4,title),objective=coalesce($5,objective),kind=coalesce($6,kind),material_source_ids=coalesce($7::uuid[],material_source_ids),estimated_minutes=coalesce($8,estimated_minutes),estimate_origin=CASE WHEN $8::int IS NULL THEN estimate_origin ELSE 'owner' END,status=coalesce($9,status),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND plan_id=$2 AND id=$3",[vaultId,studyPlanId,change.unitId,change.patch.title??null,change.patch.objective??null,change.patch.kind??null,change.patch.materialSourceIds??null,change.patch.estimatedMinutes??null,change.patch.status??null]);if(change.patch.status==="completed"&&unit.task_id)await client.query("UPDATE tasks SET completed=true,remaining_minutes=0,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND completed=false",[vaultId,unit.task_id]);}
    let taskIds=[...(current.task_ids as string[])];if(current.status==="draft"&&requestedStatus==="active"){const sources=await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,current.material_source_ids]);const sourceMap=new Map(sources.rows.map(row=>[row.id,row.content_hash]));if((current.material_snapshots as Array<{sourceId:string;contentHash:string}>).some(item=>sourceMap.get(item.sourceId)!==item.contentHash))return "study_plan_sources_stale" as const;const units=await client.query("SELECT * FROM study_plan_units WHERE plan_id=$1 ORDER BY sequence FOR UPDATE",[studyPlanId]);if(!units.rowCount)return "study_plan_has_no_units" as const;for(const unit of units.rows){if(unit.task_id){if(!taskIds.includes(unit.task_id))taskIds.push(unit.task_id);continue;}const due=current.deadline?.kind==="exact"?current.deadline.dueAt:null;const task=await client.query("INSERT INTO tasks(vault_id,title,due_at,estimated_minutes,remaining_minutes,priority,allow_split) VALUES ($1,$2,$3,$4,$4,3,true) RETURNING id",[vaultId,unit.title,due,unit.estimated_minutes]);taskIds.push(task.rows[0].id);await client.query("UPDATE study_plan_units SET task_id=$2,updated_at=now() WHERE id=$1",[unit.id,task.rows[0].id]);}}
    const result=await client.query("UPDATE study_plans SET goals=coalesce($3,goals),deadline=coalesce($4::jsonb,deadline),status=$5,task_ids=$6::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,studyPlanId,input.patch.goals??null,input.patch.deadline?JSON.stringify(input.patch.deadline):null,requestedStatus,taskIds]);return result.rows[0];});if(!updated)return reply.code(404).send({error:"study_plan_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapStudyPlan(updated);});

app.post("/api/v1/vaults/:vaultId/study/plans/:studyPlanId/withdraw",async(request,reply)=>{const {vaultId,studyPlanId}=request.params as {vaultId:string;studyPlanId:string};idSchema.parse(vaultId);idSchema.parse(studyPlanId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=withdrawStudyPlanSchema.parse(request.body);const created=await transaction(async client=>{const plan=(await client.query<Record<string,any>>("SELECT * FROM study_plans WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR SHARE",[vaultId,studyPlanId])).rows[0];if(!plan)return"study_plan_not_found" as const;if(plan.revision!==expectedRevision)return"stale_study_plan_revision" as const;if(!['draft','active'].includes(plan.status))return"study_plan_not_withdrawable" as const;const units=await client.query("SELECT task_id FROM study_plan_units WHERE vault_id=$1 AND plan_id=$2 AND task_id IS NOT NULL",[vaultId,studyPlanId]),taskIds=units.rows.map(row=>row.task_id as string);const events=await client.query<Record<string,any>>("SELECT e.id,e.starts_at,l.task_id,c.origin,EXISTS(SELECT 1 FROM study_sessions s WHERE s.vault_id=$1 AND s.calendar_event_id=e.id AND s.state IN ('active','paused','interrupted','completed')) AS started,EXISTS(SELECT 1 FROM provider_calendar_actions a WHERE a.vault_id=$1 AND a.event_id=e.id AND a.state IN ('queued','running','succeeded','reconciling')) AS external_action FROM calendar_events e JOIN calendars c ON c.id=e.calendar_id JOIN scheduled_task_event_links l ON l.event_id=e.id WHERE e.vault_id=$1 AND e.id=ANY($2::uuid[]) AND e.trashed_at IS NULL FOR SHARE",[vaultId,input.selectedUnstartedBlockIds]);if(events.rowCount!==input.selectedUnstartedBlockIds.length)return"study_withdrawal_block_not_found" as const;if(events.rows.some(row=>!taskIds.includes(row.task_id)))return"study_withdrawal_block_outside_plan" as const;if(events.rows.some(row=>row.started||new Date(row.starts_at).getTime()<=Date.now()))return"study_withdrawal_block_already_started" as const;if(events.rows.some(row=>row.origin!=="sorta"||row.external_action))return"study_withdrawal_fixed_or_external_block" as const;const row=(await client.query<Record<string,any>>("INSERT INTO study_withdrawal_proposals(vault_id,study_plan_id,study_plan_revision,selected_event_ids,affected_task_ids,reason) VALUES ($1,$2,$3,$4::uuid[],$5::uuid[],$6) RETURNING *",[vaultId,studyPlanId,plan.revision,input.selectedUnstartedBlockIds,[...new Set(events.rows.map(row=>row.task_id))],input.reason])).rows[0];return row;});if(typeof created==="string")return reply.code(created.includes("not_found")?404:409).send({error:created});return reply.code(201).send(studyWithdrawalProposalSchema.parse({id:created.id,vaultId:created.vault_id,studyPlanId:created.study_plan_id,studyPlanRevision:created.study_plan_revision,kind:"study_plan_withdrawal",status:created.status,revision:created.revision,diff:{selectedUnstartedBlockIds:created.selected_event_ids,affectedTaskIds:created.affected_task_ids,historyDeleted:false,fixedOrExternalEventsDeleted:false,writesApplied:false},reason:created.reason,stale:false,expiresAt:iso(created.expires_at),rejectionReason:null,createdAt:iso(created.created_at),updatedAt:iso(created.updated_at)}));});

app.delete("/api/v1/vaults/:vaultId/study/plans/:studyPlanId",async(request,reply)=>{const {vaultId,studyPlanId}=request.params as {vaultId:string;studyPlanId:string};idSchema.parse(vaultId);idSchema.parse(studyPlanId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE study_plans SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING id",[vaultId,studyPlanId,revision]);if(!result.rowCount)return reply.code(409).send({error:"study_plan_not_found_stale_or_archived"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/study/exercises",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {courseId,mode,limit:rawLimit}=request.query as {courseId?:string;mode?:string;limit?:string};idSchema.parse(vaultId);if(courseId)idSchema.parse(courseId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_study_exercise_filter"});const result=await query("SELECT * FROM study_exercises WHERE vault_id=$1 AND archived_at IS NULL AND ($2::uuid IS NULL OR course_id=$2) AND ($3::text IS NULL OR mode=$3) ORDER BY created_at DESC,id LIMIT $4",[vaultId,courseId??null,mode??null,limit]);return {items:await Promise.all(result.rows.map(mapStudyExercise)),nextCursor:null};});

app.post("/api/v1/vaults/:vaultId/study/exercises",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createStudyExerciseSchema.parse(request.body);const result=await transaction(async client=>{if(input.courseId){const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.courseId]);if(!course.rowCount)return "study_course_not_found" as const;}const sourceIds=[...new Set(input.materialSourceIds)];const sources=await client.query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,sourceIds]);if(sources.rowCount!==sourceIds.length||sources.rows.some(row=>!row.original_text?.trim()))return "study_material_source_not_found_or_empty" as const;const byId=new Map(sources.rows.map(row=>[row.id,row]));const sourceManifest=sourceIds.map(sourceId=>({sourceId,contentHash:byId.get(sourceId).content_hash}));const requestId=randomUUID();const jobInput={type:"study_exercise_generation",requestId,mode:input.mode,difficulty:input.difficulty,count:input.count,courseId:input.courseId,sourceManifest};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'study_exercise_generate','waiting_for_worker','awaiting_study_exercise_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({requestId,mode:input.mode,count:input.count,sourceCount:sourceIds.length})]);return job.rows[0];});if(typeof result==="string")return reply.code(400).send({error:result});return reply.code(202).send(mapJobHandle(result));});

app.get("/api/v1/vaults/:vaultId/study/exercises/:exerciseId",async(request,reply)=>{const {vaultId,exerciseId}=request.params as {vaultId:string;exerciseId:string};idSchema.parse(vaultId);idSchema.parse(exerciseId);const result=await query("SELECT * FROM study_exercises WHERE vault_id=$1 AND id=$2",[vaultId,exerciseId]);if(!result.rows[0])return reply.code(404).send({error:"study_exercise_not_found"});return mapStudyExercise(result.rows[0]);});

app.post("/api/v1/vaults/:vaultId/study/exercises/:exerciseId/attempts",async(request,reply)=>{const {vaultId,exerciseId}=request.params as {vaultId:string;exerciseId:string};idSchema.parse(vaultId);idSchema.parse(exerciseId);const input=createStudyAttemptSchema.parse(request.body);const result=await transaction(async client=>{const duplicate=await client.query("SELECT * FROM study_attempts WHERE vault_id=$1 AND idempotency_key=$2",[vaultId,input.idempotencyKey]);if(duplicate.rows[0])return duplicate.rows[0].exercise_id===exerciseId?duplicate.rows[0]:"study_attempt_idempotency_conflict" as const;const exercise=await client.query("SELECT * FROM study_exercises WHERE vault_id=$1 AND id=$2 AND status='ready' AND archived_at IS NULL",[vaultId,exerciseId]);if(!exercise.rows[0])return null;const inserted=await client.query("INSERT INTO study_attempts(vault_id,exercise_id,response,response_kind,started_at,completed_at,hints_used,confidence_self_report,idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",[vaultId,exerciseId,input.response,input.responseKind,input.startedAt??null,input.completedAt,input.hintsUsed,input.confidenceSelfReport,input.idempotencyKey]);return inserted.rows[0];});if(!result)return reply.code(404).send({error:"study_exercise_not_found_or_not_ready"});if(typeof result==="string")return reply.code(409).send({error:result});return reply.code(201).send(mapStudyAttempt(result));});

app.get("/api/v1/vaults/:vaultId/study/attempts",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {exerciseId,limit:rawLimit}=request.query as {exerciseId?:string;limit?:string};idSchema.parse(vaultId);if(exerciseId)idSchema.parse(exerciseId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_study_attempt_filter"});const result=await query("SELECT * FROM study_attempts WHERE vault_id=$1 AND ($2::uuid IS NULL OR exercise_id=$2) ORDER BY completed_at DESC,id LIMIT $3",[vaultId,exerciseId??null,limit]);return {items:result.rows.map(mapStudyAttempt),nextCursor:null};});

app.get("/api/v1/vaults/:vaultId/study/attempts/:attemptId",async(request,reply)=>{const {vaultId,attemptId}=request.params as {vaultId:string;attemptId:string};idSchema.parse(vaultId);idSchema.parse(attemptId);const result=await query("SELECT * FROM study_attempts WHERE vault_id=$1 AND id=$2",[vaultId,attemptId]);if(!result.rows[0])return reply.code(404).send({error:"study_attempt_not_found"});return mapStudyAttempt(result.rows[0]);});

app.post("/api/v1/vaults/:vaultId/study/activities",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createStudyActivitySchema.parse(request.body);const created=await transaction(async client=>{if(input.sessionId){const session=await client.query("SELECT id,course_id,material_source_ids,archived_at FROM study_sessions WHERE vault_id=$1 AND id=$2",[vaultId,input.sessionId]);if(!session.rows[0]||session.rows[0].archived_at)return"study_session_not_found" as const;const allowed=new Set(session.rows[0].material_source_ids as string[]);if(input.sourceScope.sourceIds.some(id=>!allowed.has(id)))return"activity_source_outside_session" as const;if(input.sourceScope.courseId&&session.rows[0].course_id!==input.sourceScope.courseId)return"activity_course_session_mismatch" as const;}if(input.sourceScope.courseId){const course=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.sourceScope.courseId]);if(!course.rows[0])return"study_course_not_found" as const;}const sourceIds=[...new Set(input.sourceScope.sourceIds)];const sources=await client.query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,sourceIds]);if(sources.rows.length!==sourceIds.length||sources.rows.some(row=>!row.original_text?.trim()))return"study_material_source_not_found_or_empty" as const;const byId=new Map(sources.rows.map(row=>[row.id,row]));const snapshots=sourceIds.map(sourceId=>({sourceId,contentHash:byId.get(sourceId).content_hash}));const workerMode=input.mode==="simple"?"explain_12":input.mode;const activity=await client.query("INSERT INTO study_activities(vault_id,session_id,mode,worker_mode,difficulty,requested_length,language,material_source_ids,source_snapshots) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid[],$9::jsonb) RETURNING *",[vaultId,input.sessionId,input.mode,workerMode,input.difficulty,input.length,input.language,sourceIds,JSON.stringify(snapshots)]);const jobInput={type:"study_exercise_generation",requestId:activity.rows[0].id,activityId:activity.rows[0].id,mode:workerMode,difficulty:input.difficulty,count:input.length,courseId:input.sourceScope.courseId,language:input.language,sourceManifest:snapshots};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'study_exercise_generate','waiting_for_worker','awaiting_study_activity_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("UPDATE study_activities SET generation_job_id=$2 WHERE id=$1",[activity.rows[0].id,job.rows[0].id]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({activityId:activity.rows[0].id,mode:input.mode,length:input.length,sourceCount:sourceIds.length})]);return job.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(202).send(mapJobHandle(created));
});

app.patch("/api/v1/vaults/:vaultId/performance/knowledge-gaps/:gapId",async(request,reply)=>{const {vaultId,gapId}=request.params as {vaultId:string;gapId:string};idSchema.parse(vaultId);idSchema.parse(gapId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const input=correctKnowledgeGapSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM knowledge_gaps WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,gapId]);const item=current.rows[0];if(!item)return null;if(item.revision!==revision)return"stale_revision" as const;const anchors=input.evidenceAnchorIds===undefined?item.evidence_anchor_ids:input.evidenceAnchorIds;if(anchors.length){const valid=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,anchors]);if(valid.rowCount!==anchors.length)return"knowledge_gap_evidence_not_current" as const;}await client.query("INSERT INTO knowledge_gap_corrections(vault_id,knowledge_gap_id,from_revision,previous_status,previous_correction,next_status,correction_reason,evidence_anchor_ids) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid[])",[vaultId,gapId,item.revision,item.status,item.correction,input.state,input.correctionReason,anchors]);const result=await client.query("UPDATE knowledge_gaps SET status=$3,correction=$4,evidence_anchor_ids=$5::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,gapId,input.state,input.correctionReason,anchors]);return result.rows[0];});if(!updated)return reply.code(404).send({error:"knowledge_gap_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapKnowledgeGap(updated);});

app.get("/api/v1/vaults/:vaultId/study/activities",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const raw=request.query as {session_id?:string;mode?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);if(raw.session_id)idSchema.parse(raw.session_id);const parsedMode=raw.mode?createStudyActivitySchema.shape.mode.safeParse(raw.mode):null;const limit=raw.limit===undefined?50:Number(raw.limit);if(parsedMode&&!parsedMode.success||!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_study_activity_filter"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_study_activity_cursor"});}}const result=await query("SELECT * FROM study_activities WHERE vault_id=$1 AND archived_at IS NULL AND ($2::uuid IS NULL OR session_id=$2) AND ($3::text IS NULL OR mode=$3) AND ($4::timestamptz IS NULL OR (created_at,id)<($4::timestamptz,$5::uuid)) ORDER BY created_at DESC,id DESC LIMIT $6",[vaultId,raw.session_id??null,raw.mode??null,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),items=await Promise.all(rows.map(mapStudyActivity)),last=rows.at(-1);return{items,nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};
});

app.get("/api/v1/vaults/:vaultId/study/activities/:activityId",async(request,reply)=>{const {vaultId,activityId}=request.params as {vaultId:string;activityId:string};idSchema.parse(vaultId);idSchema.parse(activityId);const result=await query("SELECT * FROM study_activities WHERE vault_id=$1 AND id=$2",[vaultId,activityId]);if(!result.rows[0])return reply.code(404).send({error:"study_activity_not_found"});return mapStudyActivity(result.rows[0]);});

app.post("/api/v1/vaults/:vaultId/study/activities/:activityId/responses",async(request,reply)=>{
  const {vaultId,activityId}=request.params as {vaultId:string;activityId:string};idSchema.parse(vaultId);idSchema.parse(activityId);const input=submitStudyResponseSchema.parse(request.body);const outcome=await transaction(async client=>{const activityResult=await client.query("SELECT * FROM study_activities WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,activityId]);const activity=activityResult.rows[0];if(!activity)return null;if(activity.revision!==input.expectedActivityRevision)return"stale_activity_revision" as const;if(activity.state!=="ready")return"study_activity_not_ready" as const;const exerciseResult=await client.query("SELECT * FROM study_exercises WHERE vault_id=$1 AND id=$2 AND generation_job_id=$3 AND status='ready' AND archived_at IS NULL FOR UPDATE",[vaultId,input.itemId,activity.generation_job_id]);const exercise=exerciseResult.rows[0];if(!exercise)return"study_activity_item_not_found" as const;const duplicate=await client.query("SELECT * FROM study_attempts WHERE vault_id=$1 AND idempotency_key=$2",[vaultId,input.responseId]);if(duplicate.rows[0]){if(duplicate.rows[0].exercise_id!==input.itemId||!duplicate.rows[0].feedback_job_id)return"study_response_id_conflict" as const;const prior=await client.query("SELECT * FROM jobs WHERE id=$1",[duplicate.rows[0].feedback_job_id]);return prior.rows[0]??"study_response_job_missing" as const;}const completedAt=new Date(),startedAt=input.elapsedActiveSeconds===null?null:new Date(completedAt.getTime()-input.elapsedActiveSeconds*1000);const inserted=await client.query("INSERT INTO study_attempts(vault_id,exercise_id,response,response_kind,started_at,completed_at,hints_used,confidence_self_report,idempotency_key) VALUES ($1,$2,$3,'text',$4,$5,'{}',NULL,$6) RETURNING *",[vaultId,input.itemId,input.answer,startedAt?.toISOString()??null,completedAt.toISOString(),input.responseId]);const attempt=inserted.rows[0];const jobInput={type:"study_attempt_feedback",attemptId:attempt.id,attemptRevision:attempt.revision+1,exerciseId:exercise.id,exerciseRevision:exercise.revision,activityId,sourceManifest:exercise.source_snapshots};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'study_attempt_feedback','waiting_for_worker','awaiting_study_feedback_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("UPDATE study_attempts SET feedback_status='waiting_for_worker',feedback_job_id=$2,revision=revision+1,updated_at=now() WHERE id=$1",[attempt.id,job.rows[0].id]);await client.query("UPDATE study_activities SET revision=revision+1,updated_at=now() WHERE id=$1",[activityId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({activityId,itemId:input.itemId,responseId:input.responseId})]);return job.rows[0];});if(!outcome)return reply.code(404).send({error:"study_activity_not_found"});if(typeof outcome==="string")return reply.code(409).send({error:outcome});return reply.code(202).send(mapJobHandle(outcome));
});

app.delete("/api/v1/vaults/:vaultId/study/activities/:activityId",async(request,reply)=>{const {vaultId,activityId}=request.params as {vaultId:string;activityId:string};idSchema.parse(vaultId);idSchema.parse(activityId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const archived=await transaction(async client=>{const result=await client.query("UPDATE study_activities SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING generation_job_id",[vaultId,activityId,revision]);if(!result.rows[0])return null;if(result.rows[0].generation_job_id)await client.query("UPDATE study_exercises SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND generation_job_id=$2 AND archived_at IS NULL",[vaultId,result.rows[0].generation_job_id]);return true;});if(!archived)return reply.code(409).send({error:"study_activity_not_found_stale_or_archived"});return reply.code(204).send();});

app.post("/api/v1/vaults/:vaultId/study/attempts/:attemptId/feedback",async(request,reply)=>{const {vaultId,attemptId}=request.params as {vaultId:string;attemptId:string};idSchema.parse(vaultId);idSchema.parse(attemptId);const input=requestStudyFeedbackSchema.parse(request.body);const result=await transaction(async client=>{const attemptResult=await client.query("SELECT a.*,e.material_source_ids,e.source_snapshots,e.revision AS exercise_revision FROM study_attempts a JOIN study_exercises e ON e.id=a.exercise_id WHERE a.vault_id=$1 AND a.id=$2 FOR UPDATE OF a",[vaultId,attemptId]);const attempt=attemptResult.rows[0];if(!attempt)return null;if(attempt.revision!==input.expectedAttemptRevision)return "stale_revision" as const;if(attempt.feedback_status==="waiting_for_worker"&&attempt.feedback_job_id){const existing=await client.query("SELECT * FROM jobs WHERE id=$1",[attempt.feedback_job_id]);if(existing.rows[0])return existing.rows[0];}const jobInput={type:"study_attempt_feedback",attemptId,attemptRevision:attempt.revision+1,exerciseId:attempt.exercise_id,exerciseRevision:attempt.exercise_revision,sourceManifest:attempt.source_snapshots};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'study_attempt_feedback','waiting_for_worker','awaiting_study_feedback_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex")]);await client.query("UPDATE study_attempts SET feedback_status='waiting_for_worker',feedback_job_id=$2,revision=revision+1,updated_at=now() WHERE id=$1",[attemptId,job.rows[0].id]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({attemptId,exerciseId:attempt.exercise_id})]);return job.rows[0];});if(!result)return reply.code(404).send({error:"study_attempt_not_found"});if(typeof result==="string")return reply.code(409).send({error:result});return reply.code(202).send(mapJobHandle(result));});

app.patch("/api/v1/vaults/:vaultId/study/attempts/:attemptId/feedback",async(request,reply)=>{const {vaultId,attemptId}=request.params as {vaultId:string;attemptId:string};idSchema.parse(vaultId);idSchema.parse(attemptId);const input=correctStudyFeedbackSchema.parse(request.body);const result=await transaction(async client=>{const attemptResult=await client.query("SELECT a.*,e.material_source_ids FROM study_attempts a JOIN study_exercises e ON e.id=a.exercise_id WHERE a.vault_id=$1 AND a.id=$2 FOR UPDATE OF a",[vaultId,attemptId]);const attempt=attemptResult.rows[0];if(!attempt)return null;if(attempt.revision!==input.expectedAttemptRevision)return "stale_revision" as const;const allowed=new Set(attempt.material_source_ids as string[]);if(input.evidenceSourceIds.some(id=>!allowed.has(id)))return "study_feedback_source_not_authorized" as const;const correction={correction:input.correction,scoreOverride:input.scoreOverride,evidenceSourceIds:input.evidenceSourceIds,correctedAt:new Date().toISOString()};const updated=await client.query("UPDATE study_attempts SET owner_correction=$3::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,attemptId,JSON.stringify(correction)]);return updated.rows[0];});if(!result)return reply.code(404).send({error:"study_attempt_not_found"});if(typeof result==="string")return reply.code(409).send({error:result});return mapStudyAttempt(result);});

app.get("/api/v1/vaults/:vaultId/study/sessions", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  const { courseId, planId, state, from, to, status = "active", limit: rawLimit } = request.query as { courseId?: string; planId?: string; state?: StudySessionState; from?: string; to?: string; status?: "active" | "archived" | "all"; limit?: string };
  idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); if (planId) idSchema.parse(planId);
  const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if ((state && !["planned","active","paused","interrupted","completed","skipped"].includes(state)) || (from && Number.isNaN(Date.parse(from))) || (to && Number.isNaN(Date.parse(to))) || (from && to && Date.parse(from) > Date.parse(to)) || !["active","archived","all"].includes(status) || !Number.isInteger(limit) || limit < 1 || limit > 200) return reply.code(400).send({ error: "invalid_study_session_filter" });
  const result = await query(`SELECT * FROM study_sessions WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3::uuid IS NULL OR plan_id=$3) AND ($4::text IS NULL OR state=$4) AND ($5::timestamptz IS NULL OR created_at >= $5) AND ($6::timestamptz IS NULL OR created_at <= $6) AND ($7='all' OR ($7='active' AND archived_at IS NULL) OR ($7='archived' AND archived_at IS NOT NULL)) ORDER BY created_at DESC,id LIMIT $8`, [vaultId, courseId ?? null, planId ?? null, state ?? null, from ?? null, to ?? null, status, limit]);
  return { items: result.rows.map(mapStudySession), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/study/sessions", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createStudySessionSchema.parse(request.body);
  const created = await transaction(async client => {
    await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    if (input.planId) { const plan=await client.query("SELECT id,course_id,material_source_ids FROM study_plans WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL AND status IN ('draft','active')",[vaultId,input.planId]);if(!plan.rowCount)return "study_plan_not_found_or_unavailable" as const;if(input.courseId&&plan.rows[0].course_id&&input.courseId!==plan.rows[0].course_id)return "study_session_plan_course_mismatch" as const;const units=[...new Set(input.unitIds)];if(units.length){const found=await client.query("SELECT id FROM study_plan_units WHERE vault_id=$1 AND plan_id=$2 AND id=ANY($3::uuid[])",[vaultId,input.planId,units]);if(found.rowCount!==units.length)return "study_plan_unit_not_found" as const;}if(input.materialSourceIds.some(id=>!(plan.rows[0].material_source_ids as string[]).includes(id)))return "study_material_outside_plan" as const; }
    if (input.courseId) { const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.courseId]); if (!course.rowCount) return "study_course_not_found" as const; }
    const taskIds = [...new Set(input.taskIds)]; if (taskIds.length) { const tasks = await client.query("SELECT id,revision,completed FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE", [vaultId, taskIds]); if (tasks.rowCount !== taskIds.length) return "study_task_not_found" as const; if(input.startImmediately&&tasks.rows.some(row=>row.completed))return "study_task_completed" as const;if(input.startImmediately&&tasks.rows.some(row=>input.expectedTaskRevisions[row.id]!==row.revision))return "stale_study_task_revision" as const; }
    if (input.calendarEventId) { const event = await client.query("SELECT id FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL", [vaultId, input.calendarEventId]); if (!event.rowCount) return "study_calendar_event_not_found" as const; }
    const sourceIds = [...new Set(input.materialSourceIds)]; let snapshots: { sourceId: string; contentHash: string }[] = [];
    if (sourceIds.length) { const sources = await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]); if (sources.rowCount !== sourceIds.length) return "study_material_source_not_found" as const; snapshots = sources.rows.map(row => ({ sourceId: row.id, contentHash: row.content_hash })); }
    if(input.startImmediately){const active=await client.query("SELECT id FROM study_sessions WHERE vault_id=$1 AND state='active' AND archived_at IS NULL FOR UPDATE",[vaultId]);if(active.rowCount)return "another_study_session_active" as const;}
    const observedAt=new Date().toISOString();const segments=input.startImmediately?[{startedAt:observedAt,endedAt:null}]:[];const result = await client.query(`INSERT INTO study_sessions(vault_id,course_id,plan_id,unit_ids,task_ids,material_source_ids,calendar_event_id,mode,state,estimated_minutes,active_time_segments,source_snapshots) VALUES ($1,$2,$3,$4::uuid[],$5::uuid[],$6::uuid[],$7,$8,$9,$10,$11::jsonb,$12::jsonb) RETURNING *`, [vaultId, input.courseId ?? null,input.planId??null, input.unitIds, taskIds, sourceIds, input.calendarEventId ?? null, input.mode ?? null,input.startImmediately?"active":"planned", input.estimatedMinutes ?? null,JSON.stringify(segments), JSON.stringify(snapshots)]);
    if(input.startImmediately)await client.query("INSERT INTO study_session_actions(vault_id,session_id,action,observed_at,resulting_revision) VALUES ($1,$2,'start',$3,1)",[vaultId,result.rows[0].id,observedAt]);
    return result.rows[0];
  });
  if (typeof created === "string") return reply.code(created==="another_study_session_active"||created==="stale_study_task_revision"||created==="study_task_completed"?409:400).send({ error: created }); return reply.code(201).send(mapStudySession(created));
});

app.get("/api/v1/vaults/:vaultId/study/sessions/:studySessionId", async (request, reply) => {
  const { vaultId, studySessionId } = request.params as { vaultId: string; studySessionId: string }; idSchema.parse(vaultId); idSchema.parse(studySessionId);
  const result = await query("SELECT * FROM study_sessions WHERE vault_id=$1 AND id=$2", [vaultId, studySessionId]); if (!result.rows[0]) return reply.code(404).send({ error: "study_session_not_found" }); return mapStudySession(result.rows[0]);
});

app.post("/api/v1/vaults/:vaultId/study/sessions/:studySessionId/actions", async (request, reply) => {
  const { vaultId, studySessionId } = request.params as { vaultId: string; studySessionId: string }; idSchema.parse(vaultId); idSchema.parse(studySessionId); const input = studySessionActionSchema.parse(request.body);
  const updated = await transaction(async client => {
    const duplicate = await client.query("SELECT resulting_revision FROM study_session_actions WHERE vault_id=$1 AND session_id=$2 AND action=$3 AND observed_at=$4", [vaultId, studySessionId, input.action, input.observedAt]);
    if (duplicate.rowCount) { const current = await client.query("SELECT * FROM study_sessions WHERE vault_id=$1 AND id=$2", [vaultId, studySessionId]); return current.rows[0] ?? null; }
    const current = await client.query("SELECT * FROM study_sessions WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE", [vaultId, studySessionId]); const item = current.rows[0]; if (!item) return null; if (item.revision !== input.expectedRevision) return "stale_revision" as const;
    const transition = applyStudySessionTransition(item.state as StudySessionState, input.action as StudySessionAction, input.observedAt, item.active_time_segments as ActiveTimeSegment[]); if (!transition) return "invalid_study_session_transition" as const;
    if (transition.state === "active") { const another = await client.query("SELECT id FROM study_sessions WHERE vault_id=$1 AND state='active' AND archived_at IS NULL AND id<>$2", [vaultId, studySessionId]); if (another.rowCount) return "another_study_session_active" as const; }
    const nextRevision = item.revision + 1;
    const result = await client.query("UPDATE study_sessions SET state=$3,active_time_segments=$4::jsonb,outcome=$5,actual_progress=$6,revision=$7,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *", [vaultId, studySessionId, transition.state, JSON.stringify(transition.segments), input.outcome === undefined ? item.outcome : input.outcome, input.progress === undefined ? item.actual_progress : input.progress, nextRevision]);
    await client.query("INSERT INTO study_session_actions(vault_id,session_id,action,observed_at,resulting_revision) VALUES ($1,$2,$3,$4,$5)", [vaultId, studySessionId, input.action, input.observedAt, nextRevision]); return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "study_session_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapStudySession(updated);
});

app.delete("/api/v1/vaults/:vaultId/study/sessions/:studySessionId", async (request, reply) => {
  const { vaultId, studySessionId } = request.params as { vaultId: string; studySessionId: string }; idSchema.parse(vaultId); idSchema.parse(studySessionId); const revision = revisionFromIfMatch(request.headers["if-match"]); if (revision === null) return reply.code(428).send({ error: "if_match_required" });
  const result = await query("UPDATE study_sessions SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL AND state<>'active' RETURNING id", [vaultId, studySessionId, revision]); if (!result.rowCount) return reply.code(409).send({ error: "study_session_not_found_stale_archived_or_active" }); return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/execution-sessions",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=startExecutionSessionSchema.parse(request.body),serialized=JSON.stringify(input),payloadHash=createHash("sha256").update(serialized).digest("hex");const created=await transaction(async client=>{await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");const duplicate=await client.query("SELECT * FROM execution_sessions WHERE vault_id=$1 AND client_operation_id=$2 FOR UPDATE",[vaultId,input.clientOperationId]);if(duplicate.rows[0])return duplicate.rows[0].payload_hash===payloadHash?duplicate.rows[0]:"client_operation_id_reused" as const;const task=await client.query("SELECT id,completed,deleted_at FROM tasks WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,input.taskId]);if(!task.rows[0]||task.rows[0].deleted_at)return"execution_task_not_found" as const;if(task.rows[0].completed)return"execution_task_completed" as const;let referenceSourceIds:string[]=[];if(input.studySessionId){const study=await client.query("SELECT task_ids,material_source_ids,archived_at FROM study_sessions WHERE vault_id=$1 AND id=$2",[vaultId,input.studySessionId]);if(!study.rows[0]||study.rows[0].archived_at)return"execution_study_session_not_found" as const;if(!(study.rows[0].task_ids as string[]).includes(input.taskId))return"execution_task_outside_study_session" as const;referenceSourceIds=study.rows[0].material_source_ids;}const [activeExecution,activeStudy]=await Promise.all([client.query("SELECT id FROM execution_sessions WHERE vault_id=$1 AND state='active' FOR UPDATE",[vaultId]),client.query("SELECT id FROM study_sessions WHERE vault_id=$1 AND state='active' AND archived_at IS NULL FOR UPDATE",[vaultId])]);if(activeExecution.rowCount||activeStudy.rowCount)return"another_execution_active" as const;const startedAt=new Date().toISOString(),segments=[{startedAt,endedAt:null}];const result=await client.query("INSERT INTO execution_sessions(vault_id,task_id,study_session_id,planned_minutes,mode,state,active_time_segments,reference_source_ids,client_operation_id,payload_hash,started_at) VALUES ($1,$2,$3,$4,$5,'active',$6::jsonb,$7::uuid[],$8,$9,$10) RETURNING *",[vaultId,input.taskId,input.studySessionId,input.plannedMinutes,input.mode,JSON.stringify(segments),referenceSourceIds,input.clientOperationId,payloadHash,startedAt]);return result.rows[0];});if(typeof created==="string")return reply.code(created==="execution_task_not_found"||created==="execution_study_session_not_found"?404:409).send({error:created});return reply.code(201).send(mapExecutionSession(created));});

app.get("/api/v1/vaults/:vaultId/execution-sessions/:executionSessionId",async(request,reply)=>{const {vaultId,executionSessionId}=request.params as {vaultId:string;executionSessionId:string};idSchema.parse(vaultId);idSchema.parse(executionSessionId);const result=await query("SELECT * FROM execution_sessions WHERE vault_id=$1 AND id=$2",[vaultId,executionSessionId]);if(!result.rows[0])return reply.code(404).send({error:"execution_session_not_found"});return mapExecutionSession(result.rows[0]);});

app.post("/api/v1/vaults/:vaultId/execution-sessions/:executionSessionId/transition",async(request,reply)=>{const {vaultId,executionSessionId}=request.params as {vaultId:string;executionSessionId:string};idSchema.parse(vaultId);idSchema.parse(executionSessionId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const input=transitionExecutionSessionSchema.parse(request.body);const updated=await transaction(async client=>{await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");const duplicate=await client.query("SELECT 1 FROM execution_session_transitions WHERE execution_session_id=$1 AND action=$2 AND observed_at=$3",[executionSessionId,input.action,input.observedAt]);if(duplicate.rowCount){const current=await client.query("SELECT * FROM execution_sessions WHERE vault_id=$1 AND id=$2",[vaultId,executionSessionId]);return current.rows[0]??null;}const current=await client.query("SELECT * FROM execution_sessions WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,executionSessionId]);const item=current.rows[0];if(!item)return null;if(item.revision!==revision)return"stale_revision" as const;const allowed=(item.state==="active"&&["pause","finish","abandon"].includes(input.action))||(item.state==="paused"&&["resume","finish","abandon"].includes(input.action));if(!allowed)return"invalid_execution_transition" as const;const last=await client.query("SELECT observed_at FROM execution_session_transitions WHERE execution_session_id=$1 ORDER BY observed_at DESC LIMIT 1",[executionSessionId]);if(Date.parse(input.observedAt)<Date.parse(iso(item.started_at))||(last.rows[0]&&Date.parse(input.observedAt)<=Date.parse(iso(last.rows[0].observed_at))))return"execution_event_out_of_order" as const;const segments=(item.active_time_segments as ActiveTimeSegment[]).map(segment=>({...segment}));let state=item.state,finishedAt=item.finished_at;if(input.action==="pause"||input.action==="finish"||input.action==="abandon"){const open=segments.at(-1);if(item.state==="active"&&open&&!open.endedAt)open.endedAt=input.observedAt;state=input.action==="pause"?"paused":input.action==="finish"?"finished":"abandoned";if(input.action!=="pause")finishedAt=input.observedAt;}else{const [activeExecution,activeStudy]=await Promise.all([client.query("SELECT id FROM execution_sessions WHERE vault_id=$1 AND state='active' AND id<>$2",[vaultId,executionSessionId]),client.query("SELECT id FROM study_sessions WHERE vault_id=$1 AND state='active' AND archived_at IS NULL",[vaultId])]);if(activeExecution.rowCount||activeStudy.rowCount)return"another_execution_active" as const;segments.push({startedAt:input.observedAt,endedAt:null});state="active";}const nextRevision=item.revision+1,completedWork=input.completedWork??item.completed_work,remainingWork=input.remainingWork??item.remaining_work,actualCorrection=input.actualMinutesCorrection??item.actual_minutes_correction;const result=await client.query("UPDATE execution_sessions SET state=$3,active_time_segments=$4::jsonb,actual_minutes_correction=$5,completed_work=$6::jsonb,remaining_work=$7::jsonb,finished_at=$8,revision=$9,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,executionSessionId,state,JSON.stringify(segments),actualCorrection,JSON.stringify(completedWork),JSON.stringify(remainingWork),finishedAt,nextRevision]);if(input.remainingWork?.minutes!==undefined)await client.query("UPDATE tasks SET remaining_minutes=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,item.task_id,input.remainingWork.minutes]);await client.query("INSERT INTO execution_session_transitions(vault_id,execution_session_id,action,observed_at,resulting_revision,payload) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",[vaultId,executionSessionId,input.action,input.observedAt,nextRevision,JSON.stringify(input)]);return result.rows[0];});if(!updated)return reply.code(404).send({error:"execution_session_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapExecutionSession(updated);});

app.get("/api/v1/vaults/:vaultId/study/knowledge-gaps", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { courseId, materialRef, status, limit: rawLimit } = request.query as { courseId?: string; materialRef?: string; status?: string; limit?: string }; idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); if (materialRef) idSchema.parse(materialRef); const limit = rawLimit === undefined ? 100 : Number(rawLimit);
  if ((status && !["reported","confirmed","corrected","dismissed","resolved"].includes(status)) || !Number.isInteger(limit) || limit < 1 || limit > 200) return reply.code(400).send({ error: "invalid_knowledge_gap_filter" });
  const result = await query("SELECT * FROM knowledge_gaps WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3::uuid IS NULL OR $3::uuid=ANY(material_source_ids)) AND ($4::text IS NULL OR status=$4) ORDER BY updated_at DESC,id LIMIT $5", [vaultId, courseId ?? null, materialRef ?? null, status ?? null, limit]); return { items: result.rows.map(mapKnowledgeGap), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/study/knowledge-gaps", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createReportedKnowledgeGapSchema.parse(request.body);
  const created = await transaction(async client => {
    if (input.courseId) { const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.courseId]); if (!course.rowCount) return "knowledge_gap_course_not_found" as const; }
    const materials = [...new Set(input.materialSourceIds)]; if (materials.length) { const sources = await client.query("SELECT id FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, materials]); if (sources.rowCount !== materials.length) return "knowledge_gap_material_not_found" as const; }
    const anchors = [...new Set(input.evidenceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "knowledge_gap_evidence_not_current" as const; }
    const result = await client.query("INSERT INTO knowledge_gaps(vault_id,course_id,concept,material_source_ids,statement,evidence_anchor_ids,origin,status,uncertainty) VALUES ($1,$2,$3,$4::uuid[],$5,$6::uuid[],'owner_report','reported',NULL) RETURNING *", [vaultId, input.courseId ?? null, input.concept, materials, input.statement, anchors]); return result.rows[0];
  }); if (typeof created === "string") return reply.code(400).send({ error: created }); return reply.code(201).send(mapKnowledgeGap(created));
});

app.patch("/api/v1/vaults/:vaultId/study/knowledge-gaps/:gapId", async (request, reply) => {
  const { vaultId, gapId } = request.params as { vaultId: string; gapId: string }; idSchema.parse(vaultId); idSchema.parse(gapId); const input = updateKnowledgeGapSchema.parse(request.body);
  const updated = await transaction(async client => { const current = await client.query("SELECT * FROM knowledge_gaps WHERE vault_id=$1 AND id=$2 FOR UPDATE", [vaultId, gapId]); const item = current.rows[0]; if (!item) return null; if (item.revision !== input.expectedRevision) return "stale_revision" as const; const anchors = input.evidenceAnchorIds === undefined ? item.evidence_anchor_ids : [...new Set(input.evidenceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "knowledge_gap_evidence_not_current" as const; } const result = await client.query("UPDATE knowledge_gaps SET status=$3,correction=$4,evidence_anchor_ids=$5::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *", [vaultId, gapId, input.status, input.correction === undefined ? item.correction : input.correction, anchors]); return result.rows[0]; });
  if (!updated) return reply.code(404).send({ error: "knowledge_gap_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapKnowledgeGap(updated);
});

app.get("/api/v1/vaults/:vaultId/study/decks", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { courseId, status = "active", limit: rawLimit } = request.query as { courseId?: string; status?: "active" | "archived" | "all"; limit?: string }; idSchema.parse(vaultId); if (courseId) idSchema.parse(courseId); const limit = rawLimit === undefined ? 100 : Number(rawLimit); if (!["active","archived","all"].includes(status) || !Number.isInteger(limit) || limit < 1 || limit > 200) return reply.code(400).send({ error: "invalid_flashcard_deck_filter" });
  const result = await query("SELECT * FROM flashcard_decks WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND ($3='all' OR ($3='active' AND archived_at IS NULL) OR ($3='archived' AND archived_at IS NOT NULL)) ORDER BY updated_at DESC,id LIMIT $4", [vaultId, courseId ?? null, status, limit]); return { items: result.rows.map(mapFlashcardDeck), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/study/decks", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createFlashcardDeckSchema.parse(request.body);
  const created = await transaction(async client => { if (input.courseId) { const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.courseId]); if (!course.rowCount) return "flashcard_deck_course_not_found" as const; } const sourceIds = [...new Set(input.materialSourceIds)]; let snapshots: { sourceId: string; contentHash: string }[] = []; if (sourceIds.length) { const sources = await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]); if (sources.rowCount !== sourceIds.length) return "flashcard_deck_material_not_found" as const; snapshots = sources.rows.map(row => ({ sourceId: row.id, contentHash: row.content_hash })); } const result = await client.query("INSERT INTO flashcard_decks(vault_id,course_id,name,material_source_ids,source_snapshots,origin) VALUES ($1,$2,$3,$4::uuid[],$5::jsonb,'owner') RETURNING *", [vaultId, input.courseId ?? null, input.name, sourceIds, JSON.stringify(snapshots)]); return result.rows[0]; }); if (typeof created === "string") return reply.code(400).send({ error: created }); return reply.code(201).send(mapFlashcardDeck(created));
});

app.get("/api/v1/vaults/:vaultId/study/decks/:flashcardDeckId", async (request, reply) => { const { vaultId, flashcardDeckId } = request.params as { vaultId: string; flashcardDeckId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardDeckId); const result = await query("SELECT * FROM flashcard_decks WHERE vault_id=$1 AND id=$2", [vaultId, flashcardDeckId]); if (!result.rows[0]) return reply.code(404).send({ error: "flashcard_deck_not_found" }); return mapFlashcardDeck(result.rows[0]); });

app.patch("/api/v1/vaults/:vaultId/study/decks/:flashcardDeckId", async (request, reply) => {
  const { vaultId, flashcardDeckId } = request.params as { vaultId: string; flashcardDeckId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardDeckId); const input = updateFlashcardDeckSchema.parse(request.body);
  const updated = await transaction(async client => { const current = await client.query("SELECT * FROM flashcard_decks WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE", [vaultId, flashcardDeckId]); const item = current.rows[0]; if (!item) return null; if (item.revision !== input.expectedRevision) return "stale_revision" as const; if (item.origin !== "owner") return "generated_deck_read_only" as const; const courseId = input.patch.courseId === undefined ? item.course_id : input.patch.courseId; if (courseId) { const course = await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, courseId]); if (!course.rowCount) return "flashcard_deck_course_not_found" as const; } const sourceIds = input.patch.materialSourceIds === undefined ? item.material_source_ids : [...new Set(input.patch.materialSourceIds)]; let snapshots = item.source_snapshots; if (input.patch.materialSourceIds !== undefined) { const sources = sourceIds.length ? await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, sourceIds]) : { rowCount: 0, rows: [] as Record<string,any>[] }; if ((sources.rowCount ?? 0) !== sourceIds.length) return "flashcard_deck_material_not_found" as const; snapshots = sources.rows.map(row => ({ sourceId: row.id, contentHash: row.content_hash })); } const result = await client.query("UPDATE flashcard_decks SET course_id=$3,name=$4,material_source_ids=$5::uuid[],source_snapshots=$6::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *", [vaultId, flashcardDeckId, courseId, input.patch.name ?? item.name, sourceIds, JSON.stringify(snapshots)]); return result.rows[0]; }); if (!updated) return reply.code(404).send({ error: "flashcard_deck_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapFlashcardDeck(updated);
});

app.delete("/api/v1/vaults/:vaultId/study/decks/:flashcardDeckId", async (request, reply) => { const { vaultId, flashcardDeckId } = request.params as { vaultId: string; flashcardDeckId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardDeckId); const revision = revisionFromIfMatch(request.headers["if-match"]); if (revision === null) return reply.code(428).send({ error: "if_match_required" }); const result = await query("UPDATE flashcard_decks SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id", [vaultId, flashcardDeckId, revision]); if (!result.rowCount) return reply.code(409).send({ error: "flashcard_deck_not_found_stale_generated_or_archived" }); return reply.code(204).send(); });

app.get("/api/v1/vaults/:vaultId/study/cards", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { deckId, courseId, status = "active", approvalStatus, limit: rawLimit } = request.query as { deckId?: string; courseId?: string; status?: "active" | "archived" | "all"; approvalStatus?: "draft" | "approved"; limit?: string }; idSchema.parse(vaultId); if (deckId) idSchema.parse(deckId); if (courseId) idSchema.parse(courseId); const limit = rawLimit === undefined ? 100 : Number(rawLimit); if (!["active","archived","all"].includes(status) || (approvalStatus && !["draft","approved"].includes(approvalStatus)) || !Number.isInteger(limit) || limit < 1 || limit > 200) return reply.code(400).send({ error: "invalid_flashcard_filter" });
  const result = await query(`SELECT q.* FROM (${flashcardProjection}) q JOIN flashcard_decks d ON d.id=q.deck_id WHERE q.vault_id=$1 AND ($2::uuid IS NULL OR q.deck_id=$2) AND ($3::uuid IS NULL OR d.course_id=$3) AND ($4='all' OR ($4='active' AND q.archived_at IS NULL) OR ($4='archived' AND q.archived_at IS NOT NULL)) AND ($5::text IS NULL OR q.approval_status=$5) ORDER BY q.updated_at DESC,q.id LIMIT $6`, [vaultId, deckId ?? null, courseId ?? null, status, approvalStatus ?? null, limit]); return { items: result.rows.map(mapFlashcard), nextCursor: null };
});

app.post("/api/v1/vaults/:vaultId/study/cards", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = createFlashcardSchema.parse(request.body);
  const created = await transaction(async client => { const deck = await client.query("SELECT id FROM flashcard_decks WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, input.deckId]); if (!deck.rowCount) return "flashcard_deck_not_found" as const; const anchors = [...new Set(input.sourceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "flashcard_source_anchor_not_current" as const; } const result = await client.query("INSERT INTO flashcards(vault_id,deck_id,prompt,answer,source_anchor_ids,origin,approval_status,review_policy_version) VALUES ($1,$2,$3,$4,$5::uuid[],'owner',$6,$7) RETURNING *", [vaultId, input.deckId, input.prompt, input.answer, anchors, input.approvalStatus, FLASHCARD_REVIEW_POLICY_VERSION]); return { ...result.rows[0], source_stale: false }; }); if (typeof created === "string") return reply.code(400).send({ error: created }); return reply.code(201).send(mapFlashcard(created));
});

app.get("/api/v1/vaults/:vaultId/study/cards/:flashcardId", async (request, reply) => { const { vaultId, flashcardId } = request.params as { vaultId: string; flashcardId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardId); const result = await query(`${flashcardProjection} WHERE f.vault_id=$1 AND f.id=$2`, [vaultId, flashcardId]); if (!result.rows[0]) return reply.code(404).send({ error: "flashcard_not_found" }); return mapFlashcard(result.rows[0]); });

app.patch("/api/v1/vaults/:vaultId/study/cards/:flashcardId", async (request, reply) => {
  const { vaultId, flashcardId } = request.params as { vaultId: string; flashcardId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardId); const input = updateFlashcardSchema.parse(request.body);
  const updated = await transaction(async client => { const current = await client.query("SELECT * FROM flashcards WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE", [vaultId, flashcardId]); const item = current.rows[0]; if (!item) return null; if (item.revision !== input.expectedRevision) return "stale_revision" as const; if (item.origin !== "owner") return "generated_flashcard_read_only" as const; const deckId = input.patch.deckId ?? item.deck_id; const deck = await client.query("SELECT id FROM flashcard_decks WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, deckId]); if (!deck.rowCount) return "flashcard_deck_not_found" as const; const anchors = input.patch.sourceAnchorIds === undefined ? item.source_anchor_ids : [...new Set(input.patch.sourceAnchorIds)]; if (anchors.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, anchors]); if (valid.rowCount !== anchors.length) return "flashcard_source_anchor_not_current" as const; } const result = await client.query("UPDATE flashcards SET deck_id=$3,prompt=$4,answer=$5,source_anchor_ids=$6::uuid[],approval_status=$7,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *", [vaultId, flashcardId, deckId, input.patch.prompt ?? item.prompt, input.patch.answer ?? item.answer, anchors, input.patch.approvalStatus ?? item.approval_status]); return { ...result.rows[0], source_stale: false }; }); if (!updated) return reply.code(404).send({ error: "flashcard_not_found" }); if (typeof updated === "string") return reply.code(409).send({ error: updated }); return mapFlashcard(updated);
});

app.delete("/api/v1/vaults/:vaultId/study/cards/:flashcardId", async (request, reply) => { const { vaultId, flashcardId } = request.params as { vaultId: string; flashcardId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardId); const revision = revisionFromIfMatch(request.headers["if-match"]); if (revision === null) return reply.code(428).send({ error: "if_match_required" }); const result = await query("UPDATE flashcards SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND origin='owner' AND archived_at IS NULL RETURNING id", [vaultId, flashcardId, revision]); if (!result.rowCount) return reply.code(409).send({ error: "flashcard_not_found_stale_generated_or_archived" }); return reply.code(204).send(); });

app.get("/api/v1/vaults/:vaultId/study/review-queue", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; const { deckId, at: rawAt, limit: rawLimit } = request.query as { deckId?: string; at?: string; limit?: string }; idSchema.parse(vaultId); if (deckId) idSchema.parse(deckId); const at = rawAt ?? new Date().toISOString(); const limit = rawLimit === undefined ? 50 : Number(rawLimit); if (Number.isNaN(Date.parse(at)) || !Number.isInteger(limit) || limit < 1 || limit > 200) return reply.code(400).send({ error: "invalid_flashcard_queue_filter" });
  const result = await query(`SELECT q.* FROM (${flashcardProjection}) q JOIN flashcard_decks d ON d.id=q.deck_id WHERE q.vault_id=$1 AND q.archived_at IS NULL AND d.archived_at IS NULL AND q.approval_status='approved' AND NOT q.source_stale AND ($2::uuid IS NULL OR q.deck_id=$2) AND (q.next_due IS NULL OR q.next_due <= $3::timestamptz) ORDER BY q.next_due NULLS FIRST,q.created_at,q.id LIMIT $4`, [vaultId, deckId ?? null, at, limit]); return { items: result.rows.map(row => flashcardReviewItemSchema.parse({ card: mapFlashcard(row), dueBasis: row.next_due ? "scheduled" : "new", dueAt: row.next_due ? iso(row.next_due) : null, policyVersion: FLASHCARD_REVIEW_POLICY_VERSION })), at: iso(at) };
});

app.post("/api/v1/vaults/:vaultId/study/cards/:flashcardId/reviews", async (request, reply) => {
  const { vaultId, flashcardId } = request.params as { vaultId: string; flashcardId: string }; idSchema.parse(vaultId); idSchema.parse(flashcardId); const input = recordFlashcardReviewSchema.parse(request.body);
  const recorded = await transaction(async client => { const duplicate = await client.query("SELECT * FROM flashcard_reviews WHERE vault_id=$1 AND response_id=$2", [vaultId, input.responseId]); if (duplicate.rows[0]) { if (duplicate.rows[0].card_id !== flashcardId) return "review_response_id_conflict" as const; return duplicate.rows[0]; } const current = await client.query("SELECT f.* FROM flashcards f JOIN flashcard_decks d ON d.id=f.deck_id WHERE f.vault_id=$1 AND f.id=$2 AND f.archived_at IS NULL AND d.archived_at IS NULL FOR UPDATE OF f", [vaultId, flashcardId]); const card = current.rows[0]; if (!card) return null; if (card.revision !== input.expectedCardRevision) return "stale_revision" as const; if (card.approval_status !== "approved") return "flashcard_not_approved" as const; if (card.source_anchor_ids.length) { const valid = await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])`, [vaultId, card.source_anchor_ids]); if (valid.rowCount !== card.source_anchor_ids.length) return "flashcard_sources_stale" as const; } const latest = await client.query("SELECT observed_at FROM flashcard_reviews WHERE card_id=$1 ORDER BY observed_at DESC LIMIT 1", [flashcardId]); if (latest.rows[0] && Date.parse(input.observedAt) <= Date.parse(iso(latest.rows[0].observed_at))) return "review_out_of_order" as const; const nextDue = nextReviewAt(input.observedAt, input.rating, card.review_count); const review = await client.query("INSERT INTO flashcard_reviews(vault_id,response_id,card_id,card_revision,rating,observed_at,active_seconds,review_policy_version,computed_next_due) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *", [vaultId, input.responseId, flashcardId, card.revision, input.rating, input.observedAt, input.activeSeconds ?? null, FLASHCARD_REVIEW_POLICY_VERSION, nextDue]); await client.query("UPDATE flashcards SET next_due=$3,review_count=review_count+1,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2", [vaultId, flashcardId, nextDue]); return review.rows[0]; }); if (!recorded) return reply.code(404).send({ error: "flashcard_not_found" }); if (typeof recorded === "string") return reply.code(409).send({ error: recorded }); return reply.code(201).send(mapFlashcardReview(recorded));
});

app.post("/api/v1/vaults/:vaultId/study/flashcards/:flashcardId/reviews",async(request,reply)=>{const {vaultId,flashcardId}=request.params as {vaultId:string;flashcardId:string};idSchema.parse(vaultId);idSchema.parse(flashcardId);const input=reviewFlashcardSchema.parse(request.body),responseId=`master-${createHash("sha256").update(JSON.stringify({flashcardId,...input})).digest("hex")}`;const recorded=await transaction(async client=>{const duplicate=await client.query("SELECT * FROM flashcard_reviews WHERE vault_id=$1 AND response_id=$2",[vaultId,responseId]);if(duplicate.rows[0])return duplicate.rows[0];const current=await client.query("SELECT f.* FROM flashcards f JOIN flashcard_decks d ON d.id=f.deck_id WHERE f.vault_id=$1 AND f.id=$2 AND f.archived_at IS NULL AND d.archived_at IS NULL FOR UPDATE OF f",[vaultId,flashcardId]);const card=current.rows[0];if(!card)return null;if(card.approval_status!=="approved")return"flashcard_not_approved" as const;if(card.source_anchor_ids.length){const valid=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,card.source_anchor_ids]);if(valid.rowCount!==card.source_anchor_ids.length)return"flashcard_sources_stale" as const;}const latest=await client.query("SELECT observed_at FROM flashcard_reviews WHERE card_id=$1 ORDER BY observed_at DESC LIMIT 1",[flashcardId]);if(latest.rows[0]&&Date.parse(input.observedAt)<=Date.parse(iso(latest.rows[0].observed_at)))return"review_out_of_order" as const;const nextDue=nextReviewAt(input.observedAt,input.outcome,card.review_count),activeSeconds=input.elapsedMs===null?null:Math.ceil(input.elapsedMs/1000);const review=await client.query("INSERT INTO flashcard_reviews(vault_id,response_id,card_id,card_revision,rating,observed_at,active_seconds,answer,hints_used,elapsed_ms,review_policy_version,computed_next_due) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",[vaultId,responseId,flashcardId,card.revision,input.outcome,input.observedAt,activeSeconds,input.answer,input.hintsUsed,input.elapsedMs,FLASHCARD_REVIEW_POLICY_VERSION,nextDue]);await client.query("UPDATE flashcards SET next_due=$3,review_count=review_count+1,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,flashcardId,nextDue]);return review.rows[0];});if(!recorded)return reply.code(404).send({error:"flashcard_not_found"});if(typeof recorded==="string")return reply.code(409).send({error:recorded});const base=mapFlashcardReview(recorded);return reply.code(201).send(flashcardReviewReceiptSchema.parse({...base,answer:recorded.answer??null,hintsUsed:recorded.hints_used??null,elapsedMs:recorded.elapsed_ms??null}));});

app.get("/api/v1/vaults/:vaultId/scheduler/preferences", async request => { const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const result = await query("SELECT * FROM scheduler_preferences WHERE vault_id=$1", [vaultId]); return result.rows[0] ? mapSchedulerPreferences(result.rows[0]) : defaultSchedulerPreferences(vaultId); });

app.put("/api/v1/vaults/:vaultId/scheduler/preferences", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = setSchedulerPreferencesSchema.parse(request.body); if (!isSupportedTimezone(input.preferences.timezone)) return reply.code(400).send({ error: "unsupported_scheduler_timezone" });
  const result = await transaction(async client => { const current = await client.query("SELECT * FROM scheduler_preferences WHERE vault_id=$1 FOR UPDATE", [vaultId]); if (!current.rows[0]) { if (input.expectedRevision !== 0) return "stale_revision" as const; const inserted = await client.query("INSERT INTO scheduler_preferences(vault_id,timezone,protected_windows,preferred_windows,daily_limit_minutes,break_minutes,min_block_minutes,max_block_minutes,allow_split,replan_policy,algorithm_version) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,$11) RETURNING *", [vaultId, input.preferences.timezone, JSON.stringify(input.preferences.protectedWindows), JSON.stringify(input.preferences.preferredWindows), input.preferences.dailyLimitMinutes, input.preferences.breakMinutes, input.preferences.minBlockMinutes, input.preferences.maxBlockMinutes, input.preferences.allowSplit, input.preferences.replanPolicy, input.preferences.algorithmVersion]); return inserted.rows[0]; } if (current.rows[0].revision !== input.expectedRevision) return "stale_revision" as const; const updated = await client.query("UPDATE scheduler_preferences SET timezone=$2,protected_windows=$3::jsonb,preferred_windows=$4::jsonb,daily_limit_minutes=$5,break_minutes=$6,min_block_minutes=$7,max_block_minutes=$8,allow_split=$9,replan_policy=$10,algorithm_version=$11,revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *", [vaultId, input.preferences.timezone, JSON.stringify(input.preferences.protectedWindows), JSON.stringify(input.preferences.preferredWindows), input.preferences.dailyLimitMinutes, input.preferences.breakMinutes, input.preferences.minBlockMinutes, input.preferences.maxBlockMinutes, input.preferences.allowSplit, input.preferences.replanPolicy, input.preferences.algorithmVersion]); return updated.rows[0]; }); if (result === "stale_revision") return reply.code(409).send({ error: result }); return mapSchedulerPreferences(result);
});

app.get("/api/v1/vaults/:vaultId/scheduler/constraints",async request=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM scheduler_preferences WHERE vault_id=$1",[vaultId]);return mapSchedulingConstraints(vaultId,result.rows[0]);});

app.put("/api/v1/vaults/:vaultId/scheduler/constraints",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const input=setSchedulingConstraintsSchema.parse(request.body);if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_scheduler_timezone"});const result=await transaction(async client=>{const current=await client.query("SELECT * FROM scheduler_preferences WHERE vault_id=$1 FOR UPDATE",[vaultId]);const replanPolicy=input.movementPolicy==="preserve_locked"?"manual_only":"preview_on_conflict";if(!current.rows[0]){if(revision!==0)return"stale_revision" as const;const inserted=await client.query("INSERT INTO scheduler_preferences(vault_id,timezone,protected_windows,preferred_windows,daily_limit_minutes,break_minutes,min_block_minutes,max_block_minutes,allow_split,replan_policy,algorithm_version,freeze_horizon_minutes,movement_policy) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6,$7,$8,$9,$10,'deterministic-scheduler-v1',$11,$12) RETURNING *",[vaultId,input.timezone,JSON.stringify(input.protectedWindows),JSON.stringify(input.preferredWindows),input.dailyLimits.defaultMinutes,input.breaks.betweenBlocksMinutes,input.breaks.minBlockMinutes,input.breaks.maxBlockMinutes,input.allowSplit,replanPolicy,input.freezeHorizonMinutes,input.movementPolicy]);return inserted.rows[0];}if(current.rows[0].revision!==revision)return"stale_revision" as const;const updated=await client.query("UPDATE scheduler_preferences SET timezone=$2,protected_windows=$3::jsonb,preferred_windows=$4::jsonb,daily_limit_minutes=$5,break_minutes=$6,min_block_minutes=$7,max_block_minutes=$8,allow_split=$9,replan_policy=$10,freeze_horizon_minutes=$11,movement_policy=$12,revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *",[vaultId,input.timezone,JSON.stringify(input.protectedWindows),JSON.stringify(input.preferredWindows),input.dailyLimits.defaultMinutes,input.breaks.betweenBlocksMinutes,input.breaks.minBlockMinutes,input.breaks.maxBlockMinutes,input.allowSplit,replanPolicy,input.freezeHorizonMinutes,input.movementPolicy]);return updated.rows[0];});if(typeof result==="string")return reply.code(409).send({error:result});return mapSchedulingConstraints(vaultId,result);});

app.post("/api/v1/vaults/:vaultId/scheduler/plans",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=proposeScheduleSchema.parse(request.body);const [tasks,preferenceRows,currentCalendarRevision]=await Promise.all([query("SELECT * FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND completed=false AND deleted_at IS NULL",[vaultId,input.taskIds]),query("SELECT * FROM scheduler_preferences WHERE vault_id=$1",[vaultId]),calendarConstraintRevision(vaultId)]);if(tasks.rowCount!==input.taskIds.length)return reply.code(400).send({error:"schedule_task_not_found_or_completed"});const preferences=preferenceRows.rows[0]?mapSchedulerPreferences(preferenceRows.rows[0]):defaultSchedulerPreferences(vaultId);if(preferences.revision!==input.constraintsRevision)return reply.code(409).send({error:"stale_scheduler_constraints"});if(currentCalendarRevision!==input.calendarRevision)return reply.code(409).send({error:"stale_calendar_revision"});const occurrences=(await loadCalendarOccurrences(vaultId,input.window.startsAt,input.window.endsAt)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id)),calendarDigest=createHash("sha256").update(JSON.stringify(occurrences.map(item=>({id:item.id,startsAt:item.startsAt,endsAt:item.endsAt})))).digest("hex"),inputRevisions=Object.fromEntries(tasks.rows.map(row=>[row.id,row.revision]));const effectivePreferences={...preferences,allowSplit:input.allowSplit};const preview=buildSchedulePreview({horizon:input.window,busy:occurrences.map(item=>({startsAt:item.startsAt,endsAt:item.endsAt})),preferences:effectivePreferences,tasks:tasks.rows.map(row=>({id:row.id,remainingMinutes:row.remaining_minutes===null?(row.estimated_minutes===null?null:Number(row.estimated_minutes)):Number(row.remaining_minutes),earliestStart:row.earliest_start?iso(row.earliest_start):null,dueAt:row.due_at?iso(row.due_at):null,priority:row.priority,allowSplit:input.allowSplit&&row.allow_split,minBlockMinutes:row.min_block_minutes,maxBlockMinutes:row.max_block_minutes}))});const unknownLessons=await query("SELECT count(*)::int AS count FROM school_lessons WHERE vault_id=$1 AND archived_at IS NULL AND calendar_event_id IS NULL AND time_spec->>'kind'='unknown'",[vaultId]),unknownAvailability=[...(Number(unknownLessons.rows[0]?.count??0)>0?["Unscheduled school lessons with unknown time exist; availability coverage is incomplete."]:[]),...(preview.unscheduled.length?[`${preview.unscheduled.length} task(s) or remainder(s) could not be placed within the requested window and limits.`]:[])];const proposalId=randomUUID(),typed=schedulePreviewResultSchema.parse({type:"schedule_preview",proposalId,constraintsRevision:preferences.revision,inputRevisions,calendarDigest,horizon:input.window,placements:preview.placements,unscheduled:preview.unscheduled,unknownAvailability,algorithmVersion:"deterministic-scheduler-v1",writesApplied:false}),jobInput={type:"schedule_preview",masterOperation:"proposeSchedule",taskIds:input.taskIds,window:input.window,constraintsRevision:input.constraintsRevision,calendarRevision:input.calendarRevision,allowSplit:input.allowSplit,objectiveParameters:input.objectiveParameters??{strategy:"deadline_priority_v1"},inputRevisions,calendarDigest},serialized=JSON.stringify(jobInput),inputHash=createHash("sha256").update(serialized).digest("hex");const existing=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='schedule_preview' AND input_hash=$2 AND status='succeeded' ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]);if(existing.rows[0])return reply.code(202).send(mapJobHandle(existing.rows[0]));const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'schedule_preview','succeeded','proposal_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,inputHash,JSON.stringify(typed)]);await client.query("INSERT INTO schedule_proposals(id,vault_id,job_id,kind,horizon_start,horizon_end,constraints_revision,input_revisions,calendar_digest,placements,unscheduled,unknown_availability,affected_record_ids,expires_at) VALUES ($1,$2,$3,'preview',$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,now()+interval '7 days')",[proposalId,vaultId,created.rows[0].id,input.window.startsAt,input.window.endsAt,preferences.revision,JSON.stringify(inputRevisions),calendarDigest,JSON.stringify(preview.placements),JSON.stringify(preview.unscheduled),JSON.stringify(unknownAvailability),JSON.stringify(input.taskIds)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({writesApplied:false}),JSON.stringify({proposalId,placements:preview.placements.length,unscheduled:preview.unscheduled.length,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.post("/api/v1/vaults/:vaultId/scheduler/preview", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string }; idSchema.parse(vaultId); const input = schedulePreviewRequestSchema.parse(request.body);
  const horizonMs = Date.parse(input.horizon.endsAt) - Date.parse(input.horizon.startsAt); if (horizonMs > 31 * 86_400_000) return reply.code(400).send({ error: "schedule_horizon_too_large" });
  let studyPlan: Record<string,any>|null=null;
  let taskIds=[...new Set(input.taskIds??[])];
  if(input.studyPlanId){const plans=await query("SELECT * FROM study_plans WHERE vault_id=$1 AND id=$2 AND status='active' AND archived_at IS NULL",[vaultId,input.studyPlanId]);studyPlan=plans.rows[0]??null;if(!studyPlan)return reply.code(400).send({error:"study_plan_not_active"});taskIds=[...new Set([...taskIds,...studyPlan.task_ids])];const revisionKey=`study_plan:${input.studyPlanId}`;if(input.expectedInputRevisions[revisionKey]!==studyPlan.revision)return reply.code(409).send({error:"stale_study_plan_revision"});}
  const tasks = await query("SELECT * FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND completed=false AND deleted_at IS NULL", [vaultId, taskIds]); if (tasks.rowCount !== taskIds.length) return reply.code(400).send({ error: "schedule_task_not_found_or_completed" });
  const inputRevisions: Record<string,number> = {}; if(studyPlan)inputRevisions[`study_plan:${studyPlan.id}`]=studyPlan.revision; for (const row of tasks.rows) { inputRevisions[row.id]=row.revision; if (input.expectedInputRevisions[row.id] !== row.revision) return reply.code(409).send({ error: "stale_task_revision", taskId: row.id }); }
  const preferenceRows = await query("SELECT * FROM scheduler_preferences WHERE vault_id=$1", [vaultId]); const preferences = preferenceRows.rows[0] ? mapSchedulerPreferences(preferenceRows.rows[0]) : defaultSchedulerPreferences(vaultId); if (input.expectedInputRevisions.scheduler_preferences !== preferences.revision) return reply.code(409).send({ error: "stale_scheduler_preferences" });
  const effectivePreferences = { ...preferences, ...(input.constraintOverrides ?? {}) }; if (effectivePreferences.minBlockMinutes > effectivePreferences.maxBlockMinutes) return reply.code(400).send({ error: "invalid_override_block_bounds" });
  const occurrences = (await loadCalendarOccurrences(vaultId,input.horizon.startsAt,input.horizon.endsAt)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id)); const calendarDigest = createHash("sha256").update(JSON.stringify(occurrences.map(item=>({id:item.id,startsAt:item.startsAt,endsAt:item.endsAt})))).digest("hex");
  const unknownLessons = await query("SELECT count(*)::int AS count FROM school_lessons WHERE vault_id=$1 AND archived_at IS NULL AND calendar_event_id IS NULL AND time_spec->>'kind'='unknown'", [vaultId]); const unknownAvailability = Number(unknownLessons.rows[0]?.count ?? 0)>0 ? ["Unscheduled school lessons with unknown time exist; availability coverage is incomplete."] : [];
  const preview = buildSchedulePreview({ horizon: input.horizon, busy: occurrences.map(item=>({startsAt:item.startsAt,endsAt:item.endsAt})), preferences: effectivePreferences, tasks: tasks.rows.map(row=>({id:row.id,remainingMinutes:row.remaining_minutes===null?(row.estimated_minutes===null?null:Number(row.estimated_minutes)):Number(row.remaining_minutes),earliestStart:row.earliest_start?iso(row.earliest_start):null,dueAt:row.due_at?iso(row.due_at):null,priority:row.priority,allowSplit:row.allow_split,minBlockMinutes:row.min_block_minutes,maxBlockMinutes:row.max_block_minutes})) });
  const proposalId=randomUUID(); const result=schedulePreviewResultSchema.parse({type:"schedule_preview",proposalId,constraintsRevision:preferences.revision,inputRevisions,calendarDigest,horizon:input.horizon,placements:preview.placements,unscheduled:preview.unscheduled,unknownAvailability,algorithmVersion:"deterministic-scheduler-v1",writesApplied:false}); const jobInput={type:"schedule_preview",taskIds,horizon:input.horizon,constraintOverrides:input.constraintOverrides??{},inputRevisions,constraintsRevision:preferences.revision,calendarDigest}; const serialized=JSON.stringify(jobInput); const inputHash=createHash("sha256").update(serialized).digest("hex");
  const existing=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='schedule_preview' AND input_hash=$2 AND status='succeeded' ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]); if(existing.rows[0])return reply.code(202).send(mapJobHandle(existing.rows[0]));
  const job=await transaction(async client=>{const jobId=randomUUID();const created=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'schedule_preview','succeeded','preview_ready',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO schedule_proposals(id,vault_id,job_id,kind,horizon_start,horizon_end,constraints_revision,input_revisions,calendar_digest,placements,unscheduled,unknown_availability,affected_record_ids,expires_at) VALUES ($1,$2,$3,'preview',$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,now()+interval '7 days')",[proposalId,vaultId,jobId,input.horizon.startsAt,input.horizon.endsAt,preferences.revision,JSON.stringify(inputRevisions),calendarDigest,JSON.stringify(preview.placements),JSON.stringify(preview.unscheduled),JSON.stringify(unknownAvailability),JSON.stringify(taskIds)]);if(studyPlan)await client.query("UPDATE study_plans SET schedule_proposal_ids=array_append(schedule_proposal_ids,$2),updated_at=now() WHERE id=$1",[studyPlan.id,proposalId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({writesApplied:false}),JSON.stringify({proposalId,placements:preview.placements.length,unscheduled:preview.unscheduled.length,writesApplied:false})]);return created.rows[0];}); return reply.code(202).send(mapJobHandle(job));
});

app.post("/api/v1/vaults/:vaultId/calendar/preparation-plan",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=preparationPlanInputSchema.parse(request.body);let studyPlan:Record<string,any>|null=null;let taskIds=[...input.taskIds];if(input.studyPlanId){const found=await query("SELECT * FROM study_plans WHERE vault_id=$1 AND id=$2 AND status='active' AND archived_at IS NULL",[vaultId,input.studyPlanId]);studyPlan=found.rows[0]??null;if(!studyPlan)return reply.code(400).send({error:"study_plan_not_active"});taskIds=[...new Set([...taskIds,...studyPlan.task_ids])];if(input.expectedInputRevisions[`study_plan:${input.studyPlanId}`]!==studyPlan.revision)return reply.code(409).send({error:"stale_study_plan_revision"});}if(Object.keys(input.estimates).some(id=>!taskIds.includes(id)))return reply.code(400).send({error:"estimate_task_not_in_plan"});const [tasks,preferenceRows,lockedEvents]=await Promise.all([query("SELECT * FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND completed=false AND deleted_at IS NULL",[vaultId,taskIds]),query("SELECT * FROM scheduler_preferences WHERE vault_id=$1",[vaultId]),input.lockedEventIds.length?query("SELECT id,revision FROM calendar_events WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND trashed_at IS NULL",[vaultId,input.lockedEventIds]):Promise.resolve({rows:[] as Record<string,any>[],rowCount:0})]);if(tasks.rowCount!==taskIds.length)return reply.code(400).send({error:"schedule_task_not_found_or_completed"});if((lockedEvents.rowCount??0)!==input.lockedEventIds.length)return reply.code(400).send({error:"locked_event_not_found"});const preferences=preferenceRows.rows[0]?mapSchedulerPreferences(preferenceRows.rows[0]):defaultSchedulerPreferences(vaultId);if(input.expectedInputRevisions.scheduler_preferences!==preferences.revision)return reply.code(409).send({error:"stale_scheduler_preferences"});const inputRevisions:Record<string,number>={};if(studyPlan)inputRevisions[`study_plan:${studyPlan.id}`]=studyPlan.revision;for(const row of tasks.rows){inputRevisions[row.id]=row.revision;if(input.expectedInputRevisions[row.id]!==row.revision)return reply.code(409).send({error:"stale_task_revision",taskId:row.id});}for(const row of lockedEvents.rows){if(input.expectedInputRevisions[`calendar_event:${row.id}`]!==row.revision)return reply.code(409).send({error:"stale_locked_event_revision",eventId:row.id});}const effectivePreferences={...preferences,...input.limits};if(effectivePreferences.minBlockMinutes>effectivePreferences.maxBlockMinutes)return reply.code(400).send({error:"invalid_override_block_bounds"});const occurrences=(await loadCalendarOccurrences(vaultId,input.window.startsAt,input.window.endsAt)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));const calendarDigest=createHash("sha256").update(JSON.stringify(occurrences.map(item=>({id:item.id,startsAt:item.startsAt,endsAt:item.endsAt})))).digest("hex");const preview=buildSchedulePreview({horizon:input.window,busy:occurrences.map(item=>({startsAt:item.startsAt,endsAt:item.endsAt})),preferences:effectivePreferences,tasks:tasks.rows.map(row=>({id:row.id,remainingMinutes:Object.hasOwn(input.estimates,row.id)?input.estimates[row.id]:(row.remaining_minutes===null?(row.estimated_minutes===null?null:Number(row.estimated_minutes)):Number(row.remaining_minutes)),earliestStart:row.earliest_start?iso(row.earliest_start):null,dueAt:row.due_at?iso(row.due_at):null,priority:row.priority,allowSplit:row.allow_split,minBlockMinutes:row.min_block_minutes,maxBlockMinutes:row.max_block_minutes}))});const unknownAvailability=[...(input.lockedEventIds.length?[`${input.lockedEventIds.length} owner-locked event(s) were preserved as fixed busy time.`]:[]),...(Object.values(input.estimates).some(value=>value===null)?["One or more owner-supplied work estimates are explicitly unknown."]:[])];const proposalId=randomUUID();const result=schedulePreviewResultSchema.parse({type:"schedule_preview",proposalId,constraintsRevision:preferences.revision,inputRevisions,calendarDigest,horizon:input.window,placements:preview.placements,unscheduled:preview.unscheduled,unknownAvailability,algorithmVersion:"deterministic-scheduler-v1",writesApplied:false});const jobInput={type:"preparation_plan_preview",taskIds,studyPlanId:input.studyPlanId,window:input.window,limits:input.limits,estimates:input.estimates,lockedEventIds:input.lockedEventIds,inputRevisions,constraintsRevision:preferences.revision,calendarDigest},serialized=JSON.stringify(jobInput),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='schedule_preview' AND input_hash=$2 AND status='succeeded' ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]);if(prior.rows[0])return reply.code(202).send(mapJobHandle(prior.rows[0]));const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'schedule_preview','succeeded','preparation_preview_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO schedule_proposals(id,vault_id,job_id,kind,horizon_start,horizon_end,constraints_revision,input_revisions,calendar_digest,placements,unscheduled,unknown_availability,affected_record_ids,expires_at) VALUES ($1,$2,$3,'preview',$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,now()+interval '7 days')",[proposalId,vaultId,created.rows[0].id,input.window.startsAt,input.window.endsAt,preferences.revision,JSON.stringify(inputRevisions),calendarDigest,JSON.stringify(preview.placements),JSON.stringify(preview.unscheduled),JSON.stringify(unknownAvailability),JSON.stringify([...taskIds,...input.lockedEventIds])]);if(studyPlan)await client.query("UPDATE study_plans SET schedule_proposal_ids=array_append(schedule_proposal_ids,$2),updated_at=now() WHERE id=$1",[studyPlan.id,proposalId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({writesApplied:false,lockedEventIds:input.lockedEventIds}),JSON.stringify({proposalId,placements:preview.placements.length,unscheduled:preview.unscheduled.length,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.post("/api/v1/vaults/:vaultId/scheduler/replans",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=scheduleReplanRequestSchema.parse(request.body);const horizonMs=Date.parse(input.horizon.endsAt)-Date.parse(input.horizon.startsAt);if(horizonMs>31*86_400_000)return reply.code(400).send({error:"schedule_horizon_too_large"});const taskIds=[...new Set(input.affectedTaskIds)];const [tasks,preferenceRows,activeSessions,preserved]=await Promise.all([query("SELECT * FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND completed=false",[vaultId,taskIds]),query("SELECT * FROM scheduler_preferences WHERE vault_id=$1",[vaultId]),query("SELECT task_ids FROM study_sessions WHERE vault_id=$1 AND archived_at IS NULL AND state IN ('active','paused') AND task_ids&&$2::uuid[]",[vaultId,taskIds]),query("SELECT l.task_id,e.id,e.starts_at,e.ends_at FROM scheduled_task_event_links l JOIN schedule_proposals p ON p.id=l.proposal_id JOIN calendar_events e ON e.id=l.event_id WHERE p.vault_id=$1 AND p.status='approved' AND e.trashed_at IS NULL AND e.ends_at>$2 AND l.task_id=ANY($3::uuid[])",[vaultId,input.horizon.startsAt,taskIds])]);if(tasks.rowCount!==taskIds.length)return reply.code(400).send({error:"replan_task_not_found_or_completed"});if(input.priorProposalId){const prior=await query("SELECT id FROM schedule_proposals WHERE vault_id=$1 AND id=$2",[vaultId,input.priorProposalId]);if(!prior.rowCount)return reply.code(400).send({error:"prior_schedule_proposal_not_found"});}const preferences=preferenceRows.rows[0]?mapSchedulerPreferences(preferenceRows.rows[0]):defaultSchedulerPreferences(vaultId);if(input.expectedInputRevisions.scheduler_preferences!==preferences.revision)return reply.code(409).send({error:"stale_scheduler_preferences"});const inputRevisions:Record<string,number>={};for(const task of tasks.rows){inputRevisions[task.id]=task.revision;if(input.expectedInputRevisions[task.id]!==task.revision)return reply.code(409).send({error:"stale_task_revision",taskId:task.id});}const activeTaskIds=new Set(activeSessions.rows.flatMap(row=>row.task_ids as string[]));const preservedMinutes=new Map<string,number>();for(const block of preserved.rows)preservedMinutes.set(block.task_id,(preservedMinutes.get(block.task_id)??0)+Math.max(0,Math.round((Date.parse(iso(block.ends_at))-Date.parse(iso(block.starts_at)))/60_000)));const occurrences=(await loadCalendarOccurrences(vaultId,input.horizon.startsAt,input.horizon.endsAt)).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));const calendarDigest=createHash("sha256").update(JSON.stringify(occurrences.map(item=>({id:item.id,startsAt:item.startsAt,endsAt:item.endsAt})))).digest("hex");const eligible=tasks.rows.filter(row=>!activeTaskIds.has(row.id)).map(row=>{const recorded=row.remaining_minutes===null?(row.estimated_minutes===null?null:Number(row.estimated_minutes)):Number(row.remaining_minutes);const explicit=input.remainingWork[row.id];const remaining=explicit??(recorded===null?null:Math.max(0,recorded-(preservedMinutes.get(row.id)??0)));return {id:row.id,remainingMinutes:remaining,earliestStart:row.earliest_start?iso(row.earliest_start):null,dueAt:row.due_at?iso(row.due_at):null,priority:row.priority,allowSplit:row.allow_split,minBlockMinutes:row.min_block_minutes,maxBlockMinutes:row.max_block_minutes};});const preview=buildSchedulePreview({horizon:input.horizon,busy:occurrences.map(item=>({startsAt:item.startsAt,endsAt:item.endsAt})),preferences,tasks:eligible});const warnings=[`Replan trigger: ${input.trigger.replaceAll("_"," ")}.`,...(preserved.rows.length?[`${preserved.rows.length} accepted future focus block(s) were preserved and counted before placing remaining work.`]:[]),...(activeTaskIds.size?[`${activeTaskIds.size} task(s) with active or paused execution were frozen.`]:[])];const proposalId=randomUUID();const typed=schedulePreviewResultSchema.parse({type:"schedule_preview",proposalId,constraintsRevision:preferences.revision,inputRevisions,calendarDigest,horizon:input.horizon,placements:preview.placements,unscheduled:preview.unscheduled,unknownAvailability:warnings,algorithmVersion:"deterministic-scheduler-v1",writesApplied:false});const jobInput={type:"schedule_preview",replan:true,trigger:input.trigger,priorProposalId:input.priorProposalId,taskIds,horizon:input.horizon,inputRevisions,constraintsRevision:preferences.revision,calendarDigest};const serialized=JSON.stringify(jobInput);const job=await transaction(async client=>{const jobId=randomUUID();const created=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'schedule_preview','succeeded','replan_ready',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(typed)]);await client.query("INSERT INTO schedule_proposals(id,vault_id,job_id,kind,horizon_start,horizon_end,constraints_revision,input_revisions,calendar_digest,placements,unscheduled,unknown_availability,affected_record_ids,expires_at) VALUES ($1,$2,$3,'replan',$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,now()+interval '7 days')",[proposalId,vaultId,jobId,input.horizon.startsAt,input.horizon.endsAt,preferences.revision,JSON.stringify(inputRevisions),calendarDigest,JSON.stringify(preview.placements),JSON.stringify(preview.unscheduled),JSON.stringify(warnings),JSON.stringify(taskIds)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({trigger:input.trigger,writesApplied:false}),JSON.stringify({proposalId,preservedBlocks:preserved.rows.length,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/scheduler/explanations/:proposalId",async(request,reply)=>{const {vaultId,proposalId}=request.params as {vaultId:string;proposalId:string};idSchema.parse(vaultId);idSchema.parse(proposalId);const result=await query("SELECT * FROM schedule_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);if(!result.rows[0])return reply.code(404).send({error:"schedule_proposal_not_found"});const proposal=await mapScheduleProposal(result.rows[0]);if(proposal.kind!=="schedule_plan")return reply.code(400).send({error:"not_a_schedule_proposal"});return scheduleExplanationSchema.parse({proposalId:proposal.id,status:proposal.status,stale:proposal.stale,algorithmVersion:"deterministic-scheduler-v1",horizon:proposal.diff.horizon,constraintsRevision:proposal.constraintsRevision,calendarDigest:proposal.calendarDigest,inputRevisions:proposal.expectedRevisions,placements:proposal.diff.placements.map(item=>({...item,explanations:explainScheduleReasons(item.reasonCodes)})),unscheduled:proposal.diff.unscheduled.map(item=>({...item,explanations:explainScheduleReasons(item.reasonCodes)})),unknownAvailability:proposal.diff.unknownAvailability,writesApplied:proposal.diff.writesApplied});});

app.post("/api/v1/vaults/:vaultId/calendar-events/:eventId/provider-action-preview",async(request,reply)=>{const {vaultId,eventId}=request.params as {vaultId:string;eventId:string};idSchema.parse(vaultId);idSchema.parse(eventId);const input=previewProviderCalendarActionSchema.parse(request.body);const [eventResult,connectionResult]=await Promise.all([query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL",[vaultId,eventId]),query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND provider IN ('microsoft','google_calendar') AND disconnected_at IS NULL",[vaultId,input.connectionId])]);const event=eventResult.rows[0],connection=connectionResult.rows[0];if(!event)return reply.code(404).send({error:"calendar_event_not_found"});if(!connection)return reply.code(404).send({error:"calendar_connection_not_found"});const publicFields=buildProviderPublicFields({title:event.title,startsAt:event.starts_at,endsAt:event.ends_at,timezone:event.timezone},input.publicFields);const result=await query("INSERT INTO provider_calendar_action_proposals(vault_id,event_id,connection_id,action_kind,target_calendar_id,recipients,public_fields,response,event_revision,connection_revision) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9,$10) RETURNING *",[vaultId,eventId,input.connectionId,input.kind,input.targetCalendarId,JSON.stringify(input.recipients),JSON.stringify(publicFields),input.response,event.revision,connection.revision]);return mapProviderCalendarProposal(result.rows[0]);});

app.get("/api/v1/vaults/:vaultId/calendar-provider-actions",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {status,event_id:eventId,limit:rawLimit}=request.query as {status?:string;event_id?:string;limit?:string};idSchema.parse(vaultId);if(eventId)idSchema.parse(eventId);const limit=rawLimit===undefined?50:Number(rawLimit);if((status&&!['pending','in_flight','delivery_unknown','acknowledged','rejected','cancelled'].includes(status))||!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_provider_action_filter"});const result=await query("SELECT a.*,c.provider FROM provider_calendar_actions a JOIN integration_connections c ON c.id=a.connection_id WHERE a.vault_id=$1 AND ($2::text IS NULL OR a.state=$2) AND ($3::uuid IS NULL OR a.event_id=$3) ORDER BY a.created_at DESC,a.id LIMIT $4",[vaultId,status??null,eventId??null,limit]);return{items:result.rows.map(mapProviderCalendarAction),nextCursor:null};});
app.get("/api/v1/vaults/:vaultId/calendar-provider-actions/:actionId",async(request,reply)=>{const {vaultId,actionId}=request.params as {vaultId:string;actionId:string};idSchema.parse(vaultId);idSchema.parse(actionId);const result=await query("SELECT a.*,c.provider FROM provider_calendar_actions a JOIN integration_connections c ON c.id=a.connection_id WHERE a.vault_id=$1 AND a.id=$2",[vaultId,actionId]);if(!result.rows[0])return reply.code(404).send({error:"provider_calendar_action_not_found"});return mapProviderCalendarAction(result.rows[0]);});
app.post("/api/v1/vaults/:vaultId/calendar-provider-actions/:actionId/reconcile",async(request,reply)=>{const {vaultId,actionId}=request.params as {vaultId:string;actionId:string};idSchema.parse(vaultId);idSchema.parse(actionId);const result=await query("SELECT a.*,c.provider,c.state AS connection_state,c.capabilities,c.revision AS connection_revision FROM provider_calendar_actions a JOIN integration_connections c ON c.id=a.connection_id WHERE a.vault_id=$1 AND a.id=$2",[vaultId,actionId]);const action=result.rows[0];if(!action)return reply.code(404).send({error:"provider_calendar_action_not_found"});if(['acknowledged','rejected','cancelled'].includes(action.state))return reply.code(409).send({error:"provider_calendar_action_terminal"});if(action.sends_disabled_after_restore)return reply.code(409).send({error:"provider_reauthorization_and_reconciliation_required"});const readiness=providerWriteReadiness({provider:action.provider,state:action.connection_state,revision:action.connection_revision,capabilities:action.capabilities});if(readiness)return reply.code(409).send({error:readiness});return reply.code(409).send({error:"provider_reconciliation_adapter_unavailable"});});
app.post("/api/v1/vaults/:vaultId/calendar-provider-actions/:actionId/cancel",async(request,reply)=>{const {vaultId,actionId}=request.params as {vaultId:string;actionId:string};idSchema.parse(vaultId);idSchema.parse(actionId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE provider_calendar_actions SET state='cancelled',cancelled_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND state='pending' RETURNING *",[vaultId,actionId,revision]);if(!result.rows[0])return reply.code(409).send({error:"provider_calendar_action_not_pending_or_stale"});const connection=await query("SELECT provider FROM integration_connections WHERE id=$1",[result.rows[0].connection_id]);return mapProviderCalendarAction({...result.rows[0],provider:connection.rows[0].provider});});

app.get("/api/v1/vaults/:vaultId/proposals",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {status,kind,limit:rawLimit}=request.query as {status?:string;kind?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?50:Number(rawLimit),contentKinds=['merge_notes','split_note','merge_labels','bulk_reassign','idea_promotion'];if((status&&!['draft','approved','rejected','withdrawn','superseded','expired'].includes(status))||(kind&&!['schedule_plan','provider_calendar_action','entity_merge','study_plan_withdrawal',...contentKinds].includes(kind))||!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_proposal_filter"});const empty=()=>Promise.resolve({rows:[] as Record<string,any>[]});const [schedule,provider,entityMerge,studyWithdrawal,content]=await Promise.all([kind&&kind!=="schedule_plan"?empty():query("SELECT * FROM schedule_proposals WHERE vault_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC,id LIMIT $3",[vaultId,status??null,limit]),kind&&kind!=="provider_calendar_action"?empty():query("SELECT * FROM provider_calendar_action_proposals WHERE vault_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC,id LIMIT $3",[vaultId,status??null,limit]),kind&&kind!=="entity_merge"?empty():query("SELECT * FROM entity_merge_proposals WHERE vault_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC,id LIMIT $3",[vaultId,status??null,limit]),kind&&kind!=="study_plan_withdrawal"?empty():query("SELECT * FROM study_withdrawal_proposals WHERE vault_id=$1 AND ($2::text IS NULL OR status=$2) ORDER BY created_at DESC,id LIMIT $3",[vaultId,status??null,limit]),kind&&!contentKinds.includes(kind)?empty():query("SELECT * FROM content_proposals WHERE vault_id=$1 AND ($2::text IS NULL OR status=$2) AND ($3::text IS NULL OR kind=$3) ORDER BY created_at DESC,id LIMIT $4",[vaultId,status??null,kind??null,limit])]);const items=[...await Promise.all(schedule.rows.map(mapScheduleProposal)),...await Promise.all(provider.rows.map(mapProviderCalendarProposal)),...await Promise.all(entityMerge.rows.map(mapEntityMergeProposal)),...await Promise.all(studyWithdrawal.rows.map(mapStudyWithdrawalProposal)),...await Promise.all(content.rows.map(mapContentProposal))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id)).slice(0,limit);return {items,nextCursor:null};});

app.post("/api/v1/vaults/:vaultId/proposals",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const created=await transaction(client=>createContentProposal(client,vaultId,request.body));if(typeof created==="string")return reply.code(created.includes("not_found")?404:409).send({error:created});return reply.code(201).send(await mapContentProposal(created));});

app.get("/api/v1/vaults/:vaultId/proposals/:proposalId",async(request,reply)=>{const {vaultId,proposalId}=request.params as {vaultId:string;proposalId:string};idSchema.parse(vaultId);idSchema.parse(proposalId);const schedule=await query("SELECT * FROM schedule_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);if(schedule.rows[0])return mapScheduleProposal(schedule.rows[0]);const provider=await query("SELECT * FROM provider_calendar_action_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);if(provider.rows[0])return mapProviderCalendarProposal(provider.rows[0]);const entityMerge=await query("SELECT * FROM entity_merge_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);if(entityMerge.rows[0])return mapEntityMergeProposal(entityMerge.rows[0]);const studyWithdrawal=await query("SELECT * FROM study_withdrawal_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);if(studyWithdrawal.rows[0])return mapStudyWithdrawalProposal(studyWithdrawal.rows[0]);const content=await query("SELECT * FROM content_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);if(!content.rows[0])return reply.code(404).send({error:"proposal_not_found"});return mapContentProposal(content.rows[0]);});

app.post("/api/v1/vaults/:vaultId/proposals/:proposalId/reject",async(request,reply)=>{const {vaultId,proposalId}=request.params as {vaultId:string;proposalId:string};idSchema.parse(vaultId);idSchema.parse(proposalId);const input=rejectProposalSchema.parse(request.body);const schedule=await query("UPDATE schedule_proposals SET status='rejected',rejection_reason=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$4 AND status='draft' RETURNING *",[vaultId,proposalId,input.reason??null,input.expectedProposalRevision]);if(schedule.rows[0])return mapScheduleProposal(schedule.rows[0]);const provider=await query("UPDATE provider_calendar_action_proposals SET status='rejected',rejection_reason=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$4 AND status='draft' RETURNING *",[vaultId,proposalId,input.reason??null,input.expectedProposalRevision]);if(provider.rows[0])return mapProviderCalendarProposal(provider.rows[0]);const entityMerge=await query("UPDATE entity_merge_proposals SET status='rejected',rejection_reason=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$4 AND status='draft' RETURNING *",[vaultId,proposalId,input.reason??null,input.expectedProposalRevision]);if(entityMerge.rows[0])return mapEntityMergeProposal(entityMerge.rows[0]);const studyWithdrawal=await query("UPDATE study_withdrawal_proposals SET status='rejected',rejection_reason=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$4 AND status='draft' RETURNING *",[vaultId,proposalId,input.reason??null,input.expectedProposalRevision]);if(studyWithdrawal.rows[0])return mapStudyWithdrawalProposal(studyWithdrawal.rows[0]);const content=await query("UPDATE content_proposals SET status='rejected',rejection_reason=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$4 AND status='draft' RETURNING *",[vaultId,proposalId,input.reason??null,input.expectedProposalRevision]);if(!content.rows[0])return reply.code(409).send({error:"proposal_not_found_stale_or_not_draft"});return mapContentProposal(content.rows[0]);});

app.post("/api/v1/vaults/:vaultId/proposals/:proposalId/accept",async(request,reply)=>{
  const {vaultId,proposalId}=request.params as {vaultId:string;proposalId:string};idSchema.parse(vaultId);idSchema.parse(proposalId);const input=acceptProposalSchema.parse(request.body);
  const studyWithdrawalCandidate=await query("SELECT id FROM study_withdrawal_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);
  if(studyWithdrawalCandidate.rowCount){
    if(input.confirmation!=="apply_study_withdrawal")return reply.code(400).send({error:"study_withdrawal_confirmation_required"});
    const applied=await transaction(async client=>{
      await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      const locked=await client.query<Record<string,any>>("SELECT * FROM study_withdrawal_proposals WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,proposalId]);const proposal=locked.rows[0];
      if(!proposal)return null;
      if(proposal.status==="approved"&&proposal.applied_job_id){const prior=await client.query("SELECT * FROM jobs WHERE id=$1",[proposal.applied_job_id]);return prior.rows[0]??"study_withdrawal_application_job_missing" as const;}
      if(proposal.status!=="draft"||proposal.revision!==input.expectedProposalRevision)return"proposal_not_draft_or_stale" as const;
      if(new Date(proposal.expires_at)<=new Date())return"proposal_expired" as const;
      const planResult=await client.query<Record<string,any>>("SELECT revision,status,archived_at FROM study_plans WHERE vault_id=$1 AND id=$2 FOR SHARE",[vaultId,proposal.study_plan_id]);const plan=planResult.rows[0];
      if(!plan||plan.archived_at||plan.revision!==proposal.study_plan_revision||!['draft','active'].includes(plan.status))return"study_withdrawal_plan_stale" as const;
      const units=await client.query("SELECT task_id FROM study_plan_units WHERE vault_id=$1 AND plan_id=$2 AND task_id IS NOT NULL",[vaultId,proposal.study_plan_id]);const planTaskIds=new Set(units.rows.map(row=>row.task_id as string));
      const events=await client.query<Record<string,any>>("SELECT e.*,l.task_id,c.origin,EXISTS(SELECT 1 FROM study_sessions s WHERE s.vault_id=$1 AND s.calendar_event_id=e.id AND s.state IN ('active','paused','interrupted','completed')) AS started,EXISTS(SELECT 1 FROM provider_calendar_actions a WHERE a.vault_id=$1 AND a.event_id=e.id AND a.state IN ('pending','in_flight','delivery_unknown','acknowledged')) AS external_action FROM calendar_events e JOIN calendars c ON c.id=e.calendar_id JOIN scheduled_task_event_links l ON l.event_id=e.id WHERE e.vault_id=$1 AND e.id=ANY($2::uuid[]) AND e.trashed_at IS NULL FOR UPDATE OF e",[vaultId,proposal.selected_event_ids]);
      if(events.rowCount!==proposal.selected_event_ids.length||events.rows.some(event=>!planTaskIds.has(event.task_id)||event.started||event.origin!=="sorta"||event.external_action||new Date(event.starts_at).getTime()<=Date.now()))return"study_withdrawal_inputs_stale_or_ineligible" as const;
      const trashedAt=new Date();
      for(const event of events.rows){await client.query("UPDATE calendar_events SET trashed_at=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,event.id,trashedAt]);await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,actor_kind,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'owner',ARRAY['trashed','study_plan_withdrawal'])",[event.id,event.revision+1,event.title,event.starts_at,event.ends_at,event.timezone,event.recurrence?JSON.stringify(event.recurrence):null]);}
      const jobId=randomUUID(),result={type:"study_plan_withdrawal_apply",proposalId,studyPlanId:proposal.study_plan_id,trashedEventIds:proposal.selected_event_ids,affectedTaskIds:proposal.affected_task_ids,historyDeleted:false,fixedOrExternalEventsDeleted:false,writesApplied:true},jobInput={type:"study_plan_withdrawal_apply",proposalId,proposalRevision:proposal.revision,studyPlanRevision:proposal.study_plan_revision},serialized=JSON.stringify(jobInput);
      const job=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'proposal_apply','succeeded','applied',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);
      await client.query("UPDATE study_withdrawal_proposals SET status='approved',applied_job_id=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,proposalId,jobId]);
      await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({proposalId,confirmation:input.confirmation}),JSON.stringify(result)]);
      return job.rows[0];
    });
    if(!applied)return reply.code(404).send({error:"proposal_not_found"});if(typeof applied==="string")return reply.code(409).send({error:applied});return reply.code(202).send(mapJobHandle(applied));
  }
  const contentCandidate=await query("SELECT id FROM content_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);
  if(contentCandidate.rowCount){
    if(input.confirmation!=="apply_content_proposal")return reply.code(400).send({error:"content_proposal_confirmation_required"});
    const applied=await transaction(async client=>{
      await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      const locked=await client.query("SELECT * FROM content_proposals WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,proposalId]);const proposal=locked.rows[0];if(!proposal)return null;
      if(proposal.status==="approved"&&proposal.applied_job_id){const prior=await client.query("SELECT * FROM jobs WHERE id=$1",[proposal.applied_job_id]);return prior.rows[0]??"content_proposal_application_job_missing" as const;}
      if(proposal.status!=="draft"||proposal.revision!==input.expectedProposalRevision)return "proposal_not_draft_or_stale" as const;
      if(await contentProposalIsStale(client,proposal))return "content_proposal_inputs_stale" as const;
      const payload=proposal.inputs as Record<string,any>,diff=proposal.diff as Record<string,any>,createdRecordIds:string[]=[],updatedRecordIds:string[]=[],undo:Record<string,any>={kind:proposal.kind};
      if(proposal.kind==="merge_notes"){
        const notes=await client.query("SELECT * FROM notes WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE",[vaultId,[payload.targetNoteId,...payload.sourceNoteIds]]);undo.notes=notes.rows.map((row:Record<string,any>)=>({id:row.id,title:row.title,body:row.body,revision:row.revision,trashedAt:row.trashed_at?iso(row.trashed_at):null}));
        const target=notes.rows.find((row:Record<string,any>)=>row.id===payload.targetNoteId);await client.query("UPDATE notes SET title=$3,body=$4,status='ready',revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,payload.targetNoteId,diff.mergedTitle,diff.mergedBody]);await client.query("INSERT INTO note_revisions(note_id,revision,title,body) VALUES ($1,$2,$3,$4)",[payload.targetNoteId,target.revision+1,diff.mergedTitle,diff.mergedBody]);
        await client.query("INSERT INTO note_labels(note_id,label_id,locked,provenance) SELECT $2,label_id,bool_or(locked),'owner' FROM note_labels WHERE note_id=ANY($1::uuid[]) GROUP BY label_id ON CONFLICT(note_id,label_id) DO UPDATE SET locked=note_labels.locked OR EXCLUDED.locked",[payload.sourceNoteIds,payload.targetNoteId]);
        for(const sourceId of payload.sourceNoteIds){const source=notes.rows.find((row:Record<string,any>)=>row.id===sourceId);await client.query("UPDATE notes SET trashed_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,sourceId]);await client.query("INSERT INTO note_revisions(note_id,revision,title,body) VALUES ($1,$2,$3,$4)",[sourceId,source.revision+1,source.title,source.body]);}
        updatedRecordIds.push(payload.targetNoteId,...payload.sourceNoteIds);
      }else if(proposal.kind==="split_note"){
        const sourceResult=await client.query("SELECT * FROM notes WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,payload.sourceNoteId]);const source=sourceResult.rows[0];undo.source={id:source.id,title:source.title,body:source.body,revision:source.revision};
        for(const part of payload.parts){const created=await client.query("INSERT INTO notes(vault_id,source_id,title,body,status) VALUES ($1,$2,$3,$4,'ready') RETURNING *",[vaultId,source.source_id,part.title,part.body]);const note=created.rows[0];createdRecordIds.push(note.id);await client.query("INSERT INTO note_revisions(note_id,revision,title,body) VALUES ($1,1,$2,$3)",[note.id,note.title,note.body]);await client.query("INSERT INTO note_labels(note_id,label_id,locked,provenance) SELECT $2,label_id,locked,'owner' FROM note_labels WHERE note_id=$1 ON CONFLICT DO NOTHING",[source.id,note.id]);}
        await client.query("UPDATE notes SET trashed_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,source.id]);await client.query("INSERT INTO note_revisions(note_id,revision,title,body) VALUES ($1,$2,$3,$4)",[source.id,source.revision+1,source.title,source.body]);updatedRecordIds.push(source.id);
      }else if(proposal.kind==="merge_labels"){
        const current=await client.query("SELECT DISTINCT note_id FROM note_labels WHERE label_id=ANY($1::uuid[]) ORDER BY note_id",[payload.sourceLabelIds]);if(JSON.stringify(current.rows.map((row:Record<string,any>)=>row.note_id))!==JSON.stringify(diff.affectedNoteIds))return "content_proposal_affected_records_changed" as const;
        const labels=await client.query("SELECT * FROM labels WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE",[vaultId,[payload.targetLabelId,...payload.sourceLabelIds]]);undo.labels=labels.rows.map((row:Record<string,any>)=>({id:row.id,revision:row.revision}));
        await client.query("INSERT INTO note_labels(note_id,label_id,locked,provenance) SELECT note_id,$2,bool_or(locked),'owner' FROM note_labels WHERE label_id=ANY($1::uuid[]) GROUP BY note_id ON CONFLICT(note_id,label_id) DO UPDATE SET locked=note_labels.locked OR EXCLUDED.locked",[payload.sourceLabelIds,payload.targetLabelId]);await client.query("DELETE FROM note_labels WHERE label_id=ANY($1::uuid[])",[payload.sourceLabelIds]);await client.query("UPDATE labels SET merged_into_label_id=$2,archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$3 AND id=ANY($1::uuid[])",[payload.sourceLabelIds,payload.targetLabelId,vaultId]);updatedRecordIds.push(payload.targetLabelId,...payload.sourceLabelIds,...diff.affectedNoteIds);
      }else if(proposal.kind==="bulk_reassign"){
        const conflicts=payload.removeLabelIds.length?await client.query("SELECT note_id,label_id FROM note_labels WHERE note_id=ANY($1::uuid[]) AND label_id=ANY($2::uuid[]) AND locked=true",[payload.noteIds,payload.removeLabelIds]):{rows:[]};if(conflicts.rows.length)return "locked_label_removal_conflict" as const;
        const prior=await client.query("SELECT note_id,label_id,locked,provenance FROM note_labels WHERE note_id=ANY($1::uuid[]) AND label_id=ANY($2::uuid[])",[payload.noteIds,[...payload.addLabelIds,...payload.removeLabelIds]]);undo.noteLabels=prior.rows;
        if(payload.removeLabelIds.length)await client.query("DELETE FROM note_labels WHERE note_id=ANY($1::uuid[]) AND label_id=ANY($2::uuid[]) AND locked=false",[payload.noteIds,payload.removeLabelIds]);
        for(const labelId of payload.addLabelIds)await client.query("INSERT INTO note_labels(note_id,label_id,locked,provenance) SELECT id,$2,false,'owner' FROM notes WHERE vault_id=$1 AND id=ANY($3::uuid[]) ON CONFLICT DO NOTHING",[vaultId,labelId,payload.noteIds]);updatedRecordIds.push(...payload.noteIds,...payload.addLabelIds,...payload.removeLabelIds);
      }else{
        const ideaIds=[payload.ideaId,...(payload.relatedIdeaIds??[])];const ideaResult=await client.query("SELECT * FROM ideas WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE",[vaultId,ideaIds]);const ideas=ideaResult.rows;undo.ideas=ideas.map((idea:Record<string,any>)=>({id:idea.id,projectId:idea.project_id,state:idea.state,revision:idea.revision}));let projectId=payload.targetProjectId;
        const sourceAnchorIds=[...new Set(ideas.flatMap((idea:Record<string,any>)=>idea.source_anchor_ids??[]))];
        if(projectId){const projectResult=await client.query("SELECT * FROM projects WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,projectId]);const currentProject=projectResult.rows[0];undo.project={id:projectId,ideaIds:currentProject.idea_ids,sourceAnchorIds:currentProject.source_anchor_ids,revision:currentProject.revision};const mergedIdeas=[...new Set([...(currentProject.idea_ids??[]),...ideaIds])],mergedAnchors=[...new Set([...(currentProject.source_anchor_ids??[]),...sourceAnchorIds])];await client.query("UPDATE projects SET idea_ids=$3::uuid[],source_anchor_ids=$4::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,projectId,mergedIdeas,mergedAnchors]);updatedRecordIds.push(projectId);}else{const project=await client.query("INSERT INTO projects(vault_id,title,status,idea_ids,source_anchor_ids) VALUES ($1,$2,'active',$3::uuid[],$4::uuid[]) RETURNING *",[vaultId,payload.newProjectName,ideaIds,sourceAnchorIds]);projectId=project.rows[0].id;createdRecordIds.push(projectId);}
        await client.query("UPDATE ideas SET project_id=$3,state='promoted',revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,ideaIds,projectId]);updatedRecordIds.push(...ideaIds);
      }
      const applicationId=randomUUID(),jobId=randomUUID();const result=contentProposalApplyResultSchema.parse({type:"content_proposal_apply",proposalId,kind:proposal.kind,createdRecordIds,updatedRecordIds:[...new Set(updatedRecordIds)],applicationId,writesApplied:true});const jobInput={type:"content_proposal_apply",proposalId,proposalRevision:proposal.revision};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'proposal_apply','succeeded','applied',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO content_proposal_applications(id,vault_id,proposal_id,job_id,result_manifest,undo_manifest) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb)",[applicationId,vaultId,proposalId,jobId,JSON.stringify(result),JSON.stringify(undo)]);await client.query("UPDATE content_proposals SET status='approved',applied_job_id=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,proposalId,jobId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({proposalId,confirmation:input.confirmation}),JSON.stringify(result)]);return job.rows[0];
    });
    if(!applied)return reply.code(404).send({error:"proposal_not_found"});if(typeof applied==="string")return reply.code(409).send({error:applied});return reply.code(202).send(mapJobHandle(applied));
  }
  const entityMergeCandidate=await query("SELECT id FROM entity_merge_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);
  if(entityMergeCandidate.rowCount){
    if(input.confirmation!=="merge_entities")return reply.code(400).send({error:"entity_merge_confirmation_required"});
    const applied=await transaction(async client=>{
      await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
      const locked=await client.query("SELECT * FROM entity_merge_proposals WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,proposalId]);const proposal=locked.rows[0];
      if(!proposal)return null;
      if(proposal.status==="approved"&&proposal.applied_job_id){const prior=await client.query("SELECT * FROM jobs WHERE id=$1",[proposal.applied_job_id]);return prior.rows[0]??"entity_merge_application_job_missing" as const;}
      if(proposal.status!=="draft"||proposal.revision!==input.expectedProposalRevision)return "proposal_not_draft_or_stale" as const;
      if(new Date(proposal.expires_at)<=new Date())return "proposal_expired" as const;
      const expected=proposal.entity_revisions as Record<string,number>;const entityIds=Object.keys(expected);
      const entities=await client.query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE",[vaultId,entityIds]);
      if(entities.rowCount!==entityIds.length||entities.rows.some(row=>row.revision!==expected[row.id]||row.archived_at||row.merged_into_entity_id))return "entity_merge_inputs_stale" as const;
      if(new Set(entities.rows.map(row=>row.kind)).size!==1)return "cross_type_entity_merge_forbidden" as const;
      const sourceIds=proposal.source_entity_ids as string[];const targetId=proposal.target_entity_id as string;
      const aliasConflicts=await client.query(`WITH candidate_names AS (
        SELECT lower(name) AS value FROM calendar_entities WHERE id=ANY($2::uuid[])
        UNION SELECT lower(alias) FROM calendar_entity_aliases WHERE entity_id=ANY($2::uuid[]) AND archived_at IS NULL
      ), unrelated_names AS (
        SELECT lower(name) AS value FROM calendar_entities WHERE vault_id=$1 AND archived_at IS NULL AND id<>ALL($3::uuid[])
        UNION SELECT lower(a.alias) FROM calendar_entity_aliases a JOIN calendar_entities e ON e.id=a.entity_id WHERE e.vault_id=$1 AND e.archived_at IS NULL AND a.archived_at IS NULL AND e.id<>ALL($3::uuid[])
      ) SELECT 1 FROM candidate_names JOIN unrelated_names USING(value) LIMIT 1`,[vaultId,sourceIds,entityIds]);
      if(aliasConflicts.rowCount)return "entity_merge_alias_conflict" as const;
      const [eventRows,commitmentRows]=await Promise.all([
        client.query("SELECT DISTINCT e.id FROM calendar_events e JOIN event_entity_links l ON l.event_id=e.id WHERE e.vault_id=$1 AND e.trashed_at IS NULL AND l.entity_id=ANY($2::uuid[]) ORDER BY e.id",[vaultId,sourceIds]),
        client.query("SELECT id FROM commitments WHERE vault_id=$1 AND archived_at IS NULL AND (person_entity_id=ANY($2::uuid[]) OR object_entity_id=ANY($2::uuid[])) ORDER BY id",[vaultId,sourceIds])
      ]);
      const currentEventIds=eventRows.rows.map(row=>row.id),currentCommitmentIds=commitmentRows.rows.map(row=>row.id);
      if(JSON.stringify(currentEventIds)!==JSON.stringify([...(proposal.affected_event_ids as string[])].sort())||JSON.stringify(currentCommitmentIds)!==JSON.stringify([...(proposal.affected_commitment_ids as string[])].sort()))return "entity_merge_affected_records_changed" as const;
      await client.query("INSERT INTO event_entity_links(event_id,entity_id,role) SELECT event_id,$2,role FROM event_entity_links WHERE entity_id=ANY($1::uuid[]) ON CONFLICT DO NOTHING",[sourceIds,targetId]);
      await client.query("DELETE FROM event_entity_links WHERE entity_id=ANY($1::uuid[])",[sourceIds]);
      await client.query("UPDATE commitments SET person_entity_id=CASE WHEN person_entity_id=ANY($1::uuid[]) THEN $2 ELSE person_entity_id END,object_entity_id=CASE WHEN object_entity_id=ANY($1::uuid[]) THEN $2 ELSE object_entity_id END,revision=revision+1,updated_at=now() WHERE vault_id=$3 AND id=ANY($4::uuid[])",[sourceIds,targetId,vaultId,currentCommitmentIds]);
      await client.query("UPDATE prep_items p SET invalidated_at=now(),invalidation_reason='commitment_changed',revision=revision+1,updated_at=now() FROM calendar_events e WHERE p.event_id=e.id AND p.commitment_id=ANY($1::uuid[]) AND p.invalidated_at IS NULL AND e.starts_at>now()",[currentCommitmentIds]);
      await client.query("INSERT INTO calendar_entity_aliases(entity_id,alias,scope) SELECT $2,name,'all' FROM calendar_entities WHERE id=ANY($1::uuid[]) ON CONFLICT DO NOTHING",[sourceIds,targetId]);
      await client.query("INSERT INTO calendar_entity_aliases(entity_id,alias,scope,evidence_note_id) SELECT $2,alias,scope,evidence_note_id FROM calendar_entity_aliases WHERE entity_id=ANY($1::uuid[]) AND archived_at IS NULL ON CONFLICT DO NOTHING",[sourceIds,targetId]);
      await client.query("UPDATE calendar_entity_aliases SET archived_at=now(),revision=revision+1,updated_at=now() WHERE entity_id=ANY($1::uuid[]) AND archived_at IS NULL",[sourceIds]);
      await client.query("UPDATE calendar_entities SET merged_into_entity_id=$2,archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$3 AND id=ANY($1::uuid[])",[sourceIds,targetId,vaultId]);
      const jobId=randomUUID();const result=entityMergeApplyResultSchema.parse({type:"entity_merge_apply",proposalId,targetEntityId:targetId,mergedEntityIds:sourceIds,affectedEventIds:currentEventIds,affectedCommitmentIds:currentCommitmentIds,writesApplied:true});const jobInput={type:"entity_merge_apply",proposalId,proposalRevision:proposal.revision};const serialized=JSON.stringify(jobInput);
      const job=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'proposal_apply','succeeded','entities_merged',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);
      await client.query("UPDATE entity_merge_proposals SET status='approved',applied_job_id=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,proposalId,jobId]);
      await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({proposalId,confirmation:input.confirmation}),JSON.stringify(result)]);
      return job.rows[0];
    });
    if(!applied)return reply.code(404).send({error:"proposal_not_found"});if(typeof applied==="string")return reply.code(409).send({error:applied});return reply.code(202).send(mapJobHandle(applied));
  }
  const providerCandidate=await query("SELECT id FROM provider_calendar_action_proposals WHERE vault_id=$1 AND id=$2",[vaultId,proposalId]);
  if(providerCandidate.rowCount){
    if(input.confirmation!=="queue_provider_calendar_action")return reply.code(400).send({error:"provider_calendar_confirmation_required"});
    const queued=await transaction(async client=>{await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");const locked=await client.query("SELECT * FROM provider_calendar_action_proposals WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,proposalId]);const proposal=locked.rows[0];if(!proposal)return null;if(proposal.status==="approved"&&proposal.applied_job_id){const prior=await client.query("SELECT * FROM jobs WHERE id=$1",[proposal.applied_job_id]);return prior.rows[0]??"provider_action_application_job_missing" as const;}if(proposal.status!=="draft"||proposal.revision!==input.expectedProposalRevision)return"proposal_not_draft_or_stale" as const;if(new Date(proposal.expires_at)<=new Date())return"proposal_expired" as const;const [eventResult,connectionResult]=await Promise.all([client.query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL FOR SHARE",[vaultId,proposal.event_id]),client.query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL FOR SHARE",[vaultId,proposal.connection_id])]);const event=eventResult.rows[0],connection=connectionResult.rows[0];if(!event||event.revision!==proposal.event_revision)return"provider_action_event_stale" as const;if(!connection||connection.revision!==proposal.connection_revision)return"provider_action_connection_stale" as const;const readiness=providerWriteReadiness({provider:connection.provider,state:connection.state,revision:connection.revision,capabilities:connection.capabilities});if(readiness)return readiness;const actionId=randomUUID();const jobId=randomUUID();const result=providerCalendarActionApplyResultSchema.parse({type:"provider_calendar_action_apply",proposalId,actionId,writesApplied:true,externalDelivery:false});const jobInput={type:"provider_calendar_action_apply",proposalId,proposalRevision:proposal.revision,actionId};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'proposal_apply','succeeded','outbox_queued',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO provider_calendar_actions(id,vault_id,proposal_id,event_id,connection_id,action_kind,target_calendar_id,recipients,public_fields,response,idempotency_key) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11)",[actionId,vaultId,proposalId,proposal.event_id,proposal.connection_id,proposal.action_kind,proposal.target_calendar_id,JSON.stringify(proposal.recipients),JSON.stringify(proposal.public_fields),proposal.response,`provider-calendar:${proposalId}`]);await client.query("UPDATE provider_calendar_action_proposals SET status='approved',applied_job_id=$3,revision=revision+1,updated_at=now() WHERE id=$1 AND vault_id=$2",[proposalId,vaultId,jobId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({proposalId,confirmation:input.confirmation}),JSON.stringify(result)]);return job.rows[0];});if(!queued)return reply.code(404).send({error:"proposal_not_found"});if(typeof queued==="string")return reply.code(409).send({error:queued});return reply.code(202).send(mapJobHandle(queued));
  }
  if(input.confirmation!=="apply_schedule")return reply.code(400).send({error:"schedule_confirmation_required"});
  const applied=await transaction(async client=>{await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");const locked=await client.query("SELECT * FROM schedule_proposals WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,proposalId]);const proposal=locked.rows[0];if(!proposal)return null;if(proposal.status==='approved'&&proposal.applied_job_id){const prior=await client.query("SELECT * FROM jobs WHERE id=$1",[proposal.applied_job_id]);if(!prior.rows[0])return "application_job_missing" as const;const priorInput=prior.rows[0].input as {proposalRevision?:number};return priorInput.proposalRevision===input.expectedProposalRevision?prior.rows[0]:"proposal_not_draft_or_stale" as const;}if(proposal.status!=='draft'||proposal.revision!==input.expectedProposalRevision)return "proposal_not_draft_or_stale" as const;if(proposal.expires_at&&new Date(proposal.expires_at)<=new Date())return "proposal_expired" as const;
    const expected=proposal.input_revisions as Record<string,number>;const planRevisionEntry=Object.entries(expected).find(([key])=>key.startsWith('study_plan:'));if(planRevisionEntry){const planId=planRevisionEntry[0].slice('study_plan:'.length);const plan=await client.query("SELECT revision,status FROM study_plans WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR SHARE",[vaultId,planId]);if(!plan.rows[0]||plan.rows[0].revision!==planRevisionEntry[1]||plan.rows[0].status!=='active')return "proposal_study_plan_stale" as const;}const taskIds=Object.keys(expected).filter(key=>!key.startsWith('study_plan:'));const tasks=await client.query("SELECT * FROM tasks WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE",[vaultId,taskIds]);if(tasks.rowCount!==taskIds.length||tasks.rows.some(row=>row.revision!==expected[row.id]||row.completed))return "proposal_task_inputs_stale" as const;const prefs=await client.query("SELECT * FROM scheduler_preferences WHERE vault_id=$1 FOR SHARE",[vaultId]);const prefRevision=prefs.rows[0]?.revision??0;if(prefRevision!==proposal.constraints_revision)return "proposal_constraints_stale" as const;const timezone=prefs.rows[0]?.timezone??"Europe/Oslo";
    const events=await client.query("SELECT * FROM calendar_events WHERE vault_id=$1 AND trashed_at IS NULL AND (recurrence IS NOT NULL OR ends_at >= $2) AND starts_at <= $3 FOR SHARE",[vaultId,proposal.horizon_start,proposal.horizon_end]);const eventIds=events.rows.map(row=>row.id);const exceptions=eventIds.length?await client.query("SELECT * FROM calendar_event_exceptions WHERE event_id=ANY($1::uuid[]) FOR SHARE",[eventIds]):{rows:[] as Record<string,any>[]};const byEvent=new Map<string,Record<string,any>[]>();for(const row of exceptions.rows)byEvent.set(row.event_id,[...(byEvent.get(row.event_id)??[]),row]);const occurrences=events.rows.flatMap(event=>expandOccurrences({eventId:event.id,title:event.title,startsAt:iso(event.starts_at),endsAt:iso(event.ends_at),recurrence:event.recurrence,from:iso(proposal.horizon_start),to:iso(proposal.horizon_end),exceptions:(byEvent.get(event.id)??[]).map(row=>({id:row.id,originalStartsAt:iso(row.original_starts_at),cancelled:row.cancelled,title:row.title,startsAt:row.starts_at?iso(row.starts_at):null,endsAt:row.ends_at?iso(row.ends_at):null}))})).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)||a.id.localeCompare(b.id));const digest=createHash("sha256").update(JSON.stringify(occurrences.map(item=>({id:item.id,startsAt:item.startsAt,endsAt:item.endsAt})))).digest("hex");if(digest!==proposal.calendar_digest)return "proposal_calendar_stale" as const;
    const taskById=new Map(tasks.rows.map(row=>[row.id,row]));const placements=proposal.placements as Array<{taskId:string;startsAt:string;endsAt:string}>;if(placements.some(placement=>!taskById.has(placement.taskId)))return "proposal_task_inputs_stale" as const;const calendarId=await writableCalendarId(client,vaultId,undefined,timezone);if(!calendarId)return "calendar_not_writable" as const;const createdEventIds:string[]=[];for(const placement of placements){const task=taskById.get(placement.taskId)!;const event=await client.query("INSERT INTO calendar_events(vault_id,calendar_id,title,starts_at,ends_at,private_context,timezone,recurrence) VALUES ($1,$2,$3,$4,$5,$6,$7,NULL) RETURNING *",[vaultId,calendarId,`Focus: ${task.title}`,placement.startsAt,placement.endsAt,`Private focus block for task ${task.id}; accepted proposal ${proposalId}.`,timezone]);createdEventIds.push(event.rows[0].id);await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,actor_kind,changed_fields) VALUES ($1,1,$2,$3,$4,$5,NULL,'owner',ARRAY['created','schedule_proposal'])",[event.rows[0].id,event.rows[0].title,event.rows[0].starts_at,event.rows[0].ends_at,timezone]);await client.query("INSERT INTO scheduled_task_event_links(proposal_id,task_id,event_id) VALUES ($1,$2,$3)",[proposalId,task.id,event.rows[0].id]);}
    const applicationId=randomUUID();const jobId=randomUUID();const result=proposalApplyResultSchema.parse({type:"proposal_apply",proposalId,createdEventIds,undoManifestId:applicationId,writesApplied:true});const jobInput={type:"proposal_apply",proposalId,proposalRevision:proposal.revision,calendarDigest:digest};const serialized=JSON.stringify(jobInput);const job=await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,$2,'proposal_apply','succeeded','applied',1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO proposal_applications(id,vault_id,proposal_id,job_id,created_event_ids,undo_manifest) VALUES ($1,$2,$3,$4,$5::uuid[],$6::jsonb)",[applicationId,vaultId,proposalId,jobId,createdEventIds,JSON.stringify({type:"trash_created_events",eventIds:createdEventIds,expectedRevisions:Object.fromEntries(createdEventIds.map(id=>[id,1]))})]);await client.query("UPDATE schedule_proposals SET status='approved',applied_job_id=$3,created_event_ids=$4::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,proposalId,jobId,createdEventIds]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[jobId,JSON.stringify({proposalId,confirmation:input.confirmation}),JSON.stringify({proposalId,createdEventIds,undoManifestId:applicationId})]);return job.rows[0];});
  if(!applied)return reply.code(404).send({error:"proposal_not_found"});if(typeof applied==='string')return reply.code(409).send({error:applied});return reply.code(202).send(mapJobHandle(applied));
});

app.post("/api/v1/vaults/:vaultId/proposals/:proposalId/undo",async(request,reply)=>{
  const {vaultId,proposalId}=request.params as {vaultId:string;proposalId:string};idSchema.parse(vaultId);idSchema.parse(proposalId);const input=undoProposalSchema.parse(request.body);
  const undone=await transaction(async client=>{await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");const proposalResult=await client.query("SELECT * FROM schedule_proposals WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,proposalId]);const proposal=proposalResult.rows[0];if(!proposal)return null;const applicationResult=await client.query("SELECT * FROM proposal_applications WHERE vault_id=$1 AND proposal_id=$2 FOR UPDATE",[vaultId,proposalId]);const application=applicationResult.rows[0];if(!application)return "proposal_application_not_found" as const;if(application.undone_at){if(proposal.revision!==input.expectedProposalRevision+1)return "proposal_not_applied_or_stale" as const;return {proposalId,applicationId:application.id,trashedEventIds:application.created_event_ids,undoneAt:iso(application.undone_at),writesApplied:true as const};}if(proposal.status!=="approved"||proposal.revision!==input.expectedProposalRevision)return "proposal_not_applied_or_stale" as const;const manifest=application.undo_manifest as {type:string;eventIds:string[];expectedRevisions:Record<string,number>};if(manifest.type!=="trash_created_events"||manifest.eventIds.length!==application.created_event_ids.length)return "proposal_undo_manifest_invalid" as const;const events=await client.query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR UPDATE",[vaultId,manifest.eventIds]);if(events.rowCount!==manifest.eventIds.length||events.rows.some(row=>row.trashed_at||row.revision!==manifest.expectedRevisions[row.id]))return "proposal_undo_conflict" as const;const undoneAt=new Date();for(const event of events.rows){await client.query("UPDATE calendar_events SET trashed_at=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,event.id,undoneAt]);await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,actor_kind,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'owner',ARRAY['trashed','proposal_undo'])",[event.id,event.revision+1,event.title,event.starts_at,event.ends_at,event.timezone,event.recurrence?JSON.stringify(event.recurrence):null]);}await client.query("UPDATE proposal_applications SET undone_at=$2 WHERE id=$1",[application.id,undoneAt]);await client.query("UPDATE schedule_proposals SET status='withdrawn',revision=revision+1,updated_at=now() WHERE id=$1",[proposalId]);return {proposalId,applicationId:application.id,trashedEventIds:manifest.eventIds,undoneAt:undoneAt.toISOString(),writesApplied:true as const};});
  if(!undone)return reply.code(404).send({error:"proposal_not_found"});if(typeof undone==="string")return reply.code(409).send({error:undone});return proposalUndoReceiptSchema.parse(undone);
});

app.post("/api/v1/vaults/:vaultId/url-captures",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createUrlCaptureSchema.parse(request.body);const vault=await query("SELECT id FROM vaults WHERE id=$1",[vaultId]);if(!vault.rows[0])return reply.code(404).send({error:"vault_not_found"});
  const jobInput={type:"url_capture",url:input.url,hasSelectedText:Boolean(input.selectedText),requestedTitle:input.title??null};const serialized=JSON.stringify(jobInput),jobId=randomUUID();let job=(await query("INSERT INTO jobs(id,vault_id,kind,status,stage,progress,input,input_hash,attempts,started_at) VALUES ($1,$2,'url_capture','running','safe_fetch',0.1,$3::jsonb,$4,1,now()) RETURNING *",[jobId,vaultId,serialized,createHash("sha256").update(serialized).digest("hex")])).rows[0];await query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[jobId,JSON.stringify({fetchConsent:true})]);
  let fetched;try{fetched=await safeFetchText(input.url);}catch(error){const raw=error instanceof Error?error.message:"url_fetch_failed",safeCode=/^(?:invalid_url|unsafe_url_scheme|url_credentials_forbidden|unsafe_url_port|private_url_forbidden|url_dns_failed|redirect_location_missing|too_many_redirects|url_response_too_large|url_fetch_timeout|unsupported_url_content_type|url_http_\d{3})$/.test(raw)?raw:"url_fetch_failed";job=(await query("UPDATE jobs SET status='failed',stage='safe_fetch_failed',progress=1,error_code=$2,safe_error_detail=$2,retryable=$3,finished_at=now() WHERE id=$1 RETURNING *",[jobId,safeCode,["url_dns_failed","url_fetch_timeout","url_fetch_failed"].includes(safeCode)])).rows[0];await query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,2,'failed',$2::jsonb)",[jobId,JSON.stringify({code:safeCode})]);return reply.code(202).send(mapJobHandle(job));}
  const body=input.selectedText??fetched.text,title=input.title??fetched.title??new URL(fetched.finalUrl).hostname,sourceId=randomUUID(),noteId=randomUUID(),contentHash=createHash("sha256").update(fetched.text).digest("hex"),documentState=createDocumentState(body);
  job=await transaction(async client=>{await client.query("INSERT INTO sources(id,vault_id,kind,original_text,content_hash,source_url,resolved_url,mime_type,http_etag,http_last_modified) VALUES ($1,$2,'url',$3,$4,$5,$6,$7,$8,$9)",[sourceId,vaultId,fetched.text,contentHash,fetched.requestedUrl,fetched.finalUrl,fetched.contentType,fetched.etag,fetched.lastModified]);await client.query("INSERT INTO notes(id,vault_id,source_id,title,body,yjs_state,status) VALUES ($1,$2,$3,$4,$5,$6,'saved')",[noteId,vaultId,sourceId,title,body,documentState]);await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,1,$2,$3,$4,'capture')",[noteId,title,body,documentState]);const result=urlCaptureResultSchema.parse({type:"url_capture",captureId:sourceId,noteId,requestedUrl:fetched.requestedUrl,finalUrl:fetched.finalUrl,redirectCount:fetched.redirects.length,byteLength:fetched.byteLength,writesApplied:true});const updated=await client.query("UPDATE jobs SET status='succeeded',stage='captured',progress=1,result=$2::jsonb,finished_at=now() WHERE id=$1 RETURNING *",[jobId,JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,2,'completed',$2::jsonb)",[jobId,JSON.stringify(result)]);const processId=randomUUID(),processInput={type:"note_processing",noteId,sourceId,revision:1,stages:["classify"]},processSerialized=JSON.stringify(processInput);await client.query("INSERT INTO jobs(id,vault_id,kind,status,stage,input,input_hash) VALUES ($1,$2,'note_process','waiting_for_worker','awaiting_local_worker',$3::jsonb,$4)",[processId,vaultId,processSerialized,createHash("sha256").update(processSerialized).digest("hex")]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[processId,JSON.stringify({status:"waiting_for_worker",parentJobId:jobId})]);return updated.rows[0];});return reply.code(202).send(mapJobHandle(job));
});

app.post("/api/v1/vaults/:vaultId/captures", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createCaptureSchema.parse(request.body);
  const text = input.text ?? "";
  const blobResult = input.blobIds.length
    ? await query("SELECT * FROM blobs WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, input.blobIds])
    : { rows: [] as Record<string, any>[], rowCount: 0 };
  if (blobResult.rowCount !== input.blobIds.length) return reply.code(400).send({ error: "capture_blob_not_found" });
  const blobsById = new Map(blobResult.rows.map((row) => [row.id, row]));
  const blobManifest = input.blobIds.map((id) => ({ id, sha256: blobsById.get(id)!.sha256 }));
  const payloadHash = createHash("sha256").update(JSON.stringify({ text, blobManifest, title: input.title ?? null })).digest("hex");

  const existing = await query<{ result_id: string; payload_hash: string | null }>(
    "SELECT result_id,payload_hash FROM client_operations WHERE vault_id = $1 AND operation_id = $2",
    [vaultId, input.clientOperationId]
  );
  if (existing.rows[0]) {
    if (existing.rows[0].payload_hash && existing.rows[0].payload_hash !== payloadHash) return reply.code(409).send({ error: "client_operation_id_reused" });
    const note = await query("SELECT * FROM notes WHERE id = $1", [existing.rows[0].result_id]);
    return reply.code(201).send(mapNote(note.rows[0]));
  }

  const firstBlob = input.blobIds.length ? blobsById.get(input.blobIds[0]) : null;
  const title = input.title ?? (text.split(/\r?\n/, 1)[0].slice(0, 100) || firstBlob?.filename || "Untitled note");
  const explicitTaskTitle=explicitCapturedTaskTitle(text);
  const noteId = randomUUID();
  const sourceId = randomUUID();
  const documentState = createDocumentState(text);

  const note = await transaction(async (client) => {
    await client.query(
      "INSERT INTO sources(id, vault_id, kind, original_text, content_hash) VALUES ($1,$2,$3,$4,$5)",
      [sourceId, vaultId, text.trim() ? "capture" : "file", text || null, payloadHash]
    );
    for (let position = 0; position < input.blobIds.length; position += 1) await client.query(
      "INSERT INTO source_blobs(source_id,blob_id,position) VALUES ($1,$2,$3)", [sourceId, input.blobIds[position], position]
    );
    const inserted = await client.query(
      "INSERT INTO notes(id, vault_id, source_id, title, body, yjs_state, status) VALUES ($1, $2, $3, $4, $5, $6, 'saved') RETURNING *",
      [noteId, vaultId, sourceId, title, text, documentState]
    );
    if(explicitTaskTitle)await client.query("INSERT INTO tasks(vault_id,title,source_note_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",[vaultId,explicitTaskTitle,noteId]);
    await client.query(
      "INSERT INTO note_revisions(note_id, revision, title, body, yjs_state, actor_kind) VALUES ($1, 1, $2, $3, $4, 'capture')",
      [noteId, title, text, documentState]
    );
    await client.query(
      "INSERT INTO client_operations(vault_id,operation_id,result_id,payload_hash) VALUES ($1,$2,$3,$4)",
      [vaultId, input.clientOperationId, noteId, payloadHash]
    );
    if (text.trim()) {
      const jobId = randomUUID();
      const jobInput = { type: "note_processing", noteId, sourceId, revision: 1, stages: ["classify"] };
      await client.query(
        `INSERT INTO jobs(id, vault_id, kind, status, stage, input, input_hash)
         VALUES ($1, $2, 'note_process', 'waiting_for_worker', 'awaiting_local_worker', $3::jsonb, $4)`,
        [jobId, vaultId, JSON.stringify(jobInput), createHash("sha256").update(JSON.stringify(jobInput)).digest("hex")]
      );
      await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, 1, 'accepted', $2::jsonb)", [jobId, JSON.stringify({ status: "waiting_for_worker" })]);
    }
    return inserted.rows[0];
  });
  return reply.code(201).send(mapNote(note));
});

app.get("/api/v1/vaults/:vaultId/captures/:captureId", async (request, reply) => {
  const { vaultId, captureId } = request.params as { vaultId: string; captureId: string };
  idSchema.parse(vaultId); idSchema.parse(captureId);
  const source = await query(
    "SELECT s.*,n.id AS note_id FROM sources s JOIN notes n ON n.source_id=s.id WHERE s.vault_id=$1 AND s.id=$2",
    [vaultId, captureId]
  );
  if (!source.rows[0] || !["capture", "file", "url"].includes(source.rows[0].kind)) return reply.code(404).send({ error: "capture_not_found" });
  const blobs = await query(
    "SELECT b.* FROM source_blobs sb JOIN blobs b ON b.id=sb.blob_id WHERE sb.source_id=$1 AND b.vault_id=$2 ORDER BY sb.position",
    [captureId, vaultId]
  );
  const row = source.rows[0];
  return captureSchema.parse({ id: row.id, vaultId: row.vault_id, kind: row.kind, originalText: row.original_text,sourceUrl:row.source_url??null,resolvedUrl:row.resolved_url??null,
    contentHash: row.content_hash, blobs: blobs.rows.map(mapBlob), noteId: row.note_id, createdAt: iso(row.created_at) });
});

async function startOAuthAuthorization(request:FastifyRequest,reply:FastifyReply,mode:"authorize"|"reauthorize"){const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const session=await getOwnerSession(request);if(!session)return reply.code(401).send({error:"authentication_required"});if(!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=mode==="authorize"?authorizationRequestSchema.parse(request.body):reauthorizationRequestSchema.parse(request.body),connection=(await query<Record<string,any>>("SELECT id,provider,state FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[vaultId,connectionId])).rows[0];if(!connection)return reply.code(404).send({error:"connection_not_found"});if(connection.provider!=="microsoft"&&connection.provider!=="google_calendar")return reply.code(409).send({error:"provider_oauth_not_supported"});const provider=connection.provider as OAuthProvider,registration=oauthRegistration(provider);if(!registration)return reply.code(409).send({error:"needs_provider_configuration",required:["registered_client_id","oauth_credential_encryption_key",...(provider==="microsoft"?["fixed_tenant_id"]:[])]});if(input.requestedCapabilities.some(capability=>!registration.scopes[capability]))return reply.code(400).send({error:"capability_not_supported_by_provider"});const state=randomBytes(32).toString("base64url"),verifier=randomBytes(48).toString("base64url"),challenge=createHash("sha256").update(verifier).digest("base64url"),expiresAt=new Date(Date.now()+10*60_000).toISOString(),transactionId=randomUUID();await transaction(async client=>{await client.query("UPDATE oauth_transactions SET consumed_at=COALESCE(consumed_at,now()) WHERE connection_id=$1 AND consumed_at IS NULL",[connectionId]);await client.query("INSERT INTO oauth_transactions(id,owner_id,vault_id,connection_id,provider,mode,state_hash,encrypted_pkce_verifier,requested_capabilities,registered_return_target,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::text[],$10,$11)",[transactionId,session.owner_id,vaultId,connectionId,provider,mode,oauthHash(state),encryptOAuthSecret(verifier),input.requestedCapabilities,input.registeredReturnTarget,expiresAt]);});const url=new URL(registration.authorizeUrl);url.searchParams.set("client_id",registration.clientId);url.searchParams.set("response_type","code");url.searchParams.set("redirect_uri",registration.redirectUri);url.searchParams.set("scope",input.requestedCapabilities.map(capability=>registration.scopes[capability]).join(" "));url.searchParams.set("state",state);url.searchParams.set("code_challenge",challenge);url.searchParams.set("code_challenge_method","S256");if(provider==="microsoft")url.searchParams.set("response_mode","query");else{url.searchParams.set("access_type","offline");url.searchParams.set("include_granted_scopes","true");if(mode==="reauthorize")url.searchParams.set("prompt","consent");}return authorizationStartSchema.parse({transactionId,provider,authorizationUrl:url.toString(),requestedCapabilities:input.requestedCapabilities,registeredReturnTarget:input.registeredReturnTarget,expiresAt,pkce:"S256",stateStoredAsHash:true,secretsIncluded:false});}

async function completeOAuthCallback(provider:OAuthProvider,request:FastifyRequest,reply:FastifyReply){const raw=request.query as {state?:string;code?:string;error?:string};if(!raw.state||raw.state.length>500||Boolean(raw.code)===Boolean(raw.error))return reply.code(400).send({error:"invalid_oauth_callback_envelope"});const claimed=await transaction(async client=>{const result=await client.query<Record<string,any>>("UPDATE oauth_transactions SET consumed_at=now() WHERE state_hash=$1 AND provider=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING *",[oauthHash(raw.state!),provider]);return result.rows[0]??null;});if(!claimed)return reply.code(400).send({error:"oauth_state_invalid_expired_or_consumed"});const safeRedirect=new URL(oauthReturnPath(claimed.registered_return_target,claimed.connection_id),config.APP_ORIGIN);if(raw.error){await query("UPDATE integration_connections SET state='authentication_required',last_error_code='provider_authorization_denied',last_failure_at=now(),updated_at=now() WHERE id=$1",[claimed.connection_id]);safeRedirect.searchParams.set("authorization","denied");return reply.redirect(safeRedirect.toString(),303);}const registration=oauthRegistration(provider);if(!registration){safeRedirect.searchParams.set("authorization","configuration_required");return reply.redirect(safeRedirect.toString(),303);}let tokenResponse:Response;try{const form=new URLSearchParams({grant_type:"authorization_code",client_id:registration.clientId,code:raw.code!,redirect_uri:registration.redirectUri,code_verifier:decryptOAuthSecret(claimed.encrypted_pkce_verifier)});if(registration.clientSecret)form.set("client_secret",registration.clientSecret);tokenResponse=await fetch(registration.tokenUrl,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:form,signal:AbortSignal.timeout(15_000)});}catch{await query("UPDATE integration_connections SET state='error',last_error_code='oauth_token_exchange_unavailable',last_failure_at=now(),updated_at=now() WHERE id=$1",[claimed.connection_id]);safeRedirect.searchParams.set("authorization","failed");return reply.redirect(safeRedirect.toString(),303);}let tokens:Record<string,unknown>;try{tokens=await tokenResponse.json() as Record<string,unknown>;}catch{tokens={};}if(!tokenResponse.ok||typeof tokens.access_token!=="string"||tokens.token_type!=="Bearer"){await query("UPDATE integration_connections SET state='authentication_required',last_error_code='oauth_token_exchange_rejected',last_failure_at=now(),updated_at=now() WHERE id=$1",[claimed.connection_id]);safeRedirect.searchParams.set("authorization","failed");return reply.redirect(safeRedirect.toString(),303);}const expiresAt=typeof tokens.expires_in==="number"?new Date(Date.now()+Math.max(0,tokens.expires_in)*1000).toISOString():null,grantedScope=typeof tokens.scope==="string"?tokens.scope.split(/\s+/).filter(Boolean):[];await transaction(async client=>{const credentialId=randomUUID();await client.query("INSERT INTO provider_oauth_credentials(id,connection_id,provider,encrypted_credentials,granted_scope,expires_at) VALUES ($1,$2,$3,$4,$5::text[],$6) ON CONFLICT(connection_id) DO UPDATE SET provider=excluded.provider,encrypted_credentials=excluded.encrypted_credentials,granted_scope=excluded.granted_scope,expires_at=excluded.expires_at,updated_at=now()",[credentialId,claimed.connection_id,provider,encryptOAuthSecret(JSON.stringify(tokens)),grantedScope,expiresAt]);const saved=await client.query("SELECT id FROM provider_oauth_credentials WHERE connection_id=$1",[claimed.connection_id]);await client.query("UPDATE integration_connections SET state='connected',credential_reference=$2,last_error_code=NULL,last_success_at=now(),revision=revision+1,updated_at=now() WHERE id=$1",[claimed.connection_id,`oauth_credentials:${saved.rows[0].id}`]);});safeRedirect.searchParams.set("authorization","connected");safeRedirect.searchParams.set("connectionId",claimed.connection_id);return reply.redirect(safeRedirect.toString(),303);}

app.get("/api/v1/oauth/microsoft/callback",async(request,reply)=>completeOAuthCallback("microsoft",request,reply));
app.get("/api/v1/oauth/:providerId/callback",async(request,reply)=>{const {providerId}=request.params as {providerId:string};if(providerId!=="google_calendar")return reply.code(404).send({error:"oauth_provider_callback_not_registered"});return completeOAuthCallback("google_calendar",request,reply);});

app.post("/api/v1/integrations/microsoft/notifications",async(request,reply)=>{if(!config.PUBLIC_PROVIDER_CALLBACKS_ENABLED)return reply.code(404).send();const validationToken=(request.query as {validationToken?:string}).validationToken;if(validationToken!==undefined){if(validationToken.length<1||validationToken.length>255||/[\r\n\0]/.test(validationToken))return reply.code(400).send({error:"invalid_validation_token"});return reply.type("text/plain; charset=utf-8").code(200).send(validationToken);}const value=(request.body as any)?.value;if(!Array.isArray(value)||value.length<1||value.length>100)return reply.code(400).send({error:"invalid_microsoft_notification_batch"});for(const item of value){if(!item||typeof item.subscriptionId!=="string"||typeof item.clientState!=="string")return reply.code(400).send({error:"invalid_microsoft_notification"});const subscription=(await query<Record<string,any>>("SELECT s.*,c.vault_id FROM provider_notification_subscriptions s JOIN integration_connections c ON c.id=s.connection_id WHERE s.provider='microsoft' AND s.external_subscription_id=$1 AND s.disabled_at IS NULL AND s.expires_at>now()",[item.subscriptionId])).rows[0];if(!subscription||oauthHash(item.clientState)!==subscription.proof_hash)return reply.code(401).send({error:"provider_notification_proof_invalid"});const messageKey=typeof item.id==="string"?item.id:oauthHash(JSON.stringify(item));await transaction(async client=>{const receipt=await client.query("INSERT INTO provider_notification_receipts(provider,subscription_id,message_key) VALUES ('microsoft',$1,$2) ON CONFLICT DO NOTHING RETURNING message_key",[subscription.id,messageKey]);if(!receipt.rowCount)return;const payload=JSON.stringify({type:"source_refresh",connectionId:subscription.connection_id,trigger:"microsoft_change_notification",subscriptionId:subscription.id,messageKey});await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'source_refresh','queued','notification_received',$2::jsonb,$3)",[subscription.vault_id,payload,oauthHash(payload)]);});}return reply.code(202).send();});

app.post("/api/v1/integrations/google/notifications",async(request,reply)=>{if(!config.PUBLIC_PROVIDER_CALLBACKS_ENABLED)return reply.code(404).send();const header=(name:string)=>{const value=request.headers[name];return typeof value==="string"?value:null;},channelId=header("x-goog-channel-id"),resourceId=header("x-goog-resource-id"),token=header("x-goog-channel-token"),messageNumber=header("x-goog-message-number");if(!channelId||!resourceId||!token||!messageNumber||!/^\d{1,20}$/.test(messageNumber))return reply.code(400).send({error:"invalid_google_notification_headers"});const subscription=(await query<Record<string,any>>("SELECT s.*,c.vault_id FROM provider_notification_subscriptions s JOIN integration_connections c ON c.id=s.connection_id WHERE s.provider='google_calendar' AND s.external_subscription_id=$1 AND s.resource_id=$2 AND s.disabled_at IS NULL AND s.expires_at>now()",[channelId,resourceId])).rows[0];if(!subscription||oauthHash(token)!==subscription.proof_hash)return reply.code(401).send({error:"provider_notification_proof_invalid"});await transaction(async client=>{const locked=(await client.query<Record<string,any>>("SELECT * FROM provider_notification_subscriptions WHERE id=$1 FOR UPDATE",[subscription.id])).rows[0],sequence=BigInt(messageNumber);if(locked.last_message_number!==null&&sequence<=BigInt(locked.last_message_number))return;await client.query("UPDATE provider_notification_subscriptions SET last_message_number=$2,updated_at=now() WHERE id=$1",[subscription.id,messageNumber]);const receipt=await client.query("INSERT INTO provider_notification_receipts(provider,subscription_id,message_key) VALUES ('google_calendar',$1,$2) ON CONFLICT DO NOTHING RETURNING message_key",[subscription.id,messageNumber]);if(!receipt.rowCount)return;const payload=JSON.stringify({type:"source_refresh",connectionId:subscription.connection_id,trigger:"google_calendar_change_notification",subscriptionId:subscription.id,messageNumber});await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'source_refresh','queued','notification_received',$2::jsonb,$3)",[subscription.vault_id,payload,oauthHash(payload)]);});return reply.code(204).send();});

app.get("/api/v1/integration-providers",async()=>{const names:Record<string,string>={microsoft:"Microsoft 365 and Teams",google_calendar:"Google account (Gmail read-only)",visma_inschool:"Visma InSchool",youtube:"YouTube",spotify:"Spotify",tiktok:"TikTok",instagram:"Instagram",reddit:"Reddit",discord:"Discord",maxun:"Maxun",firecrawl:"Firecrawl",anakin_oss:"Anakin OSS",meetily:"Meetily"};const items=integrationProviderSchema.options.map(providerId=>{const initial=initialIntegration(providerId),oauth=providerId==="microsoft"||providerId==="google_calendar",ownerExport=initial.state==="import_only",localService=["firecrawl","anakin_oss","meetily"].includes(providerId);return integrationProviderDescriptorSchema.parse({providerId,displayName:names[providerId]??providerId,backendIdentity:{registry:"omega-local-provider-registry-v1",adapter:`builtin:${providerId}`,verified:true},capabilities:initial.capabilities,accountBlockers:initial.capabilities.map(item=>item.limitation).filter((item):item is string=>Boolean(item)),optionalModules:[{key:"public_change_notifications",enabled:config.PUBLIC_PROVIDER_CALLBACKS_ENABLED,reason:config.PUBLIC_PROVIDER_CALLBACKS_ENABLED?null:"No deliberately published and provider-verified callback ingress is configured."}],authorizationMode:oauth?"oauth":ownerExport?"owner_export":localService?"local_service":"configuration_required"});});return{items};});

app.get("/api/v1/vaults/:vaultId/connections",async request=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM integration_connections WHERE vault_id=$1 ORDER BY disconnected_at NULLS FIRST,updated_at DESC",[vaultId]);return {items:result.rows.map(mapIntegrationConnection),nextCursor:null};});
app.post("/api/v1/vaults/:vaultId/connections",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createIntegrationConnectionSchema.parse(request.body);const initial=initialIntegration(input.provider);try{const result=await query("INSERT INTO integration_connections(vault_id,provider,label,state,capabilities) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *",[vaultId,input.provider,input.label,initial.state,JSON.stringify(initial.capabilities)]);return reply.code(201).send(mapIntegrationConnection(result.rows[0]));}catch(error:any){if(error?.code==="23505")return reply.code(409).send({error:"connection_label_already_exists"});throw error;}});
app.get("/api/v1/vaults/:vaultId/connections/:connectionId",async(request,reply)=>{const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const result=await query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]);if(!result.rows[0])return reply.code(404).send({error:"connection_not_found"});return mapIntegrationConnection(result.rows[0]);});
app.post("/api/v1/vaults/:vaultId/connections/:connectionId/authorize",async(request,reply)=>startOAuthAuthorization(request,reply,"authorize"));
app.post("/api/v1/vaults/:vaultId/connections/:connectionId/reauthorize",async(request,reply)=>startOAuthAuthorization(request,reply,"reauthorize"));
app.get("/api/v1/vaults/:vaultId/connections/:connectionId/capabilities",async(request,reply)=>{const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const result=await query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]);if(!result.rows[0])return reply.code(404).send({error:"connection_not_found"});const item=mapIntegrationConnection(result.rows[0]);return integrationCapabilityListSchema.parse({connectionId:item.id,state:item.state,items:item.capabilities,disclaimer:"Adapter registration is not proof of account access. Only capabilities with a verifiedAt timestamp have passed a live provider test."});});
app.post("/api/v1/vaults/:vaultId/connections/:connectionId/probe",async(request,reply)=>{const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const rawKey=request.headers["idempotency-key"],idempotencyKey=Array.isArray(rawKey)?rawKey[0]:rawKey;if(!idempotencyKey||idempotencyKey.length<8||idempotencyKey.length>128)return reply.code(400).send({error:"idempotency_key_required"});const connection=(await query("SELECT id,provider,state,credential_reference FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[vaultId,connectionId])).rows[0];if(!connection)return reply.code(404).send({error:"connection_not_found"});const payload={type:"connection_probe",connectionId,provider:connection.provider,idempotencyKey},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex"),prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='connection_probe' AND input->>'idempotencyKey'=$2",[vaultId,idempotencyKey]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"idempotency_key_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,error_code,safe_error_detail,retryable,attempts,finished_at) VALUES ($1,'connection_probe','failed','adapter_probe_unavailable',0,$2::jsonb,$3,'adapter_probe_unavailable','No live registered provider probe adapter is bound in this API process; no network request was made.',false,1,now()) RETURNING *",[vaultId,serialized,inputHash]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'failed',$3::jsonb)",[created.rows[0].id,JSON.stringify({connectionId,provider:connection.provider}),JSON.stringify({errorCode:"adapter_probe_unavailable",networkRequestMade:false})]);await client.query("UPDATE integration_connections SET last_failure_at=now(),last_error_code='adapter_probe_unavailable',updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/connections/:connectionId/mapping",async(request,reply)=>{const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const result=await query("SELECT m.*,c.provider FROM connection_mappings m JOIN integration_connections c ON c.id=m.connection_id WHERE c.vault_id=$1 AND c.id=$2",[vaultId,connectionId]);if(!result.rows[0]){const exists=await query("SELECT id FROM integration_connections WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]);return reply.code(404).send({error:exists.rows[0]?"connection_mapping_not_configured":"connection_not_found"});}return mapConnectionMapping(result.rows[0]);});

app.put("/api/v1/vaults/:vaultId/connections/:connectionId/mapping",async(request,reply)=>{const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=setConnectionMappingSchema.parse(request.body);if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});const allowed:Record<string,Set<string>>={microsoft:new Set(["calendar_event","mail_message","teams_message","drive_file","sharepoint_site","sharepoint_list","sharepoint_list_item","assignment","todo_task","planner_task","onenote_page","contact"]),google_calendar:new Set(["calendar_event","mail_message"]),visma_inschool:new Set(["timetable_entry","assignment","assessment","attendance","grade","material"]),youtube:new Set(["personal_data_item"]),spotify:new Set(["personal_data_item"]),tiktok:new Set(["personal_data_item"]),instagram:new Set(["personal_data_item"]),reddit:new Set(["personal_data_item"]),discord:new Set(["personal_data_item","message"]),maxun:new Set(["source_object"]),firecrawl:new Set(["source_object"]),anakin_oss:new Set(["source_object"]),meetily:new Set(["transcript"])};const outcome=await transaction(async client=>{const connection=(await client.query<Record<string,any>>("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL FOR UPDATE",[vaultId,connectionId])).rows[0];if(!connection)return"connection_not_found" as const;if(input.datasets.some(dataset=>!allowed[connection.provider]?.has(dataset.sourceKind)))return"mapping_source_kind_not_in_registered_provider_schema" as const;const oauth=connection.provider==="microsoft"||connection.provider==="google_calendar";if(oauth&&input.extractionProfile!=="provider_native_v1")return"mapping_extraction_profile_not_supported" as const;if(connection.provider==="visma_inschool"&&!['owner_export_v1','browser_session_v1'].includes(input.extractionProfile))return"mapping_extraction_profile_not_supported" as const;const current=(await client.query<Record<string,any>>("SELECT * FROM connection_mappings WHERE connection_id=$1 FOR UPDATE",[connectionId])).rows[0];if((current?.revision??0)!==expectedRevision)return"stale_connection_mapping" as const;const values=[connectionId,JSON.stringify(input.datasets),input.timezone,JSON.stringify(input.entityMapping),input.extractionProfile];const saved=current?(await client.query("UPDATE connection_mappings SET datasets=$2::jsonb,timezone=$3,entity_mapping=$4::jsonb,extraction_profile=$5,revision=revision+1,updated_at=now() WHERE connection_id=$1 RETURNING *",values)).rows[0]:(await client.query("INSERT INTO connection_mappings(connection_id,datasets,timezone,entity_mapping,extraction_profile) VALUES ($1,$2::jsonb,$3,$4::jsonb,$5) RETURNING *",values)).rows[0];return{...saved,provider:connection.provider};});if(typeof outcome==="string")return reply.code(outcome==="connection_not_found"?404:409).send({error:outcome});return mapConnectionMapping(outcome);});
app.get("/api/v1/vaults/:vaultId/connections/:connectionId/resources",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};const raw=request.query as {kind?:string;parent_id?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);idSchema.parse(connectionId);if(raw.parent_id)idSchema.parse(raw.parent_id);if(raw.cursor)idSchema.parse(raw.cursor);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100||!raw.kind||raw.kind.length>120)return reply.code(400).send({error:"invalid_connector_resource_filter"});const connection=await query("SELECT id FROM integration_connections WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]);if(!connection.rows[0])return reply.code(404).send({error:"connection_not_found"});const result=await query("SELECT * FROM connector_resources WHERE vault_id=$1 AND connection_id=$2 AND kind=$3 AND ($4::uuid IS NULL OR parent_id=$4) AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6",[vaultId,connectionId,raw.kind,raw.parent_id??null,raw.cursor??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),items=rows.map(mapConnectorResource);return{items,nextCursor:hasMore?items.at(-1)!.id:null};
});
app.get("/api/v1/vaults/:vaultId/connections/:connectionId/selection",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);
  const connection=(await query<Record<string,any>>("SELECT id,selection_window,selection_approvals,revision FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[vaultId,connectionId])).rows[0];
  if(!connection)return reply.code(404).send({error:"connection_not_found"});
  const selected=await query<{id:string}>("SELECT id FROM connector_resources WHERE vault_id=$1 AND connection_id=$2 AND selected=true ORDER BY id",[vaultId,connectionId]);
  return resourceSelectionSchema.parse({selectedResourceIds:selected.rows.map(row=>row.id),window:connection.selection_window,sensitiveDataOptIns:connection.selection_approvals?.sensitiveDataOptIns??[],revision:connection.revision});
});
app.put("/api/v1/vaults/:vaultId/connections/:connectionId/selection",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=resourceSelectionInputSchema.parse(request.body);const outcome=await transaction(async client=>{const locked=await client.query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,connectionId]);const connection=locked.rows[0];if(!connection)return null;if(connection.revision!==expectedRevision)return"stale_connection_revision" as const;const resources=input.selectedResourceIds.length?await client.query("SELECT id,kind,access_state,selected FROM connector_resources WHERE vault_id=$1 AND connection_id=$2 AND id=ANY($3::uuid[]) FOR UPDATE",[vaultId,connectionId,input.selectedResourceIds]):{rows:[] as Record<string,any>[]};if(resources.rows.length!==input.selectedResourceIds.length)return"connector_resource_not_found" as const;if(resources.rows.some(row=>row.access_state!=="available"))return"connector_resource_not_available" as const;const sensitiveKind=(kind:string)=>kind.includes("grade")?"grades":kind.includes("attendance")?"attendance":kind.includes("private_chat")||kind.includes("direct_message")?"private_chats":kind.includes("personal_data")||kind.includes("history")?"personal_data_history":null;const requiredOptIns=[...new Set(resources.rows.map(row=>sensitiveKind(row.kind)).filter(Boolean))] as string[];if(requiredOptIns.some(kind=>!input.sensitiveDataOptIns.includes(kind as any)))return"sensitive_dataset_opt_in_required" as const;const currentIds=(await client.query("SELECT id FROM connector_resources WHERE vault_id=$1 AND connection_id=$2 AND selected=true",[vaultId,connectionId])).rows.map(row=>row.id as string);const oldWindow=connection.selection_window as {from:string|null;to:string|null}|null;const widensIds=input.selectedResourceIds.some(id=>!currentIds.includes(id));const widensWindow=Boolean(input.window&&(oldWindow===null||(input.window.from&&(oldWindow.from===null||input.window.from<oldWindow.from))||(input.window.to===null&&oldWindow.to!==null)||(input.window.to&&oldWindow.to&&input.window.to>oldWindow.to)));if((widensIds||widensWindow)&&!input.scopeExpansionApproval)return"scope_expansion_approval_required" as const;await client.query("UPDATE connector_resources SET selected=(id=ANY($3::uuid[])),revision=revision+CASE WHEN selected IS DISTINCT FROM (id=ANY($3::uuid[])) THEN 1 ELSE 0 END,updated_at=CASE WHEN selected IS DISTINCT FROM (id=ANY($3::uuid[])) THEN now() ELSE updated_at END WHERE vault_id=$1 AND connection_id=$2",[vaultId,connectionId,input.selectedResourceIds]);const approval={sensitiveDataOptIns:[...new Set(input.sensitiveDataOptIns)].sort()};const updated=await client.query("UPDATE integration_connections SET selection_window=$3::jsonb,selection_approvals=$4::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING revision",[vaultId,connectionId,JSON.stringify(input.window),JSON.stringify(approval)]);return resourceSelectionSchema.parse({selectedResourceIds:[...input.selectedResourceIds].sort(),window:input.window,sensitiveDataOptIns:approval.sensitiveDataOptIns,revision:updated.rows[0].revision});});if(!outcome)return reply.code(404).send({error:"connection_not_found"});if(typeof outcome==="string")return reply.code(409).send({error:outcome});return outcome;
});
async function saveProviderSource(vaultId:string,connectionId:string,source:GraphSource){
  const attachmentBlobs=[] as Array<{id:string;sha256:string}>;
  for(const attachment of source.attachments??[]){
    const stored=await persistBlobBytes(vaultId,attachment.filename,attachment.mediaType,Buffer.from(attachment.bytes));
    attachmentBlobs.push({id:stored.blob.id,sha256:stored.sha256});
  }
  const attachmentBlobIds=attachmentBlobs.map(item=>item.id);
  const contentHash=createHash("sha256").update(source.content).update(JSON.stringify(source.metadata)).update(attachmentBlobs.map(item=>item.sha256).join(":")).digest("hex");
  return transaction(async client=>{
    const current=(await client.query<Record<string,any>>("SELECT * FROM source_objects WHERE connection_id=$1 AND provider_object_id=$2 FOR UPDATE",[connectionId,source.providerObjectId])).rows[0];
    if(current){
      const prior=(await client.query<{content_hash:string}>("SELECT content_hash FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2",[current.id,current.current_revision])).rows[0];
      if(prior?.content_hash===contentHash){await client.query("UPDATE source_objects SET last_attempt_at=now(),last_success_at=now(),freshness='current',updated_at=now() WHERE id=$1",[current.id]);return projectMicrosoftSchoolSource(client,vaultId,connectionId,current.id,source,contentHash);}
      const next=current.current_revision+1;
      await client.query("INSERT INTO source_object_revisions(source_object_id,revision,content_hash,content_text,metadata,attachment_blob_ids) VALUES ($1,$2,$3,$4,$5::jsonb,$6::uuid[])",[current.id,next,contentHash,source.content,JSON.stringify(source.metadata),attachmentBlobIds]);
      await client.query("UPDATE source_objects SET container_id=$2,kind=$3,title=$4,deep_link=$5,metadata=$6::jsonb,current_revision=$7,freshness='current',access_state='available',last_attempt_at=now(),last_success_at=now(),revision=revision+1,updated_at=now() WHERE id=$1",[current.id,source.containerId,source.kind,source.title,source.deepLink,JSON.stringify(source.metadata),next]);
      return projectMicrosoftSchoolSource(client,vaultId,connectionId,current.id,source,contentHash);
    }
    const inserted=(await client.query<{id:string}>("INSERT INTO source_objects(vault_id,connection_id,provider_object_id,container_id,kind,title,deep_link,metadata,freshness,last_attempt_at,last_success_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'current',now(),now()) RETURNING id",[vaultId,connectionId,source.providerObjectId,source.containerId,source.kind,source.title,source.deepLink,JSON.stringify(source.metadata)])).rows[0];
    await client.query("INSERT INTO source_object_revisions(source_object_id,revision,content_hash,content_text,metadata,attachment_blob_ids) VALUES ($1,1,$2,$3,$4::jsonb,$5::uuid[])",[inserted.id,contentHash,source.content,JSON.stringify(source.metadata),attachmentBlobIds]);
    return projectMicrosoftSchoolSource(client,vaultId,connectionId,inserted.id,source,contentHash);
  });
}

app.post("/api/v1/vaults/:vaultId/connections/:connectionId/sync",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);
  const connection=(await query<Record<string,any>>("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[vaultId,connectionId])).rows[0];
  if(!connection)return reply.code(404).send({error:"connection_not_found"});
  if(connection.provider!=="microsoft"&&connection.provider!=="google_calendar")return reply.code(409).send({error:"live_sync_adapter_not_bound"});
  const credential=(await query<Record<string,any>>("SELECT * FROM provider_oauth_credentials WHERE connection_id=$1 AND provider=$2",[connectionId,connection.provider])).rows[0];
  if(!credential)return reply.code(409).send({error:"authorization_required"});
  let tokens:Record<string,any>;
  try{tokens=JSON.parse(decryptOAuthSecret(credential.encrypted_credentials));}catch{return reply.code(409).send({error:"oauth_credential_unavailable"});}
  if(!tokens.access_token)return reply.code(409).send({error:"oauth_access_token_unavailable"});
  if(credential.expires_at&&new Date(credential.expires_at).getTime()<Date.now()+60_000){
    const registration=oauthRegistration(connection.provider as OAuthProvider);
    if(!registration||!tokens.refresh_token)return reply.code(409).send({error:"reauthorization_required",detail:"Provider refresh authorization is unavailable."});
    const form=new URLSearchParams({client_id:registration.clientId,grant_type:"refresh_token",refresh_token:tokens.refresh_token});
    if(registration.clientSecret)form.set("client_secret",registration.clientSecret);
    let response:Response;
    try{response=await fetch(registration.tokenUrl,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:form,signal:AbortSignal.timeout(15_000)});}catch{return reply.code(503).send({error:"oauth_refresh_unavailable"});}
    if(!response.ok){await query("UPDATE integration_connections SET state='authentication_required',last_error_code='oauth_refresh_rejected',last_failure_at=now(),updated_at=now() WHERE id=$1",[connectionId]);return reply.code(409).send({error:"reauthorization_required"});}
    const refreshed=await response.json() as Record<string,any>;
    if(typeof refreshed.access_token!=="string")return reply.code(502).send({error:"oauth_refresh_invalid"});
    tokens={...tokens,...refreshed};
    const expiresAt=typeof refreshed.expires_in==="number"?new Date(Date.now()+refreshed.expires_in*1000).toISOString():null;
    await query("UPDATE provider_oauth_credentials SET encrypted_credentials=$2,expires_at=$3,updated_at=now() WHERE id=$1",[credential.id,encryptOAuthSecret(JSON.stringify(tokens)),expiresAt]);
  }
  const scopes=credential.granted_scope as string[];
  if(connection.provider==="google_calendar"){
    const gmailScope="https://www.googleapis.com/auth/gmail.readonly";
    if(!scopes.some(scope=>scope.toLowerCase()===gmailScope))return reply.code(409).send({error:"gmail_scope_not_granted",detail:"Authorize read-only Gmail access on this Google connection."});
    const previousCursor=typeof connection.coverage?.gmail?.nextPageToken==="string"?connection.coverage.gmail.nextPageToken:null;
    const gmail=await collectGmail(tokens.access_token,scopes,async source=>{await saveProviderSource(vaultId,connectionId,source);},fetch,previousCursor);
    const succeeded=gmail.complete||gmail.imported>0,partial=!gmail.contentComplete;
    const capability={key:"google.gmail_read",mode:"live_read",enabled:succeeded,verifiedAt:succeeded?new Date().toISOString():null,limitation:partial?"Gmail import has content or backfill gaps; inspect coverage.":null};
    await query("UPDATE integration_connections SET state=$3,capabilities=$4::jsonb,coverage=$5::jsonb,imported_count=(SELECT count(*) FROM source_objects WHERE connection_id=$2),last_success_at=CASE WHEN $6 THEN now() ELSE last_success_at END,last_failure_at=CASE WHEN $7 THEN now() ELSE last_failure_at END,last_error_code=$8,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,connectionId,succeeded?(partial?"degraded":"connected"):"error",JSON.stringify([capability]),JSON.stringify({gmail}),succeeded,partial||!succeeded,partial||!succeeded?gmail.error??"partial_gmail_coverage":null]);
    return {coverage:[gmail],complete:gmail.contentComplete,privateChatsOptedIn:false};
  }
  const allowChats=(connection.selection_approvals?.sensitiveDataOptIns??[]).includes("private_chats");
  const permittedScopes=allowChats?scopes:scopes.filter(scope=>scope.toLowerCase()!=="chat.read");
  let unprojectedAssignments=0;
  const coverage=await collectMicrosoftGraph(tokens.access_token,permittedScopes,async source=>{if(await saveProviderSource(vaultId,connectionId,source)==="class_missing")unprojectedAssignments++;});
  if(unprojectedAssignments){const assignments=coverage.find(item=>item.dataset==="assignments");if(assignments){assignments.complete=false;assignments.contentComplete=false;assignments.error="school_projection_incomplete";assignments.limitations.push(`${unprojectedAssignments} assignment(s) could not be shown in School because the matching class was not imported.`);}}
  const succeeded=coverage.some(item=>item.complete),partial=coverage.some(item=>!item.contentComplete&&item.error!=="scope_not_granted");
  const capability={key:"microsoft.graph_read",mode:"live_read",enabled:succeeded,verifiedAt:succeeded?new Date().toISOString():null,limitation:partial||!succeeded?"Some Microsoft Graph datasets remain incomplete; inspect per-dataset coverage.":null};
  await query("UPDATE integration_connections SET state=$3,capabilities=$4::jsonb,coverage=$5::jsonb,imported_count=(SELECT count(*) FROM source_objects WHERE connection_id=$2),last_success_at=CASE WHEN $6 THEN now() ELSE last_success_at END,last_failure_at=CASE WHEN $7 THEN now() ELSE last_failure_at END,last_error_code=$8,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,connectionId,succeeded?(partial?"degraded":"connected"):"error",JSON.stringify([capability]),JSON.stringify({microsoftGraph:coverage,privateChatsOptedIn:allowChats}),succeeded,partial||!succeeded,partial||!succeeded?"partial_graph_coverage":null]);
  return {coverage,complete:coverage.every(item=>item.contentComplete),privateChatsOptedIn:allowChats};
});
app.get("/api/v1/vaults/:vaultId/connections/:connectionId/sync-status",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const [connectionResult,latestJob,resources,workers]=await Promise.all([query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2",[vaultId,connectionId]),query("SELECT id,status,stage,created_at,finished_at FROM jobs WHERE vault_id=$1 AND input->>'connectionId'=$2 ORDER BY created_at DESC,id DESC LIMIT 1",[vaultId,connectionId]),query("SELECT access_state,selected,count(*)::int AS count FROM connector_resources WHERE vault_id=$1 AND connection_id=$2 GROUP BY access_state,selected",[vaultId,connectionId]),query("SELECT 1 FROM workers w JOIN worker_vault_access a ON a.worker_id=w.id WHERE a.vault_id=$1 AND w.role='connector' AND w.revoked_at IS NULL AND w.paused=false AND w.runtime_status IN ('available','busy') AND w.last_seen_at>now()-interval '45 seconds' LIMIT 1",[vaultId])]);const row=connectionResult.rows[0];if(!row)return reply.code(404).send({error:"connection_not_found"});const workerAvailable=workers.rows.length>0,authorizationRequired=["authentication_required","admin_approval_required","needs_provider_configuration"].includes(row.state),throttled=row.state==="rate_limited";const liveCapability=(row.capabilities as Array<{mode:string;enabled:boolean;verifiedAt:string|null}>).some(capability=>capability.mode==="live_read"&&capability.enabled&&capability.verifiedAt);const blockers:string[]=[];if(authorizationRequired)blockers.push("authorization_required");if(throttled)blockers.push("provider_rate_limited");if(!liveCapability)blockers.push("verified_live_read_capability_unavailable");if(!workerAvailable)blockers.push("connector_worker_unavailable");if(row.disconnected_at)blockers.push("connection_disconnected");const latest=latestJob.rows[0];const counts=Object.fromEntries(resources.rows.map(item=>[`${item.access_state}:${item.selected?"selected":"unselected"}`,Number(item.count)]));return connectorSyncStatusSchema.parse({connectionId,state:row.state,lastAttemptAt:latest?iso(latest.created_at):(row.last_failure_at?iso(row.last_failure_at):row.last_success_at?iso(row.last_success_at):null),lastSuccessAt:row.last_success_at?iso(row.last_success_at):null,partialCoverage:{...row.coverage,resources:counts},throttled,authorizationRequired,workerAvailable,latestJob:latest?{id:latest.id,status:latest.status,stage:latest.stage}:null,blockers});
});
app.patch("/api/v1/vaults/:vaultId/connections/:connectionId/schedule",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const schedule=connectorScheduleSchema.parse(request.body);if(schedule.windows.some(window=>!isSupportedTimezone(window.timezone)))return reply.code(400).send({error:"unsupported_timezone"});const nextScheduledAt=nextConnectorRun(schedule);const result=await query("UPDATE integration_connections SET schedule=$4::jsonb,next_scheduled_at=$5,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND disconnected_at IS NULL RETURNING schedule",[vaultId,connectionId,expectedRevision,JSON.stringify(schedule),nextScheduledAt]);if(!result.rows[0])return reply.code(409).send({error:"connection_not_found_stale_or_disconnected"});return connectorScheduleSchema.parse(result.rows[0].schedule);
});
app.post("/api/v1/vaults/:vaultId/connections/:connectionId/disconnect-preview",async(request,reply)=>{const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);const input=previewConnectionDisconnectSchema.parse(request.body),connection=(await query<Record<string,any>>("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[vaultId,connectionId])).rows[0];if(!connection)return reply.code(404).send({error:"connection_not_found"});const [resources,sources,derived]=await Promise.all([query("SELECT count(*)::int AS count FROM connector_resources WHERE vault_id=$1 AND connection_id=$2 AND selected=true",[vaultId,connectionId]),query("SELECT count(*)::int AS count FROM source_objects WHERE vault_id=$1 AND connection_id=$2",[vaultId,connectionId]),query("SELECT count(*)::int AS count FROM transcript_analysis_artifacts a JOIN source_objects s ON s.id=a.source_object_id WHERE s.vault_id=$1 AND s.connection_id=$2",[vaultId,connectionId])]);const deleteImported=input.retentionChoice==="delete_imported",deleteDerived=input.retentionChoice!=="retain_imported",impact={credentialReferencesToDelete:connection.credential_reference?1:0,subscriptionsToStop:0,selectedResources:Number(resources.rows[0].count),sourceObjects:Number(sources.rows[0].count),derivedArtifacts:Number(derived.rows[0].count),importedRecords:Number(connection.imported_count),retainedRecordKinds:input.retentionChoice==="retain_imported"?["source_objects","derived_artifacts","imported_records"]:input.retentionChoice==="retain_sources_delete_derived"?["source_objects","imported_records"]:[],deletedRecordKinds:[...(deleteImported?["source_objects","imported_records"]:[]),...(deleteDerived?["derived_artifacts"]:[])],providerRevocationAttemptedOnApply:Boolean(connection.credential_reference),providerCleanupMayBeIncomplete:true as const,writesApplied:false as const};const created=(await query<Record<string,any>>("INSERT INTO connection_disconnect_previews(vault_id,connection_id,connection_revision,retention_choice,impact) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *",[vaultId,connectionId,connection.revision,input.retentionChoice,JSON.stringify(impact)])).rows[0];return connectionDisconnectPreviewSchema.parse({id:created.id,vaultId,connectionId,connectionRevision:connection.revision,retentionChoice:input.retentionChoice,impact,requiredConfirmation:"disconnect",stale:false,expiresAt:iso(created.expires_at),createdAt:iso(created.created_at)});});

app.post("/api/v1/vaults/:vaultId/connections/:connectionId/disconnect",async(request,reply)=>{
  const {vaultId,connectionId}=request.params as {vaultId:string;connectionId:string};idSchema.parse(vaultId);idSchema.parse(connectionId);
  const input=disconnectIntegrationSchema.parse(request.body);
  const [preflightPreview,preflightConnection]=await Promise.all([
    query<Record<string,any>>("SELECT * FROM connection_disconnect_previews WHERE id=$1 AND vault_id=$2 AND connection_id=$3",[input.previewId,vaultId,connectionId]),
    query<Record<string,any>>("SELECT c.*,o.encrypted_credentials FROM integration_connections c LEFT JOIN provider_oauth_credentials o ON o.connection_id=c.id WHERE c.vault_id=$1 AND c.id=$2 AND c.disconnected_at IS NULL",[vaultId,connectionId])
  ]);
  const previewBefore=preflightPreview.rows[0],connectionBefore=preflightConnection.rows[0];
  if(!previewBefore)return reply.code(404).send({error:"disconnect_preview_not_found"});
  if(!connectionBefore)return reply.code(404).send({error:"connection_not_found_or_disconnected"});
  if(previewBefore.state!=="draft"||new Date(previewBefore.expires_at)<=new Date())return reply.code(409).send({error:"disconnect_preview_expired_or_consumed"});
  if(connectionBefore.revision!==input.expectedRevision||previewBefore.connection_revision!==connectionBefore.revision)return reply.code(409).send({error:"disconnect_preview_or_connection_stale"});
  const revocation:OAuthRevocationResult=connectionBefore.credential_reference&&!connectionBefore.encrypted_credentials
    ? {attempted:false,succeeded:false,cleanupMayBeIncomplete:true,errorCode:"provider_revocation_credential_unavailable"}
    : await revokeConnectionCredential(connectionBefore.provider as OAuthProvider,connectionBefore.encrypted_credentials??null);
  const outcome=await transaction(async client=>{
    const preview=(await client.query<Record<string,any>>("SELECT * FROM connection_disconnect_previews WHERE id=$1 AND vault_id=$2 AND connection_id=$3 FOR UPDATE",[input.previewId,vaultId,connectionId])).rows[0];
    if(!preview)return"disconnect_preview_not_found" as const;
    if(preview.state!=="draft"||new Date(preview.expires_at)<=new Date())return"disconnect_preview_expired_or_consumed" as const;
    const connection=(await client.query<Record<string,any>>("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL FOR UPDATE",[vaultId,connectionId])).rows[0];
    if(!connection)return"connection_not_found_or_disconnected" as const;
    if(connection.revision!==input.expectedRevision||preview.connection_revision!==connection.revision)return"disconnect_preview_or_connection_stale" as const;
    const sourceIds=(await client.query<{id:string}>("SELECT id FROM source_objects WHERE vault_id=$1 AND connection_id=$2",[vaultId,connectionId])).rows.map(row=>row.id);
    let deletedDerived=0,deletedSources=0;
    if(preview.retention_choice!=="retain_imported"&&sourceIds.length){const artifacts=await client.query("DELETE FROM transcript_analysis_artifacts WHERE source_object_id=ANY($1::uuid[])",[sourceIds]);deletedDerived+=artifacts.rowCount??0;}
    if(preview.retention_choice==="delete_imported"&&sourceIds.length){await client.query("UPDATE study_plans SET archived_at=COALESCE(archived_at,now()),updated_at=now() WHERE vault_id=$1 AND material_source_ids&&$2::uuid[]",[vaultId,sourceIds]);await client.query("UPDATE study_plan_units SET status='skipped',revision=revision+1,updated_at=now() WHERE vault_id=$1 AND material_source_ids&&$2::uuid[]",[vaultId,sourceIds]);await client.query("UPDATE course_material_links SET archived_at=COALESCE(archived_at,now()),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND source_object_id=ANY($2::uuid[])",[vaultId,sourceIds]);const deleted=await client.query("DELETE FROM source_objects WHERE vault_id=$1 AND connection_id=$2",[vaultId,connectionId]);deletedSources=deleted.rowCount??0;}
    await client.query("DELETE FROM provider_oauth_credentials WHERE connection_id=$1",[connectionId]);
    await client.query("UPDATE provider_notification_subscriptions SET disabled_at=COALESCE(disabled_at,now()),updated_at=now() WHERE connection_id=$1",[connectionId]);
    await client.query("UPDATE connector_resources SET selected=false,revision=revision+CASE WHEN selected THEN 1 ELSE 0 END,updated_at=CASE WHEN selected THEN now() ELSE updated_at END WHERE connection_id=$1",[connectionId]);
    const cleanup={previewId:input.previewId,retentionChoice:preview.retention_choice,deletedDerivedRecords:deletedDerived,deletedSourceObjects:deletedSources,localCredentialsDeleted:true,subscriptionsDisabled:true,providerRevocationAttempted:revocation.attempted,providerRevocationSucceeded:revocation.succeeded,providerCleanupMayBeIncomplete:revocation.cleanupMayBeIncomplete};
    const updated=(await client.query("UPDATE integration_connections SET state='disconnected',credential_reference=NULL,disconnected_at=now(),coverage=coverage||$4::jsonb,last_error_code=$5,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 RETURNING *",[vaultId,connectionId,input.expectedRevision,JSON.stringify({disconnectCleanup:cleanup}),revocation.errorCode])).rows[0];
    await client.query("UPDATE connection_disconnect_previews SET state='consumed' WHERE id=$1",[input.previewId]);
    return updated;
  });
  if(typeof outcome==="string")return reply.code(outcome.includes("not_found")?404:409).send({error:outcome,providerRevocationAttempted:revocation.attempted,providerRevocationSucceeded:revocation.succeeded});
  return mapIntegrationConnection(outcome);
});

app.get("/api/v1/vaults/:vaultId/projects",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {status,limit:rawLimit}=request.query as {status?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_project_filter"});const result=await query("SELECT * FROM projects WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR status=$2) ORDER BY updated_at DESC,id LIMIT $3",[vaultId,status??null,limit]);return {items:result.rows.map(mapProject),nextCursor:null};});
app.post("/api/v1/vaults/:vaultId/projects",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createProjectSchema.parse(request.body);const created=await transaction(async client=>{if(input.descriptionNoteId&&!await vaultIdsValid(client,vaultId,"notes",[input.descriptionNoteId]))return "project_description_note_not_found" as const;if(!await vaultIdsValid(client,vaultId,"goals",input.goalIds)||!await vaultIdsValid(client,vaultId,"notes",input.noteIds)||!await vaultIdsValid(client,vaultId,"tasks",input.taskIds)||!await vaultIdsValid(client,vaultId,"ideas",input.ideaIds))return "project_link_not_found" as const;if(!await currentAnchorsValid(client,vaultId,input.sourceAnchorIds))return "project_source_anchor_not_current" as const;const result=await client.query("INSERT INTO projects(vault_id,title,description_note_id,status,goal_ids,note_ids,task_ids,idea_ids,source_anchor_ids) VALUES ($1,$2,$3,$4,$5::uuid[],$6::uuid[],$7::uuid[],$8::uuid[],$9::uuid[]) RETURNING *",[vaultId,input.title,input.descriptionNoteId,input.status,[...new Set(input.goalIds)],[...new Set(input.noteIds)],[...new Set(input.taskIds)],[...new Set(input.ideaIds)],[...new Set(input.sourceAnchorIds)]]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapProject(created));});
app.get("/api/v1/vaults/:vaultId/projects/:projectId",async(request,reply)=>{const {vaultId,projectId}=request.params as {vaultId:string;projectId:string};idSchema.parse(vaultId);idSchema.parse(projectId);const result=await query("SELECT * FROM projects WHERE vault_id=$1 AND id=$2",[vaultId,projectId]);if(!result.rows[0])return reply.code(404).send({error:"project_not_found"});return mapProject(result.rows[0]);});
app.patch("/api/v1/vaults/:vaultId/projects/:projectId",async(request,reply)=>{const {vaultId,projectId}=request.params as {vaultId:string;projectId:string};idSchema.parse(vaultId);idSchema.parse(projectId);const input=updateProjectSchema.parse(request.body);const updated=await transaction(async client=>{const result=await client.query("SELECT * FROM projects WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,projectId]);const item=result.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;const p=input.patch;const description=p.descriptionNoteId===undefined?item.description_note_id:p.descriptionNoteId;const goals=p.goalIds??item.goal_ids,notes=p.noteIds??item.note_ids,tasks=p.taskIds??item.task_ids,ideas=p.ideaIds??item.idea_ids,anchors=p.sourceAnchorIds??item.source_anchor_ids;if(description&&!await vaultIdsValid(client,vaultId,"notes",[description]))return "project_description_note_not_found" as const;if(!await vaultIdsValid(client,vaultId,"goals",goals)||!await vaultIdsValid(client,vaultId,"notes",notes)||!await vaultIdsValid(client,vaultId,"tasks",tasks)||!await vaultIdsValid(client,vaultId,"ideas",ideas))return "project_link_not_found" as const;if(!await currentAnchorsValid(client,vaultId,anchors))return "project_source_anchor_not_current" as const;const saved=await client.query("UPDATE projects SET title=$3,description_note_id=$4,status=$5,goal_ids=$6::uuid[],note_ids=$7::uuid[],task_ids=$8::uuid[],idea_ids=$9::uuid[],source_anchor_ids=$10::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,projectId,p.title??item.title,description,p.status??item.status,[...new Set(goals)],[...new Set(notes)],[...new Set(tasks)],[...new Set(ideas)],[...new Set(anchors)]]);return saved.rows[0];});if(!updated)return reply.code(404).send({error:"project_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapProject(updated);});
app.delete("/api/v1/vaults/:vaultId/projects/:projectId",async(request,reply)=>{const {vaultId,projectId}=request.params as {vaultId:string;projectId:string};idSchema.parse(vaultId);idSchema.parse(projectId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE projects SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,projectId,revision]);if(!result.rows[0])return reply.code(409).send({error:"project_not_found_stale_or_archived"});return mapProject(result.rows[0]);});

app.get("/api/v1/vaults/:vaultId/ideas",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {state,limit:rawLimit}=request.query as {state?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_idea_filter"});const result=await query("SELECT * FROM ideas WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR state=$2) ORDER BY updated_at DESC,id LIMIT $3",[vaultId,state??null,limit]);return {items:result.rows.map(mapIdea),nextCursor:null};});
app.post("/api/v1/vaults/:vaultId/ideas",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createIdeaSchema.parse(request.body);const created=await transaction(async client=>{if(!await vaultIdsValid(client,vaultId,"sources",[input.sourceId]))return "idea_source_not_found" as const;if(input.projectId&&!await vaultIdsValid(client,vaultId,"projects",[input.projectId]))return "idea_project_not_found" as const;if(!await currentAnchorsValid(client,vaultId,input.sourceAnchorIds))return "idea_source_anchor_not_current" as const;const result=await client.query("INSERT INTO ideas(vault_id,source_id,title,project_id,state,source_anchor_ids) VALUES ($1,$2,$3,$4,$5,$6::uuid[]) RETURNING *",[vaultId,input.sourceId,input.title,input.projectId,input.state,[...new Set(input.sourceAnchorIds)]]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapIdea(created));});
app.post("/api/v1/vaults/:vaultId/ideas/:ideaId/promotion-preview",async(request,reply)=>{const {vaultId,ideaId}=request.params as {vaultId:string;ideaId:string};idSchema.parse(vaultId);idSchema.parse(ideaId);const input=previewIdeaPromotionSchema.parse(request.body);const created=await transaction(client=>createContentProposal(client,vaultId,{kind:"idea_promotion",inputs:{ideaId,targetProjectId:input.targetProjectId,newProjectName:input.newProjectName},expectedRevisions:input.expectedRevisions}));if(typeof created==="string")return reply.code(created.includes("not_found")?404:409).send({error:created});return reply.code(201).send(await mapContentProposal(created));});
app.post("/api/v1/vaults/:vaultId/ideas/:ideaId/project-proposal",async(request,reply)=>{const {vaultId,ideaId}=request.params as {vaultId:string;ideaId:string};idSchema.parse(vaultId);idSchema.parse(ideaId);const input=proposeIdeaProjectSchema.parse(request.body);if(input.relatedIdeaIds.includes(ideaId))return reply.code(400).send({error:"related_ideas_include_primary"});const created=await transaction(async client=>{const ideaIds=[ideaId,...input.relatedIdeaIds];const ideas=await client.query("SELECT id,revision FROM ideas WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL FOR SHARE",[vaultId,ideaIds]);if(ideas.rowCount!==ideaIds.length)return "proposal_input_not_found" as const;let projectRows:Record<string,any>[]=[];if(input.existingProjectId){const project=await client.query("SELECT id,revision FROM projects WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR SHARE",[vaultId,input.existingProjectId]);if(!project.rows[0])return "proposal_input_not_found" as const;projectRows=project.rows;}const expectedRevisions=Object.fromEntries([...ideas.rows,...projectRows].map((row:Record<string,any>)=>[row.id,row.revision]));return createContentProposal(client,vaultId,{kind:"idea_promotion",inputs:{ideaId,relatedIdeaIds:input.relatedIdeaIds,targetProjectId:input.existingProjectId,newProjectName:input.existingProjectId?undefined:input.proposedTitle,proposedTitle:input.proposedTitle},expectedRevisions});});if(typeof created==="string")return reply.code(created.includes("not_found")?404:409).send({error:created});return reply.code(201).send(await mapContentProposal(created));});
app.get("/api/v1/vaults/:vaultId/ideas/:ideaId",async(request,reply)=>{const {vaultId,ideaId}=request.params as {vaultId:string;ideaId:string};idSchema.parse(vaultId);idSchema.parse(ideaId);const result=await query("SELECT * FROM ideas WHERE vault_id=$1 AND id=$2",[vaultId,ideaId]);if(!result.rows[0])return reply.code(404).send({error:"idea_not_found"});return mapIdea(result.rows[0]);});
app.patch("/api/v1/vaults/:vaultId/ideas/:ideaId",async(request,reply)=>{const {vaultId,ideaId}=request.params as {vaultId:string;ideaId:string};idSchema.parse(vaultId);idSchema.parse(ideaId);const input=updateIdeaSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM ideas WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,ideaId]);const item=current.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;const sourceId=input.patch.sourceId??item.source_id,projectId=input.patch.projectId===undefined?item.project_id:input.patch.projectId,anchors=input.patch.sourceAnchorIds??item.source_anchor_ids;if(!await vaultIdsValid(client,vaultId,"sources",[sourceId]))return "idea_source_not_found" as const;if(projectId&&!await vaultIdsValid(client,vaultId,"projects",[projectId]))return "idea_project_not_found" as const;if(!await currentAnchorsValid(client,vaultId,anchors))return "idea_source_anchor_not_current" as const;const saved=await client.query("UPDATE ideas SET source_id=$3,title=$4,project_id=$5,state=$6,source_anchor_ids=$7::uuid[],revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,ideaId,sourceId,input.patch.title===undefined?item.title:input.patch.title,projectId,input.patch.state??item.state,[...new Set(anchors)]]);return saved.rows[0];});if(!updated)return reply.code(404).send({error:"idea_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapIdea(updated);});
app.delete("/api/v1/vaults/:vaultId/ideas/:ideaId",async(request,reply)=>{const {vaultId,ideaId}=request.params as {vaultId:string;ideaId:string};idSchema.parse(vaultId);idSchema.parse(ideaId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE ideas SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,ideaId,revision]);if(!result.rows[0])return reply.code(409).send({error:"idea_not_found_stale_or_archived"});return mapIdea(result.rows[0]);});

app.get("/api/v1/vaults/:vaultId/goals",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {status,limit:rawLimit}=request.query as {status?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_goal_filter"});const result=await query("SELECT * FROM goals WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR status=$2) ORDER BY updated_at DESC,id LIMIT $3",[vaultId,status??null,limit]);return {items:result.rows.map(mapGoal),nextCursor:null};});
app.post("/api/v1/vaults/:vaultId/goals",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createGoalSchema.parse(request.body);const created=await transaction(async client=>{if(input.courseId&&!await vaultIdsValid(client,vaultId,"school_courses",[input.courseId]))return "goal_course_not_found" as const;if(input.projectId&&!await vaultIdsValid(client,vaultId,"projects",[input.projectId]))return "goal_project_not_found" as const;if(!await currentAnchorsValid(client,vaultId,input.sourceAnchorIds))return "goal_source_anchor_not_current" as const;const result=await client.query("INSERT INTO goals(vault_id,title,kind,target,scale,target_date,course_id,project_id,constraints,source_anchor_ids,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::uuid[],$11) RETURNING *",[vaultId,input.title,input.kind,input.target,input.scale,input.targetDate,input.courseId,input.projectId,JSON.stringify(input.constraints),[...new Set(input.sourceAnchorIds)],input.status]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapGoal(created));});
app.get("/api/v1/vaults/:vaultId/goals/:goalId",async(request,reply)=>{const {vaultId,goalId}=request.params as {vaultId:string;goalId:string};idSchema.parse(vaultId);idSchema.parse(goalId);const result=await query("SELECT * FROM goals WHERE vault_id=$1 AND id=$2",[vaultId,goalId]);if(!result.rows[0])return reply.code(404).send({error:"goal_not_found"});return mapGoal(result.rows[0]);});
app.patch("/api/v1/vaults/:vaultId/goals/:goalId",async(request,reply)=>{const {vaultId,goalId}=request.params as {vaultId:string;goalId:string};idSchema.parse(vaultId);idSchema.parse(goalId);const input=updateGoalSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM goals WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,goalId]);const item=current.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;const p=input.patch,courseId=p.courseId===undefined?item.course_id:p.courseId,projectId=p.projectId===undefined?item.project_id:p.projectId,anchors=p.sourceAnchorIds??item.source_anchor_ids;if(courseId&&!await vaultIdsValid(client,vaultId,"school_courses",[courseId]))return "goal_course_not_found" as const;if(projectId&&!await vaultIdsValid(client,vaultId,"projects",[projectId]))return "goal_project_not_found" as const;if(!await currentAnchorsValid(client,vaultId,anchors))return "goal_source_anchor_not_current" as const;const saved=await client.query("UPDATE goals SET title=$3,kind=$4,target=$5,scale=$6,target_date=$7,course_id=$8,project_id=$9,constraints=$10::jsonb,source_anchor_ids=$11::uuid[],status=$12,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,goalId,p.title??item.title,p.kind??item.kind,p.target===undefined?item.target:p.target,p.scale===undefined?item.scale:p.scale,p.targetDate===undefined?(item.target_date?iso(item.target_date).slice(0,10):null):p.targetDate,courseId,projectId,JSON.stringify(p.constraints??item.constraints),[...new Set(anchors)],p.status??item.status]);return saved.rows[0];});if(!updated)return reply.code(404).send({error:"goal_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapGoal(updated);});
app.delete("/api/v1/vaults/:vaultId/goals/:goalId",async(request,reply)=>{const {vaultId,goalId}=request.params as {vaultId:string;goalId:string};idSchema.parse(vaultId);idSchema.parse(goalId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE goals SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,goalId,revision]);if(!result.rows[0])return reply.code(409).send({error:"goal_not_found_stale_or_archived"});return mapGoal(result.rows[0]);});

app.get("/api/v1/vaults/:vaultId/memories",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {status,limit:rawLimit}=request.query as {status?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_memory_filter"});const result=await query("SELECT * FROM memories WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR status=$2) ORDER BY updated_at DESC,id LIMIT $3",[vaultId,status??null,limit]);return {items:result.rows.map(mapMemory),nextCursor:null};});
app.post("/api/v1/vaults/:vaultId/memories",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createMemorySchema.parse(request.body);const created=await transaction(async client=>{if(!await currentAnchorsValid(client,vaultId,input.sourceAnchorIds))return "memory_source_anchor_not_current" as const;const result=await client.query("INSERT INTO memories(vault_id,kind,content,source_anchor_ids,origin,valid_from,expires_at,user_confirmed,status) VALUES ($1,$2,$3,$4::uuid[],$5,$6,$7,$8,$9) RETURNING *",[vaultId,input.kind,input.content,[...new Set(input.sourceAnchorIds)],input.origin,input.validFrom,input.expiresAt,input.userConfirmed,input.status]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapMemory(created));});
app.get("/api/v1/vaults/:vaultId/memories/:memoryId",async(request,reply)=>{const {vaultId,memoryId}=request.params as {vaultId:string;memoryId:string};idSchema.parse(vaultId);idSchema.parse(memoryId);const result=await query("SELECT * FROM memories WHERE vault_id=$1 AND id=$2",[vaultId,memoryId]);if(!result.rows[0])return reply.code(404).send({error:"memory_not_found"});return mapMemory(result.rows[0]);});
app.patch("/api/v1/vaults/:vaultId/memories/:memoryId",async(request,reply)=>{const {vaultId,memoryId}=request.params as {vaultId:string;memoryId:string};idSchema.parse(vaultId);idSchema.parse(memoryId);const input=updateMemorySchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM memories WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,memoryId]);const item=current.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;const p=input.patch,origin=p.origin??item.origin,anchors=p.sourceAnchorIds??item.source_anchor_ids,confirmed=p.userConfirmed??item.user_confirmed,validFrom=p.validFrom===undefined?(item.valid_from?iso(item.valid_from):null):p.validFrom,expiresAt=p.expiresAt===undefined?(item.expires_at?iso(item.expires_at):null):p.expiresAt;if(origin==="inferred"&&!anchors.length)return "inferred_memory_requires_evidence" as const;if(validFrom&&expiresAt&&Date.parse(expiresAt)<=Date.parse(validFrom))return "invalid_memory_validity" as const;if(!await currentAnchorsValid(client,vaultId,anchors))return "memory_source_anchor_not_current" as const;const saved=await client.query("UPDATE memories SET kind=$3,content=$4,source_anchor_ids=$5::uuid[],origin=$6,valid_from=$7,expires_at=$8,user_confirmed=$9,status=$10,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,memoryId,p.kind??item.kind,p.content??item.content,[...new Set(anchors)],origin,validFrom,expiresAt,confirmed,p.status??item.status]);return saved.rows[0];});if(!updated)return reply.code(404).send({error:"memory_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapMemory(updated);});
app.delete("/api/v1/vaults/:vaultId/memories/:memoryId",async(request,reply)=>{const {vaultId,memoryId}=request.params as {vaultId:string;memoryId:string};idSchema.parse(vaultId);idSchema.parse(memoryId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE memories SET archived_at=now(),status='dismissed',revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,memoryId,revision]);if(!result.rows[0])return reply.code(409).send({error:"memory_not_found_stale_or_archived"});return mapMemory(result.rows[0]);});
app.get("/api/v1/vaults/:vaultId/personal-profile",async request=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const [memories,goals,projects]=await Promise.all([query("SELECT * FROM memories WHERE vault_id=$1 AND archived_at IS NULL AND status='active' ORDER BY updated_at DESC",[vaultId]),query("SELECT * FROM goals WHERE vault_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC",[vaultId]),query("SELECT * FROM projects WHERE vault_id=$1 AND archived_at IS NULL ORDER BY updated_at DESC",[vaultId])]);const mappedMemories=memories.rows.map(mapMemory),mappedGoals=goals.rows.map(mapGoal),mappedProjects=projects.rows.map(mapProject);return personalProfileSchema.parse({memories:mappedMemories,goals:mappedGoals,projects:mappedProjects,summary:{explicitMemories:mappedMemories.filter(item=>item.origin==="explicit").length,inferredUnconfirmedMemories:mappedMemories.filter(item=>item.origin==="inferred"&&!item.userConfirmed).length,activeGoals:mappedGoals.filter(item=>item.status==="active").length,activeProjects:mappedProjects.filter(item=>item.status==="active").length},limitations:["This profile contains only explicit owner records and evidence-linked memories stored in this vault.","No sensitive trait, diagnosis, political preference, or fixed psychological identity is inferred."],generatedAt:new Date().toISOString()});});

app.get("/api/v1/vaults/:vaultId/tasks", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const result = await query("SELECT * FROM tasks WHERE vault_id = $1 AND deleted_at IS NULL ORDER BY completed, due_at NULLS LAST, created_at DESC", [vaultId]);
  return { items: result.rows.map(mapTask) };
});

app.post("/api/v1/vaults/:vaultId/notes/:noteId/accept-task",async(request,reply)=>{
  const {vaultId,noteId}=request.params as {vaultId:string;noteId:string};idSchema.parse(vaultId);idSchema.parse(noteId);
  const input=acceptNoteTaskSchema.parse(request.body);
  const result=await transaction(async client=>{
    const note=(await client.query("SELECT id,revision,classification,title,suggested_title,body FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL FOR SHARE",[vaultId,noteId])).rows[0];
    if(!note)return"note_not_found" as const;
    if(note.revision!==input.expectedRevision)return"stale_note_revision" as const;
    const explicitTitle=explicitCapturedTaskTitle(note.body??"");
    if(!note.body?.trim()||(!explicitTitle&&note.classification!=="task"))return"note_not_task_candidate" as const;
    const existing=(await client.query("SELECT * FROM tasks WHERE vault_id=$1 AND source_note_id=$2",[vaultId,noteId])).rows[0];
    if(existing)return existing.deleted_at?"source_task_deleted" as const:{task:existing,created:false};
    const title=(explicitTitle||note.suggested_title?.trim()||note.title?.trim()||"").slice(0,500);
    if(!title)return"note_not_task_candidate" as const;
    const inserted=(await client.query("INSERT INTO tasks(vault_id,title,source_note_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *",[vaultId,title,noteId])).rows[0];
    const task=inserted??(await client.query("SELECT * FROM tasks WHERE vault_id=$1 AND source_note_id=$2",[vaultId,noteId])).rows[0];
    if(!task)return"source_task_conflict" as const;
    return task.deleted_at?"source_task_deleted" as const:{task,created:Boolean(inserted)};
  });
  if(typeof result==="string")return reply.code(result==="note_not_found"?404:409).send({error:result});
  return reply.code(result.created?201:200).send(mapTask(result.task));
});

app.post("/api/v1/vaults/:vaultId/tasks", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createTaskSchema.parse(request.body);
  const result = await query(
    "INSERT INTO tasks(vault_id,title,due_at,estimated_minutes,remaining_minutes,earliest_start,priority,allow_split,min_block_minutes,max_block_minutes) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,$9) RETURNING *",
    [vaultId, input.title, input.dueAt ?? null, input.estimatedMinutes ?? null, input.earliestStart ?? null, input.priority, input.allowSplit, input.minBlockMinutes ?? null, input.maxBlockMinutes ?? null]
  );
  return reply.code(201).send(mapTask(result.rows[0]));
});

app.post("/api/v1/vaults/:vaultId/tasks/:taskId/breakdown",async(request,reply)=>{const {vaultId,taskId}=request.params as {vaultId:string;taskId:string};idSchema.parse(vaultId);idSchema.parse(taskId);const input=proposeTaskBreakdownSchema.parse(request.body);const created=await transaction(async client=>{const taskResult=await client.query("SELECT id,title,revision,completed,deleted_at FROM tasks WHERE vault_id=$1 AND id=$2 FOR SHARE",[vaultId,taskId]);const task=taskResult.rows[0];if(!task||task.deleted_at)return"task_not_found" as const;if(task.completed)return"completed_task_cannot_be_broken_down" as const;const sourceIds=input.sourceScope.sourceIds;const sources=await client.query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,sourceIds]);if(sources.rowCount!==sourceIds.length||sources.rows.some(row=>!row.original_text?.trim()))return"task_breakdown_source_not_found_or_empty" as const;const byId=new Map(sources.rows.map(row=>[row.id,row]));const sourceManifest=sourceIds.map(sourceId=>({sourceId,contentHash:byId.get(sourceId).content_hash}));const payload={type:"task_breakdown",taskId,taskRevision:task.revision,taskTitle:task.title,maxSessionMinutes:input.maxSessionMinutes,remainingWork:input.remainingWork,sourceManifest};const serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await client.query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='task_breakdown' AND input_hash=$2 AND status IN ('waiting_for_worker','running','succeeded') ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]);if(prior.rows[0])return prior.rows[0];const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'task_breakdown','waiting_for_worker','awaiting_task_breakdown_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,inputHash]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({taskId,taskRevision:task.revision,sourceCount:sourceIds.length,writesApplied:false})]);return job.rows[0];});if(typeof created==="string")return reply.code(created==="task_not_found"?404:409).send({error:created});return reply.code(202).send(mapJobHandle(created));});

app.get("/api/v1/vaults/:vaultId/tasks/:taskId",async(request,reply)=>{const {vaultId,taskId}=request.params as {vaultId:string;taskId:string};idSchema.parse(vaultId);idSchema.parse(taskId);const result=await query("SELECT * FROM tasks WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL",[vaultId,taskId]);if(!result.rows[0])return reply.code(404).send({error:"task_not_found"});return mapTask(result.rows[0]);});

app.patch("/api/v1/vaults/:vaultId/tasks/:taskId", async (request, reply) => {
  const { vaultId, taskId } = request.params as { vaultId: string; taskId: string };
  idSchema.parse(vaultId); idSchema.parse(taskId);
  const input = updateTaskSchema.parse(request.body);
  const current = await query("SELECT * FROM tasks WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL", [vaultId, taskId]);
  if (!current.rows[0]) return reply.code(404).send({ error: "not_found" });
  const item = current.rows[0]; if (item.revision !== input.expectedRevision) return reply.code(409).send({ error: "stale_revision" });
  const minBlock = input.patch.minBlockMinutes === undefined ? item.min_block_minutes : input.patch.minBlockMinutes; const maxBlock = input.patch.maxBlockMinutes === undefined ? item.max_block_minutes : input.patch.maxBlockMinutes;
  if (minBlock !== null && maxBlock !== null && minBlock > maxBlock) return reply.code(400).send({ error: "invalid_task_block_bounds" });
  const completed = input.patch.completed ?? item.completed; const estimated = input.patch.estimatedMinutes === undefined ? item.estimated_minutes : input.patch.estimatedMinutes; const remaining = input.patch.remainingMinutes === undefined ? (completed ? 0 : item.completed && !completed ? estimated : item.remaining_minutes) : input.patch.remainingMinutes;
  const result = await query(
    "UPDATE tasks SET title=$3,completed=$4,due_at=$5,estimated_minutes=$6,remaining_minutes=$7,earliest_start=$8,priority=$9,allow_split=$10,min_block_minutes=$11,max_block_minutes=$12,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$13 AND deleted_at IS NULL RETURNING *",
    [vaultId,taskId,input.patch.title??item.title,completed,input.patch.dueAt===undefined?item.due_at:input.patch.dueAt,estimated,remaining,input.patch.earliestStart===undefined?item.earliest_start:input.patch.earliestStart,input.patch.priority??item.priority,input.patch.allowSplit??item.allow_split,minBlock,maxBlock,input.expectedRevision]
  );
  if (!result.rows[0]) return reply.code(409).send({ error: "stale_revision" });
  return mapTask(result.rows[0]);
});

app.delete("/api/v1/vaults/:vaultId/tasks/:taskId",async(request,reply)=>{const {vaultId,taskId}=request.params as {vaultId:string;taskId:string};idSchema.parse(vaultId);idSchema.parse(taskId);const input=expectedTaskRevisionSchema.parse(request.body);const outcome=await transaction(async client=>{const current=await client.query("SELECT * FROM tasks WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL FOR UPDATE",[vaultId,taskId]);const task=current.rows[0];if(!task)return "task_not_found" as const;if(task.revision!==input.expectedRevision)return "stale_revision" as const;await client.query("UPDATE reminders SET status='cancelled',deleted_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND task_id=$2 AND deleted_at IS NULL AND status IN ('scheduled','snoozed')",[vaultId,taskId]);await client.query("UPDATE tasks SET deleted_at=now(),completed=true,remaining_minutes=0,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,taskId]);return "deleted" as const;});if(outcome==="task_not_found")return reply.code(404).send({error:outcome});if(outcome==="stale_revision")return reply.code(409).send({error:outcome});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/tasks/:taskId/execution-history", async (request, reply) => {
  const { vaultId, taskId } = request.params as { vaultId: string; taskId: string };
  idSchema.parse(vaultId); idSchema.parse(taskId);
  const raw = request.query as { cursor?: string; limit?: string };
  const limit = raw.limit === undefined ? 25 : Number(raw.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return reply.code(400).send({ error: "invalid_execution_history_limit" });
  let cursor: { createdAt: string; id: string } | null = null;
  if (raw.cursor) { try { cursor = decodeActivityCursor(raw.cursor); } catch { return reply.code(400).send({ error: "invalid_execution_history_cursor" }); } }
  const task = await query("SELECT id FROM tasks WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL", [vaultId, taskId]);
  if (!task.rowCount) return reply.code(404).send({ error: "task_not_found" });
  const result = await query(`SELECT s.* FROM study_sessions s
    WHERE s.vault_id=$1 AND $2::uuid=ANY(s.task_ids)
      AND EXISTS(SELECT 1 FROM study_session_actions a WHERE a.session_id=s.id)
      AND ($3::timestamptz IS NULL OR (s.created_at,s.id)<($3::timestamptz,$4::uuid))
    ORDER BY s.created_at DESC,s.id DESC LIMIT $5`, [vaultId, taskId, cursor?.createdAt ?? null, cursor?.id ?? null, limit + 1]);
  const hasMore = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  const sessionIds = rows.map(row => row.id);
  const actions = sessionIds.length ? await query(`SELECT * FROM (
    SELECT a.*,row_number() OVER(PARTITION BY a.session_id ORDER BY a.observed_at,a.id) AS action_number,
      count(*) OVER(PARTITION BY a.session_id) AS action_count
    FROM study_session_actions a WHERE a.vault_id=$1 AND a.session_id=ANY($2::uuid[])
  ) ranked WHERE action_number<=200 ORDER BY session_id,observed_at,id`, [vaultId, sessionIds]) : { rows: [] as Record<string, any>[] };
  const actionsBySession = new Map<string, Record<string, any>[]>();
  for (const action of actions.rows) actionsBySession.set(action.session_id, [...(actionsBySession.get(action.session_id) ?? []), action]);
  const items = rows.map(row => {
    const records = actionsBySession.get(row.id) ?? [];
    return { ...mapStudySession(row), actions: records.map(action => ({ id: action.id, action: action.action, observedAt: iso(action.observed_at), resultingRevision: action.resulting_revision, createdAt: iso(action.created_at) })), actionsTruncated: Number(records[0]?.action_count ?? 0) > 200 };
  });
  const last = rows.at(-1);
  return taskExecutionHistorySchema.parse({ taskId, items, nextCursor: hasMore && last ? encodeActivityCursor({ createdAt: iso(last.created_at), id: last.id }) : null });
});

app.get("/api/v1/vaults/:vaultId/reminders",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const {status,limit:rawLimit}=request.query as {status?:string;limit?:string};const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200||status&&!reminderStatusSchema.safeParse(status).success)return reply.code(400).send({error:"invalid_reminder_filter"});await materializeDueReminders(vaultId);const result=await query("SELECT * FROM reminders WHERE vault_id=$1 AND deleted_at IS NULL AND ($2::text IS NULL OR status=$2) ORDER BY remind_at,id LIMIT $3",[vaultId,status??null,limit]);return {items:result.rows.map(mapReminder),nextCursor:null};});

app.post("/api/v1/vaults/:vaultId/reminders",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createReminderSchema.parse(request.body);if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});if(Date.parse(input.remindAt)<=Date.now())return reply.code(400).send({error:"reminder_time_must_be_future"});const created=await transaction(async client=>{if(input.taskId){const task=await client.query("SELECT id FROM tasks WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL",[vaultId,input.taskId]);if(!task.rowCount)return "reminder_task_not_found" as const;}if(input.sourceAnchorId){const anchor=await client.query(`SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=$2 AND n.trashed_at IS NULL`,[vaultId,input.sourceAnchorId]);if(!anchor.rowCount)return "reminder_source_anchor_not_current" as const;}const result=await client.query("INSERT INTO reminders(vault_id,task_id,source_anchor_id,remind_at,timezone,channel) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",[vaultId,input.taskId??null,input.sourceAnchorId??null,input.remindAt,input.timezone,input.channel]);return result.rows[0];});if(typeof created==="string")return reply.code(400).send({error:created});return reply.code(201).send(mapReminder(created));});

app.patch("/api/v1/vaults/:vaultId/reminders/:reminderId",async(request,reply)=>{
  const {vaultId,reminderId}=request.params as {vaultId:string;reminderId:string};idSchema.parse(vaultId);idSchema.parse(reminderId);
  const input=updateReminderSchema.parse(request.body);
  const updated=await transaction(async client=>{
    const current=await client.query("SELECT * FROM reminders WHERE vault_id=$1 AND id=$2 AND deleted_at IS NULL FOR UPDATE",[vaultId,reminderId]);
    const item=current.rows[0];if(!item)return null;if(item.revision!==input.expectedRevision)return "stale_revision" as const;
    const decision=reminderUpdateDecision({currentStatus:item.status,currentRemindAt:iso(item.remind_at),requestedStatus:input.status,requestedRemindAt:input.remindAt});if(!decision.ok)return decision.error;
    if(item.calendar_event_id&&decision.remindAt!==iso(item.remind_at)){
      const end=new Date(Date.parse(decision.remindAt)+60_000).toISOString();
      const moved=await client.query("UPDATE calendar_events SET starts_at=$3,ends_at=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL RETURNING *",[vaultId,item.calendar_event_id,decision.remindAt,end]);
      if(!moved.rows[0])return "linked_calendar_event_missing" as const;
      const event=moved.rows[0];
      await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,actor_kind,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,'system',ARRAY['reminder_rescheduled'])",[event.id,event.revision,event.title,event.starts_at,event.ends_at,event.timezone]);
    }
    const result=await client.query("UPDATE reminders SET remind_at=$3,status=$4,delivered_at=CASE WHEN $4 IN ('scheduled','snoozed') THEN NULL ELSE delivered_at END,dismissed_at=CASE WHEN $4='dismissed' THEN COALESCE(dismissed_at,now()) ELSE dismissed_at END,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,reminderId,decision.remindAt,decision.status]);
    return result.rows[0];
  });
  if(!updated)return reply.code(404).send({error:"reminder_not_found"});if(typeof updated==="string")return reply.code(updated==="stale_revision"?409:400).send({error:updated});return mapReminder(updated);
});

app.delete("/api/v1/vaults/:vaultId/reminders/:reminderId",async(request,reply)=>{
  const {vaultId,reminderId}=request.params as {vaultId:string;reminderId:string};idSchema.parse(vaultId);idSchema.parse(reminderId);
  const input=expectedNoteRevisionSchema.parse(request.body);
  const removed=await transaction(async client=>{
    const reminder=await client.query("UPDATE reminders SET status='cancelled',deleted_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND deleted_at IS NULL RETURNING calendar_event_id",[vaultId,reminderId,input.expectedRevision]);
    if(!reminder.rows[0])return false;
    if(reminder.rows[0].calendar_event_id){
      const event=await client.query("UPDATE calendar_events SET trashed_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL RETURNING *",[vaultId,reminder.rows[0].calendar_event_id]);
      if(event.rows[0])await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,actor_kind,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,'system',ARRAY['reminder_cancelled'])",[event.rows[0].id,event.rows[0].revision,event.rows[0].title,event.rows[0].starts_at,event.rows[0].ends_at,event.rows[0].timezone]);
    }
    return true;
  });
  if(!removed)return reply.code(409).send({error:"reminder_not_found_stale_or_cancelled"});return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/notifications",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const {unreadOnly="false",limit:rawLimit}=request.query as {unreadOnly?:string;limit?:string};const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200||!["true","false"].includes(unreadOnly))return reply.code(400).send({error:"invalid_notification_filter"});await materializeDueReminders(vaultId);const result=await query("SELECT * FROM notifications WHERE vault_id=$1 AND ($2::boolean=false OR state='unread') ORDER BY delivered_at DESC,id DESC LIMIT $3",[vaultId,unreadOnly==="true",limit]);return {items:result.rows.map(mapNotification),nextCursor:null};});

app.patch("/api/v1/vaults/:vaultId/notifications/:notificationId",async(request,reply)=>{const {vaultId,notificationId}=request.params as {vaultId:string;notificationId:string};idSchema.parse(vaultId);idSchema.parse(notificationId);const input=updateNotificationSchema.parse(request.body);const result=await transaction(async client=>{const current=await client.query("SELECT * FROM notifications WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,notificationId]);const item=current.rows[0];if(!item)return null;if(item.state==="dismissed"||item.state===input.state)return item;const updated=await client.query("UPDATE notifications SET state=$3,read_at=CASE WHEN $3='read' THEN COALESCE(read_at,now()) ELSE read_at END,dismissed_at=CASE WHEN $3='dismissed' THEN COALESCE(dismissed_at,now()) ELSE dismissed_at END,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,notificationId,input.state]);return updated.rows[0];});if(!result)return reply.code(404).send({error:"notification_not_found"});return mapNotification(result);});

app.get("/api/v1/vaults/:vaultId/sync/pull", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const raw = request.query as { cursor?: string; limit?: string };
  const limit = raw.limit === undefined ? 200 : Number(raw.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) return reply.code(400).send({ error: "invalid_sync_limit" });
  const bounds = await syncBounds(vaultId);
  if (!raw.cursor) return syncBatchSchema.parse({ events: [], nextCursor: null, hasMore: false, snapshotRequired: true, ...bounds });
  let cursor;
  try { cursor = decodeSyncCursor(raw.cursor, vaultId); } catch { return reply.code(400).send({ error: "invalid_sync_cursor" }); }
  const decision = syncCursorDecision({ suppliedEventId: cursor.eventId, ...bounds });
  if (decision === "snapshot_required") return syncBatchSchema.parse({ events: [], nextCursor: null, hasMore: false, snapshotRequired: true, ...bounds });
  if (decision === "cursor_ahead") return reply.code(409).send({ error: "sync_cursor_ahead", latestEventId: bounds.latestEventId });
  const result = await query("SELECT * FROM vault_change_events WHERE vault_id=$1 AND id>$2::bigint ORDER BY id LIMIT $3", [vaultId, cursor.eventId, limit + 1]);
  const hasMore = result.rows.length > limit;
  const rows = result.rows.slice(0, limit);
  const events = rows.map(mapVaultChangeEvent);
  return syncBatchSchema.parse({ events, nextCursor: events.at(-1)?.cursor ?? raw.cursor, hasMore, snapshotRequired: false, ...bounds });
});

app.post("/api/v1/vaults/:vaultId/sync/push", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = pushSyncSchema.parse(request.body);
  if(!await syncDeviceMatchesRequest(request,input.deviceId))return reply.code(403).send({error:"sync_device_identity_mismatch"});
  const outcome=await executeSyncPush(vaultId,input);
  if(outcome.error==="invalid_sync_cursor")return reply.code(400).send({error:outcome.error});
  if("ack" in outcome)return outcome.ack;
  {
    if(outcome.error==="sync_device_not_found_or_unauthorized")return reply.code(404).send({error:outcome.error});
    return reply.code(409).send({error:outcome.error==="snapshot_required"?"sync_snapshot_required":"sync_cursor_ahead",retentionFloorEventId:outcome.retentionFloorEventId,latestEventId:outcome.latestEventId});
  }
});

app.post("/api/v1/vaults/:vaultId/sync/snapshots", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createSyncSnapshotSchema.parse(request.body);
  if(!await syncDeviceMatchesRequest(request,input.deviceId))return reply.code(403).send({error:"sync_device_identity_mismatch"});
  const outcome = await transaction(async client => {
    await client.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const device = await client.query("SELECT id FROM devices WHERE id=$1 AND revoked_at IS NULL AND $2::uuid=ANY(vault_ids) AND 'sync:read'=ANY(scopes)", [input.deviceId, vaultId]);
    if (!device.rowCount) return { error: "sync_device_not_found_or_unauthorized" as const };
    const watermark = await client.query("SELECT COALESCE(max(id),0)::text AS event_id FROM vault_change_events WHERE vault_id=$1", [vaultId]);
    let entryCount = 0;
    for (const [table] of syncSnapshotSources) {
      const count = await client.query(`SELECT count(*)::integer AS count FROM ${table} WHERE vault_id=$1`, [vaultId]);
      entryCount += Number(count.rows[0].count);
      if (entryCount > 20000) return { error: "sync_snapshot_too_large" as const };
    }
    const deletedCount=await client.query("SELECT count(*)::integer AS count FROM sync_tombstones WHERE vault_id=$1",[vaultId]);entryCount+=Number(deletedCount.rows[0].count);
    if(entryCount>20000)return {error:"sync_snapshot_too_large" as const};
    const entries: Array<{ recordType: typeof syncSnapshotSources[number][1]; recordId: string; revision: number; changeKind: "upsert" | "tombstone" }> = [];
    for (const [table, recordType, idColumn, tombstoneColumn] of syncSnapshotSources) {
      const tombstoneExpression = tombstoneColumn ? `CASE WHEN ${tombstoneColumn} IS NOT NULL THEN 'tombstone' ELSE 'upsert' END` : "'upsert'";
      const records = await client.query(`SELECT ${idColumn}::text AS record_id,revision,${tombstoneExpression} AS change_kind FROM ${table} WHERE vault_id=$1 ORDER BY ${idColumn}`, [vaultId]);
      for (const record of records.rows) entries.push({ recordType, recordId: record.record_id, revision: record.revision, changeKind: record.change_kind });
    }
    const deleted=await client.query("SELECT record_type,record_id::text,revision FROM sync_tombstones WHERE vault_id=$1 ORDER BY record_type,record_id",[vaultId]);
    for(const record of deleted.rows)entries.push({recordType:record.record_type,recordId:record.record_id,revision:record.revision,changeKind:"tombstone"});
    const generatedAt = new Date().toISOString();
    const result = syncSnapshotResultSchema.parse({
      type: "sync_snapshot",
      protocolVersion: 1,
      snapshotId: randomUUID(),
      requestedForDeviceId: input.deviceId,
      watermarkCursor: encodeSyncCursor({ vaultId, eventId: String(watermark.rows[0].event_id) }),
      entries,
      entryCount: entries.length,
      generatedAt,
      writesApplied: false
    });
    const payload = JSON.stringify({ type: "sync_snapshot", deviceId: input.deviceId });
    const created = await client.query(`INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at)
      VALUES ($1,'sync_snapshot','succeeded','snapshot_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *`,
      [vaultId, payload, createHash("sha256").update(payload).digest("hex"), JSON.stringify(result)]);
    await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)", [created.rows[0].id, JSON.stringify({ requestedForDeviceId: input.deviceId }), JSON.stringify({ snapshotId: result.snapshotId, entryCount: result.entryCount, writesApplied: false })]);
    return { job: created.rows[0] };
  });
  if ("error" in outcome) return reply.code(outcome.error === "sync_snapshot_too_large" ? 413 : 404).send({ error: outcome.error });
  return reply.code(202).send(mapJobHandle(outcome.job));
});

app.get("/api/v1/vaults/:vaultId/sync/ws",{websocket:true,preValidation:async(request,reply)=>{if(request.headers.origin!==config.APP_ORIGIN)return reply.code(403).send({error:"origin_not_allowed"});}},(socket,request)=>{
  const {vaultId}=request.params as {vaultId:string};
  let hello:{deviceId:string;mode:"read_only"|"read_write"}|null=null,eventId="0",closed=false,polling=false,lastAuthorizationCheck=0;
  const send=(frame:unknown)=>{if(socket.readyState===socket.OPEN)socket.send(JSON.stringify(syncSocketServerFrameSchema.parse(frame)));};
  const fail=(code:"hello_required"|"invalid_frame"|"unsupported_protocol"|"origin_not_allowed"|"device_not_authorized"|"write_not_allowed"|"access_revoked"|"internal_error",retryable=false,close=false)=>{send({type:"error",code,retryable});if(close)socket.close(1008,code);};
  const helloTimeout=setTimeout(()=>{if(!hello)fail("hello_required",true,true);},5000);
  const poll=async()=>{if(closed||!hello||polling)return;polling=true;try{if(Date.now()-lastAuthorizationCheck>=3000){lastAuthorizationCheck=Date.now();if(!await hasCurrentVaultReadAccess(request,vaultId)){fail("access_revoked",false,true);return;}}const changes=await query("SELECT * FROM vault_change_events WHERE vault_id=$1 AND id>$2::bigint ORDER BY id LIMIT 100",[vaultId,eventId]);if(changes.rowCount){const events=changes.rows.map(mapVaultChangeEvent);eventId=events.at(-1)!.eventId;send({type:"changes",events,nextCursor:events.at(-1)!.cursor});}}catch{fail("internal_error",true);}finally{polling=false;}};
  const interval=setInterval(()=>void poll(),750);
  let messageChain=Promise.resolve();
  const handleMessage=async(raw:string)=>{
    let value:unknown;try{value=JSON.parse(raw);}catch{return fail("invalid_frame");}
    const candidate=value as {type?:unknown;protocolVersion?:unknown};
    if(candidate.type==="hello"&&candidate.protocolVersion!==1)return fail("unsupported_protocol",false,true);
    const parsed=syncSocketClientFrameSchema.safeParse(value);if(!parsed.success)return fail("invalid_frame");const frame=parsed.data;
    if(frame.type==="hello"){
      if(hello)return fail("invalid_frame");
      if(!await syncDeviceMatchesRequest(request,frame.deviceId))return fail("device_not_authorized",false,true);
      let cursor;try{cursor=decodeSyncCursor(frame.cursor,vaultId);}catch{return fail("invalid_frame");}
      const requiredScope=frame.mode==="read_write"?"sync:write":"sync:read";const device=await query("SELECT id FROM devices WHERE id=$1 AND revoked_at IS NULL AND $2::uuid=ANY(vault_ids) AND $3=ANY(scopes)",[frame.deviceId,vaultId,requiredScope]);if(!device.rowCount)return fail("device_not_authorized",false,true);
      const bounds=await syncBounds(vaultId),decision=syncCursorDecision({suppliedEventId:cursor.eventId,...bounds});if(decision!=="pull"){send({type:"resync_required",reason:decision==="snapshot_required"?"cursor_expired":"cursor_ahead",...bounds});socket.close(1008,"resync_required");return;}
      hello={deviceId:frame.deviceId,mode:frame.mode};eventId=cursor.eventId;clearTimeout(helloTimeout);send({type:"hello_ack",protocolVersion:1,mode:frame.mode,cursor:frame.cursor});await poll();return;
    }
    if(!hello)return fail("hello_required");
    if(frame.type==="ping"){send({type:"pong",nonce:frame.nonce});return;}
    if(hello.mode!=="read_write")return fail("write_not_allowed");
    const input=pushSyncSchema.parse({deviceId:hello.deviceId,operations:frame.operations,lastCursor:frame.lastCursor});const outcome=await executeSyncPush(vaultId,input);
    if("ack" in outcome){send({type:"push_ack",requestId:frame.requestId,ack:outcome.ack});await poll();return;}
    if(outcome.error==="snapshot_required"||outcome.error==="cursor_ahead"){send({type:"resync_required",reason:outcome.error==="snapshot_required"?"cursor_expired":"cursor_ahead",retentionFloorEventId:outcome.retentionFloorEventId,latestEventId:outcome.latestEventId});return;}
    fail(outcome.error==="sync_device_not_found_or_unauthorized"?"device_not_authorized":"invalid_frame",false,outcome.error==="sync_device_not_found_or_unauthorized");
  };
  socket.on("message",data=>{messageChain=messageChain.then(()=>handleMessage(data.toString())).catch(()=>fail("internal_error",true));});
  socket.on("close",()=>{closed=true;clearTimeout(helloTimeout);clearInterval(interval);});
  socket.on("error",()=>{closed=true;clearTimeout(helloTimeout);clearInterval(interval);});
});

app.get("/api/v1/vaults/:vaultId/events", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const header = request.headers["last-event-id"];
  const rawCursor = typeof header === "string" ? header : (request.query as { cursor?: string }).cursor;
  if (!rawCursor) return reply.code(428).send({ error: "sync_cursor_required_run_pull_or_snapshot_first" });
  let cursor;
  try { cursor = decodeSyncCursor(rawCursor, vaultId); } catch { return reply.code(400).send({ error: "invalid_sync_cursor" }); }
  const bounds = await syncBounds(vaultId);
  const decision = syncCursorDecision({ suppliedEventId: cursor.eventId, ...bounds });
  if (decision === "snapshot_required") return reply.code(409).send({ error: "sync_snapshot_required", retentionFloorEventId: bounds.retentionFloorEventId });
  if (decision === "cursor_ahead") return reply.code(409).send({ error: "sync_cursor_ahead", latestEventId: bounds.latestEventId });
  let eventId = cursor.eventId;
  let closed = false;
  request.raw.on("close", () => { closed = true; });
  reply.hijack();
  reply.raw.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" });
  const deadline = Date.now() + 25_000;
  let lastAuthorizationCheck = 0;
  while (!closed && Date.now() < deadline) {
    if (Date.now() - lastAuthorizationCheck >= 3_000) {
      lastAuthorizationCheck = Date.now();
      if (!await hasCurrentVaultReadAccess(request, vaultId)) { reply.raw.write("event: access_revoked\ndata: {\"error\":\"access_revoked\"}\n\n"); break; }
    }
    const changes = await query("SELECT * FROM vault_change_events WHERE vault_id=$1 AND id>$2::bigint ORDER BY id LIMIT 100", [vaultId, eventId]);
    for (const row of changes.rows) {
      const event = mapVaultChangeEvent(row);
      reply.raw.write(`id: ${event.cursor}\nevent: change\ndata: ${JSON.stringify(event)}\n\n`);
      eventId = event.eventId;
    }
    if (!changes.rowCount) reply.raw.write(": keep-alive\n\n");
    await new Promise(resolve => setTimeout(resolve, 750));
  }
  if (!closed) reply.raw.end();
});

app.get("/api/v1/vaults/:vaultId/people",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const raw=request.query as {cursor?:string;limit?:string;role?:string;query?:string};idSchema.parse(vaultId);const limit=raw.limit===undefined?50:Number(raw.limit),search=raw.query?.trim()??null;if(!Number.isInteger(limit)||limit<1||limit>100||raw.role&&!['contact','teacher'].includes(raw.role)||search&&search.length>240)return reply.code(400).send({error:"invalid_people_filter"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_people_cursor"});}}const result=await query("SELECT e.*,EXISTS(SELECT 1 FROM school_courses c WHERE c.vault_id=e.vault_id AND e.id=ANY(c.teacher_entity_ids) AND c.archived_at IS NULL) AS is_teacher,(SELECT count(*)::int FROM commitments c WHERE c.vault_id=e.vault_id AND c.person_entity_id=e.id AND c.status='active' AND c.archived_at IS NULL) AS active_commitment_count,(SELECT count(DISTINCT ev.id)::int FROM event_entity_links l JOIN calendar_events ev ON ev.id=l.event_id WHERE l.entity_id=e.id AND ev.vault_id=e.vault_id AND ev.trashed_at IS NULL AND ev.ends_at>=now()) AS upcoming_event_count FROM calendar_entities e WHERE e.vault_id=$1 AND e.kind='person' AND e.archived_at IS NULL AND ($2::text IS NULL OR $2='contact' OR EXISTS(SELECT 1 FROM school_courses c WHERE c.vault_id=e.vault_id AND e.id=ANY(c.teacher_entity_ids) AND c.archived_at IS NULL)) AND ($3::text IS NULL OR e.name ILIKE '%'||$3||'%' OR EXISTS(SELECT 1 FROM calendar_entity_aliases a WHERE a.entity_id=e.id AND a.archived_at IS NULL AND a.alias ILIKE '%'||$3||'%')) AND ($4::timestamptz IS NULL OR (e.created_at,e.id)<($4::timestamptz,$5::uuid)) ORDER BY e.created_at DESC,e.id DESC LIMIT $6",[vaultId,raw.role??null,search,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),ids=rows.map(row=>row.id),aliases=ids.length?await query("SELECT entity_id,alias FROM calendar_entity_aliases WHERE entity_id=ANY($1::uuid[]) AND archived_at IS NULL ORDER BY lower(alias),id",[ids]):{rows:[] as Record<string,any>[]},last=rows.at(-1);const items=rows.map(row=>personSummarySchema.parse({id:row.id,name:row.name,roles:row.is_teacher?["contact","teacher"]:["contact"],aliases:aliases.rows.filter(alias=>alias.entity_id===row.id).map(alias=>alias.alias),activeCommitmentCount:Number(row.active_commitment_count),upcomingEventCount:Number(row.upcoming_event_count),revision:row.revision,updatedAt:iso(row.updated_at)}));return{items,nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});

app.get("/api/v1/vaults/:vaultId/people/:personId",async(request,reply)=>{const {vaultId,personId}=request.params as {vaultId:string;personId:string};const raw=request.query as {include_active_commitments?:string;from?:string;to?:string};idSchema.parse(vaultId);idSchema.parse(personId);const include=raw.include_active_commitments??"true";if(!['true','false'].includes(include)||(raw.from&&!raw.to)||(!raw.from&&raw.to))return reply.code(400).send({error:"invalid_person_context_query"});const from=raw.from??new Date().toISOString(),to=raw.to??new Date(Date.parse(from)+90*86_400_000).toISOString();if(Number.isNaN(Date.parse(from))||Number.isNaN(Date.parse(to))||Date.parse(to)<=Date.parse(from)||Date.parse(to)-Date.parse(from)>366*86_400_000)return reply.code(400).send({error:"invalid_person_context_window"});const entity=(await query("SELECT e.*,EXISTS(SELECT 1 FROM school_courses c WHERE c.vault_id=e.vault_id AND e.id=ANY(c.teacher_entity_ids) AND c.archived_at IS NULL) AS is_teacher FROM calendar_entities e WHERE e.vault_id=$1 AND e.id=$2 AND e.kind='person' AND e.archived_at IS NULL",[vaultId,personId])).rows[0];if(!entity)return reply.code(404).send({error:"person_not_found"});const [aliases,commitments,eventRows]=await Promise.all([query("SELECT alias FROM calendar_entity_aliases WHERE entity_id=$1 AND archived_at IS NULL ORDER BY lower(alias),id",[personId]),query("SELECT * FROM commitments WHERE vault_id=$1 AND person_entity_id=$2 AND archived_at IS NULL ORDER BY created_at DESC,id",[vaultId,personId]),query("SELECT e.* FROM calendar_events e JOIN event_entity_links l ON l.event_id=e.id WHERE e.vault_id=$1 AND l.entity_id=$2 AND e.trashed_at IS NULL AND (e.recurrence IS NOT NULL OR (e.ends_at>$3 AND e.starts_at<$4)) ORDER BY e.starts_at,e.id LIMIT 200",[vaultId,personId,from,to])]);const active=commitments.rows.filter(row=>row.status==="active"),noteIds=[...new Set(commitments.rows.map(row=>row.source_note_id).filter(Boolean))] as string[],notes=noteIds.length?await query("SELECT id,title,revision FROM notes WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND status<>'trashed' ORDER BY updated_at DESC,id",[vaultId,noteIds]):{rows:[] as Record<string,any>[]};const occurrences=eventRows.rows.flatMap(row=>expandOccurrences({eventId:row.id,title:row.title,startsAt:iso(row.starts_at),endsAt:iso(row.ends_at),recurrence:row.recurrence,from,to,limit:100}).map(item=>({eventId:row.id,title:item.title,startsAt:item.startsAt,endsAt:item.endsAt,timezone:row.timezone,revision:row.revision}))).sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).slice(0,200);const person=personSummarySchema.parse({id:entity.id,name:entity.name,roles:entity.is_teacher?["contact","teacher"]:["contact"],aliases:aliases.rows.map(row=>row.alias),activeCommitmentCount:active.length,upcomingEventCount:occurrences.length,revision:entity.revision,updatedAt:iso(entity.updated_at)});return personContextSchema.parse({person,activeCommitments:include==="true"?active.map(mapCommitment):[],upcomingPlans:occurrences,borrowedItems:commitments.rows.map(row=>({commitmentId:row.id,objectEntityId:row.object_entity_id,objectLabel:row.object_label,status:row.status,sourceNoteId:row.source_note_id})),discussionNotes:notes.rows.map(row=>({noteId:row.id,title:row.title,revision:row.revision})),identityPolicy:"exact_canonical_entity_only",privateSourcePolicy:"owner_vault_and_explicit_links_only",personalityInferences:false,generatedAt:new Date().toISOString()});});

app.post("/api/v1/vaults/:vaultId/people/:personId/availability-proposals",async(request,reply)=>{const {vaultId,personId}=request.params as {vaultId:string;personId:string};idSchema.parse(vaultId);idSchema.parse(personId);const input=proposeSocialTimeSchema.parse(request.body),connectionIds=input.connectedAvailabilityScope?.connectionIds??[];const [person,prefs,connections,occurrences]=await Promise.all([query("SELECT id FROM calendar_entities WHERE vault_id=$1 AND id=$2 AND kind='person' AND archived_at IS NULL",[vaultId,personId]),query("SELECT revision FROM scheduler_preferences WHERE vault_id=$1",[vaultId]),connectionIds.length?query("SELECT id,state,capabilities FROM integration_connections WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND disconnected_at IS NULL",[vaultId,connectionIds]):Promise.resolve({rows:[] as Record<string,any>[],rowCount:0}),loadCalendarOccurrences(vaultId,input.window.startsAt,input.window.endsAt)]);if(!person.rowCount)return reply.code(404).send({error:"person_not_found"});const currentRevision=Number(prefs.rows[0]?.revision??0);if(currentRevision!==input.userConstraintsRevision)return reply.code(409).send({error:"stale_user_constraints_revision",currentRevision});if(connections.rowCount!==connectionIds.length)return reply.code(400).send({error:"connected_availability_scope_not_found"});const durationMs=input.durationEstimate*60_000,busy=occurrences.map(item=>({from:Date.parse(item.startsAt),to:Date.parse(item.endsAt)})).sort((a,b)=>a.from-b.from),candidates=[] as Array<Record<string,unknown>>;for(let cursor=Math.ceil(Date.parse(input.window.startsAt)/(15*60_000))*(15*60_000);cursor+durationMs<=Date.parse(input.window.endsAt)&&candidates.length<10;cursor+=15*60_000){const end=cursor+durationMs;if(busy.some(item=>item.from<end&&item.to>cursor))continue;candidates.push({startsAt:new Date(cursor).toISOString(),endsAt:new Date(end).toISOString(),ownerAvailability:"free",otherPersonAvailability:"unknown",evidenceConnectionIds:[]});}const unavailableScoped=connections.rows.filter(row=>row.state!=="connected"||!(row.capabilities as any[]).some(capability=>capability.enabled&&capability.verifiedAt&&capability.mode==="live_read")).map(row=>row.id as string);const limitations=["Owner free time is not evidence that the other person is free.","No connection currently binds verified, explicitly shared availability to this person, so every candidate keeps the other person's availability unknown.",...(unavailableScoped.length?[`${unavailableScoped.length} scoped connection(s) lack a verified live-read capability.`]:[])];const result=socialTimeProposalResultSchema.parse({type:"social_time_proposal",personId,userConstraintsRevision:currentRevision,window:input.window,durationEstimate:input.durationEstimate,candidates,connectedAvailabilityScope:connectionIds,limitations,invitationsSent:false,writesApplied:false}),payload=JSON.stringify({type:"social_time_proposal",personId,...input}),job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'social_time_proposal','succeeded','proposal_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,payload,createHash("sha256").update(payload).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({personId,userConstraintsRevision:currentRevision}),JSON.stringify({candidateCount:candidates.length,otherPersonAvailability:"unknown",invitationsSent:false,writesApplied:false})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/calendar-entities", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  const { kind } = request.query as { kind?: string };
  idSchema.parse(vaultId);
  const result = kind
    ? await query("SELECT * FROM calendar_entities WHERE vault_id = $1 AND kind = $2 AND archived_at IS NULL ORDER BY lower(name) LIMIT 250", [vaultId, kind])
    : await query("SELECT * FROM calendar_entities WHERE vault_id = $1 AND archived_at IS NULL ORDER BY kind, lower(name) LIMIT 250", [vaultId]);
  return { items: result.rows.map(mapEntity) };
});

app.post("/api/v1/vaults/:vaultId/calendar-entities", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createCalendarEntitySchema.parse(request.body);
  const ambiguous = await query(`SELECT id FROM calendar_entities WHERE vault_id=$1 AND kind=$2 AND archived_at IS NULL AND lower(name)=lower($3)
    UNION ALL SELECT a.entity_id FROM calendar_entity_aliases a JOIN calendar_entities e ON e.id=a.entity_id WHERE e.vault_id=$1 AND e.kind=$2 AND e.archived_at IS NULL AND a.archived_at IS NULL AND lower(a.alias)=lower($3) LIMIT 1`, [vaultId, input.kind, input.name]);
  if (ambiguous.rowCount) return reply.code(409).send({ error: "entity_name_ambiguous" });
  const result = await query("INSERT INTO calendar_entities(vault_id,kind,name) VALUES ($1,$2,$3) RETURNING *", [vaultId, input.kind, input.name]);
  return reply.code(201).send(mapEntity(result.rows[0]));
});

app.post("/api/v1/vaults/:vaultId/calendar-entities/merge-preview", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = previewEntityMergeSchema.parse(request.body);
  const entities = await query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL ORDER BY id", [vaultId, input.entityIds]);
  if (entities.rowCount !== input.entityIds.length) return reply.code(404).send({ error: "calendar_entity_not_found_or_merged" });
  const kinds = new Set(entities.rows.map((row) => row.kind));
  if (kinds.size !== 1) return reply.code(409).send({ error: "cross_type_entity_merge_forbidden" });
  const sourceIds = input.entityIds.filter((id) => id !== input.targetId);
  const [events, commitments] = await Promise.all([
    query("SELECT DISTINCT e.id FROM calendar_events e JOIN event_entity_links l ON l.event_id=e.id WHERE e.vault_id=$1 AND e.trashed_at IS NULL AND l.entity_id=ANY($2::uuid[]) ORDER BY e.id", [vaultId, sourceIds]),
    query("SELECT id FROM commitments WHERE vault_id=$1 AND archived_at IS NULL AND (person_entity_id=ANY($2::uuid[]) OR object_entity_id=ANY($2::uuid[])) ORDER BY id", [vaultId, sourceIds])
  ]);
  const revisions = Object.fromEntries(entities.rows.map((row) => [row.id, row.revision]));
  const result = await query(
    `INSERT INTO entity_merge_proposals(vault_id,target_entity_id,source_entity_ids,reason,entity_revisions,affected_event_ids,affected_commitment_ids)
     VALUES ($1,$2,$3::uuid[],$4,$5::jsonb,$6::uuid[],$7::uuid[]) RETURNING *`,
    [vaultId, input.targetId, sourceIds, input.reason, JSON.stringify(revisions), events.rows.map((row) => row.id), commitments.rows.map((row) => row.id)]
  );
  return mapEntityMergeProposal(result.rows[0]);
});

app.get("/api/v1/vaults/:vaultId/calendar-entities/:entityId",async(request,reply)=>{const {vaultId,entityId}=request.params as {vaultId:string;entityId:string};idSchema.parse(vaultId);idSchema.parse(entityId);const [entityResult,aliases,events,commitments]=await Promise.all([query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=$2",[vaultId,entityId]),query("SELECT id,alias,scope,evidence_note_id,revision FROM calendar_entity_aliases WHERE entity_id=$1 AND archived_at IS NULL ORDER BY lower(alias),id",[entityId]),query("SELECT count(DISTINCT e.id)::int AS count FROM calendar_events e JOIN event_entity_links l ON l.event_id=e.id WHERE e.vault_id=$1 AND l.entity_id=$2 AND e.trashed_at IS NULL",[vaultId,entityId]),query("SELECT id,status,source_note_id FROM commitments WHERE vault_id=$1 AND archived_at IS NULL AND (person_entity_id=$2 OR object_entity_id=$2) ORDER BY id",[vaultId,entityId])]);const entity=entityResult.rows[0];if(!entity)return reply.code(404).send({error:"calendar_entity_not_found"});const sourceLinks=[...aliases.rows.filter(row=>row.evidence_note_id).map(row=>({kind:"alias_evidence" as const,sourceNoteId:row.evidence_note_id,recordId:row.id})),...commitments.rows.filter(row=>row.source_note_id).map(row=>({kind:"commitment_evidence" as const,sourceNoteId:row.source_note_id,recordId:row.id}))];return mapEntity({...entity,aliases:aliases.rows.map(row=>({id:row.id,alias:row.alias,scope:row.scope,evidenceNoteId:row.evidence_note_id,revision:row.revision})),source_links:sourceLinks,dependencies:{eventCount:Number(events.rows[0]?.count??0),activeCommitmentCount:commitments.rows.filter(row=>row.status==="active").length,otherCommitmentCount:commitments.rows.filter(row=>row.status!=="active").length}});});

app.delete("/api/v1/vaults/:vaultId/calendar-entities/:entityId",async(request,reply)=>{const {vaultId,entityId}=request.params as {vaultId:string;entityId:string};idSchema.parse(vaultId);idSchema.parse(entityId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const archived=await transaction(async client=>{const current=(await client.query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,entityId])).rows[0];if(!current)return"not_found" as const;if(current.archived_at)return"already_archived" as const;if(current.revision!==expectedRevision)return"stale_revision" as const;const commitments=await client.query("SELECT id FROM commitments WHERE vault_id=$1 AND archived_at IS NULL AND status='active' AND (person_entity_id=$2 OR object_entity_id=$2)",[vaultId,entityId]);if(commitments.rowCount)await client.query("UPDATE prep_items p SET invalidated_at=now(),invalidation_reason='commitment_changed',revision=revision+1,updated_at=now() FROM calendar_events e WHERE p.event_id=e.id AND e.vault_id=$1 AND p.commitment_id=ANY($2::uuid[]) AND p.invalidated_at IS NULL AND e.starts_at>now()",[vaultId,commitments.rows.map(row=>row.id)]);await client.query("UPDATE calendar_entities SET archived_at=now(),revision=revision+1,updated_at=now() WHERE id=$1",[entityId]);return"archived" as const;});if(archived==="not_found")return reply.code(404).send({error:"calendar_entity_not_found"});if(archived!=="archived")return reply.code(409).send({error:archived});return reply.code(204).send();});

app.patch("/api/v1/vaults/:vaultId/calendar-entities/:entityId", async (request, reply) => {
  const { vaultId, entityId } = request.params as { vaultId: string; entityId: string };
  idSchema.parse(vaultId); idSchema.parse(entityId);
  const expectedRevision = revisionFromIfMatch(request.headers["if-match"]);
  if (expectedRevision === null) return reply.code(428).send({ error: "if_match_required" });
  const input = updateCalendarEntitySchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const currentResult = await client.query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE", [vaultId, entityId]);
    const current = currentResult.rows[0];
    if (!current) return null;
    if (current.revision !== expectedRevision) return "stale_revision" as const;
    const ambiguous = await client.query(
      `SELECT e.id FROM calendar_entities e WHERE e.vault_id=$1 AND e.kind=$2 AND e.id<>$3 AND lower(e.name)=lower($4)
       UNION ALL SELECT a.entity_id FROM calendar_entity_aliases a JOIN calendar_entities e ON e.id=a.entity_id
       WHERE e.vault_id=$1 AND e.kind=$2 AND a.entity_id<>$3 AND a.archived_at IS NULL AND lower(a.alias)=lower($4) LIMIT 1`,
      [vaultId, current.kind, entityId, input.name]
    );
    if (ambiguous.rowCount) return "entity_name_ambiguous" as const;
    const result = await client.query("UPDATE calendar_entities SET name=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *", [vaultId, entityId, input.name]);
    return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "calendar_entity_not_found" });
  if (typeof updated === "string") return reply.code(409).send({ error: updated });
  return mapEntity(updated);
});

app.post("/api/v1/vaults/:vaultId/calendar-entities/:entityId/aliases", async (request, reply) => {
  const { vaultId, entityId } = request.params as { vaultId: string; entityId: string };
  idSchema.parse(vaultId); idSchema.parse(entityId);
  const input = addEntityAliasSchema.parse(request.body);
  const created = await transaction(async (client) => {
    const entityResult = await client.query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR SHARE", [vaultId, entityId]);
    const entity = entityResult.rows[0];
    if (!entity) return null;
    if (entity.name.localeCompare(input.alias, undefined, { sensitivity: "accent" }) === 0) return "alias_matches_canonical_name" as const;
    if (input.evidenceNoteId) {
      const evidence = await client.query("SELECT 1 FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL", [vaultId, input.evidenceNoteId]);
      if (!evidence.rowCount) return "alias_evidence_note_not_found" as const;
    }
    const ambiguous = await client.query(
      `SELECT e.id FROM calendar_entities e WHERE e.vault_id=$1 AND e.kind=$2 AND e.id<>$3 AND lower(e.name)=lower($4)
       UNION ALL SELECT a.entity_id FROM calendar_entity_aliases a JOIN calendar_entities e ON e.id=a.entity_id
       WHERE e.vault_id=$1 AND e.kind=$2 AND a.entity_id<>$3 AND a.archived_at IS NULL AND lower(a.alias)=lower($4) LIMIT 1`,
      [vaultId, entity.kind, entityId, input.alias]
    );
    if (ambiguous.rowCount) return "entity_alias_ambiguous" as const;
    try {
      const result = await client.query("INSERT INTO calendar_entity_aliases(entity_id,alias,scope,evidence_note_id) VALUES ($1,$2,$3,$4) RETURNING *", [entityId, input.alias, input.scope, input.evidenceNoteId ?? null]);
      return result.rows[0];
    } catch (error: any) { if (error?.code === "23505") return "entity_alias_exists" as const; throw error; }
  });
  if (!created) return reply.code(404).send({ error: "calendar_entity_not_found" });
  if (typeof created === "string") return reply.code(409).send({ error: created });
  return reply.code(201).send(mapEntityAlias(created));
});

app.delete("/api/v1/vaults/:vaultId/calendar-entities/:entityId/aliases/:aliasId", async (request, reply) => {
  const { vaultId, entityId, aliasId } = request.params as { vaultId: string; entityId: string; aliasId: string };
  idSchema.parse(vaultId); idSchema.parse(entityId); idSchema.parse(aliasId);
  const expectedRevision = revisionFromIfMatch(request.headers["if-match"]);
  if (expectedRevision === null) return reply.code(428).send({ error: "if_match_required" });
  const removed = await transaction(async (client) => {
    const result = await client.query(
      `UPDATE calendar_entity_aliases a SET archived_at=now(),revision=revision+1,updated_at=now()
       FROM calendar_entities e WHERE a.entity_id=e.id AND e.vault_id=$1 AND a.entity_id=$2 AND a.id=$3 AND a.revision=$4 AND a.archived_at IS NULL RETURNING a.id`,
      [vaultId, entityId, aliasId, expectedRevision]
    );
    if (!result.rowCount) return false;
    await client.query(
      `UPDATE prep_items p SET invalidated_at=now(),invalidation_reason='entity_alias_removed',revision=revision+1,updated_at=now()
       FROM calendar_events e WHERE p.event_id=e.id AND e.vault_id=$1 AND p.invalidated_at IS NULL AND p.provenance->>'matchedAliasId'=$2`,
      [vaultId, aliasId]
    );
    return true;
  });
  if (!removed) return reply.code(409).send({ error: "entity_alias_not_found_stale_or_removed" });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/calendar-policies",async request=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM calendar_policy_sets WHERE vault_id=$1",[vaultId]);return mapCalendarPolicySet(vaultId,result.rows[0]);});

app.put("/api/v1/vaults/:vaultId/calendar-policies",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=calendarPolicySetInputSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM calendar_policy_sets WHERE vault_id=$1 FOR UPDATE",[vaultId]);if(!current.rows[0]){if(expectedRevision!==0)return null;const created=await client.query("INSERT INTO calendar_policy_sets(vault_id,rules) VALUES ($1,$2::jsonb) RETURNING *",[vaultId,JSON.stringify(input.rules)]);return{row:created.rows[0],previousRules:[]};}if(current.rows[0].revision!==expectedRevision)return null;const result=await client.query("UPDATE calendar_policy_sets SET rules=$2::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *",[vaultId,JSON.stringify(input.rules)]);return{row:result.rows[0],previousRules:current.rows[0].rules};});if(!updated)return reply.code(409).send({error:"calendar_policy_revision_conflict"});return mapCalendarPolicySet(vaultId,updated.row,updated.previousRules);});

app.post("/api/v1/vaults/:vaultId/calendar-policies/dry-run",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=policyDryRunInputSchema.parse(request.body);const sources=await query("SELECT id,kind,original_text,created_at FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[]) ORDER BY id",[vaultId,input.sourceIds]);if(sources.rowCount!==input.sourceIds.length)return reply.code(400).send({error:"policy_dry_run_source_not_found"});const outcomes=sources.rows.map(source=>{const expectedKinds=input.policy.sourceKind==="owner_note"?["capture"]:["provider"];if(new Date(source.created_at)<new Date(input.boundedWindow.from)||new Date(source.created_at)>=new Date(input.boundedWindow.to))return{sourceId:source.id,outcome:"blocked" as const,reasonCodes:["outside_bounded_window"]};if(!input.policy.enabled)return{sourceId:source.id,outcome:"blocked" as const,reasonCodes:["policy_disabled"]};if(!expectedKinds.includes(source.kind))return{sourceId:source.id,outcome:"blocked" as const,reasonCodes:["source_kind_mismatch"]};if(input.policy.sourceKind==="owner_note"&&!source.original_text)return{sourceId:source.id,outcome:"blocked" as const,reasonCodes:["source_text_unavailable"]};const reasonCodes=["semantic_intent_requires_bounded_worker_evaluation"];if(input.policy.action==="queue_external_calendar_action")reasonCodes.push("external_action_requires_review");return{sourceId:source.id,outcome:"suggested" as const,reasonCodes};});const result=calendarPolicyDryRunResultSchema.parse({type:"calendar_policy_dry_run",policyRuleId:input.policy.id,evaluatedSources:sources.rowCount??0,outcomes,writesApplied:false});const serialized=JSON.stringify({type:"calendar_policy_dry_run",...input});const job=await query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'calendar_policy_dry_run','succeeded','evaluated_without_writes',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[job.rows[0].id,JSON.stringify({policyRuleId:input.policy.id}),JSON.stringify({evaluatedSources:sources.rowCount,writesApplied:false})]);return reply.code(202).send(mapJobHandle(job.rows[0]));});

app.get("/api/v1/vaults/:vaultId/calendar-decisions",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const raw=request.query as {source_id?:string;event_id?:string;outcome?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);if(raw.source_id)idSchema.parse(raw.source_id);if(raw.event_id)idSchema.parse(raw.event_id);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100||raw.outcome&&!['applied','suggested','blocked'].includes(raw.outcome))return reply.code(400).send({error:"invalid_calendar_decision_filter"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_calendar_decision_cursor"});}}const result=await query(`SELECT * FROM calendar_automation_decisions WHERE vault_id=$1 AND ($2::uuid IS NULL OR source_id=$2) AND ($3::uuid IS NULL OR event_id=$3) AND ($4::text IS NULL OR outcome=$4) AND ($5::timestamptz IS NULL OR (created_at,id)<($5::timestamptz,$6::uuid)) ORDER BY created_at DESC,id DESC LIMIT $7`,[vaultId,raw.source_id??null,raw.event_id??null,raw.outcome??null,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit;const rows=result.rows.slice(0,limit),last=rows.at(-1);return{items:rows.map(mapAutomationDecision),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});

app.post("/api/v1/vaults/:vaultId/calendar-decisions/:decisionId/undo",async(request,reply)=>{const {vaultId,decisionId}=request.params as {vaultId:string;decisionId:string};idSchema.parse(vaultId);idSchema.parse(decisionId);const input=undoCalendarDecisionSchema.parse(request.body);const undone=await transaction(async client=>{const locked=await client.query("SELECT * FROM calendar_automation_decisions WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,decisionId]);const decision=locked.rows[0];if(!decision)return null;if(decision.undone_at){if(decision.undo_operation_id===input.clientOperationId&&decision.undo_result)return decision.undo_result;return "calendar_decision_already_undone" as const;}if(decision.revision!==input.expectedRevision)return "calendar_decision_stale" as const;if(decision.outcome!=="applied"||!decision.reversible||!decision.undo_manifest)return "calendar_decision_not_reversible" as const;const manifest=decision.undo_manifest as {type?:string;recordId?:string;expectedRevision?:number};if(!manifest.recordId||!Number.isInteger(manifest.expectedRevision))return "calendar_decision_undo_manifest_invalid" as const;let compensation:"event_trashed"|"prep_invalidated"|"commitment_archived";if(manifest.type==="trash_event"){const event=await client.query("UPDATE calendar_events SET trashed_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND trashed_at IS NULL RETURNING *",[vaultId,manifest.recordId,manifest.expectedRevision]);if(!event.rows[0])return "calendar_decision_undo_conflict" as const;const row=event.rows[0];await client.query("INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,recurrence,actor_kind,changed_fields) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'owner',ARRAY['trashed','automation_decision_undo'])",[row.id,row.revision,row.title,row.starts_at,row.ends_at,row.timezone,row.recurrence?JSON.stringify(row.recurrence):null]);compensation="event_trashed";}else if(manifest.type==="invalidate_prep"){const prep=await client.query("UPDATE prep_items p SET invalidated_at=now(),invalidation_reason='automation_decision_undo',revision=revision+1,updated_at=now() FROM calendar_events e WHERE p.event_id=e.id AND e.vault_id=$1 AND p.id=$2 AND p.revision=$3 AND p.invalidated_at IS NULL RETURNING p.id",[vaultId,manifest.recordId,manifest.expectedRevision]);if(!prep.rows[0])return "calendar_decision_undo_conflict" as const;compensation="prep_invalidated";}else if(manifest.type==="archive_commitment"){const commitment=await client.query("UPDATE commitments SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING id",[vaultId,manifest.recordId,manifest.expectedRevision]);if(!commitment.rows[0])return "calendar_decision_undo_conflict" as const;await client.query("UPDATE prep_items p SET invalidated_at=now(),invalidation_reason='commitment_archived',revision=revision+1,updated_at=now() FROM calendar_events e WHERE p.event_id=e.id AND p.commitment_id=$1 AND p.invalidated_at IS NULL AND e.starts_at>now()",[manifest.recordId]);compensation="commitment_archived";}else return "calendar_decision_undo_manifest_invalid" as const;const undoneAt=new Date().toISOString();const result=calendarDecisionUndoResultSchema.parse({decisionId,compensation,affectedRecordId:manifest.recordId,writesApplied:true,undoneAt});await client.query("UPDATE calendar_automation_decisions SET undone_at=$3,undo_operation_id=$4,undo_result=$5::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2",[vaultId,decisionId,undoneAt,input.clientOperationId,JSON.stringify(result)]);return result;});if(!undone)return reply.code(404).send({error:"calendar_decision_not_found"});if(typeof undone==="string")return reply.code(409).send({error:undone});return calendarDecisionUndoResultSchema.parse(undone);});

app.get("/api/v1/vaults/:vaultId/commitment-candidates",async request=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);
  const result=await query(`SELECT c.* FROM note_commitment_candidates c JOIN notes n ON n.id=c.note_id AND n.vault_id=c.vault_id
    WHERE c.vault_id=$1 AND c.state='proposed' AND n.revision=c.note_revision AND n.trashed_at IS NULL
    ORDER BY c.created_at DESC,c.id LIMIT 100`,[vaultId]);
  return{items:result.rows.map(mapNoteCommitmentCandidate)};
});

app.post("/api/v1/vaults/:vaultId/commitment-candidates/:candidateId/decision",async(request,reply)=>{
  const {vaultId,candidateId}=request.params as {vaultId:string;candidateId:string};idSchema.parse(vaultId);idSchema.parse(candidateId);
  const input=decideCommitmentCandidateSchema.parse(request.body);
  const outcome=await transaction(async client=>{
    const initial=(await client.query("SELECT note_id FROM note_commitment_candidates WHERE vault_id=$1 AND id=$2",[vaultId,candidateId])).rows[0];
    if(!initial)return"candidate_not_found" as const;
    const note=(await client.query("SELECT revision,body FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL FOR SHARE",[vaultId,initial.note_id])).rows[0];
    if(!note||note.revision!==input.expectedNoteRevision)return"stale_source_note" as const;
    const candidate=(await client.query("SELECT * FROM note_commitment_candidates WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,candidateId])).rows[0];
    if(!candidate||candidate.note_revision!==note.revision||!note.body.includes(candidate.evidence_quote))return"stale_candidate" as const;
    if(candidate.state!=='proposed')return candidate.state===(input.decision==='accept'?'accepted':'dismissed')?candidate:"candidate_already_decided" as const;
    if(input.decision==='dismiss')return(await client.query("UPDATE note_commitment_candidates SET state='dismissed',updated_at=now() WHERE id=$1 RETURNING *",[candidateId])).rows[0];
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`${vaultId}:${candidate.person_name.toLocaleLowerCase('nb-NO')}`]);
    const people=await client.query(`SELECT DISTINCT e.id FROM calendar_entities e LEFT JOIN calendar_entity_aliases a ON a.entity_id=e.id AND a.archived_at IS NULL
      WHERE e.vault_id=$1 AND e.kind='person' AND e.archived_at IS NULL AND (lower(e.name)=lower($2) OR lower(a.alias)=lower($2))`,[vaultId,candidate.person_name]);
    if((people.rowCount??0)>1)return"ambiguous_person" as const;
    const personId=people.rows[0]?.id??(await client.query("INSERT INTO calendar_entities(vault_id,kind,name) VALUES ($1,'person',$2) RETURNING id",[vaultId,candidate.person_name])).rows[0].id;
    const text=`Return ${candidate.object_label} to ${candidate.person_name} at the next in-person meeting`;
    const commitment=(await client.query(`INSERT INTO commitments(vault_id,text,person_entity_id,object_label,source_note_id,source_note_revision,source_quote,condition_kind)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'next_meeting_with_person') RETURNING *`,[vaultId,text,personId,candidate.object_label,candidate.note_id,candidate.note_revision,candidate.evidence_quote])).rows[0];
    await client.query("INSERT INTO commitment_status_history(commitment_id,from_status,to_status,actor,evidence_kind,evidence_note_id) VALUES ($1,NULL,'active','owner','creation',$2)",[commitment.id,candidate.note_id]);
    return(await client.query("UPDATE note_commitment_candidates SET state='accepted',commitment_id=$2,updated_at=now() WHERE id=$1 RETURNING *",[candidateId,commitment.id])).rows[0];
  });
  if(typeof outcome==='string')return reply.code(outcome==='candidate_not_found'?404:409).send({error:outcome});
  return mapNoteCommitmentCandidate(outcome);
});

app.get("/api/v1/vaults/:vaultId/commitments", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  const { status, person_id: personId } = request.query as { status?: string; person_id?: string };
  idSchema.parse(vaultId);
  const values: unknown[] = [vaultId];
  const clauses = ["vault_id = $1", "archived_at IS NULL"];
  if (status) { commitmentStatusSchema.parse(status); values.push(status); clauses.push(`status = $${values.length}`); }
  if (personId) { idSchema.parse(personId); values.push(personId); clauses.push(`person_entity_id = $${values.length}`); }
  const result = await query(`SELECT * FROM commitments WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT 250`, values);
  return { items: result.rows.map(mapCommitment) };
});

app.post("/api/v1/vaults/:vaultId/commitments", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createCommitmentSchema.parse(request.body);
  const created = await transaction(async (client) => {
    const person = await client.query("SELECT 1 FROM calendar_entities WHERE vault_id=$1 AND id=$2 AND kind='person'", [vaultId, input.personEntityId]);
    if (!person.rowCount) return "person_entity_not_found" as const;
    if (input.objectEntityId) {
      const object = await client.query("SELECT 1 FROM calendar_entities WHERE vault_id=$1 AND id=$2 AND kind='object'", [vaultId, input.objectEntityId]);
      if (!object.rowCount) return "object_entity_not_found" as const;
    }
    if (input.sourceNoteId) {
      const source = await client.query("SELECT 1 FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL", [vaultId, input.sourceNoteId]);
      if (!source.rowCount) return "source_note_not_found" as const;
    }
    const result = await client.query(
      `INSERT INTO commitments(vault_id,text,person_entity_id,object_entity_id,object_label,source_note_id,condition_kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [vaultId, input.text, input.personEntityId, input.objectEntityId ?? null, input.objectLabel, input.sourceNoteId ?? null, input.conditionKind]
    );
    await client.query("INSERT INTO commitment_status_history(commitment_id,from_status,to_status,actor,evidence_kind) VALUES ($1,NULL,'active','owner','creation')", [result.rows[0].id]);
    return result.rows[0];
  });
  if (typeof created === "string") return reply.code(400).send({ error: created });
  return reply.code(201).send(mapCommitment(created));
});

app.get("/api/v1/vaults/:vaultId/commitments/:commitmentId", async (request, reply) => {
  const { vaultId, commitmentId } = request.params as { vaultId: string; commitmentId: string };
  idSchema.parse(vaultId); idSchema.parse(commitmentId);
  const commitmentResult = await query("SELECT * FROM commitments WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL", [vaultId, commitmentId]);
  const commitment = commitmentResult.rows[0];
  if (!commitment) return reply.code(404).send({ error: "commitment_not_found" });
  const [entities, source, prep, history] = await Promise.all([
    query("SELECT * FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, [commitment.person_entity_id, commitment.object_entity_id].filter(Boolean)]),
    commitment.source_note_id ? query("SELECT id,title,revision FROM notes WHERE vault_id=$1 AND id=$2", [vaultId, commitment.source_note_id]) : Promise.resolve({ rows: [] as Record<string, any>[] }),
    query("SELECT * FROM prep_items WHERE commitment_id=$1 AND invalidated_at IS NULL ORDER BY created_at,id LIMIT 250", [commitmentId]),
    query("SELECT * FROM commitment_status_history WHERE commitment_id=$1 ORDER BY created_at,id LIMIT 250", [commitmentId])
  ]);
  const byEntity = new Map(entities.rows.map((row) => [row.id, row]));
  const eventIds = prep.rows.map((row) => row.event_id);
  const events = eventIds.length ? await query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, eventIds]) : { rows: [] as Record<string, any>[] };
  const byEvent = new Map(events.rows.map((row) => [row.id, row]));
  return commitmentDetailSchema.parse({ commitment: mapCommitment(commitment), person: mapEntity(byEntity.get(commitment.person_entity_id)!), object: commitment.object_entity_id ? mapEntity(byEntity.get(commitment.object_entity_id)!) : null,
    sourceEvidence: source.rows[0] ? { noteId: source.rows[0].id, title: source.rows[0].title, revision: source.rows[0].revision } : null,
    bindings: prep.rows.filter((row) => byEvent.has(row.event_id)).map((row) => ({ prepItem: mapPrepItem(row), event: mapEvent(byEvent.get(row.event_id)!) })),
    statusHistory: history.rows.map((row) => ({ id: row.id, fromStatus: row.from_status, toStatus: row.to_status, actor: row.actor, evidenceKind: row.evidence_kind, evidenceNoteId: row.evidence_note_id, reason: row.reason, createdAt: iso(row.created_at) })) });
});

app.patch("/api/v1/vaults/:vaultId/commitments/:commitmentId", async (request, reply) => {
  const { vaultId, commitmentId } = request.params as { vaultId: string; commitmentId: string };
  idSchema.parse(vaultId); idSchema.parse(commitmentId);
  const expectedRevision = revisionFromIfMatch(request.headers["if-match"]);
  if (expectedRevision === null) return reply.code(428).send({ error: "if_match_required" });
  const input = updateCommitmentSchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const currentResult = await client.query("SELECT * FROM commitments WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE", [vaultId, commitmentId]);
    const current = currentResult.rows[0];
    if (!current) return null;
    if (current.revision !== expectedRevision) return "stale_revision" as const;
    const personId = input.personEntityId ?? current.person_entity_id;
    const objectId = input.objectEntityId === undefined ? current.object_entity_id : input.objectEntityId;
    const entities = await client.query("SELECT id,kind FROM calendar_entities WHERE vault_id=$1 AND id=ANY($2::uuid[])", [vaultId, [personId, objectId].filter(Boolean)]);
    const byId = new Map(entities.rows.map((row) => [row.id, row.kind]));
    if (byId.get(personId) !== "person") return "person_entity_not_found" as const;
    if (objectId && byId.get(objectId) !== "object") return "object_entity_not_found" as const;
    if (input.evidenceNoteId) { const evidence = await client.query("SELECT 1 FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL", [vaultId, input.evidenceNoteId]); if (!evidence.rowCount) return "commitment_evidence_note_not_found" as const; }
    if (input.status) { const transitionError = commitmentTransitionError(current.status, input.status, input.evidenceKind!); if (transitionError) return transitionError; }
    const nextStatus = input.status ?? current.status;
    const result = await client.query(
      `UPDATE commitments SET text=$3,person_entity_id=$4,object_entity_id=$5,object_label=$6,status=$7,revision=revision+1,updated_at=now()
       WHERE vault_id=$1 AND id=$2 RETURNING *`,
      [vaultId, commitmentId, input.text ?? current.text, personId, objectId, input.objectLabel ?? current.object_label, nextStatus]
    );
    if (input.status) await client.query("INSERT INTO commitment_status_history(commitment_id,from_status,to_status,actor,evidence_kind,evidence_note_id,reason) VALUES ($1,$2,$3,'owner',$4,$5,$6)", [commitmentId, current.status, input.status, input.evidenceKind, input.evidenceNoteId ?? null, input.reason ?? null]);
    const bindingInputsChanged = personId !== current.person_entity_id || objectId !== current.object_entity_id || (input.objectLabel !== undefined && input.objectLabel !== current.object_label);
    if (bindingInputsChanged || input.status && input.status !== "active") await client.query(
      `UPDATE prep_items p SET invalidated_at=now(),invalidation_reason=$2,revision=revision+1,updated_at=now() FROM calendar_events e
       WHERE p.event_id=e.id AND p.commitment_id=$1 AND p.invalidated_at IS NULL AND e.starts_at>now()`,
      [commitmentId, input.status && input.status !== "active" ? "commitment_terminal" : "commitment_changed"]
    );
    return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "commitment_not_found" });
  if (typeof updated === "string") return reply.code(409).send({ error: updated });
  return mapCommitment(updated);
});

app.delete("/api/v1/vaults/:vaultId/commitments/:commitmentId", async (request, reply) => {
  const { vaultId, commitmentId } = request.params as { vaultId: string; commitmentId: string };
  idSchema.parse(vaultId); idSchema.parse(commitmentId);
  const expectedRevision = revisionFromIfMatch(request.headers["if-match"]);
  if (expectedRevision === null) return reply.code(428).send({ error: "if_match_required" });
  const archived = await transaction(async (client) => {
    const result = await client.query("UPDATE commitments SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *", [vaultId, commitmentId, expectedRevision]);
    if (!result.rows[0]) return null;
    await client.query("UPDATE prep_items p SET invalidated_at=now(),invalidation_reason='commitment_archived',revision=revision+1,updated_at=now() FROM calendar_events e WHERE p.event_id=e.id AND p.commitment_id=$1 AND p.invalidated_at IS NULL AND e.starts_at>now()", [commitmentId]);
    await client.query("INSERT INTO commitment_status_history(commitment_id,from_status,to_status,actor,evidence_kind,reason) VALUES ($1,$2,$2,'owner','archive','Archived by owner')", [commitmentId, result.rows[0].status]);
    return result.rows[0];
  });
  if (!archived) return reply.code(409).send({ error: "commitment_not_found_stale_or_archived" });
  return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/commitments/:commitmentId/match", async (request, reply) => {
  const { vaultId, commitmentId } = request.params as { vaultId: string; commitmentId: string };
  idSchema.parse(vaultId); idSchema.parse(commitmentId);
  const input = rematchCommitmentSchema.parse(request.body);
  const existing = await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='commitment_rematch' AND input->>'clientOperationId'=$2", [vaultId, input.clientOperationId]);
  if (existing.rows[0]) return reply.code(202).send(mapJobHandle(existing.rows[0]));
  const job = await transaction(async (client) => {
    const commitmentResult = await client.query("SELECT * FROM commitments WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR SHARE", [vaultId, commitmentId]);
    const commitment = commitmentResult.rows[0];
    if (!commitment) return null;
    if (commitment.revision !== input.expectedRevision) return "stale_revision" as const;
    if (commitment.status !== "active") return "commitment_not_active" as const;
    const events = await client.query(
      `SELECT DISTINCT e.* FROM calendar_events e JOIN event_entity_links l ON l.event_id=e.id
       WHERE e.vault_id=$1 AND e.trashed_at IS NULL AND e.ends_at>now() AND e.starts_at<now()+interval '366 days' AND l.entity_id=$2 ORDER BY e.starts_at LIMIT 250`,
      [vaultId, commitment.person_entity_id]
    );
    let createdBindings = 0;
    for (const event of events.rows) {
      const fingerprint = createHash("sha256").update(`commitment:${commitmentId}`).digest("hex");
      const suppressed = await client.query("SELECT 1 FROM prep_item_suppressions WHERE event_id=$1 AND fingerprint=$2", [event.id, fingerprint]);
      if (suppressed.rowCount) continue;
      const inserted = await client.query(
        `INSERT INTO prep_items(event_id,commitment_id,type,text,evidence_note_id,provenance) VALUES ($1,$2,'bring',$3,$4,$5::jsonb)
         ON CONFLICT DO NOTHING RETURNING id`,
        [event.id, commitmentId, commitmentPrepText({ id: commitment.id, status: commitment.status, personEntityId: commitment.person_entity_id, objectLabel: commitment.object_label, conditionKind: commitment.condition_kind }), commitment.source_note_id, JSON.stringify({ origin: "commitment_rule", sourceId: commitment.source_note_id })]
      );
      createdBindings += inserted.rowCount ?? 0;
    }
    const payload = { type: "commitment_rematch", commitmentId, commitmentRevision: commitment.revision, clientOperationId: input.clientOperationId };
    const result = await client.query(
      "INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'commitment_rematch','succeeded','matched',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",
      [vaultId, JSON.stringify(payload), createHash("sha256").update(JSON.stringify(payload)).digest("hex"), JSON.stringify({ type: "commitment_rematch", matchedEvents: events.rowCount, createdBindings, writesApplied: createdBindings > 0 })]
    );
    await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)", [result.rows[0].id, JSON.stringify({ commitmentId }), JSON.stringify({ matchedEvents: events.rowCount, createdBindings })]);
    return result.rows[0];
  });
  if (!job) return reply.code(404).send({ error: "commitment_not_found" });
  if (typeof job === "string") return reply.code(409).send({ error: job });
  return reply.code(202).send(mapJobHandle(job));
});

app.get("/api/v1/vaults/:vaultId/calendars",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const raw=request.query as {cursor?:string;limit?:string};const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_calendar_limit"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_calendar_cursor"});}}const result=await query("SELECT * FROM calendars WHERE vault_id=$1 AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4",[vaultId,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit;const rows=result.rows.slice(0,limit),last=rows.at(-1);return{items:rows.map(mapCalendar),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});

app.post("/api/v1/vaults/:vaultId/calendars",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=createCalendarSchema.parse(request.body);if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});const result=await query("INSERT INTO calendars(vault_id,name,timezone,origin,ownership,can_read,can_write,selected_visible,display_preferences,freshness_state) SELECT $1,$2,$3,'sorta','owner',true,true,true,$4::jsonb,'current' WHERE EXISTS (SELECT 1 FROM vaults WHERE id=$1) RETURNING *",[vaultId,input.name,input.timezone,JSON.stringify(input.displayPreferences)]);if(!result.rows[0])return reply.code(404).send({error:"vault_not_found"});return reply.code(201).send(mapCalendar(result.rows[0]));});

app.get("/api/v1/vaults/:vaultId/calendars/:calendarId",async(request,reply)=>{const {vaultId,calendarId}=request.params as {vaultId:string;calendarId:string};idSchema.parse(vaultId);idSchema.parse(calendarId);const result=await query("SELECT * FROM calendars WHERE vault_id=$1 AND id=$2",[vaultId,calendarId]);if(!result.rows[0])return reply.code(404).send({error:"calendar_not_found"});return mapCalendar(result.rows[0]);});

app.patch("/api/v1/vaults/:vaultId/calendars/:calendarId",async(request,reply)=>{const {vaultId,calendarId}=request.params as {vaultId:string;calendarId:string};idSchema.parse(vaultId);idSchema.parse(calendarId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=updateCalendarSchema.parse(request.body);if(input.timezone&&!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});const updated=await transaction(async client=>{const locked=await client.query("SELECT * FROM calendars WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,calendarId]);const current=locked.rows[0];if(!current)return null;if(current.revision!==expectedRevision)return "stale_calendar_revision" as const;if(current.origin!=="sorta"&&(input.name!==undefined||input.timezone!==undefined))return "provider_calendar_metadata_read_only" as const;if(input.archived===true)return "use_archive_calendar" as const;if(input.archived===false&&current.archived_at===null)return "calendar_not_archived" as const;const archivedAt=input.archived===false?null:current.archived_at;const result=await client.query("UPDATE calendars SET name=$3,timezone=$4,selected_visible=$5,display_preferences=$6::jsonb,archived_at=$7,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,calendarId,input.name??current.name,input.timezone??current.timezone,input.selectedVisible??current.selected_visible,JSON.stringify(input.displayPreferences??current.display_preferences),archivedAt]);if(input.archived===false)await client.query("DELETE FROM calendar_archive_tombstones WHERE calendar_id=$1",[calendarId]);return result.rows[0];});if(!updated)return reply.code(404).send({error:"calendar_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapCalendar(updated);});

app.delete("/api/v1/vaults/:vaultId/calendars/:calendarId",async(request,reply)=>{const {vaultId,calendarId}=request.params as {vaultId:string;calendarId:string};idSchema.parse(vaultId);idSchema.parse(calendarId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const archived=await transaction(async client=>{const result=await client.query("UPDATE calendars SET archived_at=now(),selected_visible=false,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL RETURNING *",[vaultId,calendarId,expectedRevision]);if(!result.rows[0])return null;const row=result.rows[0];await client.query("INSERT INTO calendar_archive_tombstones(calendar_id,vault_id,archived_revision,archived_at,undoable,external_delete_requested) VALUES ($1,$2,$3,$4,true,false) ON CONFLICT(calendar_id) DO UPDATE SET archived_revision=excluded.archived_revision,archived_at=excluded.archived_at,undoable=true,external_delete_requested=false",[calendarId,vaultId,row.revision,row.archived_at]);return row;});if(!archived)return reply.code(409).send({error:"calendar_not_found_stale_or_archived"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/calendar-events", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const result = await query("SELECT e.* FROM calendar_events e JOIN calendars c ON c.id=e.calendar_id WHERE e.vault_id = $1 AND e.trashed_at IS NULL AND c.archived_at IS NULL ORDER BY e.starts_at LIMIT 250", [vaultId]);
  return { items: result.rows.map(mapEvent) };
});

app.get("/api/v1/vaults/:vaultId/calendar-view",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);
  const raw=request.query as {from?:string;to?:string;timezone?:string;view?:string;calendar_ids?:string};
  const input=calendarViewQuerySchema.parse({from:raw.from,to:raw.to,timezone:raw.timezone,view:raw.view,calendarIds:raw.calendar_ids?raw.calendar_ids.split(",").filter(Boolean):[]});
  try{validateCalendarViewRange(input);}catch(error){return reply.code(400).send({error:error instanceof Error?error.message:"invalid_calendar_view_range"});}
  const calendarRows=await query("SELECT * FROM calendars WHERE vault_id=$1 AND archived_at IS NULL AND can_read=true AND ($2::boolean=false OR selected_visible=true) AND ($3::uuid[] IS NULL OR id=ANY($3::uuid[])) ORDER BY created_at,id",[vaultId,input.calendarIds.length===0,input.calendarIds.length?input.calendarIds:null]);
  if(input.calendarIds.length&&calendarRows.rowCount!==new Set(input.calendarIds).size)return reply.code(404).send({error:"calendar_selection_not_found_or_unreadable"});
  const selectedCalendarIds=calendarRows.rows.map(row=>row.id as string);
  const selectedConnectionIds=calendarRows.rows.flatMap(row=>row.connection_id?[row.connection_id as string]:[]);
  const [occurrences,eventRows,lessonLinks,studyLinks,lessonRows,assignmentRows,assessmentRows,attendanceRows,connections]=await Promise.all([
    loadCalendarOccurrences(vaultId,input.from,input.to,selectedCalendarIds),
    query("SELECT e.id,e.calendar_id,e.revision,e.timezone,c.origin,c.connection_id,c.freshness_state FROM calendar_events e JOIN calendars c ON c.id=e.calendar_id WHERE e.vault_id=$1 AND e.trashed_at IS NULL AND e.calendar_id=ANY($4::uuid[]) AND (e.recurrence IS NOT NULL OR e.ends_at>=$2) AND e.starts_at<=$3",[vaultId,input.from,input.to,selectedCalendarIds]),
    query("SELECT calendar_event_id FROM school_lessons WHERE vault_id=$1 AND archived_at IS NULL AND calendar_event_id IS NOT NULL",[vaultId]),
    query("SELECT calendar_event_id FROM study_sessions WHERE vault_id=$1 AND archived_at IS NULL AND calendar_event_id IS NOT NULL UNION SELECT event_id AS calendar_event_id FROM scheduled_task_event_links l JOIN schedule_proposals p ON p.id=l.proposal_id WHERE p.vault_id=$1",[vaultId]),
    query("SELECT l.id,l.time_spec,l.revision,c.name AS course_name FROM school_lessons l JOIN school_courses c ON c.id=l.course_id WHERE l.vault_id=$1 AND l.archived_at IS NULL AND l.calendar_event_id IS NULL",[vaultId]),
    query(`SELECT a.id,a.title,a.due,a.revision,s.source_record,s.source_timestamp FROM school_assignments a
      LEFT JOIN LATERAL (SELECT source_record,source_timestamp FROM school_snapshot_links WHERE vault_id=a.vault_id AND assignment_id=a.id AND record_kind='assignment' AND source_origin='https://assignments.edu.cloud.microsoft' ORDER BY source_timestamp DESC LIMIT 1) s ON true
      WHERE a.vault_id=$1 AND a.archived_at IS NULL`,[vaultId]),
    query("SELECT id,title,time_spec,revision FROM school_assessments WHERE vault_id=$1 AND archived_at IS NULL",[vaultId]),
    query("SELECT a.id,a.lesson_id,a.record_date,a.time_spec,a.raw_status,a.normalized_status,a.excusal_status,a.revision,l.time_spec AS lesson_time_spec,l.calendar_event_id,c.name AS course_name FROM attendance_records a JOIN school_courses c ON c.id=a.course_id LEFT JOIN school_lessons l ON l.id=a.lesson_id WHERE a.vault_id=$1 AND a.archived_at IS NULL AND a.normalized_status IN ('absent','late') AND a.record_date>=$2::timestamptz::date-1 AND a.record_date<=$3::timestamptz::date+1",[vaultId,input.from,input.to]),
    query("SELECT id,provider,label,state,last_success_at FROM integration_connections WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND provider IN ('microsoft','google_calendar') AND disconnected_at IS NULL ORDER BY label,id",[vaultId,selectedConnectionIds])
  ]);
  const eventById=new Map(eventRows.rows.map(row=>[row.id,row]));const schoolEventIds=new Set(lessonLinks.rows.map(row=>row.calendar_event_id));const studyEventIds=new Set(studyLinks.rows.map(row=>row.calendar_event_id));
  const localDate=(instant:string)=>{const parts=new Intl.DateTimeFormat("en-GB",{timeZone:input.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(instant));const part=(name:string)=>parts.find(value=>value.type===name)?.value??"";return`${part("year")}-${part("month")}-${part("day")}`;};
  const attendanceLinks:ClassAttendanceLink[]=attendanceRows.rows.map(row=>{const date=typeof row.record_date==="string"?row.record_date.slice(0,10):iso(row.record_date).slice(0,10);const type=row.raw_status?.trim()||row.normalized_status;return{id:row.id,lessonId:row.lesson_id??null,calendarEventId:row.calendar_event_id??null,date,status:row.normalized_status,label:`${type}${row.excusal_status&&row.excusal_status!=="unknown"?` (${row.excusal_status})`:""}`};});
  const mergedAttendanceIds=new Set<string>();
  const lessonCountByEvent=new Map<string,number>();for(const row of lessonLinks.rows)lessonCountByEvent.set(row.calendar_event_id,(lessonCountByEvent.get(row.calendar_event_id)??0)+1);
  const occurrenceCountByEventAndDate=new Map<string,number>();for(const occurrence of occurrences){const key=`${occurrence.eventId}:${localDate(occurrence.startsAt)}`;occurrenceCountByEventAndDate.set(key,(occurrenceCountByEventAndDate.get(key)??0)+1);}
  const projectedOccurrences=occurrences.map(occurrence=>{const event=eventById.get(occurrence.eventId);const school=schoolEventIds.has(occurrence.eventId);const key=`${occurrence.eventId}:${localDate(occurrence.startsAt)}`;const uniquelyLinked=lessonCountByEvent.get(occurrence.eventId)===1&&occurrenceCountByEventAndDate.get(key)===1;const attendance=school&&uniquelyLinked?attendanceForClass(attendanceLinks,{calendarEventId:occurrence.eventId,startsAt:occurrence.startsAt,timezone:input.timezone}):null;if(attendance)mergedAttendanceIds.add(attendance.id);return {...occurrence,calendarId:event!.calendar_id,eventRevision:event?.revision??1,timezone:event?.timezone??input.timezone,layer:school?"school":studyEventIds.has(occurrence.eventId)?"study":"personal",attendanceStatus:attendance?.status??null,attendanceLabel:attendance?.label??null,source:{kind:event?.origin==="sorta"?"local":"provider",connectionId:event?.connection_id??null,stale:event?.freshness_state==="stale"}};});
  const overlayItems:Array<Record<string,unknown>>=[];const unknownTimeMarkers:Array<Record<string,unknown>>=[];
  const firstVisibleDate=localDate(input.from),lastVisibleDate=localDate(new Date(Date.parse(input.to)-1).toISOString());
  const dateIsVisible=(date:string)=>date>=firstVisibleDate&&date<=lastVisibleDate;
  const projectSchoolRecord=(row:Record<string,any>,kind:"lesson"|"assignment"|"assessment",title:string,spec:Record<string,any>,layer:"school"|"deadline"|"assessment")=>{if(spec.kind==="exact"){const startsAt=spec.startsAt??spec.dueAt;const endsAt=spec.endsAt??null;if(startsAt&&Date.parse(startsAt)>=Date.parse(input.from)&&Date.parse(startsAt)<Date.parse(input.to)){const attendance=kind==="lesson"?attendanceForClass(attendanceLinks,{lessonId:row.id,startsAt,timezone:input.timezone}):null;if(attendance)mergedAttendanceIds.add(attendance.id);overlayItems.push({id:row.id,kind,title,startsAt,endsAt,layer,attendanceStatus:attendance?.status??null,attendanceLabel:attendance?.label??null,reason:"source_record_not_calendar_event",revision:row.revision});}return;}if(spec.kind==="date_only"&&!dateIsVisible(spec.date))return;unknownTimeMarkers.push({id:row.id,kind,title,date:spec.kind==="date_only"?spec.date:null,reason:spec.kind==="date_only"?"date_only":"time_unknown",revision:row.revision});};
  for(const row of lessonRows.rows)projectSchoolRecord(row,"lesson",`${row.course_name} lesson`,row.time_spec,"school");
  for(const row of assignmentRows.rows){
    const itemCount=overlayItems.length,markerCount=unknownTimeMarkers.length;
    projectSchoolRecord(row,"assignment",row.title,row.due,"deadline");
    const submission=assignmentSubmission(row.source_record,row.source_timestamp?iso(row.source_timestamp):null,row.due);
    if(overlayItems.length>itemCount)overlayItems.at(-1)!.submission=submission;
    if(unknownTimeMarkers.length>markerCount)unknownTimeMarkers.at(-1)!.submission=submission;
  }
  for(const row of assessmentRows.rows)projectSchoolRecord(row,"assessment",row.title,row.time_spec,"assessment");
  for(const row of attendanceRows.rows){
    if(mergedAttendanceIds.has(row.id))continue;
    const date=typeof row.record_date==="string"?row.record_date.slice(0,10):iso(row.record_date).slice(0,10);
    if(!dateIsVisible(date))continue;
    const type=row.raw_status?.trim()||row.normalized_status;
    const title=`${row.course_name}: ${type}${row.excusal_status&&row.excusal_status!=="unknown"?` (${row.excusal_status})`:""}`;
    const matchingOccurrences=occurrences.filter(occurrence=>occurrence.eventId===row.calendar_event_id&&localDate(occurrence.startsAt)===date);
    const linked=matchingOccurrences.length===1?matchingOccurrences[0]:null;
    const spec=row.time_spec?.kind==="exact"?row.time_spec:row.lesson_time_spec?.kind==="exact"?row.lesson_time_spec:null;
    const startsAt=linked?.startsAt??spec?.startsAt??null,endsAt=linked?.endsAt??spec?.endsAt??null;
    if(startsAt&&localDate(startsAt)===date)overlayItems.push({id:row.id,kind:"attendance",title,startsAt,endsAt,layer:"attendance",attendanceStatus:row.normalized_status,attendanceLabel:attendanceLinks.find(item=>item.id===row.id)?.label??null,reason:"source_record_not_calendar_event",revision:row.revision});
    else unknownTimeMarkers.push({id:row.id,kind:"attendance",title,date,attendanceStatus:row.normalized_status,reason:"date_only",revision:row.revision});
  }
  const staleSources=connections.rows.flatMap(row=>{const lastSuccessAt=row.last_success_at?iso(row.last_success_at):null;const reason=calendarSourceStaleness({state:row.state,lastSuccessAt});return reason?[{connectionId:row.id,provider:row.provider,label:row.label,state:row.state,lastSuccessAt,reason}]:[];});
  return calendarViewSchema.parse({view:input.view,range:{from:input.from,to:input.to,timezone:input.timezone},selectedCalendarIds,occurrences:projectedOccurrences,overlayItems,unknownTimeMarkers,staleSources});
});

app.get("/api/v1/vaults/:vaultId/calendar/brief",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=calendarBriefQuerySchema.safeParse(request.query);if(!input.success||!isSupportedTimezone(input.data.timezone))return reply.code(400).send({error:"invalid_calendar_brief_query"});const cached=await query("SELECT * FROM calendar_briefs WHERE vault_id=$1 AND brief_date=$2::date AND timezone=$3",[vaultId,input.data.date,input.data.timezone]);return computeCalendarBrief(vaultId,input.data.date,input.data.timezone,cached.rows[0]);});

app.post("/api/v1/vaults/:vaultId/calendar/brief-refresh",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=calendarBriefQuerySchema.parse(request.body);if(!isSupportedTimezone(input.timezone))return reply.code(400).send({error:"unsupported_timezone"});const rawKey=request.headers["idempotency-key"],idempotencyKey=Array.isArray(rawKey)?rawKey[0]:rawKey;if(!idempotencyKey||idempotencyKey.length<8||idempotencyKey.length>128)return reply.code(400).send({error:"idempotency_key_required"});const payload={type:"calendar_brief_refresh",...input,idempotencyKey},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='calendar_brief_refresh' AND input->>'idempotencyKey'=$2",[vaultId,idempotencyKey]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"idempotency_key_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}const current=await query("SELECT * FROM calendar_briefs WHERE vault_id=$1 AND brief_date=$2::date AND timezone=$3",[vaultId,input.date,input.timezone]);const brief=await computeCalendarBrief(vaultId,input.date,input.timezone,current.rows[0]);const created=await transaction(async client=>{const saved=await client.query("INSERT INTO calendar_briefs(vault_id,brief_date,timezone,items,source_manifest,deterministic_summary) VALUES ($1,$2::date,$3,$4::jsonb,$5::jsonb,$6) ON CONFLICT(vault_id,brief_date,timezone) DO UPDATE SET items=excluded.items,source_manifest=excluded.source_manifest,deterministic_summary=excluded.deterministic_summary,revision=calendar_briefs.revision+1,generated_at=now(),updated_at=now() RETURNING *",[vaultId,input.date,input.timezone,JSON.stringify(brief.items),JSON.stringify(brief.sourceManifest),brief.deterministicSummary]);const result={type:"calendar_brief_refresh" as const,date:input.date,timezone:input.timezone,briefRevision:saved.rows[0].revision,sourceCount:brief.sourceManifest.length,writesApplied:true as const};const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'calendar_brief_refresh','succeeded','brief_cached',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[job.rows[0].id,JSON.stringify({date:input.date,timezone:input.timezone}),JSON.stringify(result)]);return job.rows[0];});return reply.code(202).send(mapJobHandle(created));});

app.post("/api/v1/vaults/:vaultId/calendar-events", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createCalendarEventSchema.parse(request.body);
  if (!isSupportedTimezone(input.timezone) || input.recurrence && (!isSupportedTimezone(input.recurrence.timezone) || input.recurrence.timezone !== input.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const created = await transaction(async (client) => {
    const calendarId=await writableCalendarId(client,vaultId,input.calendarId,input.timezone);if(!calendarId)return "calendar_not_writable" as const;
    if (input.entityIds.length) {
      const entities = await client.query("SELECT id FROM calendar_entities WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, input.entityIds]);
      if (entities.rowCount !== new Set(input.entityIds).size) return "invalid_entities" as const;
    }
    const result = await client.query(
      "INSERT INTO calendar_events(vault_id, calendar_id, title, starts_at, ends_at, private_context, timezone, recurrence) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *",
      [vaultId,calendarId, input.title, input.startsAt, input.endsAt, input.privateContext ?? null, input.timezone, input.recurrence ? JSON.stringify(input.recurrence) : null]
    );
    const event = result.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1, 1, $2, $3, $4, $5, $6::jsonb, ARRAY['created'])`, [event.id, event.title, event.starts_at, event.ends_at, event.timezone, event.recurrence ? JSON.stringify(event.recurrence) : null]);
    for (const entityId of new Set(input.entityIds)) {
      await client.query("INSERT INTO event_entity_links(event_id, entity_id, role) VALUES ($1, $2, 'participant')", [event.id, entityId]);
    }
    if (input.entityIds.length) {
      const commitments = await client.query(
        "SELECT * FROM commitments WHERE vault_id = $1 AND status = 'active' AND archived_at IS NULL AND person_entity_id = ANY($2::uuid[])",
        [vaultId, input.entityIds]
      );
      for (const row of commitments.rows) {
        const candidate = { id: row.id, status: row.status, personEntityId: row.person_entity_id, objectLabel: row.object_label, conditionKind: row.condition_kind } as const;
        if (!matchesEvent(candidate, input.entityIds)) continue;
        const prepText = commitmentPrepText(candidate);
        const fingerprint = createHash("sha256").update(`commitment:${row.id}`).digest("hex");
        const suppressed = await client.query("SELECT 1 FROM prep_item_suppressions WHERE event_id = $1 AND fingerprint = $2", [event.id, fingerprint]);
        if (suppressed.rowCount) continue;
        await client.query(
          `INSERT INTO prep_items(event_id, commitment_id, type, text, evidence_note_id, provenance)
           VALUES ($1, $2, 'bring', $3, $4, $5::jsonb) ON CONFLICT DO NOTHING`,
          [event.id, row.id, prepText, row.source_note_id, JSON.stringify({ origin: "commitment_rule", sourceId: row.source_note_id })]
        );
      }
    }
    return event;
  });
  if (created === "invalid_entities") return reply.code(400).send({ error: "event_entity_not_found" });
  if (created === "calendar_not_writable") return reply.code(409).send({ error: "calendar_not_found_archived_or_read_only" });
  return reply.code(201).send(mapEvent(created));
});

app.get("/api/v1/vaults/:vaultId/calendar-events/:eventId", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const result = await query("SELECT * FROM calendar_events WHERE vault_id = $1 AND id = $2", [vaultId, eventId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "event_not_found" });
  return mapEvent(result.rows[0]);
});

app.patch("/api/v1/vaults/:vaultId/calendar-events/:eventId", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const input = updateCalendarEventSchema.parse(request.body);
  if (input.timezone && !isSupportedTimezone(input.timezone) || input.recurrence && !isSupportedTimezone(input.recurrence.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  const updated = await transaction(async (client) => {
    const current = await client.query("SELECT e.* FROM calendar_events e JOIN calendars c ON c.id=e.calendar_id WHERE e.vault_id = $1 AND e.id = $2 AND c.archived_at IS NULL AND c.can_write=true FOR UPDATE OF e", [vaultId, eventId]);
    const event = current.rows[0];
    if (!event) return null;
    if (event.revision !== input.expectedRevision) return "stale_revision" as const;
    const linkedReminder=await client.query("SELECT 1 FROM reminders WHERE vault_id=$1 AND calendar_event_id=$2 AND deleted_at IS NULL LIMIT 1",[vaultId,eventId]);
    if(linkedReminder.rowCount)return "assistant_reminder_event_managed_from_reminders" as const;
    const startsAt = input.startsAt ?? iso(event.starts_at); const endsAt = input.endsAt ?? iso(event.ends_at);
    const timezone = input.timezone ?? event.timezone; const recurrence = input.recurrence === undefined ? event.recurrence : input.recurrence;
    if (Date.parse(endsAt) <= Date.parse(startsAt)) return "invalid_event_range" as const;
    if (recurrence && recurrence.timezone !== timezone) return "recurrence_timezone_mismatch" as const;
    const changedFields = Object.keys(input).filter((key) => key !== "expectedRevision" && key !== "scope");
    const result = await client.query(
      `UPDATE calendar_events SET title = $3, starts_at = $4, ends_at = $5, timezone = $6, recurrence = $7::jsonb,
       revision = revision + 1, updated_at = now() WHERE vault_id = $1 AND id = $2 RETURNING *`,
      [vaultId, eventId, input.title ?? event.title, startsAt, endsAt, timezone, recurrence ? JSON.stringify(recurrence) : null]
    );
    const row = result.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`, [eventId, row.revision, row.title, row.starts_at, row.ends_at, row.timezone, row.recurrence ? JSON.stringify(row.recurrence) : null, changedFields]);
    return row;
  });
  if (!updated) return reply.code(404).send({ error: "event_not_found" });
  if (typeof updated === "string") return reply.code(409).send({ error: updated });
  return mapEvent(updated);
});

app.delete("/api/v1/vaults/:vaultId/calendar-events/:eventId", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const {expectedRevision:rawExpectedRevision,scope}=request.query as {expectedRevision?:string;scope?:string};const expectedRevision=Number(rawExpectedRevision);
  if(scope!=="series")return reply.code(400).send({error:"explicit_series_scope_required"});
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return reply.code(400).send({ error: "expected_revision_required" });
  const result = await transaction(async (client) => {
    const changed = await client.query("UPDATE calendar_events e SET trashed_at = now(), revision = e.revision + 1, updated_at = now() FROM calendars c WHERE e.calendar_id=c.id AND e.vault_id = $1 AND e.id = $2 AND e.revision = $3 AND e.trashed_at IS NULL AND c.archived_at IS NULL AND c.can_write=true RETURNING e.*", [vaultId, eventId, expectedRevision]);
    if (!changed.rows[0]) return null;
    const row = changed.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,ARRAY['trashed_at'])`, [row.id, row.revision, row.title, row.starts_at, row.ends_at, row.timezone, row.recurrence ? JSON.stringify(row.recurrence) : null]);
    await client.query("UPDATE reminders SET status='cancelled',deleted_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND calendar_event_id=$2 AND deleted_at IS NULL",[vaultId,eventId]);
    return row;
  });
  if (!result) return reply.code(409).send({ error: "event_not_found_or_stale" });
  return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/calendar-events/:eventId/restore", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const expectedRevision = (request.body as { expectedRevision?: unknown })?.expectedRevision;
  if (!Number.isInteger(expectedRevision)) return reply.code(400).send({ error: "expected_revision_required" });
  const result = await transaction(async (client) => {
    const linkedReminder=await client.query("SELECT r.id,r.status,r.deleted_at,n.id AS notification_id FROM reminders r LEFT JOIN notifications n ON n.reminder_id=r.id WHERE r.vault_id=$1 AND r.calendar_event_id=$2 FOR UPDATE OF r",[vaultId,eventId]);
    if(linkedReminder.rows.some(row=>row.notification_id||row.status!=="cancelled"||!row.deleted_at))return "assistant_reminder_not_restorable" as const;
    const before=await client.query("SELECT starts_at FROM calendar_events WHERE vault_id=$1 AND id=$2 AND revision=$3 AND trashed_at IS NOT NULL FOR UPDATE",[vaultId,eventId,expectedRevision]);
    if(!before.rows[0])return null;
    if(linkedReminder.rowCount&&new Date(before.rows[0].starts_at).getTime()<=Date.now())return "assistant_reminder_event_expired" as const;
    const changed = await client.query("UPDATE calendar_events e SET trashed_at = NULL, revision = e.revision + 1, updated_at = now() FROM calendars c WHERE e.calendar_id=c.id AND e.vault_id = $1 AND e.id = $2 AND e.revision = $3 AND e.trashed_at IS NOT NULL AND c.archived_at IS NULL AND c.can_write=true RETURNING e.*", [vaultId, eventId, expectedRevision]);
    if (!changed.rows[0]) return null;
    const row = changed.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,ARRAY['restored'])`, [row.id, row.revision, row.title, row.starts_at, row.ends_at, row.timezone, row.recurrence ? JSON.stringify(row.recurrence) : null]);
    if(linkedReminder.rowCount)await client.query("UPDATE reminders SET status='scheduled',deleted_at=NULL,remind_at=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND calendar_event_id=$2",[vaultId,eventId,row.starts_at]);
    return row;
  });
  if(typeof result==="string")return reply.code(409).send({error:result});
  if (!result) return reply.code(409).send({ error: "event_not_found_or_stale" });
  return mapEvent(result);
});

app.get("/api/v1/vaults/:vaultId/calendar-events/:eventId/revisions", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const exists = await query("SELECT 1 FROM calendar_events WHERE vault_id = $1 AND id = $2", [vaultId, eventId]);
  if (!exists.rowCount) return reply.code(404).send({ error: "event_not_found" });
  const result = await query("SELECT * FROM calendar_event_revisions WHERE event_id = $1 ORDER BY revision DESC LIMIT 250", [eventId]);
  return { items: result.rows.map((row) => ({ id: row.id, eventId: row.event_id, revision: row.revision, title: row.title, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at), timezone: row.timezone, recurrence: row.recurrence, actorKind: row.actor_kind, changedFields: row.changed_fields, createdAt: iso(row.created_at) })) };
});

app.get("/api/v1/vaults/:vaultId/calendar-events/:eventId/occurrences", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  const { from, to } = request.query as { from?: string; to?: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) return reply.code(400).send({ error: "bounded_range_required" });
  const event = await query("SELECT * FROM calendar_events WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL", [vaultId, eventId]);
  if (!event.rows[0]) return reply.code(404).send({ error: "event_not_found" });
  const exceptions = await query("SELECT * FROM calendar_event_exceptions WHERE event_id = $1", [eventId]);
  try {
    const items = expandOccurrences({ eventId, title: event.rows[0].title, startsAt: iso(event.rows[0].starts_at), endsAt: iso(event.rows[0].ends_at), recurrence: event.rows[0].recurrence, from, to, exceptions: exceptions.rows.map((row) => ({ id: row.id, originalStartsAt: iso(row.original_starts_at), cancelled: row.cancelled, title: row.title, startsAt: row.starts_at ? iso(row.starts_at) : null, endsAt: row.ends_at ? iso(row.ends_at) : null })) });
    return { items: items.map((item) => eventOccurrenceSchema.parse(item)) };
  } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "occurrence_expansion_failed" }); }
});

app.post("/api/v1/vaults/:vaultId/calendar-events/:eventId/exceptions", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const input = occurrenceExceptionInputSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const event = await client.query("SELECT * FROM calendar_events WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, eventId]);
    if (!event.rows[0]) return null;
    if (event.rows[0].revision !== input.expectedRevision) return "stale_revision" as const;
    const original = new Date(input.originalStartsAt);
    const validOccurrence = expandOccurrences({
      eventId, title: event.rows[0].title, startsAt: iso(event.rows[0].starts_at), endsAt: iso(event.rows[0].ends_at), recurrence: event.rows[0].recurrence,
      from: new Date(original.getTime() - 1000).toISOString(), to: new Date(original.getTime() + 1000).toISOString()
    }).some((occurrence) => occurrence.originalStartsAt === original.toISOString());
    if (!validOccurrence) return "occurrence_not_in_series" as const;
    const created = await client.query(
      `INSERT INTO calendar_event_exceptions(event_id, original_starts_at, cancelled, title, starts_at, ends_at)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(event_id, original_starts_at) DO UPDATE SET cancelled = excluded.cancelled,
       title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at, revision = calendar_event_exceptions.revision + 1, updated_at = now() RETURNING *`,
      [eventId, input.originalStartsAt, input.cancelled, input.title ?? null, input.startsAt ?? null, input.endsAt ?? null]
    );
    const revised = await client.query("UPDATE calendar_events SET revision = revision + 1, updated_at = now() WHERE id = $1 RETURNING *", [eventId]);
    const row = revised.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,ARRAY['exception'])`, [row.id, row.revision, row.title, row.starts_at, row.ends_at, row.timezone, row.recurrence ? JSON.stringify(row.recurrence) : null]);
    return created.rows[0];
  });
  if (!result) return reply.code(404).send({ error: "event_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return reply.code(201).send({ id: result.id, eventId: result.event_id, originalStartsAt: iso(result.original_starts_at), cancelled: result.cancelled, title: result.title, startsAt: result.starts_at ? iso(result.starts_at) : null, endsAt: result.ends_at ? iso(result.ends_at) : null, revision: result.revision });
});

app.patch("/api/v1/vaults/:vaultId/calendar-events/:eventId/exceptions/:exceptionId", async (request, reply) => {
  const { vaultId, eventId, exceptionId } = request.params as { vaultId: string; eventId: string; exceptionId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId); idSchema.parse(exceptionId);
  const input = updateOccurrenceExceptionSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const event = await client.query("SELECT * FROM calendar_events WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, eventId]);
    if (!event.rows[0]) return null;
    if (event.rows[0].revision !== input.expectedEventRevision) return "stale_event_revision" as const;
    const current = await client.query("SELECT * FROM calendar_event_exceptions WHERE event_id = $1 AND id = $2 FOR UPDATE", [eventId, exceptionId]);
    if (!current.rows[0]) return "exception_not_found" as const;
    if (current.rows[0].revision !== input.expectedExceptionRevision) return "stale_exception_revision" as const;
    const row = current.rows[0];
    const updated = await client.query(
      `UPDATE calendar_event_exceptions SET cancelled = $3, title = $4, starts_at = $5, ends_at = $6,
       revision = revision + 1, updated_at = now() WHERE event_id = $1 AND id = $2 RETURNING *`,
      [eventId, exceptionId, input.cancelled ?? row.cancelled, input.title === undefined ? row.title : input.title, input.startsAt === undefined ? row.starts_at : input.startsAt, input.endsAt === undefined ? row.ends_at : input.endsAt]
    );
    const revised = await client.query("UPDATE calendar_events SET revision = revision + 1, updated_at = now() WHERE id = $1 RETURNING *", [eventId]);
    const eventRow = revised.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,ARRAY['exception'])`, [eventRow.id, eventRow.revision, eventRow.title, eventRow.starts_at, eventRow.ends_at, eventRow.timezone, eventRow.recurrence ? JSON.stringify(eventRow.recurrence) : null]);
    return updated.rows[0];
  });
  if (!result) return reply.code(404).send({ error: "event_not_found" });
  if (typeof result === "string") return reply.code(result === "exception_not_found" ? 404 : 409).send({ error: result });
  return { id: result.id, eventId: result.event_id, originalStartsAt: iso(result.original_starts_at), cancelled: result.cancelled, title: result.title, startsAt: result.starts_at ? iso(result.starts_at) : null, endsAt: result.ends_at ? iso(result.ends_at) : null, revision: result.revision };
});

app.delete("/api/v1/vaults/:vaultId/calendar-events/:eventId/exceptions/:exceptionId", async (request, reply) => {
  const { vaultId, eventId, exceptionId } = request.params as { vaultId: string; eventId: string; exceptionId: string };
  const { expectedEventRevision, expectedExceptionRevision,scope } = request.query as { expectedEventRevision?: string; expectedExceptionRevision?: string;scope?:string };
  idSchema.parse(vaultId); idSchema.parse(eventId); idSchema.parse(exceptionId);
  const eventRevision = Number(expectedEventRevision); const exceptionRevision = Number(expectedExceptionRevision);
  if(scope!=="occurrence")return reply.code(400).send({error:"explicit_occurrence_scope_required"});
  if (!Number.isInteger(eventRevision) || !Number.isInteger(exceptionRevision)) return reply.code(400).send({ error: "expected_revisions_required" });
  const result = await transaction(async (client) => {
    const event = await client.query("SELECT * FROM calendar_events WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL FOR UPDATE", [vaultId, eventId]);
    if (!event.rows[0]) return null;
    if (event.rows[0].revision !== eventRevision) return "stale_event_revision" as const;
    const removed = await client.query("DELETE FROM calendar_event_exceptions WHERE event_id = $1 AND id = $2 AND revision = $3 RETURNING id", [eventId, exceptionId, exceptionRevision]);
    if (!removed.rowCount) return "exception_not_found_or_stale" as const;
    const revised = await client.query("UPDATE calendar_events SET revision = revision + 1, updated_at = now() WHERE id = $1 RETURNING *", [eventId]);
    const row = revised.rows[0];
    await client.query(`INSERT INTO calendar_event_revisions(event_id, revision, title, starts_at, ends_at, timezone, recurrence, changed_fields)
      VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,ARRAY['exception_removed'])`, [row.id, row.revision, row.title, row.starts_at, row.ends_at, row.timezone, row.recurrence ? JSON.stringify(row.recurrence) : null]);
    return true;
  });
  if (!result) return reply.code(404).send({ error: "event_not_found" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return reply.code(204).send();
});

app.post("/api/v1/vaults/:vaultId/calendar/free-busy", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = freeBusyQuerySchema.parse(request.body);
  if (!isSupportedTimezone(input.timezone)) return reply.code(400).send({ error: "unsupported_timezone" });
  try {
    const occurrences = (await loadCalendarOccurrences(vaultId, input.from, input.to)).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const busy: Array<{ startsAt: string; endsAt: string; occurrenceIds: string[] }> = [];
    for (const occurrence of occurrences) {
      const last = busy.at(-1);
      if (last && Date.parse(occurrence.startsAt) <= Date.parse(last.endsAt)) {
        if (Date.parse(occurrence.endsAt) > Date.parse(last.endsAt)) last.endsAt = occurrence.endsAt;
        last.occurrenceIds.push(occurrence.id);
      } else busy.push({ startsAt: occurrence.startsAt, endsAt: occurrence.endsAt, occurrenceIds: [occurrence.id] });
    }
    return freeBusyResultSchema.parse({ from: input.from, to: input.to, timezone: input.timezone, busy, unknownTimeConflicts: [], staleSources: [] });
  } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "free_busy_failed" }); }
});

app.get("/api/v1/vaults/:vaultId/calendar/conflicts", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  const { from, to } = request.query as { from?: string; to?: string };
  idSchema.parse(vaultId);
  if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) return reply.code(400).send({ error: "bounded_range_required" });
  try {
    const occurrences = (await loadCalendarOccurrences(vaultId, from, to)).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
    const items: Array<ReturnType<typeof calendarConflictSchema.parse>> = [];
    for (let left = 0; left < occurrences.length; left += 1) for (let right = left + 1; right < occurrences.length; right += 1) {
      if (Date.parse(occurrences[right].startsAt) >= Date.parse(occurrences[left].endsAt)) break;
      if (occurrences[left].eventId === occurrences[right].eventId) continue;
      const startsAt = new Date(Math.max(Date.parse(occurrences[left].startsAt), Date.parse(occurrences[right].startsAt))).toISOString();
      const endsAt = new Date(Math.min(Date.parse(occurrences[left].endsAt), Date.parse(occurrences[right].endsAt))).toISOString();
      items.push(calendarConflictSchema.parse({ id: `${occurrences[left].id}|${occurrences[right].id}`, kind: "overlap", startsAt, endsAt, occurrenceIds: [occurrences[left].id, occurrences[right].id], eventIds: [occurrences[left].eventId, occurrences[right].eventId], titles: [occurrences[left].title, occurrences[right].title] }));
    }
    return { items };
  } catch (error) { return reply.code(400).send({ error: error instanceof Error ? error.message : "conflict_scan_failed" }); }
});

app.get("/api/v1/vaults/:vaultId/calendar-events/:eventId/private-context", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const event = await query("SELECT * FROM calendar_events WHERE vault_id = $1 AND id = $2", [vaultId, eventId]);
  if (!event.rows[0]) return reply.code(404).send({ error: "event_not_found" });
  const prep = await query(
    `SELECT p.* FROM prep_items p JOIN calendar_events e ON e.id = p.event_id
     WHERE e.vault_id = $1 AND p.event_id = $2 AND p.invalidated_at IS NULL ORDER BY p.created_at`,
    [vaultId, eventId]
  );
  const commitments = await query(
    `SELECT c.* FROM commitments c JOIN prep_items p ON p.commitment_id = c.id
     WHERE c.vault_id = $1 AND c.archived_at IS NULL AND p.event_id = $2 AND p.invalidated_at IS NULL ORDER BY c.created_at`,
    [vaultId, eventId]
  );
  return {
    event: mapEvent(event.rows[0]),
    privateContext: event.rows[0].private_context,
    prepItems: prep.rows.map(mapPrepItem),
    linkedCommitments: commitments.rows.map(mapCommitment)
  };
});

app.post("/api/v1/vaults/:vaultId/calendar-events/:eventId/context-refresh",async(request,reply)=>{const {vaultId,eventId}=request.params as {vaultId:string;eventId:string};idSchema.parse(vaultId);idSchema.parse(eventId);const input=refreshPrivateEventContextSchema.parse(request.body);const rawKey=request.headers["idempotency-key"],idempotencyKey=Array.isArray(rawKey)?rawKey[0]:rawKey;if(!idempotencyKey||idempotencyKey.length<8||idempotencyKey.length>128)return reply.code(400).send({error:"idempotency_key_required"});const payload={type:"calendar_context_refresh",eventId,...input,idempotencyKey};const serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='calendar_context_refresh' AND input->>'idempotencyKey'=$2",[vaultId,idempotencyKey]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"idempotency_key_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}const job=await transaction(async client=>{const eventResult=await client.query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL FOR UPDATE",[vaultId,eventId]);const event=eventResult.rows[0];if(!event)return null;if(event.revision!==input.expectedRevision)return "stale_event_revision" as const;if(input.occurrenceId&&!input.occurrenceId.startsWith(`${eventId}:`))return "occurrence_not_in_event" as const;const links=await client.query("SELECT entity_id FROM event_entity_links WHERE event_id=$1",[eventId]);const entityIds=links.rows.map(row=>row.entity_id as string);const commitments=entityIds.length?await client.query("SELECT * FROM commitments WHERE vault_id=$1 AND status='active' AND archived_at IS NULL AND person_entity_id=ANY($2::uuid[]) ORDER BY id LIMIT 100",[vaultId,entityIds]):{rows:[] as Record<string,any>[],rowCount:0};let createdPrepItems=0;for(const row of commitments.rows){const candidate={id:row.id,status:row.status,personEntityId:row.person_entity_id,objectLabel:row.object_label,conditionKind:row.condition_kind} as const;if(!matchesEvent(candidate,entityIds))continue;const fingerprint=createHash("sha256").update(`commitment:${row.id}`).digest("hex");const suppressed=await client.query("SELECT 1 FROM prep_item_suppressions WHERE event_id=$1 AND fingerprint=$2",[eventId,fingerprint]);if(suppressed.rowCount)continue;const inserted=await client.query("INSERT INTO prep_items(event_id,commitment_id,occurrence_id,type,text,evidence_note_id,provenance) VALUES ($1,$2,$3,'bring',$4,$5,$6::jsonb) ON CONFLICT DO NOTHING RETURNING id",[eventId,row.id,input.occurrenceId,commitmentPrepText(candidate),row.source_note_id,JSON.stringify({origin:"context_refresh",sourceId:row.source_note_id,idempotencyKey})]);createdPrepItems+=inserted.rowCount??0;}const result={type:"calendar_context_refresh" as const,eventId,eventRevision:event.revision,matchedCommitments:commitments.rowCount??0,createdPrepItems,staleContext:false,writesApplied:createdPrepItems>0};const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'calendar_context_refresh','succeeded','deterministic_matches_refreshed',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({eventId,occurrenceId:input.occurrenceId}),JSON.stringify(result)]);return created.rows[0];});if(!job)return reply.code(404).send({error:"event_not_found"});if(typeof job==="string")return reply.code(409).send({error:job});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/calendar-events/:eventId/reminder-plan",async(request,reply)=>{const {vaultId,eventId}=request.params as {vaultId:string;eventId:string};idSchema.parse(vaultId);idSchema.parse(eventId);const requested=(request.query as {occurrence_id?:string}).occurrence_id;const [eventResult,planResult]=await Promise.all([query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL",[vaultId,eventId]),query("SELECT * FROM event_reminder_plans WHERE vault_id=$1 AND event_id=$2",[vaultId,eventId])]);const event=eventResult.rows[0];if(!event)return reply.code(404).send({error:"event_not_found"});const plan=planResult.rows[0];if(requested&&plan?.occurrence_id!==requested)return reply.code(404).send({error:"occurrence_reminder_plan_not_found"});return mapEventReminderPlan(event,plan);});

app.post("/api/v1/vaults/:vaultId/calendar-events/:eventId/reminder-plan",async(request,reply)=>{const {vaultId,eventId}=request.params as {vaultId:string;eventId:string};idSchema.parse(vaultId);idSchema.parse(eventId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=setEventReminderPlanSchema.parse(request.body);const saved=await transaction(async client=>{const eventResult=await client.query("SELECT * FROM calendar_events WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL FOR SHARE",[vaultId,eventId]);const event=eventResult.rows[0];if(!event)return null;if(input.occurrenceId&&!input.occurrenceId.startsWith(`${eventId}:`))return "occurrence_not_in_event" as const;const current=await client.query("SELECT * FROM event_reminder_plans WHERE vault_id=$1 AND event_id=$2 FOR UPDATE",[vaultId,eventId]);if(!current.rows[0]){if(expectedRevision!==0)return "stale_reminder_plan_revision" as const;const created=await client.query("INSERT INTO event_reminder_plans(event_id,vault_id,occurrence_scope,occurrence_id,schedules,channels) VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *",[eventId,vaultId,input.occurrenceScope,input.occurrenceId,JSON.stringify(input.schedules),input.channels]);return{event,row:created.rows[0]};}if(current.rows[0].revision!==expectedRevision)return "stale_reminder_plan_revision" as const;const updated=await client.query("UPDATE event_reminder_plans SET occurrence_scope=$3,occurrence_id=$4,schedules=$5::jsonb,channels=$6,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND event_id=$2 RETURNING *",[vaultId,eventId,input.occurrenceScope,input.occurrenceId,JSON.stringify(input.schedules),input.channels]);return{event,row:updated.rows[0]};});if(!saved)return reply.code(404).send({error:"event_not_found"});if(typeof saved==="string")return reply.code(409).send({error:saved});return mapEventReminderPlan(saved.event,saved.row);});

app.post("/api/v1/vaults/:vaultId/calendar-events/:eventId/prep-items", async (request, reply) => {
  const { vaultId, eventId } = request.params as { vaultId: string; eventId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId);
  const input = createPrepItemSchema.parse(request.body);
  const created = await transaction(async (client) => {
    const event = await client.query("SELECT 1 FROM calendar_events WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL", [vaultId, eventId]);
    if (!event.rowCount) return "event_not_found" as const;
    if (input.evidenceNoteId) {
      const note = await client.query("SELECT 1 FROM notes WHERE vault_id = $1 AND id = $2 AND trashed_at IS NULL", [vaultId, input.evidenceNoteId]);
      if (!note.rowCount) return "evidence_note_not_found" as const;
    }
    if (input.commitmentId) {
      const commitment = await client.query("SELECT 1 FROM commitments WHERE vault_id = $1 AND id = $2 AND archived_at IS NULL", [vaultId, input.commitmentId]);
      if (!commitment.rowCount) return "commitment_not_found" as const;
    }
    try {
      const result = await client.query(
        `INSERT INTO prep_items(event_id, commitment_id, occurrence_id, type, text, evidence_note_id, provenance)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *`,
        [eventId, input.commitmentId ?? null, input.occurrenceId ?? null, input.type, input.text, input.evidenceNoteId ?? null, JSON.stringify({ origin: "owner", sourceId: input.evidenceNoteId ?? null })]
      );
      return result.rows[0];
    } catch (error: any) {
      if (error?.code === "23505") return "commitment_already_bound" as const;
      throw error;
    }
  });
  if (created === "event_not_found") return reply.code(404).send({ error: created });
  if (typeof created === "string") return reply.code(409).send({ error: created });
  return reply.code(201).send(mapPrepItem(created));
});

app.patch("/api/v1/vaults/:vaultId/calendar-events/:eventId/prep-items/:prepId", async (request, reply) => {
  const { vaultId, eventId, prepId } = request.params as { vaultId: string; eventId: string; prepId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId); idSchema.parse(prepId);
  const input = updatePrepItemSchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const current = await client.query(
      `SELECT p.* FROM prep_items p JOIN calendar_events e ON e.id = p.event_id
       WHERE e.vault_id = $1 AND p.event_id = $2 AND p.id = $3 AND p.invalidated_at IS NULL FOR UPDATE OF p`, [vaultId, eventId, prepId]
    );
    const item = current.rows[0];
    if (!item) return null;
    if (item.revision !== input.expectedRevision) return "stale_revision" as const;
    const transition = prepStatusTransition(item.status, input.status);
    const result = await client.query(
      `UPDATE prep_items SET text = $2, status = $3, revision = revision + 1, updated_at = now() WHERE id = $1 RETURNING *`,
      [prepId, input.text ?? item.text, transition.status]
    );
    if (transition.suppressFutureSuggestion) {
      const fingerprint = createHash("sha256").update(item.commitment_id ? `commitment:${item.commitment_id}` : `prep:${item.id}`).digest("hex");
      await client.query(
        `INSERT INTO prep_item_suppressions(event_id, fingerprint, commitment_id, reason) VALUES ($1,$2,$3,'dismissed')
         ON CONFLICT(event_id, fingerprint) DO UPDATE SET reason = 'dismissed'`, [eventId, fingerprint, item.commitment_id]
      );
    }
    return result.rows[0];
  });
  if (!updated) return reply.code(404).send({ error: "prep_item_not_found" });
  if (updated === "stale_revision") return reply.code(409).send({ error: updated });
  return mapPrepItem(updated);
});

app.delete("/api/v1/vaults/:vaultId/calendar-events/:eventId/prep-items/:prepId", async (request, reply) => {
  const { vaultId, eventId, prepId } = request.params as { vaultId: string; eventId: string; prepId: string };
  idSchema.parse(vaultId); idSchema.parse(eventId); idSchema.parse(prepId);
  const expectedRevision = Number((request.query as { expectedRevision?: string }).expectedRevision);
  if (!Number.isInteger(expectedRevision)) return reply.code(400).send({ error: "expected_revision_required" });
  const removed = await transaction(async (client) => {
    const current = await client.query(
      `SELECT p.* FROM prep_items p JOIN calendar_events e ON e.id = p.event_id
       WHERE e.vault_id = $1 AND p.event_id = $2 AND p.id = $3 AND p.invalidated_at IS NULL FOR UPDATE OF p`, [vaultId, eventId, prepId]
    );
    const item = current.rows[0];
    if (!item) return null;
    if (item.revision !== expectedRevision) return "stale_revision" as const;
    const fingerprint = createHash("sha256").update(item.commitment_id ? `commitment:${item.commitment_id}` : `prep:${item.id}`).digest("hex");
    await client.query(
      `INSERT INTO prep_item_suppressions(event_id, fingerprint, commitment_id, reason) VALUES ($1,$2,$3,'removed')
       ON CONFLICT(event_id, fingerprint) DO UPDATE SET reason = 'removed'`, [eventId, fingerprint, item.commitment_id]
    );
    await client.query("DELETE FROM prep_items WHERE id = $1", [prepId]);
    return true;
  });
  if (!removed) return reply.code(404).send({ error: "prep_item_not_found" });
  if (removed === "stale_revision") return reply.code(409).send({ error: removed });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/chats", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const result = await query("SELECT * FROM chats WHERE vault_id = $1 ORDER BY updated_at DESC, id", [vaultId]);
  return { items: result.rows.map(mapChat) };
});

app.post("/api/v1/vaults/:vaultId/chats", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = createChatSchema.parse(request.body);
  const created = await query(
    `INSERT INTO chats(vault_id, title, default_mode, default_scope) VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
    [vaultId, input.title ?? null, input.defaultMode, JSON.stringify(input.defaultScope)]
  );
  return reply.code(201).send(mapChat(created.rows[0]));
});

app.get("/api/v1/vaults/:vaultId/chats/:chatId", async (request, reply) => {
  const { vaultId, chatId } = request.params as { vaultId: string; chatId: string };
  idSchema.parse(vaultId); idSchema.parse(chatId);
  const result = await query("SELECT * FROM chats WHERE vault_id = $1 AND id = $2", [vaultId, chatId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "chat_not_found" });
  return mapChat(result.rows[0]);
});

app.delete("/api/v1/vaults/:vaultId/chats/:chatId", async (request, reply) => {
  const { vaultId, chatId } = request.params as { vaultId: string; chatId: string };
  idSchema.parse(vaultId); idSchema.parse(chatId);
  const deleted = await transaction(async (client) => {
    const chat = await client.query("SELECT id FROM chats WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, chatId]);
    if (!chat.rowCount) return false;
    await client.query(
      `UPDATE jobs SET cancel_requested = true,
       status = CASE WHEN status = 'running' THEN status ELSE 'cancelled' END,
       stage = CASE WHEN status = 'running' THEN 'cancellation_requested' ELSE 'cancelled' END,
       finished_at = CASE WHEN status = 'running' THEN finished_at ELSE now() END, updated_at = now()
       WHERE vault_id = $1 AND kind = 'answer_generation' AND input->>'chatId' = $2
       AND status IN ('queued','waiting_for_worker','running')`, [vaultId, chatId]
    );
    await client.query("DELETE FROM chats WHERE id = $1", [chatId]);
    return true;
  });
  if (!deleted) return reply.code(404).send({ error: "chat_not_found" });
  return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/chats/:chatId/messages", async (request, reply) => {
  const { vaultId, chatId } = request.params as { vaultId: string; chatId: string };
  const {cursor,limit:rawLimit}=request.query as {cursor?:string;limit?:string};
  idSchema.parse(vaultId); idSchema.parse(chatId);
  const limit=rawLimit===undefined?50:Number(rawLimit);
  if(!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_message_limit"});
  if(cursor)idSchema.parse(cursor);
  const exists = await query("SELECT 1 FROM chats WHERE vault_id = $1 AND id = $2", [vaultId, chatId]);
  if (!exists.rowCount) return reply.code(404).send({ error: "chat_not_found" });
  const result = await query(`SELECT m.* FROM chat_messages m WHERE m.chat_id=$1 AND ($2::uuid IS NULL OR (m.created_at, CASE WHEN m.role = 'user' THEN 0 ELSE 1 END, m.id)>(SELECT c.created_at, CASE WHEN c.role = 'user' THEN 0 ELSE 1 END, c.id FROM chat_messages c WHERE c.chat_id=$1 AND c.id=$2)) ORDER BY m.created_at, CASE WHEN m.role = 'user' THEN 0 ELSE 1 END, m.id LIMIT $3`,[chatId,cursor??null,limit+1]);
  const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit);
  return { items: rows.map(mapChatMessage),nextCursor:hasMore?rows.at(-1)!.id:null };
});

app.post("/api/v1/vaults/:vaultId/chats/:chatId/messages", async (request, reply) => {
  const { vaultId, chatId } = request.params as { vaultId: string; chatId: string };
  idSchema.parse(vaultId); idSchema.parse(chatId);
  const input = createChatMessageSchema.parse(request.body);
  const accepted = await transaction(async (client) => {
    const chat = await client.query("SELECT * FROM chats WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, chatId]);
    if (!chat.rows[0]) return null;
    const duplicate = await client.query("SELECT * FROM chat_messages WHERE chat_id = $1 AND client_message_id = $2", [chatId, input.clientMessageId]);
    if (duplicate.rows[0]) {
      const assistant = await client.query("SELECT * FROM chat_messages WHERE answer_to_id = $1", [duplicate.rows[0].id]);
      const job = assistant.rows[0]?.job_id ? await client.query("SELECT * FROM jobs WHERE id = $1", [assistant.rows[0].job_id]) : { rows: [] };
      return assistant.rows[0] && job.rows[0] ? { user: duplicate.rows[0], assistant: assistant.rows[0], job: job.rows[0] } : "duplicate_incomplete" as const;
    }
    const scope = input.scope ?? chat.rows[0].default_scope;
    const user = await client.query(
      `INSERT INTO chat_messages(chat_id, client_message_id, role, text, answer_mode, status)
       VALUES ($1, $2, 'user', $3, $4, 'persisted') RETURNING *`, [chatId, input.clientMessageId, input.text, input.mode]
    );
    const assistantId = randomUUID();
    const vaultSettings = await client.query("SELECT timezone FROM vaults WHERE id=$1", [vaultId]);
    const jobInput = { type: "answer_generation", chatId, userMessageId: user.rows[0].id, assistantMessageId: assistantId, question: input.text, mode: input.mode, scope, requestedAt: new Date().toISOString(), timezone: vaultSettings.rows[0]?.timezone ?? "Europe/Oslo", actionType: isDirectReminderRequest(input.text) ? "reminder" : null };
    const serialized = JSON.stringify(jobInput);
    const job = await client.query(
      `INSERT INTO jobs(vault_id, kind, status, stage, input, input_hash)
       VALUES ($1, 'answer_generation', 'waiting_for_worker', 'awaiting_generation_worker', $2::jsonb, $3) RETURNING *`,
      [vaultId, serialized, createHash("sha256").update(serialized).digest("hex")]
    );
    const assistant = await client.query(
      `INSERT INTO chat_messages(id, chat_id, role, text, answer_mode, status, answer_to_id, job_id)
       VALUES ($1, $2, 'assistant', '', $3, 'waiting_for_worker', $4, $5) RETURNING *`,
      [assistantId, chatId, input.mode, user.rows[0].id, job.rows[0].id]
    );
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, 1, 'accepted', $2::jsonb)", [job.rows[0].id, JSON.stringify({ status: "waiting_for_worker", queue_when_offline: input.queueWhenOffline })]);
    await client.query("UPDATE chats SET title = coalesce(title, $2), updated_at = now() WHERE id = $1", [chatId, input.text.slice(0, 80)]);
    return { user: user.rows[0], assistant: assistant.rows[0], job: job.rows[0] };
  });
  if (!accepted) return reply.code(404).send({ error: "chat_not_found" });
  if (accepted === "duplicate_incomplete") return reply.code(409).send({ error: "duplicate_message_incomplete" });
  return reply.code(202).send(askHandleSchema.parse({jobId:accepted.job.id,userMessageId:accepted.user.id,answerMessageId:accepted.assistant.id,status:accepted.job.status}));
});

app.post("/api/v1/vaults/:vaultId/generations",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=generateArtifactSchema.parse(request.body);
  const assembled=await transaction(async client=>{const noteIds=new Set(input.scope.noteIds),sourceIds=new Set(input.scope.sourceIds);
    if(input.scope.courseIds.length){const courses=await client.query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,input.scope.courseIds]);if(courses.rowCount!==input.scope.courseIds.length)return"generation_course_not_found" as const;const records=await client.query("SELECT instruction_source_ids,material_source_ids FROM school_assignments WHERE vault_id=$1 AND course_id=ANY($2::uuid[]) AND archived_at IS NULL UNION ALL SELECT '{}'::uuid[],material_source_ids FROM school_assessments WHERE vault_id=$1 AND course_id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,input.scope.courseIds]);for(const row of records.rows)for(const id of [...row.instruction_source_ids,...row.material_source_ids])sourceIds.add(id);}
    if(input.scope.projectIds.length){const projects=await client.query("SELECT id,note_ids FROM projects WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL",[vaultId,input.scope.projectIds]);if(projects.rowCount!==input.scope.projectIds.length)return"generation_project_not_found" as const;for(const row of projects.rows)for(const id of row.note_ids)noteIds.add(id);}
    const notes=noteIds.size?await client.query("SELECT id,source_id,title,body,revision FROM notes WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND trashed_at IS NULL",[vaultId,[...noteIds]]):{rows:[] as Record<string,any>[],rowCount:0};if(notes.rowCount!==noteIds.size)return"generation_note_not_found" as const;for(const row of notes.rows)if(row.source_id)sourceIds.delete(row.source_id);
    const sources=sourceIds.size?await client.query("SELECT id,original_text,content_hash,source_url FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[vaultId,[...sourceIds]]):{rows:[] as Record<string,any>[],rowCount:0};if(sources.rowCount!==sourceIds.size)return"generation_source_not_found" as const;
    const manifest=[...notes.rows.map(row=>({recordId:row.id,recordType:"note" as const,revision:row.revision,contentHash:createHash("sha256").update(row.body).digest("hex"),title:row.title,text:row.body})),...sources.rows.map(row=>({recordId:row.id,recordType:"source" as const,revision:1,contentHash:row.content_hash,title:row.source_url??row.original_text?.split(/\r?\n/,1)[0]?.slice(0,240)??"Source",text:row.original_text??""}))].filter(item=>item.text.trim());
    if(!manifest.length)return"generation_scope_empty" as const;if(manifest.length>100||manifest.reduce((sum,item)=>sum+item.text.length,0)>1_000_000)return"generation_scope_too_large" as const;
    if(input.targetGeneratedNoteId){const target=await client.query("SELECT n.revision,n.body,g.kind FROM notes n JOIN generated_notes g ON g.note_id=n.id AND g.vault_id=n.vault_id WHERE n.vault_id=$1 AND n.id=$2 AND n.trashed_at IS NULL FOR SHARE OF n",[vaultId,input.targetGeneratedNoteId]);if(!target.rows[0])return"generated_note_not_found" as const;if(target.rows[0].revision!==input.expectedRevision)return"generated_note_stale" as const;if(target.rows[0].kind!==input.kind)return"generated_note_kind_mismatch" as const;if(replaceAiBlock(target.rows[0].body,"preview")===null)return"generated_note_ai_block_missing" as const;}
    const payload={type:"artifact_generation",kind:input.kind,instructions:input.instructions??null,outputLanguage:input.outputLanguage??null,targetGeneratedNoteId:input.targetGeneratedNoteId??null,expectedRevision:input.expectedRevision??null,sourceManifest:manifest},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await client.query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='artifact_generate' AND input_hash=$2 AND status IN ('waiting_for_worker','running','succeeded') ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]);if(prior.rows[0])return prior.rows[0];const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'artifact_generate','waiting_for_worker','awaiting_artifact_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,inputHash]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({kind:input.kind,sourceCount:manifest.length,targetGeneratedNoteId:input.targetGeneratedNoteId??null})]);return job.rows[0];});
  if(typeof assembled==="string")return reply.code(assembled.includes("not_found")?404:409).send({error:assembled});return reply.code(202).send(mapJobHandle(assembled));
});

app.get("/api/v1/vaults/:vaultId/search/suggestions",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const {prefix,limit:rawLimit}=request.query as {prefix?:string;limit?:string};idSchema.parse(vaultId);
  const normalized=prefix?.trim()??"",limit=rawLimit===undefined?10:Number(rawLimit);if(!normalized||normalized.length>200||!Number.isInteger(limit)||limit<1||limit>25)return reply.code(400).send({error:"invalid_search_suggestion_query"});
  const pattern=`${normalized.replace(/[\\%_]/g,value=>`\\${value}`)}%`;
  const [labels,notes,tasks,events]=await Promise.all([
    query("SELECT id,name FROM labels WHERE vault_id=$1 AND name ILIKE $2 ESCAPE '\\\\' ORDER BY lower(name),id LIMIT $3",[vaultId,pattern,limit]),
    query("SELECT id,title FROM notes WHERE vault_id=$1 AND deleted_at IS NULL AND title ILIKE $2 ESCAPE '\\\\' ORDER BY lower(title),id LIMIT $3",[vaultId,pattern,limit]),
    query("SELECT id,title FROM tasks WHERE vault_id=$1 AND deleted_at IS NULL AND title ILIKE $2 ESCAPE '\\\\' ORDER BY lower(title),id LIMIT $3",[vaultId,pattern,limit]),
    query("SELECT id,title FROM calendar_events WHERE vault_id=$1 AND trashed_at IS NULL AND title ILIKE $2 ESCAPE '\\\\' ORDER BY lower(title),id LIMIT $3",[vaultId,pattern,limit])
  ]);
  const titles=[...notes.rows.map(row=>({kind:"note" as const,id:row.id,title:row.title})),...tasks.rows.map(row=>({kind:"task" as const,id:row.id,title:row.title})),...events.rows.map(row=>({kind:"calendar_event" as const,id:row.id,title:row.title}))].sort((a,b)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id)).slice(0,limit);
  return searchSuggestionsSchema.parse({labels:labels.rows,titles,savedQueries:[]});
});

app.get("/api/v1/vaults/:vaultId/citations/:citationId",async(request,reply)=>{
  const {vaultId,citationId}=request.params as {vaultId:string;citationId:string};idSchema.parse(vaultId);if(!citationId||citationId.length>80)return reply.code(400).send({error:"invalid_citation_id"});
  const messages=await query("SELECT m.citations FROM chat_messages m JOIN chats c ON c.id=m.chat_id WHERE c.vault_id=$1 AND EXISTS(SELECT 1 FROM jsonb_array_elements(m.citations) item WHERE item->>'citationId'=$2) ORDER BY m.created_at DESC LIMIT 2",[vaultId,citationId]);
  if(!messages.rowCount)return reply.code(404).send({error:"citation_not_found"});if((messages.rowCount??0)>1)return reply.code(409).send({error:"citation_id_ambiguous"});
  const citation=(messages.rows[0].citations as Array<Record<string,unknown>>).find(item=>item.citationId===citationId);if(!citation)return reply.code(404).send({error:"citation_not_found"});
  if(citation.kind==="school_assessment"){
    const assessmentId=idSchema.parse(citation.assessmentId),citedRevision=Number(citation.revision),retainedQuote=String(citation.quote??"");
    const current=await query("SELECT title,revision,archived_at FROM school_assessments WHERE vault_id=$1 AND id=$2",[vaultId,assessmentId]);
    const row=current.rows[0],available=Boolean(row&&!row.archived_at);
    return resolvedCitationSchema.parse({kind:"school_assessment",assessmentId,citedRevision,currentRevision:row?.revision??null,title:String(citation.title??""),exactExcerpt:retainedQuote,currentAssessmentLink:available?{assessmentId,title:row.title,path:"/school"}:null,historical:!available||row.revision!==citedRevision});
  }
  const sourceId=idSchema.parse(citation.sourceId),noteId=idSchema.parse(citation.noteId),chunkId=idSchema.parse(citation.chunkId),citedRevision=Number(citation.revision),startOffset=Number(citation.startOffset),endOffset=Number(citation.endOffset),retainedQuote=String(citation.quote??"");
  const evidence=await query("SELECT s.id,s.kind,s.content_hash,s.original_text,n.id AS note_id,n.title,n.revision AS current_revision,n.deleted_at FROM sources s LEFT JOIN notes n ON n.id=$3 AND n.vault_id=$1 WHERE s.vault_id=$1 AND s.id=$2",[vaultId,sourceId,noteId]);const row=evidence.rows[0];
  if(!row)return reply.code(410).send({error:"citation_source_unavailable",sourceId,noteId,citedRevision,historical:true});
  const exact=typeof row.original_text==="string"?row.original_text.slice(startOffset,endOffset):retainedQuote;const currentAvailable=Boolean(row.note_id&&!row.deleted_at);
  return resolvedCitationSchema.parse({source:{id:row.id,kind:row.kind,contentHash:row.content_hash,available:true},revision:{noteId,citedRevision,currentRevision:row.current_revision??null},anchor:{chunkId,startOffset,endOffset},exactExcerpt:exact||retainedQuote,currentNoteLink:currentAvailable?{noteId,title:row.title,path:`/notes/${noteId}`} : null,historical:!currentAvailable||row.current_revision!==citedRevision});
});

app.post("/api/v1/vaults/:vaultId/search", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = searchRequestSchema.parse(request.body);
  if (input.cursor) return reply.code(400).send({ error: "cursor_not_supported_yet" });
  if (input.mode !== "lexical") {
    const kind = input.mode === "hybrid" ? "hybrid_search" : "semantic_search";
    const jobInput = { type: "search", query: input.query, mode: input.mode, scope: input.scope, limit: input.limit };
    const serialized = JSON.stringify(jobInput);
    const result = await transaction(async (client) => {
      const created = await client.query(
        `INSERT INTO jobs(vault_id, kind, status, stage, input, input_hash)
         VALUES ($1, $2, 'waiting_for_worker', 'awaiting_embedding_worker', $3::jsonb, $4) RETURNING *`,
        [vaultId, kind, serialized, createHash("sha256").update(serialized).digest("hex")]
      );
      await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, 1, 'accepted', $2::jsonb)", [created.rows[0].id, JSON.stringify({ status: "waiting_for_worker" })]);
      return created.rows[0];
    });
    return reply.code(202).send(mapJobHandle(result));
  }

  const kinds = new Set(input.scope.kinds);
  const result = await query(
    `WITH q AS (SELECT websearch_to_tsquery('simple', $2) AS terms),
     candidates AS (
       SELECT 'note'::text AS kind, n.id, n.title, n.body AS searchable_text, n.source_id,
              n.revision, n.updated_at, ts_rank_cd(n.search_vector, q.terms) AS score
       FROM notes n, q
       WHERE $3::boolean AND n.vault_id = $1 AND n.trashed_at IS NULL AND n.search_vector @@ q.terms
       UNION ALL
       SELECT 'task'::text, t.id, t.title, t.title, NULL::uuid, 1, t.updated_at,
              ts_rank_cd(to_tsvector('simple', t.title), q.terms)
       FROM tasks t, q
       WHERE $4::boolean AND t.vault_id = $1 AND to_tsvector('simple', t.title) @@ q.terms
       UNION ALL
       SELECT 'calendar_event'::text, e.id, e.title, e.title, NULL::uuid, 1, e.updated_at,
              ts_rank_cd(to_tsvector('simple', e.title), q.terms)
       FROM calendar_events e, q
       WHERE $5::boolean AND e.vault_id = $1 AND to_tsvector('simple', e.title) @@ q.terms
     )
     SELECT * FROM candidates ORDER BY score DESC, updated_at DESC, id LIMIT $6`,
    [vaultId, input.query, kinds.has("note"), kinds.has("task"), kinds.has("calendar_event"), input.limit]
  );
  return searchResultSchema.parse({
    mode: "lexical",
    query: input.query,
    items: result.rows.map((row) => ({
      kind: row.kind,
      id: row.id,
      title: row.title,
      excerpt: buildExcerpt(row.searchable_text, input.query),
      score: Number(row.score),
      sourceId: row.source_id,
      revision: row.revision,
      updatedAt: iso(row.updated_at)
    })),
    coverage: { kinds: input.scope.kinds, semanticAvailable: false },
    nextCursor: null
  });
});

app.get("/api/v1/vaults/:vaultId/jobs", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  const { kind, status } = request.query as { kind?: string; status?: string };
  idSchema.parse(vaultId);
  const values: unknown[] = [vaultId];
  const clauses = ["vault_id = $1"];
  if (kind) { values.push(kind); clauses.push(`kind = $${values.length}`); }
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  const result = await query(`SELECT * FROM jobs WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT 100`, values);
  return { items: result.rows.map(mapJob) };
});

app.get("/api/v1/vaults/:vaultId/jobs/:jobId", async (request, reply) => {
  const { vaultId, jobId } = request.params as { vaultId: string; jobId: string };
  idSchema.parse(vaultId); idSchema.parse(jobId);
  const result = await query("SELECT * FROM jobs WHERE vault_id = $1 AND id = $2", [vaultId, jobId]);
  if (!result.rows[0]) return reply.code(404).send({ error: "job_not_found" });
  return mapJob(result.rows[0]);
});

app.get("/api/v1/vaults/:vaultId/jobs/:jobId/events", async (request, reply) => {
  const { vaultId, jobId } = request.params as { vaultId: string; jobId: string };
  idSchema.parse(vaultId); idSchema.parse(jobId);
  const exists = await query("SELECT status FROM jobs WHERE vault_id = $1 AND id = $2", [vaultId, jobId]);
  if (!exists.rows[0]) return reply.code(404).send({ error: "job_not_found" });
  const header = request.headers["last-event-id"];
  let sequence = typeof header === "string" && /^\d+$/.test(header) ? Number(header) : 0;
  let closed = false;
  request.raw.on("close", () => { closed = true; });
  reply.hijack();
  reply.raw.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive",
    "x-accel-buffering": "no"
  });
  const deadline = Date.now() + 25_000;
  while (!closed && Date.now() < deadline) {
    const events = await query(
      `SELECT sequence, kind, data, created_at FROM job_events
       WHERE job_id = $1 AND sequence > $2 ORDER BY sequence LIMIT 100`,
      [jobId, sequence]
    );
    for (const row of events.rows) {
      const event = jobEventSchema.parse({ jobId, sequence: row.sequence, kind: row.kind, data: row.data, createdAt: iso(row.created_at) });
      reply.raw.write(`id: ${event.sequence}\nevent: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`);
      sequence = event.sequence;
    }
    const state = await query<{ status: string }>("SELECT status FROM jobs WHERE vault_id = $1 AND id = $2", [vaultId, jobId]);
    if (["succeeded", "failed", "cancelled", "superseded"].includes(state.rows[0]?.status ?? "")) break;
    if (!events.rowCount) reply.raw.write(": keep-alive\n\n");
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  if (!closed) reply.raw.end();
});

app.post("/api/v1/vaults/:vaultId/jobs/:jobId/cancel", async (request, reply) => {
  const { vaultId, jobId } = request.params as { vaultId: string; jobId: string };
  idSchema.parse(vaultId); idSchema.parse(jobId);
  const result = await transaction(async (client) => {
    const locked = await client.query("SELECT * FROM jobs WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, jobId]);
    const job = locked.rows[0];
    if (!job) return null;
    if (["succeeded", "failed", "cancelled", "superseded"].includes(job.status)) return job;
    const running = job.status === "running";
    const updated = await client.query(
      `UPDATE jobs SET cancel_requested = true, status = CASE WHEN status = 'running' THEN status ELSE 'cancelled' END,
       stage = CASE WHEN status = 'running' THEN 'cancellation_requested' ELSE 'cancelled' END,
       finished_at = CASE WHEN status = 'running' THEN finished_at ELSE now() END, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [jobId]
    );
    const sequence = await client.query<{ next: number }>("SELECT coalesce(max(sequence), 0) + 1 AS next FROM job_events WHERE job_id = $1", [jobId]);
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, $2, $3, $4::jsonb)", [jobId, sequence.rows[0].next, running ? "status" : "cancelled", JSON.stringify({ cancel_requested: true })]);
    if (job.kind === "answer_generation") await client.query(
      "UPDATE chat_messages SET status = $2, updated_at = now() WHERE id = $1",
      [job.input.assistantMessageId, running ? "running" : "cancelled"]
    );
    if (job.kind === "study_plan_generate" && !running) await client.query(
      "UPDATE study_plans SET status='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1 AND status='generating'",
      [job.input.studyPlanId]
    );
    if(job.kind==="study_attempt_feedback"&&!running)await client.query("UPDATE study_attempts SET feedback_status='failed',revision=revision+1,updated_at=now() WHERE id=$1 AND feedback_job_id=$2",[job.input.attemptId,jobId]);
    return updated.rows[0];
  });
  if (!result) return reply.code(404).send({ error: "job_not_found" });
  return mapJob(result);
});

app.post("/api/v1/vaults/:vaultId/jobs/:jobId/retry", async (request, reply) => {
  const { vaultId, jobId } = request.params as { vaultId: string; jobId: string };
  idSchema.parse(vaultId); idSchema.parse(jobId);
  const result = await transaction(async (client) => {
    const original = await client.query("SELECT * FROM jobs WHERE vault_id = $1 AND id = $2 FOR UPDATE", [vaultId, jobId]);
    const job = original.rows[0];
    if (!job) return null;
    if (job.status !== "failed" || !job.retryable || job.attempts >= job.max_attempts) return "not_retryable" as const;
    const created = await client.query(
      `INSERT INTO jobs(vault_id, kind, status, stage, input, input_hash, attempts, max_attempts, retried_from_job_id)
       VALUES ($1, $2, 'waiting_for_worker', 'awaiting_worker_retry', $3, $4, $5, $6, $7) RETURNING *`,
      [vaultId, job.kind, job.input, job.input_hash, job.attempts + 1, job.max_attempts, job.id]
    );
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, 1, 'accepted', $2::jsonb)", [created.rows[0].id, JSON.stringify({ retried_from_job_id: job.id })]);
    if (job.kind === "answer_generation") await client.query(
      "UPDATE chat_messages SET job_id = $2, status = 'waiting_for_worker', updated_at = now() WHERE id = $1",
      [job.input.assistantMessageId, created.rows[0].id]
    );
    if (job.kind === "study_plan_generate") await client.query(
      "UPDATE study_plans SET generation_job_id=$2,status='generating',revision=revision+1,updated_at=now() WHERE id=$1 AND status='generation_failed'",
      [job.input.studyPlanId, created.rows[0].id]
    );
    return created.rows[0];
  });
  if (!result) return reply.code(404).send({ error: "job_not_found" });
  if (result === "not_retryable") return reply.code(409).send({ error: "job_not_retryable" });
  return reply.code(202).send(mapJobHandle(result));
});

app.get("/api/v1/vaults/:vaultId/ai/policy",async(request)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM vault_ai_policies WHERE vault_id=$1",[vaultId]);return mapVaultAiPolicy(vaultId,result.rows[0]);});

app.post("/api/v1/vaults/:vaultId/ai/disclosure-preview",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=aiDisclosurePreviewInputSchema.parse(request.body);const connectionResult=await query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND disconnected_at IS NULL",[vaultId,input.providerConnectionId]);if(!connectionResult.rows[0])return reply.code(404).send({error:"ai_provider_connection_not_found"});const connection=mapIntegrationConnection(connectionResult.rows[0]);
  const supported=connection.capabilities.some(capability=>capability.key==="ai.inference"||capability.key.startsWith("ai."));if(!supported)return reply.code(409).send({error:"connection_has_no_registered_ai_capability"});
  const fields=[...new Set(input.scope.kinds.flatMap(kind=>kind==="note"?["note title","selected note text","approved source excerpts"]:kind==="task"?["task title","due date","effort estimate"]:kind==="calendar_event"?["event title","start and end time"]:kind==="school"?["selected lesson or assignment text","approved source excerpts"]:["explicitly selected profile facts"]))];
  const boundary={contentLeavesVault:true as const,fields,excludedCategories:["credentials and tokens","health data","grades unless separately authorized","private participant context","unselected sources"],providerReceives:`${connection.provider} through connection ${connection.id}`,noContentSentDuringPreview:true as const};
  const created=await query("INSERT INTO ai_disclosure_previews(vault_id,provider_connection_id,purpose,scope,limits,boundary) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb) RETURNING *",[vaultId,input.providerConnectionId,input.purpose,JSON.stringify(input.scope),JSON.stringify(input.limits),JSON.stringify(boundary)]);const row=created.rows[0];
  return aiDisclosurePreviewSchema.parse({id:row.id,vaultId,providerConnectionId:row.provider_connection_id,provider:connection.provider,purpose:row.purpose,scope:row.scope,limits:row.limits,boundary:row.boundary,expiresAt:iso(row.expires_at),createdAt:iso(row.created_at)});
});

app.put("/api/v1/vaults/:vaultId/ai/policy",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const session=await getOwnerSession(request);if(!session||!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=setVaultAiPolicySchema.parse(request.body);if(!localModelProfiles().some(profile=>profile.id===input.policy.local.profileId))return reply.code(400).send({error:"local_model_profile_not_allowlisted"});
  const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM vault_ai_policies WHERE vault_id=$1 FOR UPDATE",[vaultId]);const revision=current.rows[0]?.revision??0;if(revision!==input.expectedRevision)return "stale_ai_policy" as const;
    if(input.policy.cloud.enabled){if(!input.explicitConsent||!input.disclosurePreviewId)return "cloud_ai_requires_explicit_disclosure_consent" as const;const preview=await client.query("SELECT * FROM ai_disclosure_previews WHERE vault_id=$1 AND id=$2 AND provider_connection_id=$3 AND status='draft' AND expires_at>now() FOR UPDATE",[vaultId,input.disclosurePreviewId,input.policy.cloud.providerConnectionId]);if(!preview.rows[0]||!input.policy.purposes.includes(preview.rows[0].purpose))return "ai_disclosure_preview_missing_expired_or_mismatched" as const;const connection=await client.query("SELECT * FROM integration_connections WHERE vault_id=$1 AND id=$2 AND state='connected' AND disconnected_at IS NULL",[vaultId,input.policy.cloud.providerConnectionId]);const capabilities=(connection.rows[0]?.capabilities??[]) as Array<{key:string;mode:string;enabled:boolean;verifiedAt:string|null}>;if(!connection.rows[0]||!capabilities.some(capability=>capability.key==="ai.inference"&&capability.mode==="live_write"&&capability.enabled&&capability.verifiedAt))return "cloud_ai_provider_not_live_verified" as const;await client.query("UPDATE ai_disclosure_previews SET status='consumed',consumed_at=now() WHERE id=$1",[input.disclosurePreviewId]);}
    else if(input.policy.cloud.providerConnectionId!==null)return "disabled_cloud_policy_must_not_reference_provider" as const;
    const values=[vaultId,input.policy.local.enabled,input.policy.local.profileId,input.policy.cloud.enabled,input.policy.cloud.providerConnectionId,input.policy.purposes,JSON.stringify(input.policy.limits),JSON.stringify(input.policy.disclosure)];
    if(!current.rows[0])return (await client.query("INSERT INTO vault_ai_policies(vault_id,local_enabled,local_profile_id,cloud_enabled,cloud_connection_id,purposes,limits,disclosure) VALUES ($1,$2,$3,$4,$5,$6::text[],$7::jsonb,$8::jsonb) RETURNING *",values)).rows[0];return (await client.query("UPDATE vault_ai_policies SET local_enabled=$2,local_profile_id=$3,cloud_enabled=$4,cloud_connection_id=$5,purposes=$6::text[],limits=$7::jsonb,disclosure=$8::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *",values)).rows[0];});
  if(typeof updated==="string")return reply.code(409).send({error:updated});return mapVaultAiPolicy(vaultId,updated);
});

app.get("/api/v1/vaults/:vaultId/ai/status", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const [workers, queued, tests] = await Promise.all([
    query(
      `SELECT w.id, w.runtime_status, w.installed_profiles, w.last_seen_at,
              (SELECT max(j.last_heartbeat_at) FROM jobs j
               WHERE j.assigned_worker_id = w.id AND j.status = 'running'
                 AND j.lease_expires_at > now()) AS active_job_heartbeat_at
       FROM workers w JOIN worker_vault_access a ON a.worker_id = w.id
       WHERE a.vault_id = $1 AND w.revoked_at IS NULL AND w.paused = false`,
      [vaultId]
    ),
    query<{ count: string }>(
      "SELECT count(*)::text AS count FROM jobs WHERE vault_id = $1 AND status IN ('queued', 'waiting_for_worker', 'running') AND kind IN ('note_process', 'hybrid_search', 'semantic_search', 'ai_setup_test', 'index_rebuild', 'answer_generation', 'study_plan_generate', 'study_exercise_generate', 'study_attempt_feedback', 'transcript_analysis', 'artifact_generate')",
      [vaultId]
    ),
    query(
      `SELECT DISTINCT ON (input->>'modelProfileId') input->>'modelProfileId' AS profile_id, result
       FROM jobs WHERE vault_id = $1 AND kind = 'ai_setup_test' AND status = 'succeeded'
       ORDER BY input->>'modelProfileId', finished_at DESC`, [vaultId]
    )
  ]);
  const recent = (value: Date | string | null | undefined) => !!value && Date.now() - new Date(value).getTime() < 45_000;
  const freshWorkers = workers.rows.filter((worker) => recent(worker.last_seen_at) || recent(worker.active_job_heartbeat_at));
  const stateFor = (worker: typeof workers.rows[number]) => recent(worker.active_job_heartbeat_at) ? "busy" : worker.runtime_status === "available" ? "available" : worker.runtime_status === "busy" ? "busy" : "error";
  const installed = new Map<string, string | null>();
  for (const worker of freshWorkers) for (const profile of worker.installed_profiles as Array<{ model: string; digest: string }>) installed.set(profile.model, profile.digest);
  const profiles = localModelProfiles(installed);
  const testResults = tests.rows.map((row) => row.result).filter((result) => result?.type === "ai_setup_test");
  const capabilities = {
    generate: testResults.some((result) => result.completion === true),
    chat: testResults.some((result) => result.completion === true),
    embed: testResults.some((result) => result.embeddings === true),
    extract: testResults.some((result) => result.structuredOutput === true),
    classify: testResults.some((result) => result.structuredOutput === true)
  };
  let state: "worker_offline" | "model_missing" | "busy" | "available" | "error" = "worker_offline";
  if (freshWorkers.length) state = freshWorkers.some((worker) => stateFor(worker) === "available") ? "available" : freshWorkers.some((worker) => stateFor(worker) === "busy") ? "busy" : "error";
  if ((state === "available" || state === "busy") && profiles.some((profile) => !profile.installed)) state = "model_missing";
  return aiStatusSchema.parse({
    state,
    workers: workers.rows.map((worker) => ({
      id: worker.id,
      backend: config.LOCAL_CHAT_BACKEND === "openai_compatible" ? "mixed" : "ollama",
      state: freshWorkers.includes(worker) ? stateFor(worker) : "worker_offline",
      detail: freshWorkers.includes(worker) ? null : "heartbeat_stale"
    })),
    capabilities,
    availableModels: [...installed.keys()],
    queuedJobs: Number(queued.rows[0]?.count ?? 0),
    cloudFallbackEnabled: false
  });
});

app.get("/api/v1/ai/models", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session || session.auth_level !== "passkey") return reply.code(401).send({ error: "authentication_required" });
  const [workers, tests] = await Promise.all([
    query(`SELECT w.installed_profiles FROM workers w
           WHERE w.owner_id = $1 AND w.revoked_at IS NULL AND w.paused = false
             AND (w.last_seen_at > now() - interval '45 seconds' OR EXISTS (
               SELECT 1 FROM jobs j WHERE j.assigned_worker_id = w.id AND j.status = 'running'
                 AND j.lease_expires_at > now()
                 AND j.last_heartbeat_at > now() - interval '45 seconds'))`, [session.owner_id]),
    query(
      `SELECT DISTINCT ON (j.input->>'modelProfileId') j.input->>'modelProfileId' AS profile_id
       FROM jobs j JOIN vaults v ON v.id = j.vault_id
       WHERE v.owner_id = $1 AND j.kind = 'ai_setup_test' AND j.status = 'succeeded'
       ORDER BY j.input->>'modelProfileId', j.finished_at DESC`, [session.owner_id]
    )
  ]);
  const installed = new Map<string, string | null>();
  for (const worker of workers.rows) for (const profile of worker.installed_profiles as Array<{ model: string; digest: string }>) installed.set(profile.model, profile.digest);
  const tested = new Set(tests.rows.map((row) => row.profile_id));
  return { items: localModelProfiles(installed).map((profile) => modelProfileSchema.parse({ ...profile, tested: tested.has(profile.id) })) };
});

app.post("/api/v1/vaults/:vaultId/ai/tests", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = aiTestRequestSchema.parse(request.body);
  idSchema.parse(input.workerId);
  const profiles = localModelProfiles();
  if (!profiles.some((profile) => profile.id === input.modelProfileId)) return reply.code(400).send({ error: "model_profile_not_allowlisted" });
  const worker = await query(
    `SELECT w.* FROM workers w JOIN worker_vault_access a ON a.worker_id = w.id
     WHERE w.id = $1 AND a.vault_id = $2 AND w.revoked_at IS NULL AND w.paused = false AND 'ai_setup_test' = ANY(w.allowed_job_types)`,
    [input.workerId, vaultId]
  );
  if (!worker.rows[0]) return reply.code(404).send({ error: "worker_not_available_for_vault" });
  if (!(worker.rows[0].installed_profiles as Array<{ id: string }>).some((profile) => profile.id === input.modelProfileId)) return reply.code(409).send({ error: "model_not_reported_installed" });
  const jobInput = { type: "ai_setup_test", workerId: input.workerId, modelProfileId: input.modelProfileId };
  const serialized = JSON.stringify(jobInput);
  const result = await transaction(async (client) => {
    const created = await client.query(
      `INSERT INTO jobs(vault_id, kind, status, stage, input, input_hash)
       VALUES ($1, 'ai_setup_test', 'waiting_for_worker', 'awaiting_local_model_worker', $2::jsonb, $3) RETURNING *`,
      [vaultId, serialized, createHash("sha256").update(serialized).digest("hex")]
    );
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, 1, 'accepted', $2::jsonb)", [created.rows[0].id, JSON.stringify({ status: "waiting_for_worker", worker_id: input.workerId })]);
    return created.rows[0];
  });
  return reply.code(202).send(mapJobHandle(result));
});

app.get("/api/v1/vaults/:vaultId/index/status", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const [generation, indexed, pending, errors] = await Promise.all([
    query("SELECT * FROM index_generations WHERE vault_id = $1 AND status = 'active' ORDER BY activated_at DESC LIMIT 1", [vaultId]),
    query<{ count: string }>(
      `SELECT count(DISTINCT (c.note_id, c.note_revision))::text AS count
       FROM semantic_chunks c JOIN chunk_embeddings e ON e.chunk_id = c.id
       JOIN index_generations g ON g.id = e.generation_id AND c.generation_id = g.id
       WHERE c.vault_id = $1 AND g.status = 'active'`,
      [vaultId]
    ),
    query<{ count: string }>(
      `SELECT count(*)::text AS count FROM notes n JOIN sources s ON s.id = n.source_id
       WHERE n.vault_id = $1 AND n.trashed_at IS NULL AND nullif(btrim(s.original_text), '') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM semantic_chunks c JOIN index_generations g ON g.id = c.generation_id
                       WHERE c.note_id = n.id AND c.note_revision = n.revision AND g.status = 'active')`,
      [vaultId]
    ),
    query<{ count: string }>("SELECT count(*)::text AS count FROM index_generations WHERE vault_id = $1 AND status = 'failed'", [vaultId])
  ]);
  const current = generation.rows[0];
  return indexStatusSchema.parse({
    currentProfile: current?.model_profile_id ?? null,
    currentGenerationId: current?.id ?? null,
    chunkerVersion: current?.chunker_version ?? null,
    indexedRevisions: Number(indexed.rows[0]?.count ?? 0),
    pending: Number(pending.rows[0]?.count ?? 0),
    errors: Number(errors.rows[0]?.count ?? 0),
    semanticAvailable: Boolean(current)
  });
});

app.post("/api/v1/vaults/:vaultId/index/rebuild", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const input = rebuildIndexRequestSchema.parse(request.body);
  const embeddingProfile = localModelProfiles()
    .find((profile) => profile.id === input.modelProfileId && profile.capabilities.includes("embed"));
  if (!embeddingProfile) return reply.code(400).send({ error: "embedding_profile_not_allowlisted" });
  if (input.scope?.noteIds) {
    const owned = await query<{ count: string }>("SELECT count(*)::text AS count FROM notes WHERE vault_id = $1 AND id = ANY($2::uuid[])", [vaultId, input.scope.noteIds]);
    if (Number(owned.rows[0]?.count ?? 0) !== input.scope.noteIds.length) return reply.code(404).send({ error: "note_not_found" });
  }
  const result = await transaction(async (client) => {
    await client.query("SELECT id FROM vaults WHERE id = $1 FOR UPDATE", [vaultId]);
    const existing = await client.query(
      `SELECT * FROM jobs WHERE vault_id = $1 AND kind = 'index_rebuild'
       AND status IN ('queued', 'waiting_for_worker', 'running')
       ORDER BY created_at DESC LIMIT 1`, [vaultId]
    );
    if (existing.rows[0]) return existing.rows[0];
    const generation = await client.query(
      `INSERT INTO index_generations(vault_id, model_profile_id, embedding_dimension, chunker_version, status)
       VALUES ($1, $2, 1024, $3, 'building') RETURNING id`,
      [vaultId, input.modelProfileId, input.chunkerVersion]
    );
    const targets = await client.query(
      `SELECT n.id AS note_id, n.source_id, n.revision, s.content_hash
       FROM notes n JOIN sources s ON s.id = n.source_id
       WHERE n.vault_id = $1 AND n.trashed_at IS NULL AND nullif(btrim(s.original_text), '') IS NOT NULL
       AND ($2::uuid[] IS NULL OR n.id = ANY($2::uuid[])) ORDER BY n.id`,
      [vaultId, input.scope?.noteIds ?? null]
    );
    const jobInput = {
      type: "index_rebuild", generationId: generation.rows[0].id,
      modelProfileId: input.modelProfileId, chunkerVersion: input.chunkerVersion,
      notes: targets.rows.map((row) => ({ noteId: row.note_id, sourceId: row.source_id, revision: row.revision, contentHash: row.content_hash }))
    };
    const serialized = JSON.stringify(jobInput);
    const created = await client.query(
      `INSERT INTO jobs(vault_id, kind, status, stage, input, input_hash)
       VALUES ($1, 'index_rebuild', 'waiting_for_worker', 'awaiting_embedding_worker', $2::jsonb, $3) RETURNING *`,
      [vaultId, serialized, createHash("sha256").update(serialized).digest("hex")]
    );
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, 1, 'accepted', $2::jsonb)", [created.rows[0].id, JSON.stringify({ status: "waiting_for_worker", generation_id: generation.rows[0].id })]);
    return created.rows[0];
  });
  return reply.code(202).send(mapJobHandle(result));
});

app.post("/api/v1/worker/heartbeat", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const input = workerHeartbeatRequestSchema.parse(request.body);
  if (input.deviceId !== worker.id) return reply.code(403).send({ error: "worker_identity_mismatch" });
  const allowedProfiles = new Map(localModelProfiles().map((profile) => [profile.id, { model: profile.model, backend: profile.backend }]));
  if (input.installedProfiles.some((profile) => {
    const allowed = allowedProfiles.get(profile.id);
    return !allowed || allowed.model !== profile.model || allowed.backend !== profile.backend;
  })) return reply.code(400).send({ error: "unrecognized_model_profile" });
  await query(
    `UPDATE workers SET installed_profiles = $2::jsonb, capacity = $3::jsonb, runtime_status = $4,
     last_seen_at = now(), updated_at = now() WHERE id = $1`,
    [worker.id, JSON.stringify(input.installedProfiles), JSON.stringify(input.capacity), input.runtimeStatus]
  );
  return { serverTime: new Date().toISOString(), configRevision: worker.config_revision };
});

app.post("/api/v1/worker/jobs/claim", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const input = claimWorkerJobRequestSchema.parse(request.body);
  const supported = input.supportedJobTypes.filter((kind) => worker.allowed_job_types.includes(kind));
  if (!supported.length) return reply.code(204).send();
  const leaseToken = randomBytes(32).toString("base64url");
  const leaseExpiresAt = new Date(Date.now() + 60_000);
  const leased = await transaction(async (client) => {
    const expired = await client.query(
      `UPDATE jobs SET status = CASE WHEN cancel_requested THEN 'cancelled' WHEN attempts >= max_attempts THEN 'failed' ELSE 'waiting_for_worker' END,
       stage = CASE WHEN cancel_requested THEN 'cancelled' WHEN attempts >= max_attempts THEN 'lease_exhausted' ELSE 'lease_expired' END,
       error_code = CASE WHEN NOT cancel_requested AND attempts >= max_attempts THEN 'worker_lease_exhausted' ELSE error_code END,
       safe_error_detail = CASE WHEN NOT cancel_requested AND attempts >= max_attempts THEN 'The worker stopped before completing this job.' ELSE safe_error_detail END,
       assigned_worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, updated_at = now(),
       finished_at = CASE WHEN cancel_requested OR attempts >= max_attempts THEN now() ELSE finished_at END
       WHERE status = 'running' AND lease_expires_at < now() RETURNING id,kind,input,status,error_code`
    );
    const exhausted = await client.query(
      `UPDATE jobs SET status='failed',stage='lease_exhausted',error_code='worker_lease_exhausted',
       safe_error_detail='The worker stopped before completing this job.',finished_at=now(),updated_at=now()
       WHERE status='waiting_for_worker' AND attempts >= max_attempts RETURNING id,kind,input,status,error_code`
    );
    for (const terminal of [...expired.rows, ...exhausted.rows].filter((row) => row.status === 'failed' || row.status === 'cancelled')) {
      if (terminal.kind === 'index_rebuild') await client.query(
        "UPDATE index_generations SET status='failed' WHERE id=$1 AND status='building'",
        [terminal.input.generationId]
      );
      if (terminal.kind === 'answer_generation') await client.query(
        'UPDATE chat_messages SET status=$2,updated_at=now() WHERE id=$1',
        [terminal.input.assistantMessageId, terminal.status]
      );
      if (terminal.status === 'failed' && terminal.kind === 'study_plan_generate') await client.query(
        "UPDATE study_plans SET status='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1 AND status='generating'",
        [terminal.input.studyPlanId]
      );
      if (terminal.status === 'failed' && terminal.kind === 'study_exercise_generate' && terminal.input.activityId) await client.query(
        "UPDATE study_activities SET state='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1 AND generation_job_id=$2 AND state='generating'",
        [terminal.input.activityId, terminal.id]
      );
      if (terminal.status === 'failed' && terminal.kind === 'study_attempt_feedback') await client.query(
        "UPDATE study_attempts SET feedback_status='failed',revision=revision+1,updated_at=now() WHERE id=$1 AND feedback_job_id=$2",
        [terminal.input.attemptId, terminal.id]
      );
      const next = await client.query<{ sequence: number }>(
        'SELECT coalesce(max(sequence),0)::int+1 AS sequence FROM job_events WHERE job_id=$1', [terminal.id]
      );
      await client.query('INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,$2,$3,$4::jsonb)',
        [terminal.id, next.rows[0].sequence, terminal.status, JSON.stringify({ status: terminal.status, error_code: terminal.error_code })]);
    }
    const selected = await client.query(
      `SELECT j.* FROM jobs j JOIN worker_vault_access a ON a.vault_id = j.vault_id AND a.worker_id = $1
       WHERE j.status IN ('queued', 'waiting_for_worker') AND j.cancel_requested = false
       AND j.kind = ANY($2::text[]) AND j.attempts < j.max_attempts
       AND (j.kind NOT IN ('index_rebuild','hybrid_search','semantic_search') OR EXISTS (
         SELECT 1 FROM jobs t WHERE t.vault_id = j.vault_id AND t.kind = 'ai_setup_test' AND t.status = 'succeeded'
         AND t.input->>'workerId' = $1::text AND (t.result->>'embeddings')::boolean = true
       ))
       AND (j.kind <> 'answer_generation' OR (
         (j.input->>'actionType' = 'reminder' OR EXISTS (SELECT 1 FROM jobs t WHERE t.vault_id = j.vault_id AND t.kind = 'ai_setup_test' AND t.status = 'succeeded'
                 AND t.input->>'workerId' = $1::text AND (t.result->>'embeddings')::boolean = true))
         AND EXISTS (SELECT 1 FROM jobs t WHERE t.vault_id = j.vault_id AND t.kind = 'ai_setup_test' AND t.status = 'succeeded'
                     AND t.input->>'workerId' = $1::text AND (t.result->>'completion')::boolean = true AND (t.result->>'structuredOutput')::boolean = true)
       ))
       AND (j.kind NOT IN ('study_plan_generate','study_exercise_generate','study_attempt_feedback','transcript_analysis','artifact_generate','task_breakdown') OR EXISTS (
         SELECT 1 FROM jobs t WHERE t.vault_id=j.vault_id AND t.kind='ai_setup_test' AND t.status='succeeded'
         AND t.input->>'workerId'=$1::text AND (t.result->>'completion')::boolean=true AND (t.result->>'structuredOutput')::boolean=true
       ))
       ORDER BY CASE WHEN j.kind IN ('hybrid_search','semantic_search','ai_setup_test') THEN 0 ELSE 1 END, j.created_at
       FOR UPDATE OF j SKIP LOCKED LIMIT 1`,
      [worker.id, supported]
    );
    if (!selected.rows[0]) return null;
    const updated = await client.query(
      `UPDATE jobs SET status = 'running', stage = 'leased', assigned_worker_id = $2,
       lease_token_hash = $3, lease_expires_at = $4, last_heartbeat_at = now(),
       attempts = attempts + 1, started_at = coalesce(started_at, now()), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [selected.rows[0].id, worker.id, hashWorkerSecret(leaseToken), leaseExpiresAt]
    );
    const sequence = await client.query<{ next: number }>("SELECT coalesce(max(sequence), 0) + 1 AS next FROM job_events WHERE job_id = $1", [selected.rows[0].id]);
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, $2, 'status', $3::jsonb)", [selected.rows[0].id, sequence.rows[0].next, JSON.stringify({ status: "running", stage: "leased" })]);
    if (selected.rows[0].kind === "answer_generation") await client.query("UPDATE chat_messages SET status = 'running', updated_at = now() WHERE id = $1", [selected.rows[0].input.assistantMessageId]);
    return updated.rows[0];
  });
  if (!leased) return reply.code(204).send();
  return workerLeaseSchema.parse({ jobId: leased.id, vaultId: leased.vault_id, leaseToken, expiresAt: leaseExpiresAt.toISOString(), inputManifest: { kind: leased.kind, inputHash: leased.input_hash } });
});

app.get("/api/v1/worker/jobs/:jobId/input", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const leaseToken = request.headers["x-job-lease-token"];
  if (typeof leaseToken !== "string") return reply.code(401).send({ error: "job_lease_required" });
  const result = await query(
    `SELECT j.* FROM jobs j JOIN worker_vault_access a ON a.vault_id = j.vault_id AND a.worker_id = $2
     WHERE j.id = $1 AND j.assigned_worker_id = $2 AND j.status = 'running' AND j.lease_expires_at > now()`,
    [jobId, worker.id]
  );
  const job = result.rows[0];
  if (!job?.lease_token_hash || !leaseSecretMatches(leaseToken, job.lease_token_hash)) return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  let payload = job.input;
  if (job.kind === "note_process") {
    const source = await query<{ body: string }>(
      `SELECT r.body FROM note_revisions r JOIN notes n ON n.id = r.note_id
       WHERE n.vault_id = $1 AND n.source_id = $2 AND r.note_id = $3 AND r.revision = $4`,
      [job.vault_id, payload.sourceId, payload.noteId, payload.revision]
    );
    if (!source.rows[0]) return reply.code(409).send({ error: "job_input_stale" });
    payload = { ...payload, source: { contentHash: createHash("sha256").update(source.rows[0].body).digest("hex"), text: source.rows[0].body } };
  }
  if (job.kind === "study_plan_generate") {
    const plan = await query("SELECT status FROM study_plans WHERE id=$1 AND vault_id=$2", [payload.studyPlanId, job.vault_id]);
    if (plan.rows[0]?.status !== "generating") return reply.code(409).send({ error: "job_input_stale" });
    const manifest = payload.sourceManifest as Array<{ sourceId: string; contentHash: string }>;
    const sources = await query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [job.vault_id, manifest.map((item) => item.sourceId)]);
    const byId = new Map(sources.rows.map((row) => [row.id, row]));
    if (manifest.some((item) => byId.get(item.sourceId)?.content_hash !== item.contentHash || !byId.get(item.sourceId)?.original_text)) return reply.code(409).send({ error: "job_input_stale" });
    payload = { type: payload.type, studyPlanId: payload.studyPlanId, courseTitle: payload.courseTitle, assessmentTitle: payload.assessmentTitle, goals: payload.goals, deadline: payload.deadline, sources: manifest.map((item) => ({ sourceId: item.sourceId, contentHash: item.contentHash, text: byId.get(item.sourceId)!.original_text })) };
  }
  if(job.kind==="study_exercise_generate"){const manifest=payload.sourceManifest as Array<{sourceId:string;contentHash:string}>;const sources=await query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[job.vault_id,manifest.map(item=>item.sourceId)]);const byId=new Map(sources.rows.map(row=>[row.id,row]));if(sources.rowCount!==manifest.length||manifest.some(item=>byId.get(item.sourceId)?.content_hash!==item.contentHash||!byId.get(item.sourceId)?.original_text))return reply.code(409).send({error:"job_input_stale"});payload={type:payload.type,requestId:payload.requestId,mode:payload.mode,difficulty:payload.difficulty,count:payload.count,courseId:payload.courseId,language:payload.language??null,sources:manifest.map(item=>({sourceId:item.sourceId,contentHash:item.contentHash,text:byId.get(item.sourceId)!.original_text}))};}
  if(job.kind==="study_attempt_feedback"){const target=await query("SELECT a.*,e.prompt,e.answer,e.explanation,e.mode,e.source_snapshots,e.revision AS exercise_revision FROM study_attempts a JOIN study_exercises e ON e.id=a.exercise_id WHERE a.vault_id=$1 AND a.id=$2",[job.vault_id,payload.attemptId]);const row=target.rows[0];if(!row||row.revision!==payload.attemptRevision||row.exercise_revision!==payload.exerciseRevision||row.feedback_job_id!==job.id)return reply.code(409).send({error:"job_input_stale"});const manifest=payload.sourceManifest as Array<{sourceId:string;contentHash:string}>;const sources=await query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[job.vault_id,manifest.map(item=>item.sourceId)]);const byId=new Map(sources.rows.map(source=>[source.id,source]));if(sources.rowCount!==manifest.length||manifest.some(item=>byId.get(item.sourceId)?.content_hash!==item.contentHash||!byId.get(item.sourceId)?.original_text))return reply.code(409).send({error:"job_input_stale"});payload={type:payload.type,attemptId:payload.attemptId,exercise:{prompt:row.prompt,referenceAnswer:row.answer,explanation:row.explanation,mode:row.mode},attempt:{response:row.response,confidenceSelfReport:row.confidence_self_report},sources:manifest.map(item=>({sourceId:item.sourceId,contentHash:item.contentHash,text:byId.get(item.sourceId)!.original_text}))};}
  if(job.kind==="transcript_analysis"){const result=await query("SELECT s.current_revision,r.* FROM source_objects s JOIN source_object_revisions r ON r.source_object_id=s.id WHERE s.vault_id=$1 AND s.id=$2 AND r.id=$3 AND r.revision=$4 AND r.content_hash=$5 AND s.current_revision=r.revision AND s.excluded=false",[job.vault_id,payload.transcriptId,payload.sourceRevisionId,payload.sourceRevision,payload.contentHash]);const revision=result.rows[0],segments=revision?.metadata?.segments;if(!revision||!Array.isArray(segments)||!segments.length)return reply.code(409).send({error:"job_input_stale"});payload={type:"transcript_analysis",transcriptId:payload.transcriptId,sourceRevision:payload.sourceRevision,scope:payload.scope,segments:segments.map((segment:any)=>({id:segment.id,startMs:segment.startMs,endMs:segment.endMs,speakerLabel:segment.speaker?.label??"Unknown speaker",text:segment.text}))};}
  if(job.kind==="task_breakdown"){const task=await query("SELECT title,revision,completed,deleted_at FROM tasks WHERE vault_id=$1 AND id=$2",[job.vault_id,payload.taskId]);if(!task.rows[0]||task.rows[0].revision!==payload.taskRevision||task.rows[0].completed||task.rows[0].deleted_at)return reply.code(409).send({error:"job_input_stale"});const manifest=payload.sourceManifest as Array<{sourceId:string;contentHash:string}>;const sources=await query("SELECT id,content_hash,original_text FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[job.vault_id,manifest.map(item=>item.sourceId)]);const byId=new Map(sources.rows.map(row=>[row.id,row]));if(sources.rowCount!==manifest.length||manifest.some(item=>byId.get(item.sourceId)?.content_hash!==item.contentHash||!byId.get(item.sourceId)?.original_text))return reply.code(409).send({error:"job_input_stale"});payload={type:"task_breakdown",taskId:payload.taskId,taskRevision:payload.taskRevision,taskTitle:task.rows[0].title,maxSessionMinutes:payload.maxSessionMinutes,remainingWork:payload.remainingWork,sources:manifest.map(item=>({sourceId:item.sourceId,contentHash:item.contentHash,text:byId.get(item.sourceId)!.original_text}))};}
  return workerJobInputSchema.parse({ jobId: job.id, vaultId: job.vault_id, kind: job.kind, inputHash: job.input_hash, payload });
});

app.get("/api/v1/worker/jobs/:jobId/sources/:sourceId", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId, sourceId } = request.params as { jobId: string; sourceId: string };
  idSchema.parse(jobId); idSchema.parse(sourceId);
  const leaseToken = request.headers["x-job-lease-token"];
  if (typeof leaseToken !== "string") return reply.code(401).send({ error: "job_lease_required" });
  const leased = await query("SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND status = 'running' AND lease_expires_at > now()", [jobId, worker.id]);
  const job = leased.rows[0];
  if (!job?.lease_token_hash || !leaseSecretMatches(leaseToken, job.lease_token_hash)) return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  const manifest = job.kind === "note_process"
    ? [{ noteId: job.input.noteId, sourceId: job.input.sourceId, revision: job.input.revision }]
    : job.kind === "index_rebuild" ? job.input.notes : [];
  const allowed = manifest.find((item: { sourceId: string }) => item.sourceId === sourceId);
  if (!allowed) return reply.code(404).send({ error: "source_not_in_job_scope" });
  const source = await query<{ original_text: string; content_hash: string; note_id: string; revision: number }>(
    `SELECT s.original_text, s.content_hash, n.id AS note_id, n.revision
     FROM sources s JOIN notes n ON n.source_id = s.id
     WHERE s.id = $1 AND s.vault_id = $2 AND n.id = $3 AND n.revision = $4`,
    [sourceId, job.vault_id, allowed.noteId, allowed.revision]
  );
  if (!source.rows[0]) return reply.code(409).send({ error: "job_input_stale" });
  return workerSourceInputSchema.parse({ sourceId, noteId: source.rows[0].note_id, revision: source.rows[0].revision, contentHash: source.rows[0].content_hash, text: source.rows[0].original_text });
});

app.post("/api/v1/worker/jobs/:jobId/evidence", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const input = workerEvidenceRequestSchema.parse(request.body);
  const packet = await transaction(async (client) => {
    const leased = await client.query(
      "SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND kind = 'answer_generation' AND status = 'running' AND lease_expires_at > now() AND cancel_requested = false FOR UPDATE",
      [jobId, worker.id]
    );
    const job = leased.rows[0];
    if (!job?.lease_token_hash || !leaseSecretMatches(input.leaseToken, job.lease_token_hash)) return "invalid_lease" as const;
    if (job.input.mode !== "grounded") return "evidence_not_allowed_for_brainstorm" as const;
    const answerScope = new Set(job.input.scope.kinds as string[]);
    if (!answerScope.has("note") && !answerScope.has("school_assessment")) return { items: [] };
    const generation = await client.query(
      `SELECT g.* FROM index_generations g WHERE g.vault_id = $1 AND g.status = 'active'
       AND g.model_profile_id = $2 ORDER BY g.activated_at DESC LIMIT 1`, [job.vault_id, input.modelProfileId]
    );
    if (!generation.rows[0]) return "semantic_index_unavailable" as const;
    const workerProfile = await client.query<{ digest: string }>(
      `SELECT profile->>'digest' AS digest FROM workers w, jsonb_array_elements(w.installed_profiles) profile
       WHERE w.id = $1 AND profile->>'id' = $2`, [worker.id, input.modelProfileId]
    );
    if (workerProfile.rows[0]?.digest !== generation.rows[0].model_digest) return "embedding_model_digest_mismatch" as const;
    const ranked = answerScope.has("note") ? await client.query(
      `SELECT c.id AS chunk_id, c.note_id, n.source_id, c.note_revision, n.title, c.text, c.start_offset, c.end_offset
       FROM chunk_embeddings e JOIN semantic_chunks c ON c.id = e.chunk_id AND c.generation_id = e.generation_id
       JOIN notes n ON n.id = c.note_id AND n.revision = c.note_revision
       WHERE e.generation_id = $1 AND n.vault_id = $3 AND n.trashed_at IS NULL
       ORDER BY e.embedding <=> $2::vector, c.id LIMIT 32`,
      [generation.rows[0].id, `[${input.embedding.join(",")}]`, job.vault_id]
    ) : { rows: [] as Record<string, any>[] };
    await client.query("DELETE FROM job_evidence WHERE job_id = $1", [jobId]);
    const items: Array<{ citationId: string; title: string; text: string }> = [];
    if (answerScope.has("school_assessment") && isAssessmentQuestion(job.input.question)) {
      const assessments = await client.query(
        `SELECT a.id, a.revision, a.title, a.time_spec, a.material_scope, c.name AS course_name
         FROM school_assessments a JOIN school_courses c ON c.id = a.course_id
         WHERE a.vault_id = $1 AND a.archived_at IS NULL AND c.archived_at IS NULL
         ORDER BY a.updated_at DESC, a.id LIMIT 100`,
        [job.vault_id]
      );
      const assessmentCandidates = assessments.rows.map((row) => {
        const date = typeof row.time_spec?.date === "string" ? row.time_spec.date : "unknown";
        const scope = typeof row.material_scope?.description === "string" ? row.material_scope.description : "unknown";
        return { id: row.id as string, revision: row.revision as number, title: `${row.course_name} · ${row.title}`,
          text: `Course: ${row.course_name}\nAssessment: ${row.title}\nDate: ${date}\nDetails: ${scope}`.slice(0, 4000) };
      });
      for (const row of focusGroundedEvidence(job.input.question, assessmentCandidates, 3)) {
        const citationId = `c${String(items.length + 1).padStart(3, "0")}`;
        await client.query(
          `INSERT INTO job_evidence(job_id, citation_id, assessment_id, note_revision, title, text, start_offset, end_offset)
           VALUES ($1,$2,$3,$4,$5,$6,0,$7)`,
          [jobId, citationId, row.id, row.revision, row.title, row.text, row.text.length]
        );
        items.push({ citationId, title: row.title, text: row.text });
      }
    }
    const focused = focusGroundedEvidence(job.input.question, ranked.rows, 8);
    for (const row of focused) {
      const citationId = `c${String(items.length + 1).padStart(3, "0")}`;
      await client.query(
        `INSERT INTO job_evidence(job_id, citation_id, chunk_id, note_id, source_id, note_revision, title, text, start_offset, end_offset)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [jobId, citationId, row.chunk_id, row.note_id, row.source_id, row.note_revision, row.title, row.text, row.start_offset, row.end_offset]
      );
      items.push({ citationId, title: row.title, text: row.text });
    }
    return { items };
  });
  if (packet === "invalid_lease") return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  if (typeof packet === "string") return reply.code(409).send({ error: packet });
  return workerEvidencePacketSchema.parse(packet);
});

app.post("/api/v1/worker/jobs/:jobId/index-batches", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const input = workerIndexBatchSchema.parse(request.body);
  const accepted = await transaction(async (client) => {
    const leased = await client.query("SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND kind = 'index_rebuild' AND status = 'running' AND lease_expires_at > now() AND cancel_requested = false FOR UPDATE", [jobId, worker.id]);
    const job = leased.rows[0];
    if (!job?.lease_token_hash || !leaseSecretMatches(input.leaseToken, job.lease_token_hash)) return "invalid_lease" as const;
    if (input.generationId !== job.input.generationId) return "generation_mismatch" as const;
    const manifest = (job.input.notes as Array<{ noteId: string; sourceId: string; revision: number; contentHash: string }>).find((item) => item.noteId === input.noteId);
    if (!manifest || manifest.revision !== input.noteRevision || manifest.contentHash !== input.sourceHash) return "source_revision_mismatch" as const;
    const generation = await client.query("SELECT 1 FROM index_generations WHERE id = $1 AND vault_id = $2 AND status = 'building'", [input.generationId, job.vault_id]);
    if (!generation.rowCount) return "generation_not_building" as const;
    const source = await client.query<{ original_text: string; content_hash: string; revision: number }>(
      `SELECT s.original_text, s.content_hash, n.revision FROM sources s JOIN notes n ON n.source_id = s.id
       WHERE s.id = $1 AND s.vault_id = $2 AND n.id = $3 FOR UPDATE`,
      [manifest.sourceId, job.vault_id, manifest.noteId]
    );
    if (!source.rows[0] || source.rows[0].content_hash !== input.sourceHash || source.rows[0].revision !== input.noteRevision) return "source_revision_mismatch" as const;
    for (const chunk of input.chunks) {
      if (chunk.endOffset <= chunk.startOffset || source.rows[0].original_text.slice(chunk.startOffset, chunk.endOffset) !== chunk.text) return "chunk_anchor_mismatch" as const;
      if (createHash("sha256").update(chunk.text).digest("hex") !== chunk.contentHash) return "chunk_hash_mismatch" as const;
    }
    if (input.chunks[0]?.sequence === 0) await client.query("DELETE FROM semantic_chunks WHERE generation_id = $1 AND note_id = $2 AND note_revision = $3", [input.generationId, input.noteId, input.noteRevision]);
    const previous = await client.query<{ next_sequence: number }>(
      "SELECT coalesce(max(sequence) + 1, 0)::int AS next_sequence FROM semantic_chunks WHERE generation_id = $1 AND note_id = $2 AND note_revision = $3",
      [input.generationId, input.noteId, input.noteRevision]
    );
    const nextSequence = previous.rows[0].next_sequence;
    if (input.chunks.some((chunk, index) => chunk.sequence !== nextSequence + index)) return "chunk_sequence_mismatch" as const;
    for (const chunk of input.chunks) {
      const inserted = await client.query(
        `INSERT INTO semantic_chunks(generation_id, vault_id, note_id, note_revision, sequence, text, start_offset, end_offset, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [input.generationId, job.vault_id, input.noteId, input.noteRevision, chunk.sequence, chunk.text, chunk.startOffset, chunk.endOffset, chunk.contentHash]
      );
      const vector = `[${chunk.embedding.join(",")}]`;
      await client.query("INSERT INTO chunk_embeddings(generation_id, chunk_id, embedding) VALUES ($1, $2, $3::vector)", [input.generationId, inserted.rows[0].id, vector]);
    }
    return input.chunks.length;
  });
  if (accepted === "invalid_lease") return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  if (typeof accepted === "string") return reply.code(409).send({ error: accepted });
  return { acceptedChunks: accepted };
});

app.post("/api/v1/worker/jobs/:jobId/heartbeat", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const input = workerLeaseHeartbeatSchema.parse(request.body);
  const current = await query("SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND status = 'running' AND lease_expires_at > now()", [jobId, worker.id]);
  const job = current.rows[0];
  if (!job?.lease_token_hash || !leaseSecretMatches(input.leaseToken, job.lease_token_hash)) return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  const expiresAt = new Date(Date.now() + 60_000);
  const updated = await query(
    `UPDATE jobs SET stage = $3, progress = coalesce($4, progress), lease_expires_at = $5,
     last_heartbeat_at = now(), updated_at = now() WHERE id = $1 AND assigned_worker_id = $2 RETURNING cancel_requested`,
    [jobId, worker.id, input.stage, input.progress ?? null, expiresAt]
  );
  return { expiresAt: expiresAt.toISOString(), cancelRequested: updated.rows[0].cancel_requested };
});

app.post("/api/v1/worker/jobs/:jobId/events", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const input = workerProgressEventsSchema.parse(request.body);
  const accepted = await transaction(async (client) => {
    const locked = await client.query("SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND status = 'running' AND lease_expires_at > now() FOR UPDATE", [jobId, worker.id]);
    const job = locked.rows[0];
    if (!job?.lease_token_hash || !leaseSecretMatches(input.leaseToken, job.lease_token_hash)) return null;
    const last = await client.query<{ sequence: number }>("SELECT coalesce(max(sequence), 0)::int AS sequence FROM job_events WHERE job_id = $1", [jobId]);
    let next = last.rows[0].sequence + 1;
    if (input.sequence < next) return last.rows[0].sequence;
    if (input.sequence !== next) return "gap" as const;
    for (const event of input.events) {
      await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, $2, $3, $4::jsonb)", [jobId, next, event.kind, JSON.stringify(event)]);
      next += 1;
    }
    return next - 1;
  });
  if (accepted === null) return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  if (accepted === "gap") return reply.code(409).send({ error: "job_event_sequence_gap" });
  return { acceptedSequence: accepted };
});

app.post("/api/v1/worker/jobs/:jobId/complete", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const input = workerCompleteSchema.parse(request.body);
  const result = await transaction(async (client) => {
    const locked = await client.query("SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND status = 'running' AND lease_expires_at > now() FOR UPDATE", [jobId, worker.id]);
    const job = locked.rows[0];
    if (!job?.lease_token_hash || !leaseSecretMatches(input.leaseToken, job.lease_token_hash)) return "invalid_lease" as const;
    if (input.inputHash !== job.input_hash) return "input_hash_mismatch" as const;
    const expectedResult = job.kind === "note_process" ? "note_processing" : job.kind === "ai_setup_test" ? "ai_setup_test" : job.kind === "index_rebuild" ? "index_rebuild" : job.kind === "answer_generation" ? "worker_answer" : job.kind === "study_plan_generate" ? "worker_study_plan" : job.kind === "study_exercise_generate" ? "worker_study_exercises" : job.kind === "study_attempt_feedback" ? "worker_study_feedback" : job.kind === "transcript_analysis" ? "worker_transcript_analysis" : job.kind === "artifact_generate" ? "worker_artifact_generation" : job.kind === "task_breakdown" ? "worker_task_breakdown" : "search_embedding";
    if (input.result.type !== expectedResult) return "result_type_mismatch" as const;
    if (!["note_process", "ai_setup_test", "index_rebuild", "hybrid_search", "semantic_search", "answer_generation", "study_plan_generate", "study_exercise_generate", "study_attempt_feedback", "transcript_analysis", "artifact_generate", "task_breakdown"].includes(job.kind)) return "unsupported_completion" as const;
    let persistedResult: unknown = input.result;
    if (input.result.type === "note_processing") {
      if (input.result.noteId !== job.input.noteId || input.result.processedRevision !== job.input.revision) return "result_revision_mismatch" as const;
      const current = await client.query<{ revision: number; body: string; classification_locked: boolean; classification: NoteClassification | null; suggested_title: string | null; classified_revision: number | null; organization_revision: number }>("SELECT revision, body, classification_locked, classification, suggested_title, classified_revision, organization_revision FROM notes WHERE id = $1 AND vault_id = $2 AND trashed_at IS NULL FOR UPDATE", [job.input.noteId, job.vault_id]);
      if (!current.rows[0] || current.rows[0].revision !== job.input.revision) {
        const superseded = await client.query(
          `UPDATE jobs SET status = 'superseded', stage = 'stale_input', progress = NULL, result = NULL,
           assigned_worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, finished_at = now(), updated_at = now()
           WHERE id = $1 RETURNING *`, [jobId]
        );
        const sequence = await client.query<{ next: number }>("SELECT coalesce(max(sequence), 0) + 1 AS next FROM job_events WHERE job_id = $1", [jobId]);
        await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, $2, 'status', $3::jsonb)", [jobId, sequence.rows[0].next, JSON.stringify({ status: "superseded", stage: "stale_input" })]);
        return superseded.rows[0];
      }
      const nextClassification = applyClassificationResult({ classification: current.rows[0].classification, suggestedTitle: current.rows[0].suggested_title, classifiedRevision: current.rows[0].classified_revision, locked: current.rows[0].classification_locked }, input.result, job.input.revision);
      const applied = nextClassification.applied;
      await client.query(
        `UPDATE notes SET status = 'ready', classification = $2, suggested_title = $3,
         classified_revision = $4, updated_at = now() WHERE id = $1`,
        [job.input.noteId, nextClassification.classification, nextClassification.suggestedTitle, nextClassification.classifiedRevision]
      );
      const validCandidates=groundedReturnCandidates(current.rows[0].body,input.result.commitmentCandidates);
      persistedResult={...input.result,commitmentCandidates:validCandidates};
      const model = await client.query<{ digest: string }>(
        `SELECT profile->>'digest' AS digest FROM workers w, jsonb_array_elements(w.installed_profiles) profile
         WHERE w.id = $1 AND profile->>'id' = 'local-qwen-general'`, [worker.id]
      );
      const operation = await client.query(
        `INSERT INTO ai_operations(vault_id, note_id, job_id, kind, source_revision, model_profile_id, model_digest, prompt_version, result, inverse, applied)
         VALUES ($1,$2,$3,'classification',$4,'local-qwen-general',$5,'note-classification-v1',$6::jsonb,$7::jsonb,$8)
         ON CONFLICT(job_id, kind) DO UPDATE SET result = excluded.result RETURNING id`,
        [job.vault_id, job.input.noteId, jobId, job.input.revision, model.rows[0]?.digest ?? null, JSON.stringify(persistedResult), JSON.stringify({ classification: current.rows[0].classification, suggestedTitle: current.rows[0].suggested_title, classifiedRevision: current.rows[0].classified_revision, organizationRevision: current.rows[0].organization_revision }), applied]
      );
      for(const candidate of validCandidates)await client.query(
        `INSERT INTO note_commitment_candidates(vault_id,note_id,note_revision,evidence_quote,person_name,object_label,kind,condition_kind,source_operation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [job.vault_id,job.input.noteId,job.input.revision,candidate.evidenceQuote,candidate.personName,candidate.objectLabel,candidate.kind,candidate.conditionKind,operation.rows[0].id]
      );
      if (applied) {
        const rules = await client.query("SELECT * FROM routing_rules WHERE vault_id = $1 AND enabled = true ORDER BY priority, created_at", [job.vault_id]);
        let insertedLabels = 0;
        for (const rule of rules.rows) {
          const compiled = compileNoteFilter(rule.condition, 3);
          const matches = await client.query(`SELECT 1 FROM notes n WHERE n.id = $1 AND n.vault_id = $2 AND ${compiled.sql}`, [job.input.noteId, job.vault_id, ...compiled.values]);
          if (!matches.rowCount) continue;
          for (const labelId of rule.target_label_ids as string[]) {
            const inserted = await client.query(
              `INSERT INTO note_labels(note_id, label_id, locked, provenance, source_operation_id) VALUES ($1,$2,false,'rule',$3)
               ON CONFLICT(note_id, label_id) DO NOTHING RETURNING label_id`, [job.input.noteId, labelId, operation.rows[0].id]
            );
            insertedLabels += inserted.rowCount ?? 0;
          }
        }
        if (insertedLabels) await client.query("UPDATE notes SET organization_revision = organization_revision + 1, updated_at = now() WHERE id = $1", [job.input.noteId]);
        const effect = await client.query<{ organization_revision: number }>("SELECT organization_revision FROM notes WHERE id = $1", [job.input.noteId]);
        await client.query("UPDATE ai_operations SET effect_organization_revision = $2 WHERE id = $1", [operation.rows[0].id, effect.rows[0].organization_revision]);
      }
    }
    if (input.result.type === "index_rebuild") {
      const expected = (job.input.notes as Array<unknown>).length;
      if (input.result.indexedRevisions !== expected) return "indexed_revision_count_mismatch" as const;
      const indexed = await client.query<{ count: string }>(
        `SELECT count(DISTINCT (c.note_id, c.note_revision))::text AS count
         FROM semantic_chunks c JOIN chunk_embeddings e ON e.chunk_id = c.id AND e.generation_id = c.generation_id
         WHERE c.generation_id = $1`, [job.input.generationId]
      );
      if (Number(indexed.rows[0]?.count ?? 0) !== expected) return "index_generation_incomplete" as const;
      const workerProfile = await client.query<{ digest: string }>(
        `SELECT profile->>'digest' AS digest FROM workers w,
         jsonb_array_elements(w.installed_profiles) profile
         WHERE w.id = $1 AND profile->>'id' = $2`, [worker.id, job.input.modelProfileId]
      );
      if (!workerProfile.rows[0]?.digest) return "model_digest_missing" as const;
      await client.query("UPDATE index_generations SET status = 'superseded' WHERE vault_id = $1 AND status = 'active'", [job.vault_id]);
      const activated = await client.query(
        `UPDATE index_generations SET status = 'active', model_digest = $3, validated_at = now(), activated_at = now()
         WHERE id = $1 AND vault_id = $2 AND status = 'building' RETURNING id`,
        [job.input.generationId, job.vault_id, workerProfile.rows[0].digest]
      );
      if (!activated.rowCount) return "generation_not_building" as const;
    }
    if (input.result.type === "search_embedding") {
      if (input.result.query !== job.input.query || input.result.mode !== job.input.mode || input.result.modelProfileId !== "local-qwen-embedding") return "search_embedding_mismatch" as const;
      const generation = await client.query(
        `SELECT g.* FROM index_generations g WHERE g.vault_id = $1 AND g.status = 'active'
         AND g.model_profile_id = $2 ORDER BY g.activated_at DESC LIMIT 1`,
        [job.vault_id, input.result.modelProfileId]
      );
      if (!generation.rows[0]) return "semantic_index_unavailable" as const;
      const workerProfile = await client.query<{ digest: string }>(
        `SELECT profile->>'digest' AS digest FROM workers w, jsonb_array_elements(w.installed_profiles) profile
         WHERE w.id = $1 AND profile->>'id' = $2`, [worker.id, input.result.modelProfileId]
      );
      if (workerProfile.rows[0]?.digest !== generation.rows[0].model_digest) return "embedding_model_digest_mismatch" as const;
      const scopeKinds = new Set(job.input.scope.kinds as string[]);
      const semantic = scopeKinds.has("note") ? await client.query(
        `SELECT * FROM (
           SELECT DISTINCT ON (n.id) 'note'::text AS kind, n.id, n.title, c.text AS searchable_text,
                  n.source_id, n.revision, n.updated_at, 1 - (e.embedding <=> $2::vector) AS similarity
           FROM chunk_embeddings e JOIN semantic_chunks c ON c.id = e.chunk_id AND c.generation_id = e.generation_id
           JOIN notes n ON n.id = c.note_id AND n.revision = c.note_revision
           WHERE e.generation_id = $1 AND n.vault_id = $3 AND n.trashed_at IS NULL
           ORDER BY n.id, e.embedding <=> $2::vector
         ) best_per_note ORDER BY similarity DESC, updated_at DESC LIMIT 100`,
        [generation.rows[0].id, `[${input.result.embedding.join(",")}]`, job.vault_id]
      ) : { rows: [] as Record<string, any>[] };
      const lexical = job.input.mode === "hybrid" ? await client.query(
        `WITH q AS (SELECT websearch_to_tsquery('simple', $2) AS terms), candidates AS (
           SELECT 'note'::text AS kind, n.id, n.title, n.body AS searchable_text, n.source_id, n.revision, n.updated_at, ts_rank_cd(n.search_vector, q.terms) AS score FROM notes n, q
           WHERE $3::boolean AND n.vault_id = $1 AND n.trashed_at IS NULL AND n.search_vector @@ q.terms
           UNION ALL SELECT 'task', t.id, t.title, t.title, NULL::uuid, 1, t.updated_at, ts_rank_cd(to_tsvector('simple', t.title), q.terms) FROM tasks t, q
           WHERE $4::boolean AND t.vault_id = $1 AND to_tsvector('simple', t.title) @@ q.terms
           UNION ALL SELECT 'calendar_event', e.id, e.title, e.title, NULL::uuid, 1, e.updated_at, ts_rank_cd(to_tsvector('simple', e.title), q.terms) FROM calendar_events e, q
           WHERE $5::boolean AND e.vault_id = $1 AND to_tsvector('simple', e.title) @@ q.terms)
         SELECT * FROM candidates ORDER BY score DESC, updated_at DESC LIMIT 100`,
        [job.vault_id, job.input.query, scopeKinds.has("note"), scopeKinds.has("task"), scopeKinds.has("calendar_event")]
      ) : { rows: [] as Record<string, any>[] };
      const fused = reciprocalRankFusion(lexical.rows as RankedCandidate[], semantic.rows as RankedCandidate[], job.input.limit);
      const search = searchResultSchema.parse({
        mode: job.input.mode,
        query: job.input.query,
        items: fused.map((row) => ({
          kind: row.kind, id: row.id, title: row.title, excerpt: buildExcerpt(row.searchable_text, job.input.query), score: row.score,
          sourceId: row.source_id, revision: row.revision, updatedAt: iso(row.updated_at)
        })),
        coverage: { kinds: job.input.scope.kinds, semanticAvailable: true }, nextCursor: null
      });
      persistedResult = { type: "search", search };
    }
    if (input.result.type === "worker_answer") {
      if (input.result.chatId !== job.input.chatId || input.result.messageId !== job.input.assistantMessageId) return "answer_target_mismatch" as const;
      if (new Set(input.result.citationIds).size !== input.result.citationIds.length) return "duplicate_citation_id" as const;
      if (job.input.mode === "brainstorm" && input.result.citationIds.length) return "brainstorm_citations_not_allowed" as const;
      if (job.input.mode === "grounded" && input.result.insufficientEvidence && input.result.citationIds.length) return "insufficient_answer_has_citations" as const;
      if (job.input.mode === "grounded" && !input.result.insufficientEvidence && !input.result.citationIds.length) return "grounded_answer_requires_citation" as const;
      const assistant = await client.query(
        `SELECT m.* FROM chat_messages m JOIN chats c ON c.id = m.chat_id
         WHERE m.id = $1 AND m.chat_id = $2 AND m.job_id = $3 AND c.vault_id = $4 FOR UPDATE`,
        [job.input.assistantMessageId, job.input.chatId, jobId, job.vault_id]
      );
      if (!assistant.rows[0]) return "answer_target_missing" as const;
      const evidence = input.result.citationIds.length ? await client.query(
        `SELECT e.*, n.revision AS current_revision, s.original_text,
                a.revision AS current_assessment_revision, a.archived_at AS assessment_archived_at
         FROM job_evidence e
         LEFT JOIN notes n ON n.id = e.note_id
         LEFT JOIN sources s ON s.id = e.source_id
         LEFT JOIN school_assessments a ON a.id = e.assessment_id AND a.vault_id = $3
         WHERE e.job_id = $1 AND e.citation_id = ANY($2::text[]) ORDER BY e.citation_id`,
        [jobId, input.result.citationIds, job.vault_id]
      ) : { rows: [] as Record<string, any>[] };
      if (evidence.rows.length !== input.result.citationIds.length) return "citation_not_in_evidence_packet" as const;
      if (evidence.rows.some((row) => row.assessment_id
        ? row.current_assessment_revision !== row.note_revision || row.assessment_archived_at !== null
        : row.current_revision !== row.note_revision || typeof row.original_text !== "string" || row.original_text.slice(row.start_offset, row.end_offset) !== row.text)) return "citation_source_stale" as const;
      const byId = new Map(evidence.rows.map((row) => [row.citation_id, row]));
      const citations = input.result.citationIds.map((citationId) => {
        const row = byId.get(citationId)!;
        return row.assessment_id
          ? { citationId:`${jobId.replaceAll("-","")}.${citationId}`, kind:"school_assessment" as const, assessmentId:row.assessment_id, revision:row.note_revision, title:row.title, quote:row.text }
          : { citationId:`${jobId.replaceAll("-","")}.${citationId}`, kind:"note" as const, chunkId: row.chunk_id, noteId: row.note_id, sourceId: row.source_id, revision: row.note_revision, title: row.title, startOffset: row.start_offset, endOffset: row.end_offset, quote: row.text };
      });
      const sourceManifest = evidence.rows.map((row) => row.assessment_id
        ? { citationId:`${jobId.replaceAll("-","")}.${row.citation_id}`, kind:"school_assessment", assessmentId:row.assessment_id, revision:row.note_revision }
        : { citationId:`${jobId.replaceAll("-","")}.${row.citation_id}`, kind:"note", noteId: row.note_id, sourceId: row.source_id, revision: row.note_revision, chunkId: row.chunk_id });
      let answerText = input.result.answer;
      let actionReceipt: { calendarEventId: string; reminderId: string; remindAt: string } | null = null;
      if (job.input.actionType === "reminder" && isDirectReminderRequest(job.input.question)) {
        const requested = input.result.proposedReminder;
        const timezone = job.input.timezone;
        const validated = requested?.kind === "reminder" && typeof timezone === "string" && isSupportedTimezone(timezone) ? validateReminderProposal(job.input.question, requested, new Date(), timezone) : null;
        if (validated && typeof timezone === "string") {
          const calendarId = await writableCalendarId(client, job.vault_id, undefined, timezone);
          if (calendarId) {
            const end = new Date(Date.parse(validated.remindAt) + 60_000).toISOString();
            const event = await client.query(
              "INSERT INTO calendar_events(vault_id,calendar_id,title,starts_at,ends_at,private_context,timezone) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
              [job.vault_id, calendarId, `Reminder: ${validated.title}`, validated.remindAt, end, `Created from Brain message ${job.input.userMessageId}; local only.`, timezone]
            );
            await client.query(
              "INSERT INTO calendar_event_revisions(event_id,revision,title,starts_at,ends_at,timezone,actor_kind,changed_fields) VALUES ($1,1,$2,$3,$4,$5,'system',ARRAY['created','assistant_reminder'])",
              [event.rows[0].id, `Reminder: ${validated.title}`, validated.remindAt, end, timezone]
            );
            const reminder = await client.query(
              "INSERT INTO reminders(vault_id,calendar_event_id,title,remind_at,timezone,channel) VALUES ($1,$2,$3,$4,$5,'in_app') RETURNING id",
              [job.vault_id, event.rows[0].id, validated.title, validated.remindAt, timezone]
            );
            actionReceipt = { calendarEventId: event.rows[0].id, reminderId: reminder.rows[0].id, remindAt: validated.remindAt };
            const when = new Intl.DateTimeFormat("nb-NO", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }).format(new Date(validated.remindAt));
            answerText = `Scheduled “${validated.title}” in your Sorta calendar for ${when} (${timezone}). An in-app reminder is set. Nothing was written to an external calendar.`;
          }
        }
        if (!actionReceipt) answerText = "I couldn't schedule that reminder. Please give me a specific date and time; no reminder or calendar event was created.";
      }
      const updatedMessage = await client.query(
        `UPDATE chat_messages SET text = $2, status = 'succeeded', citations = $3::jsonb, source_manifest = $4::jsonb, updated_at = now()
         WHERE id = $1 RETURNING *`, [job.input.assistantMessageId, answerText, JSON.stringify(job.input.actionType === "reminder" ? [] : citations), JSON.stringify(job.input.actionType === "reminder" ? [] : sourceManifest)]
      );
      await client.query("UPDATE chats SET updated_at = now() WHERE id = $1", [job.input.chatId]);
      persistedResult = { type: "answer", chatId: job.input.chatId, messageId: job.input.assistantMessageId, answer: answerText, citations: updatedMessage.rows[0].citations, actionReceipt };
    }
    if (input.result.type === "worker_study_plan") {
      if (input.result.studyPlanId !== job.input.studyPlanId) return "study_plan_target_mismatch" as const;
      const planResult = await client.query("SELECT * FROM study_plans WHERE id=$1 AND vault_id=$2 FOR UPDATE", [job.input.studyPlanId, job.vault_id]);
      const plan = planResult.rows[0];
      if (!plan || plan.status !== "generating" || plan.generation_job_id !== jobId) return "study_plan_target_stale" as const;
      const manifest = job.input.sourceManifest as Array<{ sourceId: string; contentHash: string }>;
      const sources = await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])", [job.vault_id, manifest.map((item) => item.sourceId)]);
      const sourceHashes = new Map(sources.rows.map((row) => [row.id, row.content_hash]));
      if (sources.rowCount !== manifest.length || manifest.some((item) => sourceHashes.get(item.sourceId) !== item.contentHash)) {
        await client.query("UPDATE study_plans SET status='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1", [plan.id]);
        const superseded = await client.query(
          `UPDATE jobs SET status='superseded',stage='stale_input',progress=NULL,result=NULL,
           assigned_worker_id=NULL,lease_token_hash=NULL,lease_expires_at=NULL,finished_at=now(),updated_at=now()
           WHERE id=$1 RETURNING *`, [jobId]
        );
        const sequence = await client.query<{ next: number }>("SELECT coalesce(max(sequence),0)+1 AS next FROM job_events WHERE job_id=$1", [jobId]);
        await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,$2,'status',$3::jsonb)", [jobId, sequence.rows[0].next, JSON.stringify({ status: "superseded", stage: "stale_input" })]);
        return superseded.rows[0];
      }
      const allowedSources = new Set(manifest.map((item) => item.sourceId));
      if (input.result.units.some((unit) => unit.materialSourceIds.some((sourceId) => !allowedSources.has(sourceId)))) return "study_plan_source_not_authorized" as const;
      await client.query("DELETE FROM study_plan_units WHERE plan_id=$1", [plan.id]);
      for (const [sequence, unit] of input.result.units.entries()) {
        await client.query(
          `INSERT INTO study_plan_units(vault_id,plan_id,sequence,title,objective,kind,material_source_ids,estimated_minutes,estimate_origin)
           VALUES ($1,$2,$3,$4,$5,$6,$7::uuid[],$8,'model')`,
          [job.vault_id, plan.id, sequence, unit.title, unit.objective, unit.kind, unit.materialSourceIds, unit.estimatedMinutes]
        );
      }
      await client.query("UPDATE study_plans SET status='draft',revision=revision+1,updated_at=now() WHERE id=$1", [plan.id]);
      persistedResult = studyPlanGenerationResultSchema.parse({ type: "study_plan_generation", studyPlanId: plan.id, unitCount: input.result.units.length, taskIds: plan.task_ids, writesApplied: true });
    }
    if(input.result.type==="worker_study_exercises"){
      if(input.result.requestId!==job.input.requestId||input.result.exercises.length!==job.input.count)return "study_exercise_result_mismatch" as const;const manifest=job.input.sourceManifest as Array<{sourceId:string;contentHash:string}>;const sourceHashes=new Map(manifest.map(item=>[item.sourceId,item.contentHash]));const current=await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[job.vault_id,manifest.map(item=>item.sourceId)]);const currentHashes=new Map(current.rows.map(row=>[row.id,row.content_hash]));if(current.rowCount!==manifest.length||manifest.some(item=>currentHashes.get(item.sourceId)!==item.contentHash)){if(job.input.activityId)await client.query("UPDATE study_activities SET state='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1 AND generation_job_id=$2",[job.input.activityId,jobId]);const superseded=await client.query("UPDATE jobs SET status='superseded',stage='stale_input',assigned_worker_id=NULL,lease_token_hash=NULL,lease_expires_at=NULL,finished_at=now(),updated_at=now() WHERE id=$1 RETURNING *",[jobId]);return superseded.rows[0];}const exerciseIds:string[]=[];for(const exercise of input.result.exercises){if(exercise.materialSourceIds.some(id=>!sourceHashes.has(id)))return "study_source_not_authorized" as const;const snapshots=exercise.materialSourceIds.map(sourceId=>({sourceId,contentHash:sourceHashes.get(sourceId)!}));const inserted=await client.query("INSERT INTO study_exercises(vault_id,course_id,generation_job_id,mode,difficulty,status,prompt,answer,explanation,material_source_ids,source_snapshots,model_profile_id,prompt_version) VALUES ($1,$2,$3,$4,$5,'ready',$6,$7,$8,$9::uuid[],$10::jsonb,'local-qwen-general','study-exercise-v1') RETURNING id",[job.vault_id,job.input.courseId,jobId,job.input.mode,job.input.difficulty,exercise.prompt,exercise.answer,exercise.explanation,exercise.materialSourceIds,JSON.stringify(snapshots)]);exerciseIds.push(inserted.rows[0].id);}if(job.input.activityId)await client.query("UPDATE study_activities SET state='ready',revision=revision+1,updated_at=now() WHERE id=$1 AND generation_job_id=$2 AND state='generating'",[job.input.activityId,jobId]);persistedResult=studyExerciseGenerationResultSchema.parse({type:"study_exercise_generation",exerciseIds,writesApplied:true});
    }
    if(input.result.type==="worker_study_feedback"){
      if(input.result.attemptId!==job.input.attemptId)return "study_feedback_target_mismatch" as const;const targetResult=await client.query("SELECT a.*,e.material_source_ids,e.source_snapshots,e.revision AS exercise_revision FROM study_attempts a JOIN study_exercises e ON e.id=a.exercise_id WHERE a.vault_id=$1 AND a.id=$2 FOR UPDATE OF a",[job.vault_id,job.input.attemptId]);const target=targetResult.rows[0];if(!target||target.revision!==job.input.attemptRevision||target.exercise_revision!==job.input.exerciseRevision||target.feedback_job_id!==jobId)return "study_feedback_target_stale" as const;const snapshots=target.source_snapshots as Array<{sourceId:string;contentHash:string}>;const current=await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[job.vault_id,snapshots.map(item=>item.sourceId)]);const hashes=new Map(current.rows.map(row=>[row.id,row.content_hash]));if(current.rowCount!==snapshots.length||snapshots.some(item=>hashes.get(item.sourceId)!==item.contentHash))return "study_feedback_sources_stale" as const;const allowed=new Set(target.material_source_ids as string[]);if(input.result.feedback.materialSourceIds.some(id=>!allowed.has(id)))return "study_source_not_authorized" as const;await client.query("UPDATE study_attempts SET feedback_status='ready',feedback=$2::jsonb,revision=revision+1,updated_at=now() WHERE id=$1",[target.id,JSON.stringify(input.result.feedback)]);if(job.input.activityId)await client.query("UPDATE study_activities SET revision=revision+1,updated_at=now() WHERE id=$1 AND archived_at IS NULL",[job.input.activityId]);persistedResult=studyAttemptFeedbackResultSchema.parse({type:"study_attempt_feedback",attemptId:target.id,writesApplied:true});
    }
    if(input.result.type==="worker_transcript_analysis"){
      if(input.result.transcriptId!==job.input.transcriptId||input.result.sourceRevision!==job.input.sourceRevision||input.result.scope!==job.input.scope)return"transcript_analysis_target_mismatch" as const;const source=await client.query("SELECT s.current_revision,r.metadata FROM source_objects s JOIN source_object_revisions r ON r.source_object_id=s.id AND r.revision=s.current_revision WHERE s.vault_id=$1 AND s.id=$2 AND s.current_revision=$3 AND r.id=$4 AND r.content_hash=$5 AND s.excluded=false FOR SHARE OF s",[job.vault_id,job.input.transcriptId,job.input.sourceRevision,job.input.sourceRevisionId,job.input.contentHash]);const segments=source.rows[0]?.metadata?.segments;if(!Array.isArray(segments))return"transcript_analysis_source_stale" as const;const allowed=new Set(segments.map((segment:any)=>segment.id));if(input.result.sourceSegmentIds.some(id=>!allowed.has(id)))return"transcript_analysis_segment_not_authorized" as const;const artifact=await client.query("INSERT INTO transcript_analysis_artifacts(vault_id,source_object_id,source_revision,job_id,scope,content,source_segment_ids,model_profile_id,prompt_version) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::text[],'local-qwen-general','transcript-analysis-v1') RETURNING id",[job.vault_id,job.input.transcriptId,job.input.sourceRevision,jobId,job.input.scope,JSON.stringify(input.result.content),input.result.sourceSegmentIds]);persistedResult={type:"transcript_analysis",transcriptId:job.input.transcriptId,artifactId:artifact.rows[0].id,sourceRevision:job.input.sourceRevision,scope:job.input.scope,writesApplied:true};
    }
    if(input.result.type==="worker_artifact_generation"){
      if(input.result.kind!==job.input.kind)return"artifact_generation_kind_mismatch" as const;
      const manifest=job.input.sourceManifest as Array<{recordId:string;recordType:"note"|"source";revision:number;contentHash:string;title:string;text:string}>;
      const returnedIds=input.result.sourceRecordIds;
      if(new Set(returnedIds).size!==returnedIds.length)return"artifact_generation_duplicate_source" as const;
      const manifestById=new Map(manifest.map(item=>[item.recordId,item]));
      if(returnedIds.some(id=>!manifestById.has(id)))return"artifact_generation_source_not_authorized" as const;
      const noteManifest=manifest.filter(item=>item.recordType==="note"),sourceManifest=manifest.filter(item=>item.recordType==="source");
      const currentNotes=noteManifest.length?await client.query("SELECT id,revision,body FROM notes WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND trashed_at IS NULL FOR SHARE",[job.vault_id,noteManifest.map(item=>item.recordId)]):{rows:[] as Record<string,any>[],rowCount:0};
      const currentSources=sourceManifest.length?await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[]) FOR SHARE",[job.vault_id,sourceManifest.map(item=>item.recordId)]):{rows:[] as Record<string,any>[],rowCount:0};
      const notesById=new Map(currentNotes.rows.map(row=>[row.id,row])),sourcesById=new Map(currentSources.rows.map(row=>[row.id,row]));
      const stale=currentNotes.rowCount!==noteManifest.length||currentSources.rowCount!==sourceManifest.length||noteManifest.some(item=>{const row=notesById.get(item.recordId);return !row||row.revision!==item.revision||createHash("sha256").update(row.body).digest("hex")!==item.contentHash;})||sourceManifest.some(item=>sourcesById.get(item.recordId)?.content_hash!==item.contentHash);
      if(stale){const superseded=await client.query("UPDATE jobs SET status='superseded',stage='stale_input',progress=NULL,result=NULL,assigned_worker_id=NULL,lease_token_hash=NULL,lease_expires_at=NULL,finished_at=now(),updated_at=now() WHERE id=$1 RETURNING *",[jobId]);const sequence=await client.query<{next:number}>("SELECT coalesce(max(sequence),0)+1 AS next FROM job_events WHERE job_id=$1",[jobId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,$2,'status',$3::jsonb)",[jobId,sequence.rows[0].next,JSON.stringify({status:"superseded",stage:"stale_input"})]);return superseded.rows[0];}
      const usedManifest=returnedIds.map(id=>manifestById.get(id)!);
      let noteId:string,noteRevision:number,created:boolean;
      if(job.input.targetGeneratedNoteId){
        const targetResult=await client.query("SELECT n.*,g.kind AS generated_kind,g.revision AS generated_revision FROM notes n JOIN generated_notes g ON g.note_id=n.id AND g.vault_id=n.vault_id WHERE n.vault_id=$1 AND n.id=$2 AND n.trashed_at IS NULL FOR UPDATE OF n,g",[job.vault_id,job.input.targetGeneratedNoteId]);const target=targetResult.rows[0];
        if(!target||target.revision!==job.input.expectedRevision||target.generated_kind!==job.input.kind)return"artifact_generation_target_stale" as const;
        const body=replaceAiBlock(target.body,input.result.contentMarkdown);if(body===null)return"artifact_generation_ai_block_missing" as const;
        noteId=target.id;noteRevision=target.revision+1;created=false;const documentState=createDocumentState(body);
        await client.query("UPDATE notes SET body=$3,yjs_state=$4,revision=$5,status='ready',updated_at=now() WHERE vault_id=$1 AND id=$2",[job.vault_id,noteId,body,documentState,noteRevision]);
        await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,$2,$3,$4,$5,'ai')",[noteId,noteRevision,target.title,body,documentState]);
        await client.query("UPDATE generated_notes SET source_manifest=$2::jsonb,latest_job_id=$3,model_profile_id='local-qwen-general',prompt_version='artifact-generation-v1',revision=revision+1,updated_at=now() WHERE note_id=$1",[noteId,JSON.stringify(usedManifest),jobId]);
      }else{
        const body=wrapAiBlock(input.result.contentMarkdown),documentState=createDocumentState(body);created=true;noteRevision=1;
        const inserted=await client.query("INSERT INTO notes(vault_id,source_id,title,body,status,revision,yjs_state) VALUES ($1,NULL,$2,$3,'ready',1,$4) RETURNING id",[job.vault_id,input.result.title,body,documentState]);noteId=inserted.rows[0].id;
        await client.query("INSERT INTO note_revisions(note_id,revision,title,body,yjs_state,actor_kind) VALUES ($1,1,$2,$3,$4,'ai')",[noteId,input.result.title,body,documentState]);
        await client.query("INSERT INTO generated_notes(note_id,vault_id,kind,source_manifest,latest_job_id,model_profile_id,prompt_version) VALUES ($1,$2,$3,$4::jsonb,$5,'local-qwen-general','artifact-generation-v1')",[noteId,job.vault_id,job.input.kind,JSON.stringify(usedManifest),jobId]);
      }
      persistedResult=artifactGenerationResultSchema.parse({type:"artifact_generation",noteId,noteRevision,kind:job.input.kind,created,sourceRecordIds:returnedIds,writesApplied:true});
    }
    if(input.result.type==="worker_task_breakdown"){
      if(input.result.taskId!==job.input.taskId)return"task_breakdown_target_mismatch" as const;const task=await client.query("SELECT revision,completed,deleted_at FROM tasks WHERE vault_id=$1 AND id=$2 FOR SHARE",[job.vault_id,job.input.taskId]);const manifest=job.input.sourceManifest as Array<{sourceId:string;contentHash:string}>;const sources=await client.query("SELECT id,content_hash FROM sources WHERE vault_id=$1 AND id=ANY($2::uuid[])",[job.vault_id,manifest.map(item=>item.sourceId)]);const byId=new Map(sources.rows.map(row=>[row.id,row.content_hash]));if(!task.rows[0]||task.rows[0].revision!==job.input.taskRevision||task.rows[0].completed||task.rows[0].deleted_at||sources.rowCount!==manifest.length||manifest.some(item=>byId.get(item.sourceId)!==item.contentHash)){const superseded=await client.query("UPDATE jobs SET status='superseded',stage='stale_input',progress=NULL,result=NULL,assigned_worker_id=NULL,lease_token_hash=NULL,lease_expires_at=NULL,finished_at=now(),updated_at=now() WHERE id=$1 RETURNING *",[jobId]);const sequence=await client.query<{next:number}>("SELECT coalesce(max(sequence),0)+1 AS next FROM job_events WHERE job_id=$1",[jobId]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,$2,'status',$3::jsonb)",[jobId,sequence.rows[0].next,JSON.stringify({status:"superseded",stage:"stale_input"})]);return superseded.rows[0];}const allowed=new Set(manifest.map(item=>item.sourceId)),stepIds=new Set(input.result.steps.map(step=>step.stepId));if(stepIds.size!==input.result.steps.length||dependencyGraphHasCycle(input.result.steps)||input.result.steps.some(step=>step.sourceIds.some(id=>!allowed.has(id))||step.dependsOnStepIds.includes(step.stepId)||step.dependsOnStepIds.some(id=>!stepIds.has(id))||(job.input.maxSessionMinutes!==null&&step.estimatedMinutes>job.input.maxSessionMinutes)))return"task_breakdown_result_invalid" as const;persistedResult=taskBreakdownProposalResultSchema.parse({type:"task_breakdown_proposal",taskId:job.input.taskId,taskRevision:job.input.taskRevision,steps:input.result.steps.map(step=>({...step,estimateOrigin:"model" as const})),maxSessionMinutes:job.input.maxSessionMinutes,uncertainty:input.result.uncertainty,writesApplied:false});
    }
    const completed = await client.query(
      `UPDATE jobs SET status = 'succeeded', stage = 'completed', progress = 1, result = $2::jsonb,
       assigned_worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL, finished_at = now(), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [jobId, JSON.stringify(persistedResult)]
    );
    const sequence = await client.query<{ next: number }>("SELECT coalesce(max(sequence), 0) + 1 AS next FROM job_events WHERE job_id = $1", [jobId]);
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, $2, 'completed', $3::jsonb)", [jobId, sequence.rows[0].next, JSON.stringify({ status: "succeeded", result_type: input.result.type })]);
    return completed.rows[0];
  });
  if (result === "invalid_lease") return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  if (typeof result === "string") return reply.code(409).send({ error: result });
  return mapJob(result);
});

app.post("/api/v1/worker/jobs/:jobId/fail", async (request, reply) => {
  const worker = await requireWorker(request, reply);
  if (!worker) return;
  const { jobId } = request.params as { jobId: string };
  idSchema.parse(jobId);
  const input = workerFailSchema.parse(request.body);
  if (/https?:\/\/|bearer\s|password|token/i.test(input.safeDetail)) return reply.code(400).send({ error: "unsafe_error_detail" });
  const result = await transaction(async (client) => {
    const locked = await client.query("SELECT * FROM jobs WHERE id = $1 AND assigned_worker_id = $2 AND status = 'running' AND lease_expires_at > now() FOR UPDATE", [jobId, worker.id]);
    const job = locked.rows[0];
    if (!job?.lease_token_hash || !leaseSecretMatches(input.leaseToken, job.lease_token_hash)) return null;
    const willRetry = input.retryable && job.attempts < job.max_attempts && !job.cancel_requested;
    const status = job.cancel_requested ? "cancelled" : willRetry ? "waiting_for_worker" : "failed";
    const updated = await client.query(
      `UPDATE jobs SET status = $2, stage = $3, progress = NULL, error_code = $4, safe_error_detail = $5,
       retryable = $6, assigned_worker_id = NULL, lease_token_hash = NULL, lease_expires_at = NULL,
       finished_at = CASE WHEN $2 IN ('failed','cancelled') THEN now() ELSE NULL END, updated_at = now()
       WHERE id = $1 RETURNING *`,
      [jobId, status, willRetry ? "awaiting_worker_retry" : status, input.errorCode, input.safeDetail, input.retryable]
    );
    if (job.kind === "answer_generation") await client.query(
      "UPDATE chat_messages SET status = $2, updated_at = now() WHERE id = $1",
      [job.input.assistantMessageId, willRetry ? "waiting_for_worker" : status]
    );
    if (job.kind === "index_rebuild" && !willRetry) await client.query(
      "UPDATE index_generations SET status='failed' WHERE id=$1 AND status='building'",
      [job.input.generationId]
    );
    if (job.kind === "study_plan_generate" && !willRetry) await client.query(
      "UPDATE study_plans SET status='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1 AND status='generating'",
      [job.input.studyPlanId]
    );
    if(job.kind==="study_exercise_generate"&&job.input.activityId&&!willRetry)await client.query("UPDATE study_activities SET state='generation_failed',revision=revision+1,updated_at=now() WHERE id=$1 AND generation_job_id=$2 AND state='generating'",[job.input.activityId,jobId]);
    if(job.kind==="study_attempt_feedback"&&!willRetry){await client.query("UPDATE study_attempts SET feedback_status='failed',revision=revision+1,updated_at=now() WHERE id=$1 AND feedback_job_id=$2",[job.input.attemptId,jobId]);if(job.input.activityId)await client.query("UPDATE study_activities SET revision=revision+1,updated_at=now() WHERE id=$1 AND archived_at IS NULL",[job.input.activityId]);}
    const sequence = await client.query<{ next: number }>("SELECT coalesce(max(sequence), 0) + 1 AS next FROM job_events WHERE job_id = $1", [jobId]);
    await client.query("INSERT INTO job_events(job_id, sequence, kind, data) VALUES ($1, $2, $3, $4::jsonb)", [jobId, sequence.rows[0].next, status === "cancelled" ? "cancelled" : status === "failed" ? "failed" : "status", JSON.stringify({ status, error_code: input.errorCode, retryable: willRetry })]);
    return updated.rows[0];
  });
  if (!result) return reply.code(401).send({ error: "invalid_or_expired_job_lease" });
  return mapJob(result);
});

app.get("/api/v1/workers", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session || session.auth_level !== "passkey") return reply.code(401).send({ error: "authentication_required" });
  const workers = await query(
    `SELECT w.*, coalesce(array_agg(a.vault_id) FILTER (WHERE a.vault_id IS NOT NULL), ARRAY[]::uuid[]) AS vault_ids
     FROM workers w LEFT JOIN worker_vault_access a ON a.worker_id = w.id
     WHERE w.owner_id = $1 AND w.revoked_at IS NULL GROUP BY w.id ORDER BY w.created_at`,
    [session.owner_id]
  );
  return { items: workers.rows.map(mapWorker) };
});

app.patch("/api/v1/workers/:workerId", async (request, reply) => {
  const session = await getOwnerSession(request);
  if (!session || session.auth_level !== "passkey") return reply.code(401).send({ error: "authentication_required" });
  if (!hasRecentStrongAuthentication(session)) return reply.code(403).send({ error: "recent_strong_authentication_required" });
  const { workerId } = request.params as { workerId: string };
  idSchema.parse(workerId);
  const input = configureWorkerSchema.parse(request.body);
  const updated = await transaction(async (client) => {
    const locked = await client.query("SELECT * FROM workers WHERE id = $1 AND owner_id = $2 AND revoked_at IS NULL FOR UPDATE", [workerId, session.owner_id]);
    if (!locked.rows[0]) return "missing" as const;
    if (locked.rows[0].config_revision !== input.expectedRevision) return "stale" as const;
    if (input.vaultIds) {
      const owned = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM vaults WHERE owner_id = $1 AND id = ANY($2::uuid[])", [session.owner_id, input.vaultIds]);
      if (Number(owned.rows[0]?.count ?? 0) !== input.vaultIds.length) return "vault_missing" as const;
      await client.query("DELETE FROM worker_vault_access WHERE worker_id = $1", [workerId]);
      for (const vaultId of input.vaultIds) await client.query("INSERT INTO worker_vault_access(worker_id, vault_id) VALUES ($1, $2)", [workerId, vaultId]);
    }
    await client.query(
      `UPDATE workers SET allowed_job_types = coalesce($3, allowed_job_types), paused = coalesce($4, paused),
       resource_policy = coalesce($5, resource_policy), config_revision = config_revision + 1, updated_at = now()
       WHERE id = $1 AND owner_id = $2`,
      [workerId, session.owner_id, input.allowedJobTypes ?? null, input.paused ?? null, input.resourcePolicy ?? null]
    );
    const result = await client.query(
      `SELECT w.*, coalesce(array_agg(a.vault_id) FILTER (WHERE a.vault_id IS NOT NULL), ARRAY[]::uuid[]) AS vault_ids
       FROM workers w LEFT JOIN worker_vault_access a ON a.worker_id = w.id
       WHERE w.id = $1 GROUP BY w.id`, [workerId]
    );
    return result.rows[0];
  });
  if (updated === "missing") return reply.code(404).send({ error: "worker_not_found" });
  if (updated === "stale") return reply.code(409).send({ error: "stale_worker_revision" });
  if (updated === "vault_missing") return reply.code(404).send({ error: "vault_not_found" });
  return mapWorker(updated);
});

app.get("/api/v1/vaults/:vaultId/today", async (request) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const horizon={startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+24*60*60_000).toISOString()};
  const [tasks, events, notes, preferenceRows, scheduledFocus, occurrences] = await Promise.all([
    query("SELECT * FROM tasks WHERE vault_id = $1 AND completed = false AND deleted_at IS NULL ORDER BY due_at NULLS LAST, priority DESC, created_at LIMIT 100", [vaultId]),
    query("SELECT * FROM calendar_events WHERE vault_id = $1 AND trashed_at IS NULL AND ends_at >= now() AND starts_at < now() + interval '7 days' ORDER BY starts_at LIMIT 20", [vaultId]),
    query<{ count: string }>("SELECT count(*)::text AS count FROM notes WHERE vault_id = $1 AND trashed_at IS NULL", [vaultId]),
    query("SELECT * FROM scheduler_preferences WHERE vault_id=$1",[vaultId]),
    query("SELECT l.task_id,e.id AS event_id,e.starts_at,e.ends_at FROM scheduled_task_event_links l JOIN calendar_events e ON e.id=l.event_id JOIN tasks t ON t.id=l.task_id AND t.vault_id=$1 WHERE e.trashed_at IS NULL AND t.completed=false AND e.ends_at>$2 AND e.starts_at<$3 ORDER BY e.starts_at,e.id",[vaultId,horizon.startsAt,horizon.endsAt]),
    loadCalendarOccurrences(vaultId,horizon.startsAt,horizon.endsAt)
  ]);
  const taskItems = tasks.rows.map(mapTask);
  const preferences=preferenceRows.rows[0]?mapSchedulerPreferences(preferenceRows.rows[0]):defaultSchedulerPreferences(vaultId);
  const placement=selectNextActionPlacement({horizon,preferences,tasks:taskItems.map(task=>({id:task.id,remainingMinutes:task.remainingMinutes??task.estimatedMinutes,earliestStart:task.earliestStart,dueAt:task.dueAt,priority:task.priority,allowSplit:task.allowSplit,minBlockMinutes:task.minBlockMinutes,maxBlockMinutes:task.maxBlockMinutes})),scheduledFocus:scheduledFocus.rows.map(row=>({taskId:row.task_id,eventId:row.event_id,startsAt:iso(row.starts_at),endsAt:iso(row.ends_at)})),busy:occurrences.map(item=>({startsAt:item.startsAt,endsAt:item.endsAt}))});
  const nextTask=placement?taskItems.find(task=>task.id===placement.taskId)??null:null;
  const assignment=nextTask?await query("SELECT course_id,material_source_ids FROM school_assignments WHERE vault_id=$1 AND archived_at IS NULL AND $2::uuid=ANY(task_ids) ORDER BY created_at,id LIMIT 1",[vaultId,nextTask.id]):{rows:[] as Record<string,any>[]};
  return todaySchema.parse({
    nextAction: nextTask,
    nextActionPlan:placement&&nextTask?{...placement,task:nextTask,materialSourceIds:assignment.rows[0]?.material_source_ids??[],courseId:assignment.rows[0]?.course_id??null}:null,
    upcomingEvents: events.rows.map(mapEvent),
    dueTasks: taskItems.slice(0,20),
    noteCount: Number(notes.rows[0]?.count ?? 0)
  });
});

app.get("/api/v1/vaults/:vaultId/next-actions", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const raw = request.query as Record<string, string | undefined>;
  const availableRaw = raw.available_minutes ?? raw.availableMinutes;
  const input = nextActionQuerySchema.safeParse({
    availableMinutes: availableRaw === undefined ? null : Number(availableRaw),
    context: raw.context ?? "any",
    courseScope: raw.course_id ?? raw.course_scope ?? raw.courseScope ?? null,
    limit: raw.limit === undefined ? 5 : Number(raw.limit)
  });
  if (!input.success) return reply.code(400).send({ error: "invalid_next_action_query" });
  const at=raw.at?new Date(raw.at):new Date();if(Number.isNaN(at.getTime()))return reply.code(400).send({error:"invalid_recommendation_time"});
  const horizon = { startsAt: at.toISOString(), endsAt: new Date(at.getTime() + 24 * 60 * 60_000).toISOString() };
  const [tasks, preferenceRows, scheduledFocus, occurrences, assignments] = await Promise.all([
    query("SELECT * FROM tasks WHERE vault_id=$1 AND completed=false AND deleted_at IS NULL ORDER BY due_at NULLS LAST,priority DESC,created_at,id LIMIT 200", [vaultId]),
    query("SELECT * FROM scheduler_preferences WHERE vault_id=$1", [vaultId]),
    query("SELECT l.task_id,e.id AS event_id,e.starts_at,e.ends_at FROM scheduled_task_event_links l JOIN calendar_events e ON e.id=l.event_id JOIN tasks t ON t.id=l.task_id AND t.vault_id=$1 WHERE e.trashed_at IS NULL AND t.completed=false AND e.ends_at>$2 AND e.starts_at<$3 ORDER BY e.starts_at,e.id", [vaultId, horizon.startsAt, horizon.endsAt]),
    loadCalendarOccurrences(vaultId, horizon.startsAt, horizon.endsAt),
    query("SELECT course_id,material_source_ids,instructions_source_ids,task_ids FROM school_assignments WHERE vault_id=$1 AND archived_at IS NULL ORDER BY created_at,id", [vaultId])
  ]);
  const assignmentByTask = new Map<string, { courseId: string; materialSourceIds: string[] }>();
  for (const assignment of assignments.rows) for (const taskId of assignment.task_ids as string[]) if (!assignmentByTask.has(taskId)) assignmentByTask.set(taskId, { courseId: assignment.course_id, materialSourceIds: [...new Set([...(assignment.instructions_source_ids as string[]), ...(assignment.material_source_ids as string[])])] });
  const allTasks = tasks.rows.map(mapTask);
  const scopedTasks = input.data.courseScope ? allTasks.filter((task) => assignmentByTask.get(task.id)?.courseId === input.data.courseScope) : allTasks;
  const preferences = preferenceRows.rows[0] ? mapSchedulerPreferences(preferenceRows.rows[0]) : defaultSchedulerPreferences(vaultId);
  const selected = selectNextActionCandidates({
    horizon,
    preferences,
    availableMinutes: input.data.availableMinutes,
    limit: input.data.limit,
    tasks: scopedTasks.map((task) => ({ id: task.id, remainingMinutes: task.remainingMinutes ?? task.estimatedMinutes, earliestStart: task.earliestStart, dueAt: task.dueAt, priority: task.priority, allowSplit: task.allowSplit, minBlockMinutes: task.minBlockMinutes, maxBlockMinutes: task.maxBlockMinutes })),
    scheduledFocus: scheduledFocus.rows.map((row) => ({ taskId: row.task_id, eventId: row.event_id, startsAt: iso(row.starts_at), endsAt: iso(row.ends_at) })),
    busy: occurrences.map((item) => ({ startsAt: item.startsAt, endsAt: item.endsAt }))
  });
  const taskById = new Map(scopedTasks.map((task) => [task.id, task]));
  const contextApplied = input.data.context === "any";
  return nextActionSetSchema.parse({
    generatedAt: new Date().toISOString(),
    constraintsRevision: preferences.revision,
    availableMinutes: input.data.availableMinutes,
    context: input.data.context,
    contextApplied,
    courseScope: input.data.courseScope,
    candidates: selected.map((candidate) => ({ ...candidate, task: taskById.get(candidate.taskId), courseId: assignmentByTask.get(candidate.taskId)?.courseId ?? null, materialSourceIds: assignmentByTask.get(candidate.taskId)?.materialSourceIds ?? [] })),
    limitations: contextApplied ? ["Candidates use only current tasks, accepted local focus blocks, calendar busy time, and explicit scheduling constraints."] : [`No ${input.data.context.replaceAll("_", " ")} task-context metadata is stored, so that context filter was not applied.`]
  });
});

app.get("/api/v1/vaults/:vaultId/momentum/summary", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const raw = request.query as Record<string, string | undefined>;
  const parsed = momentumSummaryQuerySchema.safeParse({ dateFrom: raw.date_from ?? raw.dateFrom, dateTo: raw.date_to ?? raw.dateTo, courseId: raw.course_id ?? raw.courseId ?? null });
  if (!parsed.success) return reply.code(400).send({ error: "invalid_momentum_window" });
  const schedulerRows = await query("SELECT timezone FROM scheduler_preferences WHERE vault_id=$1", [vaultId]);
  const timezone = schedulerRows.rows[0]?.timezone ?? "Europe/Oslo";
  const dayAfterTo = new Date(Date.parse(`${parsed.data.dateTo}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);
  const from = instantFromWallClock(new Date(`${parsed.data.dateFrom}T00:00:00.000Z`), timezone).toISOString();
  const toExclusive = instantFromWallClock(new Date(`${dayAfterTo}T00:00:00.000Z`), timezone).toISOString();
  if (parsed.data.courseId) {
    const course = await query("SELECT id FROM school_courses WHERE vault_id=$1 AND id=$2", [vaultId, parsed.data.courseId]);
    if (!course.rowCount) return reply.code(404).send({ error: "momentum_course_not_found" });
  }
  const [preferenceRows, sessionRows] = await Promise.all([
    query("SELECT * FROM momentum_preferences WHERE vault_id=$1", [vaultId]),
    query("SELECT * FROM study_sessions WHERE vault_id=$1 AND ($2::uuid IS NULL OR course_id=$2) AND created_at<$4 AND (updated_at>=$3 OR state='active') ORDER BY created_at,id LIMIT 5001", [vaultId, parsed.data.courseId, from, toExclusive])
  ]);
  const truncated = sessionRows.rows.length > 5000;
  const sessions = sessionRows.rows.slice(0, 5000);
  const ids = sessions.map(row => row.id);
  const actionRows = ids.length ? await query("SELECT session_id,action,observed_at FROM study_session_actions WHERE vault_id=$1 AND session_id=ANY($2::uuid[]) AND observed_at>=$3 AND observed_at<$4 ORDER BY observed_at,id", [vaultId, ids, from, toExclusive]) : { rows: [] as Record<string, any>[] };
  const actionsBySession = new Map<string, Array<{ action: StudySessionAction; observedAt: string }>>();
  for (const row of actionRows.rows) {
    const current = actionsBySession.get(row.session_id) ?? [];
    current.push({ action: row.action as StudySessionAction, observedAt: iso(row.observed_at) });
    actionsBySession.set(row.session_id, current);
  }
  const preferences = preferenceRows.rows[0] ? mapMomentumPreferences(preferenceRows.rows[0]) : defaultMomentumPreferences(vaultId);
  const summary = buildMomentumSummary({
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    courseId: parsed.data.courseId,
    timezone,
    windowStartsAt: from,
    windowEndsAt: toExclusive,
    preferences,
    truncated,
    sessions: sessions.map(row => ({ id: row.id, courseId: row.course_id, createdAt: iso(row.created_at), estimatedMinutes: row.estimated_minutes, activeTimeSegments: row.active_time_segments as ActiveTimeSegment[], actions: actionsBySession.get(row.id) ?? [] }))
  });
  return momentumSummarySchema.parse({ ...summary, preferences });
});

app.patch("/api/v1/vaults/:vaultId/momentum/preferences", async (request, reply) => {
  const { vaultId } = request.params as { vaultId: string };
  idSchema.parse(vaultId);
  const revision = revisionFromIfMatch(request.headers["if-match"]);
  if (revision === null) return reply.code(428).send({ error: "if_match_required" });
  const input = updateMomentumPreferencesSchema.parse(request.body);
  const result = await transaction(async client => {
    const currentResult = await client.query("SELECT * FROM momentum_preferences WHERE vault_id=$1 FOR UPDATE", [vaultId]);
    const current = currentResult.rows[0];
    if (!current) {
      if (revision !== 0) return "stale_revision" as const;
      const locks = [...new Set(input.userLockedParameters ?? [])];
      const inserted = await client.query("INSERT INTO momentum_preferences(vault_id,enabled,evidence_window_days,min_observations,user_locked_parameters) VALUES ($1,$2,$3,$4,$5::text[]) ON CONFLICT (vault_id) DO NOTHING RETURNING *", [vaultId, input.enabled ?? false, input.evidenceWindowDays ?? 28, input.minObservations ?? 5, locks]);
      return inserted.rows[0] ?? "stale_revision" as const;
    }
    if (current.revision !== revision) return "stale_revision" as const;
    const locks = [...new Set(input.userLockedParameters ?? current.user_locked_parameters)];
    const updated = await client.query("UPDATE momentum_preferences SET enabled=$2,evidence_window_days=$3,min_observations=$4,user_locked_parameters=$5::text[],revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *", [vaultId, input.enabled ?? current.enabled, input.evidenceWindowDays ?? current.evidence_window_days, input.minObservations ?? current.min_observations, locks]);
    return updated.rows[0];
  });
  if (result === "stale_revision") return reply.code(409).send({ error: result });
  return mapMomentumPreferences(result);
});

app.get("/api/v1/vaults/:vaultId/insights",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {kind,limit:rawLimit}=request.query as {kind?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?50:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_insight_filter"});const result=await query("SELECT * FROM insights WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR kind=$2) ORDER BY window_end DESC,created_at DESC LIMIT $3",[vaultId,kind??null,limit]);return {items:result.rows.map(mapInsight),nextCursor:null};});
app.post("/api/v1/vaults/:vaultId/insights",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=generateInsightSchema.parse(request.body);const from=`${input.window.from}T00:00:00.000Z`,toExclusive=new Date(Date.parse(`${input.window.to}T00:00:00.000Z`)+86_400_000).toISOString();const [tasks,sessions,attendance,assessments,projects,ideas,events]=await Promise.all([query("SELECT id,revision,completed FROM tasks WHERE vault_id=$1 AND (completed=false OR updated_at>=$2) AND updated_at<$3",[vaultId,from,toExclusive]),query("SELECT id,revision,state,active_time_segments FROM study_sessions WHERE vault_id=$1 AND archived_at IS NULL AND updated_at>=$2 AND updated_at<$3",[vaultId,from,toExclusive]),query("SELECT id,revision,normalized_status FROM attendance_records WHERE vault_id=$1 AND archived_at IS NULL AND record_date>=$2::date AND record_date<=$3::date",[vaultId,input.window.from,input.window.to]),query("SELECT id,revision,time_spec FROM school_assessments WHERE vault_id=$1 AND archived_at IS NULL",[vaultId]),query("SELECT id,revision FROM projects WHERE vault_id=$1 AND archived_at IS NULL AND status='active'",[vaultId]),query("SELECT id,revision FROM ideas WHERE vault_id=$1 AND archived_at IS NULL AND state NOT IN ('dismissed','promoted')",[vaultId]),query("SELECT id,revision FROM calendar_events WHERE vault_id=$1 AND trashed_at IS NULL AND starts_at>=$2 AND starts_at<$3",[vaultId,from,toExclusive])]);const upcoming=assessments.rows.filter(row=>{const spec=row.time_spec;const value=spec.kind==="exact"?spec.dueAt:spec.kind==="date_only"?`${spec.date}T00:00:00.000Z`:null;return value&&value>=from;});const counts={tasksCompleted:tasks.rows.filter(row=>row.completed).length,tasksOpen:tasks.rows.filter(row=>!row.completed).length,studySessionsCompleted:sessions.rows.filter(row=>row.state==="completed").length,observedStudySeconds:sessions.rows.reduce((sum,row)=>sum+observedActiveSeconds(row.active_time_segments),0),attendanceKnown:attendance.rows.filter(row=>row.normalized_status!=="unknown").length,attendanceUnknown:attendance.rows.filter(row=>row.normalized_status==="unknown").length,absences:attendance.rows.filter(row=>row.normalized_status==="absent").length,upcomingAssessments:upcoming.length,activeProjects:projects.rowCount,openIdeas:ideas.rowCount,plannedCalendarEvents:events.rowCount,personalDataItems:0};const review=buildWeeklyReview(counts,input.scope);const ids:Record<string,string[]>={tasks:tasks.rows.map(row=>row.id),study:sessions.rows.map(row=>row.id),attendance:attendance.rows.map(row=>row.id),assessments:upcoming.map(row=>row.id),calendar:events.rows.map(row=>row.id)};const facts=review.facts.map(fact=>({...fact,evidenceIds:ids[fact.key.startsWith("tasks")?"tasks":fact.key.startsWith("observed_study")?"study":fact.key.startsWith("attendance")?"attendance":fact.key.startsWith("upcoming")?"assessments":"calendar"]}));const manifest=[...tasks.rows.map(row=>({objectType:"task",objectId:row.id,revision:row.revision})),...sessions.rows.map(row=>({objectType:"study_session",objectId:row.id,revision:row.revision})),...attendance.rows.map(row=>({objectType:"attendance_record",objectId:row.id,revision:row.revision})),...upcoming.map(row=>({objectType:"assessment",objectId:row.id,revision:row.revision})),...projects.rows.map(row=>({objectType:"project",objectId:row.id,revision:row.revision})),...ideas.rows.map(row=>({objectType:"idea",objectId:row.id,revision:row.revision})),...events.rows.map(row=>({objectType:"calendar_event",objectId:row.id,revision:row.revision}))];const created=await transaction(async client=>{const insight=await client.query("INSERT INTO insights(vault_id,kind,window_start,window_end,title,facts,coverage,suggestions,source_manifest,generator) VALUES ($1,'weekly_review',$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,'deterministic-weekly-review-v1') RETURNING *",[vaultId,input.window.from,input.window.to,`Weekly review · ${input.window.from} to ${input.window.to}`,JSON.stringify(facts),JSON.stringify(review.coverage),JSON.stringify(review.suggestions),JSON.stringify(manifest)]);const result=insightGenerationResultSchema.parse({type:"insight_generation",insightId:insight.rows[0].id,writesApplied:true});const jobInput=JSON.stringify({type:"weekly_review",...input});const job=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'insight_generate','succeeded','review_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,jobInput,createHash("sha256").update(jobInput).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[job.rows[0].id,JSON.stringify({kind:"weekly_review"}),JSON.stringify({insightId:insight.rows[0].id})]);return job.rows[0];});return reply.code(202).send(mapJobHandle(created));});
app.get("/api/v1/vaults/:vaultId/insights/:insightId",async(request,reply)=>{const {vaultId,insightId}=request.params as {vaultId:string;insightId:string};idSchema.parse(vaultId);idSchema.parse(insightId);const result=await query("SELECT * FROM insights WHERE vault_id=$1 AND id=$2",[vaultId,insightId]);if(!result.rows[0])return reply.code(404).send({error:"insight_not_found"});return mapInsight(result.rows[0]);});
app.patch("/api/v1/vaults/:vaultId/insights/:insightId",async(request,reply)=>{const {vaultId,insightId}=request.params as {vaultId:string;insightId:string};idSchema.parse(vaultId);idSchema.parse(insightId);const input=updateInsightSchema.parse(request.body);const result=await query("UPDATE insights SET state=$3,annotation=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$5 AND archived_at IS NULL RETURNING *",[vaultId,insightId,input.state,input.annotation,input.expectedRevision]);if(!result.rows[0])return reply.code(409).send({error:"insight_not_found_stale_or_archived"});return mapInsight(result.rows[0]);});
app.delete("/api/v1/vaults/:vaultId/insights/:insightId",async(request,reply)=>{const {vaultId,insightId}=request.params as {vaultId:string;insightId:string};idSchema.parse(vaultId);idSchema.parse(insightId);const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});const result=await query("UPDATE insights SET archived_at=now(),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL",[vaultId,insightId,revision]);if(!result.rowCount)return reply.code(409).send({error:"insight_not_found_stale_or_archived"});return reply.code(204).send();});

app.get("/api/v1/vaults/:vaultId/personal-data/policies",async(request)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM personal_data_policies WHERE vault_id=$1",[vaultId]);return mapPersonalDataPolicies(vaultId,result.rows[0]);});
app.put("/api/v1/vaults/:vaultId/personal-data/policies",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const session=await getOwnerSession(request);if(!session||!hasRecentStrongAuthentication(session))return reply.code(403).send({error:"recent_strong_authentication_required"});const input=setPersonalDataPoliciesSchema.parse(request.body);if(!isSupportedTimezone(input.policies.weeklySync.timezone))return reply.code(400).send({error:"unsupported_timezone"});const values=[vaultId,input.policies.enabledProviders,input.policies.analysisTypes,input.policies.retentionDays,JSON.stringify(input.policies.weeklySync),JSON.stringify(input.policies.privacy)];const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM personal_data_policies WHERE vault_id=$1 FOR UPDATE",[vaultId]);if((current.rows[0]?.revision??0)!==input.expectedRevision)return null;if(!current.rows[0])return (await client.query("INSERT INTO personal_data_policies(vault_id,enabled_providers,analysis_types,retention_days,weekly_sync,privacy) VALUES ($1,$2::text[],$3::text[],$4,$5::jsonb,$6::jsonb) RETURNING *",values)).rows[0];return (await client.query("UPDATE personal_data_policies SET enabled_providers=$2::text[],analysis_types=$3::text[],retention_days=$4,weekly_sync=$5::jsonb,privacy=$6::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *",values)).rows[0];});if(!updated)return reply.code(409).send({error:"stale_personal_data_policies"});return mapPersonalDataPolicies(vaultId,updated);});
app.post("/api/v1/vaults/:vaultId/personal-data/sync",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=syncSelectedPersonalDataSchema.parse(request.body),policy=(await query("SELECT * FROM personal_data_policies WHERE vault_id=$1",[vaultId])).rows[0];if(!policy||!(policy.enabled_providers as string[]).length)return reply.code(409).send({error:"personal_data_sync_policy_not_enabled"});const connections=await query<Record<string,any>>("SELECT id,provider,state,capabilities FROM integration_connections WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND disconnected_at IS NULL",[vaultId,input.connectionIds]);if(connections.rowCount!==input.connectionIds.length)return reply.code(409).send({error:"personal_data_connection_not_found_or_disconnected"});if(connections.rows.some(row=>!(policy.enabled_providers as string[]).includes(row.provider)))return reply.code(409).send({error:"personal_data_provider_not_enabled_by_policy"});const runKey=input.catchUpRunKey??randomUUID(),payload={type:"personal_data_sync",...input,runKey},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex"),prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='personal_data_sync' AND input->>'runKey'=$2",[vaultId,runKey]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"catch_up_run_key_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}const job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,error_code,safe_error_detail,retryable,attempts,finished_at) VALUES ($1,'personal_data_sync','failed','connector_adapters_unavailable',0,$2::jsonb,$3,'connector_adapters_unavailable','Selected provider adapters are not bound to an executable connector worker; no provider request was made.',false,1,now()) RETURNING *",[vaultId,serialized,inputHash]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'failed',$3::jsonb)",[created.rows[0].id,JSON.stringify({connectionIds:input.connectionIds,capabilities:input.capabilities,runKey}),JSON.stringify({errorCode:"connector_adapters_unavailable",providerRequestsMade:0})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});
app.get("/api/v1/vaults/:vaultId/personal-data/items",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const {provider,action,limit:rawLimit}=request.query as {provider?:string;action?:string;limit?:string};idSchema.parse(vaultId);const limit=rawLimit===undefined?100:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>200)return reply.code(400).send({error:"invalid_personal_data_filter"});const result=await query("SELECT * FROM personal_data_items WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR provider=$2) AND ($3::text IS NULL OR action_kind=$3) ORDER BY observed_at DESC NULLS LAST,created_at DESC LIMIT $4",[vaultId,provider??null,action??null,limit]);return {items:result.rows.map(mapPersonalDataItem),nextCursor:null};});
app.get("/api/v1/vaults/:vaultId/personal-data/items/:itemId",async(request,reply)=>{const {vaultId,itemId}=request.params as {vaultId:string;itemId:string};idSchema.parse(vaultId);idSchema.parse(itemId);const result=await query("SELECT * FROM personal_data_items WHERE vault_id=$1 AND id=$2",[vaultId,itemId]);if(!result.rows[0])return reply.code(404).send({error:"personal_data_item_not_found"});return mapPersonalDataItem(result.rows[0]);});
app.post("/api/v1/vaults/:vaultId/personal-data/import-preview",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=previewPersonalDataImportSchema.parse(request.body);const suppressed=await query("SELECT source_item_id FROM personal_data_suppressions WHERE vault_id=$1 AND provider=$2 AND account_label=$3",[vaultId,input.provider,input.accountLabel]);const normalized=summarizePersonalDataRecords(input.records,new Set(suppressed.rows.map(row=>row.source_item_id)));const result=await query("INSERT INTO personal_data_import_previews(vault_id,provider,account_label,export_format,records,summary) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb) RETURNING *",[vaultId,input.provider,input.accountLabel,input.exportFormat,JSON.stringify(normalized.unique),JSON.stringify(normalized.summary)]);return reply.code(201).send(mapPersonalDataPreview(result.rows[0]));});
app.get("/api/v1/vaults/:vaultId/personal-data/import-previews/:previewId",async(request,reply)=>{const {vaultId,previewId}=request.params as {vaultId:string;previewId:string};idSchema.parse(vaultId);idSchema.parse(previewId);const result=await query("SELECT * FROM personal_data_import_previews WHERE vault_id=$1 AND id=$2",[vaultId,previewId]);if(!result.rows[0])return reply.code(404).send({error:"personal_data_import_preview_not_found"});return mapPersonalDataPreview(result.rows[0]);});
app.post("/api/v1/vaults/:vaultId/personal-data/import-previews/:previewId/apply",async(request,reply)=>{const {vaultId,previewId}=request.params as {vaultId:string;previewId:string};idSchema.parse(vaultId);idSchema.parse(previewId);const input=applyPersonalDataImportSchema.parse(request.body);const receipt=await transaction(async client=>{const current=await client.query("SELECT * FROM personal_data_import_previews WHERE vault_id=$1 AND id=$2 FOR UPDATE",[vaultId,previewId]);const preview=current.rows[0];if(!preview)return "not_found" as const;if(preview.status!=="draft"||preview.revision!==input.expectedRevision||Date.parse(iso(preview.expires_at))<=Date.now())return "stale" as const;let insertedCount=0,duplicateCount=0,suppressedCount=0;for(const record of preview.records){const suppressed=await client.query("SELECT 1 FROM personal_data_suppressions WHERE vault_id=$1 AND provider=$2 AND account_label=$3 AND source_item_id=$4",[vaultId,preview.provider,preview.account_label,record.sourceItemId]);if(suppressed.rowCount){suppressedCount++;continue;}const inserted=await client.query("INSERT INTO personal_data_items(vault_id,provider,account_label,source_item_id,action_kind,observed_at,title,content_reference,url,metadata,coverage,import_preview_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12) ON CONFLICT (vault_id,provider,account_label,source_item_id,action_kind) DO NOTHING RETURNING id",[vaultId,preview.provider,preview.account_label,record.sourceItemId,record.actionKind,record.observedAt,record.title,record.contentReference,record.url,JSON.stringify(record.metadata),JSON.stringify(record.coverage),previewId]);if(inserted.rowCount)insertedCount++;else duplicateCount++;}const appliedAt=new Date().toISOString();await client.query("UPDATE personal_data_import_previews SET status='applied',applied_at=$3,revision=revision+1 WHERE vault_id=$1 AND id=$2",[vaultId,previewId,appliedAt]);return {previewId,insertedCount,duplicateCount,suppressedCount,appliedAt};});if(receipt==="not_found")return reply.code(404).send({error:"personal_data_import_preview_not_found"});if(receipt==="stale")return reply.code(409).send({error:"personal_data_import_preview_stale_applied_or_expired"});return receipt;});
app.delete("/api/v1/vaults/:vaultId/personal-data/items/:itemId",async(request,reply)=>{
  const {vaultId,itemId}=request.params as {vaultId:string;itemId:string};idSchema.parse(vaultId);idSchema.parse(itemId);
  const revision=revisionFromIfMatch(request.headers["if-match"]);if(revision===null)return reply.code(428).send({error:"if_match_required"});
  const removed=await transaction(async client=>{
    const current=await client.query("SELECT * FROM personal_data_items WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL FOR UPDATE",[vaultId,itemId,revision]);const item=current.rows[0];if(!item)return false;
    const affected=await client.query<{interest_id:string}>("SELECT interest_id FROM interest_evidence WHERE personal_data_item_id=$1",[itemId]);
    await client.query("INSERT INTO personal_data_suppressions(vault_id,provider,account_label,source_item_id,reason) VALUES ($1,$2,$3,$4,'owner_deleted_local_observation') ON CONFLICT DO NOTHING",[vaultId,item.provider,item.account_label,item.source_item_id]);
    await client.query("DELETE FROM interest_evidence WHERE personal_data_item_id=$1",[itemId]);
    await client.query("UPDATE personal_data_items SET archived_at=now(),revision=revision+1,updated_at=now() WHERE id=$1",[itemId]);
    if(item.observed_at)await client.query("UPDATE interests SET metric=jsonb_set(metric,'{denominator}',to_jsonb(greatest(0,(metric->>'denominator')::integer-1)),true),revision=revision+1,updated_at=now() WHERE vault_id=$1 AND archived_at IS NULL AND (metric->>'windowFrom')::timestamptz<=$2 AND (metric->>'windowTo')::timestamptz>$2",[vaultId,item.observed_at]);
    for(const row of affected.rows){
      const remaining=await client.query<{count:string;first_observed_at:Date|null;last_observed_at:Date|null}>("SELECT count(*)::text AS count,min(p.observed_at) AS first_observed_at,max(p.observed_at) AS last_observed_at FROM interest_evidence e JOIN personal_data_items p ON p.id=e.personal_data_item_id AND p.archived_at IS NULL WHERE e.interest_id=$1",[row.interest_id]);
      const count=Number(remaining.rows[0]?.count??0);const dates=remaining.rows[0];
      await client.query("UPDATE interests SET metric=jsonb_set(metric,'{count}',to_jsonb($2::integer),true),status=CASE WHEN status='tentative' AND $2<3 THEN 'retracted' ELSE status END,first_observed_at=$3,last_observed_at=$4,revision=revision+1,updated_at=now() WHERE id=$1 AND status<>'dismissed'",[row.interest_id,count,dates?.first_observed_at??null,dates?.last_observed_at??null]);
    }
    return true;
  });
  if(!removed)return reply.code(409).send({error:"personal_data_item_not_found_stale_or_archived"});return reply.code(204).send();
});

app.get("/api/v1/vaults/:vaultId/interests",async(request)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM interests WHERE vault_id=$1 AND archived_at IS NULL ORDER BY CASE status WHEN 'confirmed' THEN 0 WHEN 'corrected' THEN 1 WHEN 'tentative' THEN 2 WHEN 'retracted' THEN 3 ELSE 4 END,label,id",[vaultId]);return {items:await Promise.all(result.rows.map(row=>mapInterest(row))),nextCursor:null};});
app.get("/api/v1/vaults/:vaultId/personal-profile/interests",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};const raw=request.query as {state?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100||raw.state&&!['tentative','confirmed','corrected','dismissed','retracted'].includes(raw.state))return reply.code(400).send({error:"invalid_interest_claim_filter"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_interest_claim_cursor"});}}const result=await query("SELECT * FROM interests WHERE vault_id=$1 AND archived_at IS NULL AND ($2::text IS NULL OR status=$2) AND ($3::timestamptz IS NULL OR (created_at,id)<($3::timestamptz,$4::uuid)) ORDER BY created_at DESC,id DESC LIMIT $5",[vaultId,raw.state??null,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),last=rows.at(-1);return{items:await Promise.all(rows.map(row=>mapInterest(row))),nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.created_at),id:last.id}):null};});
app.get("/api/v1/vaults/:vaultId/interests/:interestId",async(request,reply)=>{const {vaultId,interestId}=request.params as {vaultId:string;interestId:string};idSchema.parse(vaultId);idSchema.parse(interestId);const result=await query("SELECT * FROM interests WHERE vault_id=$1 AND id=$2",[vaultId,interestId]);if(!result.rows[0])return reply.code(404).send({error:"interest_not_found"});return mapInterest(result.rows[0]);});
app.get("/api/v1/vaults/:vaultId/personal-profile/interests/:interestId/evidence",async(request,reply)=>{const {vaultId,interestId}=request.params as {vaultId:string;interestId:string};const raw=request.query as {cursor?:string;limit?:string};idSchema.parse(vaultId);idSchema.parse(interestId);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100)return reply.code(400).send({error:"invalid_interest_evidence_limit"});let before:{createdAt:string;id:string}|null=null;if(raw.cursor){try{before=decodeActivityCursor(raw.cursor);}catch{return reply.code(400).send({error:"invalid_interest_evidence_cursor"});}}const interest=await query("SELECT id FROM interests WHERE vault_id=$1 AND id=$2",[vaultId,interestId]);if(!interest.rows[0])return reply.code(404).send({error:"interest_not_found"});const result=await query("SELECT e.created_at AS linked_at,p.* FROM interest_evidence e JOIN personal_data_items p ON p.id=e.personal_data_item_id WHERE e.interest_id=$1 AND p.vault_id=$2 AND ($3::timestamptz IS NULL OR (e.created_at,p.id)<($3::timestamptz,$4::uuid)) ORDER BY e.created_at DESC,p.id DESC LIMIT $5",[interestId,vaultId,before?.createdAt??null,before?.id??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),last=rows.at(-1),items=rows.map(row=>interestEvidenceSchema.parse({personalDataItemId:row.id,interactionKind:row.action_kind,observedEventTime:row.observed_at?iso(row.observed_at):null,provider:row.provider,accountLabel:row.account_label,sourceItemId:row.source_item_id,title:row.title,contentReference:row.content_reference,sourceUrl:row.url,extractionLimits:row.coverage,fetchingContentProvesConsumption:false,linkedAt:iso(row.linked_at)}));return{items,nextCursor:hasMore&&last?encodeActivityCursor({createdAt:iso(last.linked_at),id:last.id}):null};});
app.patch("/api/v1/vaults/:vaultId/interests/:interestId",async(request,reply)=>{
  const {vaultId,interestId}=request.params as {vaultId:string;interestId:string};idSchema.parse(vaultId);idSchema.parse(interestId);const input=updateInterestSchema.parse(request.body);
  const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM interests WHERE vault_id=$1 AND id=$2 AND revision=$3 AND archived_at IS NULL FOR UPDATE",[vaultId,interestId,input.expectedRevision]);const interest=current.rows[0];if(!interest)return "stale" as const;
    if(input.action==="correct"){const normalized=input.value!.trim().toLocaleLowerCase();const duplicate=await client.query("SELECT 1 FROM interests WHERE vault_id=$1 AND normalized_label=$2 AND id<>$3",[vaultId,normalized,interestId]);if(duplicate.rowCount)return "duplicate" as const;const suppression={...(interest.suppression??{}),sourceNormalizedLabel:interest.suppression?.sourceNormalizedLabel??interest.normalized_label,correctedAt:new Date().toISOString()};return (await client.query("UPDATE interests SET label=$3,normalized_label=$4,status='corrected',owner_correction=$5,suppression=$6::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,interestId,input.value!.trim(),normalized,input.reason??`Corrected to ${input.value!.trim()}`,JSON.stringify(suppression)])).rows[0];}
    if(input.action==="dismiss"){const evidence=await client.query("SELECT personal_data_item_id FROM interest_evidence WHERE interest_id=$1 ORDER BY personal_data_item_id",[interestId]);const suppression={...(interest.suppression??{}),sourceNormalizedLabel:interest.suppression?.sourceNormalizedLabel??interest.normalized_label,dismissedAt:new Date().toISOString(),reason:input.reason??"Owner dismissed inferred interest",evidenceItemIds:evidence.rows.map(row=>row.personal_data_item_id)};return (await client.query("UPDATE interests SET status='dismissed',suppression=$3::jsonb,owner_correction=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,interestId,JSON.stringify(suppression),input.reason??null])).rows[0];}
    return (await client.query("UPDATE interests SET status='confirmed',owner_correction=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,interestId,input.reason??null])).rows[0];
  });
  if(updated==="stale")return reply.code(409).send({error:"interest_not_found_stale_or_archived"});if(updated==="duplicate")return reply.code(409).send({error:"interest_label_already_exists"});return mapInterest(updated);
});
app.post("/api/v1/vaults/:vaultId/personal-profile/interests/:interestId/decision",async(request,reply)=>{const {vaultId,interestId}=request.params as {vaultId:string;interestId:string};idSchema.parse(vaultId);idSchema.parse(interestId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=decideInterestClaimSchema.parse(request.body);const updated=await transaction(async client=>{const current=await client.query("SELECT * FROM interests WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL FOR UPDATE",[vaultId,interestId]);const interest=current.rows[0];if(!interest)return"not_found" as const;if(interest.revision!==expectedRevision)return"stale_revision" as const;if(interest.status==="dismissed"&&input.decision==="confirm")return"dismissed_evidence_cannot_reinstate" as const;if(input.decision==="correct"){const value=input.correctedValue!.trim(),normalized=value.toLocaleLowerCase();const duplicate=await client.query("SELECT 1 FROM interests WHERE vault_id=$1 AND normalized_label=$2 AND id<>$3",[vaultId,normalized,interestId]);if(duplicate.rowCount)return"interest_label_already_exists" as const;const suppression={...(interest.suppression??{}),sourceNormalizedLabel:interest.suppression?.sourceNormalizedLabel??interest.normalized_label,correctedAt:new Date().toISOString(),reason:input.reason??"Owner corrected inferred claim"};return(await client.query("UPDATE interests SET label=$3,normalized_label=$4,status='corrected',owner_correction=$5,suppression=$6::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,interestId,value,normalized,input.reason??`Corrected to ${value}`,JSON.stringify(suppression)])).rows[0];}if(input.decision==="dismiss"){const evidence=await client.query("SELECT personal_data_item_id FROM interest_evidence WHERE interest_id=$1 ORDER BY personal_data_item_id",[interestId]);const suppression={...(interest.suppression??{}),sourceNormalizedLabel:interest.suppression?.sourceNormalizedLabel??interest.normalized_label,dismissedAt:new Date().toISOString(),reason:input.reason??"Owner dismissed inferred interest",evidenceItemIds:evidence.rows.map(row=>row.personal_data_item_id)};return(await client.query("UPDATE interests SET status='dismissed',suppression=$3::jsonb,owner_correction=$4,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,interestId,JSON.stringify(suppression),input.reason??null])).rows[0];}return(await client.query("UPDATE interests SET status='confirmed',owner_correction=$3,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,interestId,input.reason??null])).rows[0];});if(updated==="not_found")return reply.code(404).send({error:"interest_not_found"});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapInterest(updated);});
app.post("/api/v1/vaults/:vaultId/personal-profile/refresh",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=refreshPersonalProfileSchema.parse(request.body);
  const rows=await query("SELECT id,action_kind,observed_at,metadata FROM personal_data_items WHERE vault_id=$1 AND archived_at IS NULL AND observed_at>=$2 AND observed_at<$3 ORDER BY observed_at,id",[vaultId,input.window.from,input.window.to]);
  const observations=rows.rows.map(row=>({id:row.id,actionKind:row.action_kind,observedAt:row.observed_at?iso(row.observed_at):null,metadata:row.metadata??{}}));const analysis=analyzeApprovedTopics(observations,input.approvedTopicLabels);
  const job=await transaction(async client=>{const interestIds:string[]=[];
    for(const candidate of analysis.interests){const existingResult=await client.query("SELECT * FROM interests WHERE vault_id=$1 AND (normalized_label=$2 OR suppression->>'sourceNormalizedLabel'=$2) ORDER BY created_at LIMIT 1 FOR UPDATE",[vaultId,candidate.normalizedLabel]);const existing=existingResult.rows[0];if(existing?.status==="dismissed")continue;
      const observed=candidate.items.map(item=>item.observedAt).filter((value):value is string=>Boolean(value)).sort();const actionKinds=[...new Set(candidate.items.map(item=>item.actionKind))];const metric={name:"deduplicated_observation_count",count:candidate.items.length,denominator:rows.rowCount,windowFrom:input.window.from,windowTo:input.window.to,actionKinds};
      let interestId:string;if(existing){const nextStatus=existing.status==="retracted"?"tentative":existing.status;const updated=await client.query("UPDATE interests SET label=CASE WHEN status IN ('confirmed','corrected') THEN label ELSE $3 END,status=$4,metric=$5::jsonb,first_observed_at=$6,last_observed_at=$7,revision=revision+1,updated_at=now() WHERE id=$1 AND vault_id=$2 RETURNING id",[existing.id,vaultId,candidate.label,nextStatus,JSON.stringify(metric),observed[0]??null,observed.at(-1)??null]);interestId=updated.rows[0].id;}else{const inserted=await client.query("INSERT INTO interests(vault_id,label,normalized_label,origin,status,metric,confidence_semantics,method_version,first_observed_at,last_observed_at) VALUES ($1,$2,$3,'inferred','tentative',$4::jsonb,'rule_threshold_not_probability','owner-approved-topic-count-v1',$5,$6) RETURNING id",[vaultId,candidate.label,candidate.normalizedLabel,JSON.stringify(metric),observed[0]??null,observed.at(-1)??null]);interestId=inserted.rows[0].id;}
      await client.query("DELETE FROM interest_evidence WHERE interest_id=$1",[interestId]);for(const item of candidate.items)await client.query("INSERT INTO interest_evidence(interest_id,personal_data_item_id) VALUES ($1,$2)",[interestId,item.id]);interestIds.push(interestId);
    }
    const result=profileRefreshResultSchema.parse({type:"profile_refresh",interestIds,skippedSparseTopics:analysis.skippedSparseTopics,blockedSensitiveTopics:analysis.blockedSensitiveTopics,writesApplied:true});const jobInput=JSON.stringify({type:"profile_refresh",...input});const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'profile_refresh','succeeded','profile_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,jobInput,createHash("sha256").update(jobInput).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({kind:"profile_refresh"}),JSON.stringify(result)]);return created.rows[0];
  });return reply.code(202).send(mapJobHandle(job));
});

app.post("/api/v1/vaults/:vaultId/personal-profile/rebuild",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=rebuildPersonalProfileSchema.parse(request.body),policy=(await query<Record<string,any>>("SELECT * FROM personal_data_policies WHERE vault_id=$1",[vaultId])).rows[0];if(!policy||policy.revision!==input.policyRevision)return reply.code(409).send({error:"personal_data_policy_missing_or_stale"});if(!policy.privacy?.allowProfileInference||!(policy.analysis_types as string[]).includes("interest_topics"))return reply.code(409).send({error:"profile_inference_not_enabled_by_policy"});if(input.sourceScope.providers.some(provider=>!(policy.enabled_providers as string[]).includes(provider)))return reply.code(409).send({error:"profile_source_provider_not_enabled"});const rows=await query<Record<string,any>>("SELECT id,action_kind,observed_at,metadata FROM personal_data_items WHERE vault_id=$1 AND archived_at IS NULL AND observed_at>=$2 AND observed_at<$3 AND (id=ANY($4::uuid[]) OR provider=ANY($5::text[])) ORDER BY observed_at,id",[vaultId,input.timeWindow.from,input.timeWindow.to,input.sourceScope.personalDataItemIds,input.sourceScope.providers]);if(input.sourceScope.personalDataItemIds.length){const returned=new Set(rows.rows.map(row=>row.id));if(input.sourceScope.personalDataItemIds.some(id=>!returned.has(id)))return reply.code(409).send({error:"profile_source_item_not_found_archived_or_outside_window"});}const interests=await query<Record<string,any>>("SELECT id,label,normalized_label FROM interests WHERE vault_id=$1 AND archived_at IS NULL AND status IN ('tentative','confirmed','corrected') ORDER BY id",[vaultId]);const observations=rows.rows.map(row=>({id:row.id,actionKind:row.action_kind,observedAt:row.observed_at?iso(row.observed_at):null,metadata:row.metadata??{}})),analysis=analyzeApprovedTopics(observations,interests.rows.map(row=>row.label)),byNormalized=new Map(interests.rows.map(row=>[row.normalized_label,row]));const result=profileRebuildProposalResultSchema.parse({type:"profile_rebuild_proposal",policyRevision:input.policyRevision,candidates:analysis.interests.flatMap(candidate=>{const current=byNormalized.get(candidate.normalizedLabel);return current?[{interestId:current.id,label:current.label,observationCount:candidate.items.length,evidenceItemIds:candidate.items.map(item=>item.id)}]:[];}),skippedSparseTopics:analysis.skippedSparseTopics,blockedSensitiveTopics:analysis.blockedSensitiveTopics,ownerLocksPreserved:true,writesApplied:false});const payload={type:"profile_rebuild",...input},serialized=JSON.stringify(payload),job=await transaction(async client=>{const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'profile_rebuild','succeeded','proposal_ready',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({policyRevision:input.policyRevision,sourceItemCount:rows.rowCount}),JSON.stringify(result)]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));});

app.get("/api/v1/vaults/:vaultId/source-objects",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const {connection_id:connectionId,kind,container_id:containerId,cursor,limit:rawLimit}=request.query as {connection_id?:string;kind?:string;container_id?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);if(connectionId)idSchema.parse(connectionId);if(cursor)idSchema.parse(cursor);const limit=rawLimit===undefined?50:Number(rawLimit);if(!Number.isInteger(limit)||limit<1||limit>100||kind&&kind.length>120||containerId&&containerId.length>500)return reply.code(400).send({error:"invalid_source_object_filter"});const result=await query("SELECT * FROM source_objects WHERE vault_id=$1 AND ($2::uuid IS NULL OR connection_id=$2) AND ($3::text IS NULL OR kind=$3) AND ($4::text IS NULL OR container_id=$4) AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6",[vaultId,connectionId??null,kind??null,containerId??null,cursor??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit),items=rows.map(mapSourceObject);return {items,nextCursor:hasMore?items.at(-1)!.id:null};
});

app.get("/api/v1/vaults/:vaultId/source-objects/:sourceId",async(request,reply)=>{
  const {vaultId,sourceId}=request.params as {vaultId:string;sourceId:string};const {revision_id:revisionId}=request.query as {revision_id?:string};idSchema.parse(vaultId);idSchema.parse(sourceId);if(revisionId)idSchema.parse(revisionId);const sourceResult=await query("SELECT * FROM source_objects WHERE vault_id=$1 AND id=$2",[vaultId,sourceId]);const source=sourceResult.rows[0];if(!source)return reply.code(404).send({error:"source_object_not_found"});const revisionResult=revisionId?await query("SELECT * FROM source_object_revisions WHERE source_object_id=$1 AND id=$2",[sourceId,revisionId]):await query("SELECT * FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2",[sourceId,source.current_revision]);const revision=revisionResult.rows[0];if(!revision)return reply.code(409).send({error:"source_object_revision_unavailable"});return sourceObjectDetailSchema.parse({source:mapSourceObject(source),selectedRevision:mapStoredSourceRevision(revision),current:revision.revision===source.current_revision,historical:revision.revision!==source.current_revision});
});

app.post("/api/v1/vaults/:vaultId/source-objects/:sourceId/refresh",async(request,reply)=>{
  const {vaultId,sourceId}=request.params as {vaultId:string;sourceId:string};idSchema.parse(vaultId);idSchema.parse(sourceId);const input=refreshSourceObjectSchema.parse(request.body??{}),rawKey=request.headers["idempotency-key"],idempotencyKey=Array.isArray(rawKey)?rawKey[0]:rawKey;if(!idempotencyKey||idempotencyKey.length<8||idempotencyKey.length>128)return reply.code(400).send({error:"idempotency_key_required"});const result=await query("SELECT s.*,c.state AS connection_state,c.capabilities FROM source_objects s JOIN integration_connections c ON c.id=s.connection_id AND c.disconnected_at IS NULL WHERE s.vault_id=$1 AND s.id=$2",[vaultId,sourceId]);const source=result.rows[0];if(!source)return reply.code(404).send({error:"source_object_not_found"});if(input.expectedRevision!==undefined&&input.expectedRevision!==source.revision)return reply.code(409).send({error:"stale_source_object_revision"});if(source.excluded)return reply.code(409).send({error:"source_object_excluded"});const live=(source.capabilities as Array<{mode:string;enabled:boolean;verifiedAt:string|null}>).some(capability=>capability.mode==="live_read"&&capability.enabled&&capability.verifiedAt);if(!live||source.connection_state!=="connected")return reply.code(409).send({error:"source_refresh_capability_unavailable",connectionState:source.connection_state});const payload={type:"source_refresh",sourceId,sourceRevision:source.revision,idempotencyKey},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='source_refresh' AND input->>'idempotencyKey'=$2",[vaultId,idempotencyKey]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"idempotency_key_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}const job=await transaction(async client=>{await client.query("UPDATE source_objects SET last_attempt_at=now(),freshness='stale',updated_at=now() WHERE id=$1",[sourceId]);const created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,error_code,safe_error_detail,retryable,attempts,finished_at) VALUES ($1,'source_refresh','failed','adapter_execution_unavailable',0,$2::jsonb,$3,'adapter_execution_unavailable','The registered provider adapter is not installed in this API process.',false,1,now()) RETURNING *",[vaultId,serialized,inputHash]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'failed',$3::jsonb)",[created.rows[0].id,JSON.stringify({sourceId}),JSON.stringify({errorCode:"adapter_execution_unavailable"})]);return created.rows[0];});return reply.code(202).send(mapJobHandle(job));
});

app.post("/api/v1/vaults/:vaultId/source-objects/:sourceId/exclusion",async(request,reply)=>{
  const {vaultId,sourceId}=request.params as {vaultId:string;sourceId:string};idSchema.parse(vaultId);idSchema.parse(sourceId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=sourceExclusionInputSchema.parse(request.body);const outcome=await transaction(async client=>{const current=await client.query("SELECT * FROM source_objects WHERE vault_id=$1 AND id=$2 AND revision=$3 FOR UPDATE",[vaultId,sourceId,expectedRevision]);const source=current.rows[0];if(!source)return null;const updated=await client.query("UPDATE source_objects SET excluded=$3,exclusion_reason=$4,access_state=CASE WHEN $3 THEN 'excluded' ELSE 'available' END,freshness=CASE WHEN $3 THEN 'stale' ELSE freshness END,revision=revision+1,updated_at=now() WHERE vault_id=$1 AND id=$2 RETURNING *",[vaultId,sourceId,input.excluded,input.reason]);let invalidated=false;if(input.excluded&&source.legacy_source_id){const removed=await client.query("DELETE FROM semantic_chunks WHERE vault_id=$1 AND note_id IN (SELECT id FROM notes WHERE vault_id=$1 AND source_id=$2)",[vaultId,source.legacy_source_id]);invalidated=Boolean(removed.rowCount);}return {row:updated.rows[0],invalidated};});if(!outcome)return reply.code(409).send({error:"source_object_not_found_or_stale"});return sourceExclusionSchema.parse({sourceObjectId:sourceId,excluded:outcome.row.excluded,reason:outcome.row.exclusion_reason,revision:outcome.row.revision,derivedIndexInvalidated:outcome.invalidated,updatedAt:iso(outcome.row.updated_at)});
});

app.get("/api/v1/vaults/:vaultId/transcripts",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const raw=request.query as {course_id?:string;lesson_id?:string;source?:string;cursor?:string;limit?:string};idSchema.parse(vaultId);if(raw.course_id)idSchema.parse(raw.course_id);if(raw.lesson_id)idSchema.parse(raw.lesson_id);if(raw.cursor)idSchema.parse(raw.cursor);const limit=raw.limit===undefined?50:Number(raw.limit);if(!Number.isInteger(limit)||limit<1||limit>100||raw.source&&raw.source.length>120)return reply.code(400).send({error:"invalid_transcript_filter"});const result=await query(`SELECT DISTINCT s.*,r.id AS selected_revision_id,r.revision AS selected_revision,r.content_hash AS selected_content_hash,r.exact_content AS selected_exact_content,r.metadata AS selected_metadata,r.attachment_blob_ids AS selected_attachment_blob_ids,r.fetched_at AS selected_fetched_at FROM source_objects s JOIN source_object_revisions r ON r.source_object_id=s.id AND r.revision=s.current_revision JOIN integration_connections c ON c.id=s.connection_id LEFT JOIN transcript_lesson_associations a ON a.source_object_id=s.id LEFT JOIN school_lessons l ON l.id=a.lesson_id WHERE s.vault_id=$1 AND s.excluded=false AND s.access_state='available' AND jsonb_typeof(r.metadata->'segments')='array' AND ($2::uuid IS NULL OR a.lesson_id=$2) AND ($3::uuid IS NULL OR l.course_id=$3) AND ($4::text IS NULL OR c.provider=$4 OR s.kind=$4) AND ($5::uuid IS NULL OR s.id>$5) ORDER BY s.id LIMIT $6`,[vaultId,raw.lesson_id??null,raw.course_id??null,raw.source??null,raw.cursor??null,limit+1]);const hasMore=result.rows.length>limit,rows=result.rows.slice(0,limit);const items=await Promise.all(rows.map(row=>mapTranscript(row,{id:row.selected_revision_id,source_object_id:row.id,revision:row.selected_revision,content_hash:row.selected_content_hash,exact_content:row.selected_exact_content,metadata:row.selected_metadata,attachment_blob_ids:row.selected_attachment_blob_ids,fetched_at:row.selected_fetched_at})));return{items,nextCursor:hasMore?items.at(-1)!.id:null};
});

app.get("/api/v1/vaults/:vaultId/transcripts/:transcriptId",async(request,reply)=>{const {vaultId,transcriptId}=request.params as {vaultId:string;transcriptId:string};const {revision_id:revisionId}=request.query as {revision_id?:string};idSchema.parse(vaultId);idSchema.parse(transcriptId);if(revisionId)idSchema.parse(revisionId);const sourceResult=await query("SELECT * FROM source_objects WHERE vault_id=$1 AND id=$2 AND excluded=false",[vaultId,transcriptId]);const source=sourceResult.rows[0];if(!source)return reply.code(404).send({error:"transcript_not_found"});const revisionResult=revisionId?await query("SELECT * FROM source_object_revisions WHERE source_object_id=$1 AND id=$2",[transcriptId,revisionId]):await query("SELECT * FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2",[transcriptId,source.current_revision]);const revision=revisionResult.rows[0];if(!revision||!Array.isArray(revision.metadata?.segments))return reply.code(404).send({error:"transcript_revision_not_found"});return mapTranscript(source,revision);});

app.patch("/api/v1/vaults/:vaultId/transcripts/:transcriptId",async(request,reply)=>{
  const {vaultId,transcriptId}=request.params as {vaultId:string;transcriptId:string};idSchema.parse(vaultId);idSchema.parse(transcriptId);const input=correctTranscriptSchema.parse(request.body);const outcome=await transaction(async client=>{const sourceResult=await client.query("SELECT * FROM source_objects WHERE vault_id=$1 AND id=$2 AND excluded=false FOR UPDATE",[vaultId,transcriptId]);const source=sourceResult.rows[0];if(!source)return null;if(source.current_revision!==input.expectedRevision)return"stale_transcript_revision" as const;const revisionResult=await client.query("SELECT * FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2",[transcriptId,source.current_revision]);const previous=revisionResult.rows[0],segments=structuredClone(previous.metadata?.segments);if(!Array.isArray(segments))return"transcript_segments_unavailable" as const;const byId=new Map(segments.map((segment:any)=>[segment.id,segment])),editIds=input.segmentEdits.map(item=>item.segmentId),speakerIds=input.speakerLabelCorrections.map(item=>item.segmentId);if(new Set(editIds).size!==editIds.length||new Set(speakerIds).size!==speakerIds.length)return"duplicate_transcript_segment_edit" as const;if([...editIds,...speakerIds].some(id=>!byId.has(id)))return"transcript_segment_not_found" as const;for(const edit of input.segmentEdits)byId.get(edit.segmentId).text=edit.text;for(const correction of input.speakerLabelCorrections)byId.get(correction.segmentId).speaker={id:correction.speakerId,label:correction.label,status:correction.status};const exactContent=segments.map((segment:any)=>`[${Math.floor(segment.startMs/60000).toString().padStart(2,"0")}:${Math.floor(segment.startMs%60000/1000).toString().padStart(2,"0")}] ${segment.speaker.label}: ${segment.text}`).join("\n"),nextRevision=source.current_revision+1,metadata={...previous.metadata,segments,correctionOfRevision:source.current_revision,correction:{segmentEditIds:editIds,speakerLabelCorrectionIds:speakerIds,correctedAt:new Date().toISOString(),origin:"owner"}};const inserted=await client.query("INSERT INTO source_object_revisions(source_object_id,revision,content_hash,exact_content,metadata,attachment_blob_ids) VALUES ($1,$2,$3,$4,$5::jsonb,$6::uuid[]) RETURNING *",[transcriptId,nextRevision,createHash("sha256").update(exactContent).digest("hex"),exactContent,JSON.stringify(metadata),previous.attachment_blob_ids]);const updated=await client.query("UPDATE source_objects SET current_revision=$2,freshness='current',revision=revision+1,updated_at=now() WHERE id=$1 RETURNING *",[transcriptId,nextRevision]);return{source:updated.rows[0],revision:inserted.rows[0]};});if(!outcome)return reply.code(404).send({error:"transcript_not_found"});if(typeof outcome==="string")return reply.code(409).send({error:outcome});return mapTranscript(outcome.source,outcome.revision);
});

app.post("/api/v1/vaults/:vaultId/transcripts/:transcriptId/lesson-association",async(request,reply)=>{
  const {vaultId,transcriptId}=request.params as {vaultId:string;transcriptId:string};idSchema.parse(vaultId);idSchema.parse(transcriptId);const input=associateTranscriptSchema.parse(request.body);const outcome=await transaction(async client=>{const source=await client.query("SELECT id,current_revision FROM source_objects WHERE vault_id=$1 AND id=$2 AND excluded=false FOR SHARE",[vaultId,transcriptId]);if(!source.rows[0])return null;if(source.rows[0].current_revision!==input.expectedRevision)return"stale_transcript_revision" as const;const lesson=await client.query("SELECT id FROM school_lessons WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL",[vaultId,input.lessonId]);if(!lesson.rows[0])return"school_lesson_not_found" as const;if(input.evidenceRefs.length){const evidence=await client.query("SELECT c.id FROM semantic_chunks c JOIN notes n ON n.id=c.note_id AND n.revision=c.note_revision WHERE c.vault_id=$1 AND c.id=ANY($2::uuid[])",[vaultId,input.evidenceRefs]);if(evidence.rows.length!==new Set(input.evidenceRefs).size)return"association_evidence_not_current" as const;}const result=await client.query("INSERT INTO transcript_lesson_associations(vault_id,source_object_id,lesson_id,transcript_revision,evidence_refs) VALUES ($1,$2,$3,$4,$5::uuid[]) ON CONFLICT(source_object_id) DO UPDATE SET lesson_id=excluded.lesson_id,transcript_revision=excluded.transcript_revision,evidence_refs=excluded.evidence_refs,revision=transcript_lesson_associations.revision+1,updated_at=now() RETURNING *",[vaultId,transcriptId,input.lessonId,input.expectedRevision,[...new Set(input.evidenceRefs)]]);return result.rows[0];});if(!outcome)return reply.code(404).send({error:"transcript_not_found"});if(typeof outcome==="string")return reply.code(409).send({error:outcome});return reply.code(201).send(transcriptAssociationSchema.parse({id:outcome.id,transcriptId:outcome.source_object_id,lessonId:outcome.lesson_id,transcriptRevision:outcome.transcript_revision,evidenceRefs:outcome.evidence_refs,origin:outcome.origin,revision:outcome.revision,createdAt:iso(outcome.created_at),updatedAt:iso(outcome.updated_at)}));
});

app.post("/api/v1/vaults/:vaultId/transcripts/:transcriptId/analysis",async(request,reply)=>{
  const {vaultId,transcriptId}=request.params as {vaultId:string;transcriptId:string};idSchema.parse(vaultId);idSchema.parse(transcriptId);const input=analyzeTranscriptSchema.parse(request.body);const sourceResult=await query("SELECT s.*,r.id AS source_revision_id,r.content_hash,r.metadata FROM source_objects s JOIN source_object_revisions r ON r.source_object_id=s.id AND r.revision=s.current_revision WHERE s.vault_id=$1 AND s.id=$2 AND s.excluded=false",[vaultId,transcriptId]);const source=sourceResult.rows[0];if(!source)return reply.code(404).send({error:"transcript_not_found"});if(source.current_revision!==input.expectedRevision)return reply.code(409).send({error:"stale_transcript_revision"});if(!Array.isArray(source.metadata?.segments)||!source.metadata.segments.length)return reply.code(409).send({error:"transcript_segments_unavailable"});const payload={type:"transcript_analysis",transcriptId,sourceRevision:source.current_revision,sourceRevisionId:source.source_revision_id,contentHash:source.content_hash,scope:input.scope},serialized=JSON.stringify(payload),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='transcript_analysis' AND input_hash=$2 AND status IN ('waiting_for_worker','running','succeeded') ORDER BY created_at DESC LIMIT 1",[vaultId,inputHash]);if(prior.rows[0])return reply.code(202).send(mapJobHandle(prior.rows[0]));const job=await query("INSERT INTO jobs(vault_id,kind,status,stage,input,input_hash) VALUES ($1,'transcript_analysis','waiting_for_worker','awaiting_transcript_analysis_worker',$2::jsonb,$3) RETURNING *",[vaultId,serialized,inputHash]);await query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb)",[job.rows[0].id,JSON.stringify({transcriptId,sourceRevision:source.current_revision,scope:input.scope})]);return reply.code(202).send(mapJobHandle(job.rows[0]));
});

app.get("/api/v1/vaults/:vaultId/agent-tools",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};const {domain}=request.query as {domain?:string};idSchema.parse(vaultId);if(domain&&domain!=="notes")return reply.code(400).send({error:"unsupported_tool_domain"});
  const descriptors=[toolDescriptorSchema.parse({name:"search_notes",domain:"notes",description:"Run bounded lexical search over current authorized notes.",effect:"read",requiredGrant:"notes:read",inputSchema:{type:"object",required:["query"],properties:{query:{type:"string",maxLength:500},limit:{type:"integer",minimum:1,maximum:20}}},outputSchema:{type:"object",properties:{items:{type:"array"}}},capability:{state:"available",reason:null}}),toolDescriptorSchema.parse({name:"get_note_summary",domain:"notes",description:"Read bounded metadata and a short current excerpt for one authorized note.",effect:"read",requiredGrant:"notes:read",inputSchema:{type:"object",required:["noteId"],properties:{noteId:{type:"string",format:"uuid"}}},outputSchema:{type:"object",properties:{noteId:{type:"string"},title:{type:"string"},excerpt:{type:"string"},revision:{type:"integer"}}},capability:{state:"available",reason:null}})];
  return {items:descriptors,nextCursor:null};
});

app.get("/api/v1/vaults/:vaultId/tool-policies",async request=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const result=await query("SELECT * FROM tool_policy_sets WHERE vault_id=$1",[vaultId]);return mapToolPolicySet(vaultId,result.rows[0]);});

app.put("/api/v1/vaults/:vaultId/tool-policies",async(request,reply)=>{const owner=await getOwnerSession(request);if(!owner)return reply.code(403).send({error:"owner_session_required"});const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const expectedRevision=revisionFromIfMatch(request.headers["if-match"]);if(expectedRevision===null)return reply.code(428).send({error:"if_match_required"});const input=setToolPoliciesSchema.parse(request.body),noteIds=[...new Set(input.policies.flatMap(item=>item.scope.noteIds))];const updated=await transaction(async client=>{if(noteIds.length){const valid=await client.query("SELECT id FROM notes WHERE vault_id=$1 AND id=ANY($2::uuid[]) AND trashed_at IS NULL",[vaultId,noteIds]);if(valid.rowCount!==noteIds.length)return"tool_policy_note_not_found" as const;}const current=await client.query("SELECT * FROM tool_policy_sets WHERE vault_id=$1 FOR UPDATE",[vaultId]);if(!current.rows[0]){if(expectedRevision!==0)return"stale_revision" as const;return(await client.query("INSERT INTO tool_policy_sets(vault_id,policies) VALUES ($1,$2::jsonb) RETURNING *",[vaultId,JSON.stringify(input.policies)])).rows[0];}if(current.rows[0].revision!==expectedRevision)return"stale_revision" as const;return(await client.query("UPDATE tool_policy_sets SET policies=$2::jsonb,revision=revision+1,updated_at=now() WHERE vault_id=$1 RETURNING *",[vaultId,JSON.stringify(input.policies)])).rows[0];});if(typeof updated==="string")return reply.code(409).send({error:updated});return mapToolPolicySet(vaultId,updated);});

app.post("/api/v1/vaults/:vaultId/commands",async(request,reply)=>{const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=executeNaturalLanguageCommandSchema.parse(request.body),summaryMatch=input.text.match(/^(?:summarize|summary of)\s+note\s+([0-9a-f-]{36})\s*$/i),searchMatch=input.text.match(/^search\s+(?:my\s+)?notes(?:\s+for)?\s+(.+)$/i);let toolName:"search_notes"|"get_note_summary"|null=null,toolInput:Record<string,unknown>|null=null;if(summaryMatch&&idSchema.safeParse(summaryMatch[1]).success){toolName="get_note_summary";toolInput={noteId:summaryMatch[1].toLowerCase()};}else if(searchMatch?.[1]?.trim()){toolName="search_notes";toolInput={query:searchMatch[1].trim(),limit:10};}const canonical={type:"natural_language_command",...input,toolName,toolInput},serialized=JSON.stringify(canonical),inputHash=createHash("sha256").update(serialized).digest("hex");const prior=await query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='natural_language_command' AND input->>'clientOperationId'=$2",[vaultId,input.clientOperationId]);if(prior.rows[0]){if(prior.rows[0].input_hash!==inputHash)return reply.code(409).send({error:"client_operation_id_reused"});return reply.code(202).send(mapJobHandle(prior.rows[0]));}const outcome=await transaction(async client=>{await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`${vaultId}:command:${input.clientOperationId}`]);const duplicate=await client.query("SELECT * FROM jobs WHERE vault_id=$1 AND kind='natural_language_command' AND input->>'clientOperationId'=$2",[vaultId,input.clientOperationId]);if(duplicate.rows[0])return duplicate.rows[0].input_hash===inputHash?duplicate.rows[0]:"client_operation_id_reused" as const;const policyRow=(await client.query("SELECT * FROM tool_policy_sets WHERE vault_id=$1 FOR SHARE",[vaultId])).rows[0],policySet=mapToolPolicySet(vaultId,policyRow);let intent:"search_notes"|"get_note_summary"|"needs_clarification"="needs_clarification",output:Record<string,unknown>|null=null,clarification:string|null="Use 'search notes for …' or 'summarize note <UUID>'. This bounded router cannot execute external, destructive, shell, filesystem, or network actions.";if(toolName&&toolInput){const policy=policySet.policies.find(item=>item.toolName===toolName);if(!policy?.enabled)return"tool_disabled_by_owner_policy" as const;if(policy.confirmation!=="none")return"tool_confirmation_required" as const;const used=await client.query("SELECT count(*)::int AS count FROM jobs WHERE vault_id=$1 AND created_at>=now()-interval '1 hour' AND ((kind='domain_tool_run' AND input->>'toolName'=$2) OR (kind='natural_language_command' AND input->>'toolName'=$2))",[vaultId,toolName]);if(Number(used.rows[0].count)>=policy.quota.maxRunsPerHour)return"tool_hourly_quota_exceeded" as const;const requested=input.sourceScope.noteIds,policyIds=policy.scope.kind==="selected_notes"?policy.scope.noteIds:[],allowed=policyIds.length&&requested.length?policyIds.filter(id=>requested.includes(id)):policyIds.length?policyIds:requested;if(toolName==="get_note_summary"){const noteId=String(toolInput.noteId);if((requested.length&&!requested.includes(noteId))||(policyIds.length&&!policyIds.includes(noteId)))return"tool_scope_denied" as const;const note=(await client.query("SELECT id,title,body,source_id,revision,updated_at FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL",[vaultId,noteId])).rows[0];if(!note)return"note_not_found" as const;output={noteId:note.id,title:note.title,excerpt:String(note.body).slice(0,2000),sourceId:note.source_id,revision:note.revision,updatedAt:iso(note.updated_at)};intent="get_note_summary";clarification=null;}else{const queryText=String(toolInput.query),found=await client.query(`WITH q AS (SELECT websearch_to_tsquery('simple',$2) terms) SELECT n.id,n.title,n.body,n.source_id,n.revision,ts_rank_cd(to_tsvector('simple',n.title||' '||n.body),q.terms) score FROM notes n,q WHERE n.vault_id=$1 AND n.trashed_at IS NULL AND (cardinality($3::uuid[])=0 OR n.id=ANY($3::uuid[])) AND to_tsvector('simple',n.title||' '||n.body)@@q.terms ORDER BY score DESC,n.updated_at DESC,n.id LIMIT 10`,[vaultId,queryText,allowed]);output={items:found.rows.map(row=>({noteId:row.id,title:row.title,excerpt:buildExcerpt(row.body,queryText),sourceId:row.source_id,revision:row.revision,score:Number(row.score)}))};intent="search_notes";clarification=null;}if(Buffer.byteLength(JSON.stringify(output))>policy.quota.maxResultBytes)return"tool_result_quota_exceeded" as const;}const result={type:"natural_language_command" as const,intent,toolName,output,clarification,policyRevision:policySet.revision,writesApplied:false as const,externalWritesAuthorized:false as const},created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'natural_language_command','succeeded',$2,1,$3::jsonb,$4,$5::jsonb,1,now(),now()) RETURNING *",[vaultId,intent==="needs_clarification"?"needs_clarification":"read_complete",serialized,inputHash,JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({intent,policyRevision:policySet.revision}),JSON.stringify({intent,writesApplied:false,externalWritesAuthorized:false})]);return created.rows[0];});if(typeof outcome==="string")return reply.code(outcome==="note_not_found"?404:409).send({error:outcome});return reply.code(202).send(mapJobHandle(outcome));});

app.post("/api/v1/vaults/:vaultId/tool-runs",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);const input=runDomainToolSchema.parse(request.body);const outcome=await transaction(async client=>{await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[`${vaultId}:tool:${input.toolName}`]);const policyRow=(await client.query("SELECT * FROM tool_policy_sets WHERE vault_id=$1 FOR SHARE",[vaultId])).rows[0],policy=mapToolPolicySet(vaultId,policyRow).policies.find(item=>item.toolName===input.toolName);if(!policy?.enabled)return"tool_disabled_by_owner_policy" as const;if(policy.confirmation!=="none")return"tool_confirmation_required" as const;const used=await client.query("SELECT count(*)::int AS count FROM jobs WHERE vault_id=$1 AND kind='domain_tool_run' AND input->>'toolName'=$2 AND created_at>=now()-interval '1 hour'",[vaultId,input.toolName]);if(Number(used.rows[0].count)>=policy.quota.maxRunsPerHour)return"tool_hourly_quota_exceeded" as const;const selected=policy.scope.kind==="selected_notes"?policy.scope.noteIds:[];let output:Record<string,unknown>;if(input.toolName==="search_notes"){const result=await client.query(`WITH q AS (SELECT websearch_to_tsquery('simple',$2) terms) SELECT n.id,n.title,n.body,n.source_id,n.revision,ts_rank_cd(to_tsvector('simple',n.title||' '||n.body),q.terms) score FROM notes n,q WHERE n.vault_id=$1 AND n.trashed_at IS NULL AND (cardinality($4::uuid[])=0 OR n.id=ANY($4::uuid[])) AND to_tsvector('simple',n.title||' '||n.body)@@q.terms ORDER BY score DESC,n.updated_at DESC,n.id LIMIT $3`,[vaultId,input.input.query,input.input.limit,selected]);output={items:result.rows.map(row=>({noteId:row.id,title:row.title,excerpt:buildExcerpt(row.body,input.input.query),sourceId:row.source_id,revision:row.revision,score:Number(row.score)}))};}else{if(selected.length&&!selected.includes(input.input.noteId))return"tool_scope_denied" as const;const result=await client.query("SELECT id,title,body,source_id,revision,updated_at FROM notes WHERE vault_id=$1 AND id=$2 AND trashed_at IS NULL",[vaultId,input.input.noteId]);const note=result.rows[0];if(!note)return"note_not_found" as const;const expected=input.expectedRevisions?.[note.id];if(expected!==undefined&&expected!==note.revision)return"stale_note_revision" as const;output={noteId:note.id,title:note.title,excerpt:String(note.body).slice(0,2000),sourceId:note.source_id,revision:note.revision,updatedAt:iso(note.updated_at)};}const result={type:"domain_tool_run" as const,toolName:input.toolName,output,writesApplied:false as const};if(Buffer.byteLength(JSON.stringify(result))>policy.quota.maxResultBytes)return"tool_result_quota_exceeded" as const;const serialized=JSON.stringify({type:"domain_tool_run",toolName:input.toolName,input:input.input,mode:input.mode,policyRevision:policyRow?.revision??0}),created=await client.query("INSERT INTO jobs(vault_id,kind,status,stage,progress,input,input_hash,result,attempts,started_at,finished_at) VALUES ($1,'domain_tool_run','succeeded','read_complete',1,$2::jsonb,$3,$4::jsonb,1,now(),now()) RETURNING *",[vaultId,serialized,createHash("sha256").update(serialized).digest("hex"),JSON.stringify(result)]);await client.query("INSERT INTO job_events(job_id,sequence,kind,data) VALUES ($1,1,'accepted',$2::jsonb),($1,2,'completed',$3::jsonb)",[created.rows[0].id,JSON.stringify({toolName:input.toolName,effect:"read",policyRevision:policyRow?.revision??0}),JSON.stringify({toolName:input.toolName,writesApplied:false})]);return created.rows[0];});if(typeof outcome==="string"){const status=outcome==="note_not_found"?404:409;return reply.code(status).send({error:outcome});}return reply.code(202).send(mapJobHandle(outcome));
});

app.post("/api/v1/vaults/:vaultId/scheduler/replan",async(request,reply)=>{
  const headers:Record<string,string>={"content-type":"application/json"};for(const name of ["cookie","authorization","origin","idempotency-key"]){const value=request.headers[name];if(typeof value==="string")headers[name]=value;}
  const response=await app.inject({method:"POST",url:request.url.replace("/scheduler/replan","/scheduler/replans"),headers,payload:JSON.stringify(request.body??{})});
  const contentType=response.headers["content-type"];if(contentType)reply.type(contentType);return reply.code(response.statusCode).send(response.body?JSON.parse(response.body):undefined);
});

app.get("/api/v1/vaults/:vaultId/scheduler/recommendations",async(request,reply)=>{
  const headers:Record<string,string>={};for(const name of ["cookie","authorization"]){const value=request.headers[name];if(typeof value==="string")headers[name]=value;}
  const response=await app.inject({method:"GET",url:request.url.replace("/scheduler/recommendations","/next-actions"),headers});
  const contentType=response.headers["content-type"];if(contentType)reply.type(contentType);return reply.code(response.statusCode).send(response.body?JSON.parse(response.body):undefined);
});

app.post("/api/v1/vaults/:vaultId/transcripts/meetily-import",async(request,reply)=>{
  const {vaultId}=request.params as {vaultId:string};idSchema.parse(vaultId);
  const input=meetilyImportSchema.parse(request.body);
  const exactText=input.segments.map(segment=>`[${Math.floor(segment.startMs/60000).toString().padStart(2,"0")}:${Math.floor(segment.startMs%60000/1000).toString().padStart(2,"0")}] ${segment.speaker.label}: ${segment.text}`).join("\n");
  const metadata={segments:input.segments,meetily:{meetingId:input.meetingId,startedAt:input.startedAt,completedAt:input.completedAt,audioLocation:"on_recording_device",recordingApprovalConfirmed:true}};
  const contentHash=createHash("sha256").update(exactText).update(JSON.stringify(metadata)).digest("hex");
  const result=await transaction(async client=>{
    let connection=(await client.query<{id:string}>(`SELECT id FROM integration_connections WHERE vault_id=$1 AND provider='meetily' AND disconnected_at IS NULL ORDER BY created_at,id LIMIT 1`,[vaultId])).rows[0];
    if(!connection){
      const initial=initialIntegration("meetily");
      await client.query(`INSERT INTO integration_connections(vault_id,provider,label,state,capabilities) VALUES ($1,'meetily','Meetily on this PC',$2,$3::jsonb) ON CONFLICT DO NOTHING`,[vaultId,initial.state,JSON.stringify(initial.capabilities)]);
      connection=(await client.query<{id:string}>(`SELECT id FROM integration_connections WHERE vault_id=$1 AND provider='meetily' AND disconnected_at IS NULL ORDER BY created_at,id LIMIT 1`,[vaultId])).rows[0];
    }
    if(!connection)throw new Error("meetily_connection_unavailable");
    const providerObjectId=`meeting:${input.meetingId}`;
    const prior=(await client.query<Record<string,any>>(`SELECT * FROM source_objects WHERE connection_id=$1 AND provider_object_id=$2 FOR UPDATE`,[connection.id,providerObjectId])).rows[0];
    if(prior?.excluded)return {error:"meetily_recording_excluded" as const};
    let sourceId:string,revision=1,imported=true;
    if(prior){
      sourceId=prior.id;revision=prior.current_revision;
      const current=(await client.query<{content_hash:string;metadata:Record<string,unknown>}>(`SELECT content_hash,metadata FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2`,[sourceId,revision])).rows[0];
      // A later folder scan must never overwrite words or speakers the owner corrected in Sorta.
      if(current?.metadata?.correctionOfRevision){
        imported=false;
      }else if(current?.content_hash!==contentHash){
        revision++;
        await client.query(`INSERT INTO source_object_revisions(source_object_id,revision,content_hash,content_text,exact_content,metadata) VALUES ($1,$2,$3,$4,$4,$5::jsonb)`,[sourceId,revision,contentHash,exactText,JSON.stringify(metadata)]);
        await client.query(`UPDATE source_objects SET title=$2,current_revision=$3,freshness='current',access_state='available',last_attempt_at=now(),last_success_at=now(),revision=revision+1,updated_at=now() WHERE id=$1`,[sourceId,input.title,revision]);
      }else{
        imported=false;
        await client.query(`UPDATE source_objects SET freshness='current',last_success_at=now(),updated_at=now() WHERE id=$1`,[sourceId]);
      }
    }else{
      sourceId=(await client.query<{id:string}>(`INSERT INTO source_objects(vault_id,connection_id,provider_object_id,kind,title,freshness,last_attempt_at,last_success_at,metadata) VALUES ($1,$2,$3,'transcript',$4,'current',now(),now(),$5::jsonb) RETURNING id`,[vaultId,connection.id,providerObjectId,input.title,JSON.stringify({startedAt:input.startedAt,completedAt:input.completedAt})])).rows[0].id;
      await client.query(`INSERT INTO source_object_revisions(source_object_id,revision,content_hash,content_text,exact_content,metadata) VALUES ($1,1,$2,$3,$3,$4::jsonb)`,[sourceId,contentHash,exactText,JSON.stringify(metadata)]);
    }
    let lessonMatch:"matched"|"selected"|"ambiguous"|"none"="none",lessonId:string|null=null;
    if(input.lessonId){
      const chosen=await client.query(`SELECT id FROM school_lessons WHERE vault_id=$1 AND id=$2 AND archived_at IS NULL`,[vaultId,input.lessonId]);
      if(!chosen.rowCount)return {error:"school_lesson_not_found" as const};
      lessonId=input.lessonId;lessonMatch="selected";
    }else{
      const candidates=await client.query<{id:string}>(`SELECT id FROM school_lessons WHERE vault_id=$1 AND archived_at IS NULL AND time_spec->>'kind'='exact' AND abs(extract(epoch FROM ((time_spec->>'startsAt')::timestamptz - $2::timestamptz)))<=1200 ORDER BY id LIMIT 2`,[vaultId,input.startedAt]);
      if(candidates.rows.length===1){lessonId=candidates.rows[0].id;lessonMatch="matched";}
      else if(candidates.rows.length>1)lessonMatch="ambiguous";
    }
    const priorAssociation=(await client.query<{lesson_id:string}>(`SELECT lesson_id FROM transcript_lesson_associations WHERE source_object_id=$1`,[sourceId])).rows[0];
    if(priorAssociation){lessonId=priorAssociation.lesson_id;lessonMatch="selected";if(imported)await client.query(`UPDATE transcript_lesson_associations SET transcript_revision=$2,revision=revision+1,updated_at=now() WHERE source_object_id=$1`,[sourceId,revision]);}
    else if(lessonId)await client.query(`INSERT INTO transcript_lesson_associations(vault_id,source_object_id,lesson_id,transcript_revision,evidence_refs) VALUES ($1,$2,$3,$4,'{}'::uuid[])`,[vaultId,sourceId,lessonId,revision]);
    await client.query(`UPDATE integration_connections SET imported_count=(SELECT count(*) FROM source_objects WHERE connection_id=$1),last_success_at=now(),coverage=jsonb_build_object('source','local_meetily_recordings','audio','remains_on_recording_device'),updated_at=now() WHERE id=$1`,[connection.id]);
    return {sourceId,revision,imported,lessonMatch};
  });
  if("error" in result)return reply.code(result.error==="school_lesson_not_found"?404:409).send({error:result.error});
  const [source,revision]=await Promise.all([query(`SELECT * FROM source_objects WHERE id=$1 AND vault_id=$2`,[result.sourceId,vaultId]),query(`SELECT * FROM source_object_revisions WHERE source_object_id=$1 AND revision=$2`,[result.sourceId,result.revision])]);
  return reply.code(result.imported?201:200).send(meetilyImportResultSchema.parse({transcript:await mapTranscript(source.rows[0],revision.rows[0]),imported:result.imported,lessonMatch:result.lessonMatch}));
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  if (error instanceof ZodError) return reply.code(400).send({ error: "validation_failed", details: error.message });
  return reply.code(500).send({ error: "internal_error" });
});

if (config.NODE_ENV === "production") {
  const apiDirectory = path.dirname(fileURLToPath(import.meta.url));
  const webDirectory = path.resolve(apiDirectory, "../../web/dist");
  if (!existsSync(path.join(webDirectory, "index.html"))) throw new Error(`Web build not found at ${webDirectory}`);
  const iosDnsProfile = path.join(webDirectory, "downloads/sorta-mullvad-base-tailscale.mobileconfig");
  if (!existsSync(iosDnsProfile)) throw new Error(`iOS DNS profile not found at ${iosDnsProfile}`);
  await app.register(staticFiles, { root: webDirectory, wildcard: false });
  app.get("/setup/ios-dns.mobileconfig", async (_request, reply) => reply
    .header("Content-Disposition", 'attachment; filename="sorta-mullvad-base-tailscale.mobileconfig"')
    .type("application/x-apple-aspen-config")
    .send(await readFile(iosDnsProfile)));
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/") || request.url.startsWith("/health/")) return reply.code(404).send({ error: "not_found" });
    return reply.type("text/html").sendFile("index.html");
  });
}

const close = async () => { await app.close(); await pool.end(); };
registerSchoolWeatherRoutes(app);
process.on("SIGINT", close);
process.on("SIGTERM", close);

await app.listen({ host: config.API_HOST, port: config.API_PORT });
app.log.info({ defaultVault: DEFAULT_VAULT }, "Sorta Omega API ready");
