import type { ActivityEvent, AiOperation, AiStatus, AskHandle, AttendanceRecord, AttendanceSummary, AutomationDecision, BlobSummary, Calendar as CalendarRecord, CalendarBrief, CalendarEntity, CalendarEvent, CalendarPolicySet, CalendarView, Capture, Chat, ChatMessage, Collection, Commitment, CommitmentDetail, EditorDocument, EventReminderPlan, ExportManifest, Flashcard, FlashcardDeck, FlashcardReview, FlashcardReviewItem, Goal, Idea, IndexStatus, Job, JobHandle, KnowledgeGap, Label, MeetilyImport, MeetilyImportResult, Memory, ModelProfile, MomentumPreferences, MomentumSummary, NextActionSet, Note, NoteCommitmentCandidate, NoteRevision, Notification, OccurrenceException, PerformanceGrade, PerformanceSummary, PerformanceTarget, PersonalProfile, Preferences, PrepItem, Project, Proposal, ProposalUndoReceipt, ProviderCalendarAction, RelatedResult, Relationship, Reminder, RoutingRule, RulePreviewResult, ScheduleExplanation, SchedulerPreferences, SchoolAssessment, SchoolAssignment, SchoolCourse, SchoolLesson, SchoolSubject, SearchResult, SourceObjectDetail, StudyAttempt, StudyExercise, StudyPlan, StudySession, SystemStatus, Task, TaskExecutionHistory, Today, TodayNextActionPlan, Transcript, UndoReceipt, UploadSession } from "@sorta/contracts";
import type { ApiTokenSummary, DeviceCachePolicy, DeviceScope, DeviceSummary, Insight, IntegrationConnection, Interest, PersonalDataImportPreview, PersonalDataItem, SyncAck, SyncBatch, SyncOperation, TokenPair } from "@sorta/contracts";
import { schoolWeatherSchema } from "@sorta/contracts";

export const VAULT_ID = "00000000-0000-4000-8000-000000000001";
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: string };
    throw new ApiError(response.status, detail.error ?? "request_failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function sha256(value: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await value.arrayBuffer());
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export type AuthSession = { id: string; owner_id: string; expires_at: string; auth_level: "passkey" | "recovery" };
type WebAuthnOptions<T> = { challenge_id: string; public_key_options: T; expires_at: string };

const vaultPath = `/api/v1/vaults/${VAULT_ID}`;
export const api = {
  schoolWeather: async () => schoolWeatherSchema.parse(await request<unknown>(`${vaultPath}/school/weather`)),
  session: () => request<AuthSession>("/api/v1/auth/session"),
  preferences: () => request<Preferences>("/api/v1/preferences"),
  updatePreferences: (preferences: Preferences, patch: Partial<Omit<Preferences, "revision" | "updatedAt">>) => request<Preferences>("/api/v1/preferences", { method: "PATCH", body: JSON.stringify({ expectedRevision: preferences.revision, patch }) }),
  systemStatus: () => request<SystemStatus>("/api/v1/status"),
  bootstrapOptions: <T>(bootstrapSecret: string, ownerLabel: string) => request<WebAuthnOptions<T>>("/api/v1/auth/bootstrap/options", {
    method: "POST", body: JSON.stringify({ bootstrap_secret: bootstrapSecret, owner_label: ownerLabel })
  }),
  bootstrapVerify: (challengeId: string, credential: unknown) => request<{ session: AuthSession; recovery_codes_once: string[] }>("/api/v1/auth/bootstrap/verify", {
    method: "POST", body: JSON.stringify({ challenge_id: challengeId, credential })
  }),
  loginOptions: <T>() => request<WebAuthnOptions<T>>("/api/v1/auth/login/options", { method: "POST", body: "{}" }),
  loginVerify: (challengeId: string, credential: unknown) => request<AuthSession>("/api/v1/auth/login/verify", {
    method: "POST", body: JSON.stringify({ challenge_id: challengeId, credential })
  }),
  recover: (recoveryCode: string) => request<{ id: string; expires_at: string; allowed_actions: string[] }>("/api/v1/auth/recovery", {
    method: "POST", body: JSON.stringify({ recovery_code: recoveryCode })
  }),
  passkeyOptions: <T>(label: string) => request<WebAuthnOptions<T>>("/api/v1/auth/passkeys/options", {
    method: "POST", body: JSON.stringify({ label })
  }),
  passkeyVerify: (challengeId: string, credential: unknown) => request<unknown>("/api/v1/auth/passkeys/verify", {
    method: "POST", body: JSON.stringify({ challenge_id: challengeId, credential })
  }),
  logout: () => request<void>("/api/v1/auth/logout", { method: "POST", body: "{}" }),
  devices: () => request<{ items: DeviceSummary[] }>("/api/v1/devices"),
  createDevicePairing: (deviceName:string) => request<{pairing_id:string;device_code_once:string;user_code:string;expires_at:string}>("/api/v1/device-pairings",{method:"POST",body:JSON.stringify({device_name:deviceName,requested_role:"client",client_public_key:null})}),
  approveDevicePairing: (pairingId: string, userCode: string, scopes: DeviceScope[]) => request<{ status: "approved"; expires_at: string }>(`/api/v1/device-pairings/${pairingId}/approve`, { method: "POST", body: JSON.stringify({ user_code: userCode, vault_ids: [VAULT_ID], scopes, approved_role: "client" }) }),
  exchangeDevicePairing: (pairingId:string,deviceCode:string) => request<TokenPair>(`/api/v1/device-pairings/${pairingId}/exchange`,{method:"POST",body:JSON.stringify({device_code:deviceCode})}),
  deviceCachePolicy:(deviceId:string)=>request<DeviceCachePolicy>(`/api/v1/devices/${deviceId}/cache-policy`),
  setDeviceCachePolicy:(policy:DeviceCachePolicy,input:Pick<DeviceCachePolicy,"trusted"|"selectedVaultIds"|"cacheLimits"|"expireAfterSeconds"|"clearOnLogout">)=>request<DeviceCachePolicy>(`/api/v1/devices/${policy.deviceId}/cache-policy`,{method:"PUT",headers:{"if-match":`"${policy.revision}"`},body:JSON.stringify(input)}),
  revokeDevice: (deviceId: string) => request<void>(`/api/v1/devices/${deviceId}`, { method: "DELETE" }),
  apiTokens: () => request<{ items: ApiTokenSummary[] }>("/api/v1/tokens"),
  createApiToken: (label: string, scopes: DeviceScope[]) => request<ApiTokenSummary & { secret_once: string }>("/api/v1/tokens", { method: "POST", body: JSON.stringify({ label, vault_ids: [VAULT_ID], scopes, expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString() }) }),
  revokeApiToken: (tokenId: string) => request<void>(`/api/v1/tokens/${tokenId}`, { method: "DELETE" }),
  today: () => request<Today>(`${vaultPath}/today`),
  nextActions: (availableMinutes?: number) => request<NextActionSet>(`${vaultPath}/scheduler/recommendations${availableMinutes ? `?available_minutes=${availableMinutes}` : ""}`),
  notes: (cursor?: string) => request<{ items: Note[]; nextCursor: string | null }>(`${vaultPath}/notes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  noteVersion: () => request<{ version: string }>(`${vaultPath}/notes?versionOnly=true`),
  allNotes: async () => {
    const items: Note[] = [];
    let cursor: string | null = null;
    const seen = new Set<string>();
    do {
      const page = await api.notes(cursor ?? undefined);
      items.push(...page.items);
      if (page.nextCursor && seen.has(page.nextCursor)) throw new Error("notes_pagination_repeated_cursor");
      cursor = page.nextCursor;
      if (cursor) seen.add(cursor);
    } while (cursor);
    return items;
  },
  createNote: (text="") => request<Note>(`${vaultPath}/notes`,{method:"POST",body:JSON.stringify({content:{kind:"text",text}})}),
  note: (noteId: string) => request<Note>(`${vaultPath}/notes/${noteId}`),
  trashNote: (noteId:string,expectedRevision:number) => request<void>(`${vaultPath}/notes/${noteId}`,{method:"DELETE",body:JSON.stringify({expectedRevision})}),
  restoreTrashedNote: (noteId:string,expectedRevision:number) => request<Note>(`${vaultPath}/notes/${noteId}/restore`,{method:"POST",body:JSON.stringify({expectedRevision})}),
  noteDocument: (noteId: string, format: "editor_json" | "markdown" | "text" | "yjs_update" = "text") => request<{ format: typeof format; content: string | EditorDocument; revisionId: string; sourceMap: unknown[] }>(`${vaultPath}/notes/${noteId}/document?format=${format}`),
  editNote: (note: Note, text: string) => request<NoteRevision>(`${vaultPath}/notes/${note.id}/edits`, {
    method: "POST",
    body: JSON.stringify({ expectedRevision: note.revision, edit: { kind: "replace_document", text } })
  }),
  editNoteDocument: (noteId: string, expectedRevision: number, document: EditorDocument) => request<NoteRevision>(`${vaultPath}/notes/${noteId}/edits`, {
    method: "POST", body: JSON.stringify({ expectedRevision, edit: { kind: "replace_editor_document", document } })
  }),
  noteRevisions: (noteId: string) => request<{ items: NoteRevision[] }>(`${vaultPath}/notes/${noteId}/revisions`),
  restoreNoteRevision: (noteId:string,revisionId:string,expectedCurrentRevision:number) => request<NoteRevision>(`${vaultPath}/notes/${noteId}/revisions/${revisionId}/restore`,{method:"POST",body:JSON.stringify({expectedCurrentRevision})}),
  reprocessNote: (note: Note) => request<JobHandle>(`${vaultPath}/notes/${note.id}/reprocess`, { method: "POST", body: JSON.stringify({ expectedRevision: note.revision, stages: ["classify"] }) }),
  correctNoteClassification: (note: Note, classification: NonNullable<Note["classification"]>, lock: boolean) => request<unknown>(`${vaultPath}/notes/${note.id}/corrections`, {
    method: "POST", body: JSON.stringify({ expectedRevision: note.revision, classification, lock, reason: "Owner correction from note editor" })
  }),
  labels: () => request<{ items: Label[] }>(`${vaultPath}/labels`),
  createLabel: (name: string) => request<Label>(`${vaultPath}/labels`, { method: "POST", body: JSON.stringify({ kind: "topic", name, aliases: [] }) }),
  noteLabels: (noteId: string) => request<{ noteId: string; noteRevision: number; organizationRevision: number; labels: Array<Label & { locked: boolean; provenance: "owner" | "classification" | "rule" }> }>(`${vaultPath}/notes/${noteId}/labels`),
  setNoteLabels: (note: Note, labelIds: string[], lockedLabelIds: string[]) => request<unknown>(`${vaultPath}/notes/${note.id}/labels`, { method: "PUT", body: JSON.stringify({ expectedRevision: note.revision, labelIds, lockedLabelIds }) }),
  collections: () => request<{ items: Collection[] }>(`${vaultPath}/collections`),
  collectionItems: (collectionId: string) => request<{ collection: Collection; items: Note[]; nextCursor: string | null }>(`${vaultPath}/collections/${collectionId}/items`),
  rules: () => request<{ items: RoutingRule[] }>(`${vaultPath}/rules`),
  previewRule: (classification: NonNullable<Note["classification"]>, labelId: string) => request<RulePreviewResult>(`${vaultPath}/rules/preview`, { method: "POST", body: JSON.stringify({ condition: { operator: "and", conditions: [{ type: "classification", value: classification }] }, targetLabelIds: [labelId], sampleLimit: 10 }) }),
  createRule: (name: string, classification: NonNullable<Note["classification"]>, labelId: string) => request<RoutingRule>(`${vaultPath}/rules`, { method: "POST", body: JSON.stringify({ name, condition: { operator: "and", conditions: [{ type: "classification", value: classification }] }, targetLabelIds: [labelId], priority: 100, enabled: true }) }),
  setRuleEnabled: (rule: RoutingRule, enabled: boolean) => request<RoutingRule>(`${vaultPath}/rules/${rule.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: rule.revision, enabled }) }),
  deleteRule: (rule: RoutingRule) => request<void>(`${vaultPath}/rules/${rule.id}?expectedRevision=${rule.revision}`, { method: "DELETE" }),
  relationships: (noteId: string) => request<{ items: Relationship[] }>(`${vaultPath}/relationships?noteId=${encodeURIComponent(noteId)}`),
  relatedNotes:(noteId:string,limit=10)=>request<RelatedResult>(`${vaultPath}/notes/${noteId}/related?limit=${limit}`),
  createRelationship: (fromNoteId: string, toNoteId: string, kind: Relationship["kind"]) => request<Relationship>(`${vaultPath}/relationships`, { method: "POST", body: JSON.stringify({ fromNoteId, toNoteId, kind, evidenceAnchorIds: [] }) }),
  deleteRelationship: (relationship: Relationship) => request<void>(`${vaultPath}/relationships/${relationship.id}?expectedRevision=${relationship.revision}`, { method: "DELETE" }),
  capture: (text: string | undefined, clientOperationId: string = crypto.randomUUID(), blobIds: string[] = [], title?: string) => request<Note>(`${vaultPath}/captures`, {
    method: "POST",
    body: JSON.stringify({ text, blobIds, clientOperationId, title })
  }),
  captureDetails: (captureId: string) => request<Capture>(`${vaultPath}/captures/${captureId}`),
  blobContentUrl: (blobId: string, download = false) => `${BASE}${vaultPath}/blobs/${blobId}/content${download ? "?download=true" : ""}`,
  uploadFile: async (file: File, onProgress?: (completedParts: number, totalParts: number) => void) => {
    if (file.size < 1 || file.size > 64 * 1024 * 1024) throw new ApiError(400, "browser_upload_size_limit");
    const wholeHash = await sha256(file);
    const mediaType = file.type || "application/octet-stream";
    const session = await request<UploadSession>(`${vaultPath}/uploads`, { method: "POST", body: JSON.stringify({ filename: file.name, mediaType, byteLength: file.size, sha256: wholeHash }) });
    const totalParts = Math.ceil(file.size / session.partSize);
    try {
      for (let index = 0; index < totalParts; index += 1) {
        const start = index * session.partSize, end = Math.min(file.size, start + session.partSize);
        const part = file.slice(start, end), partHash = await sha256(part);
        const response = await fetch(`${BASE}${vaultPath}/uploads/${session.uploadId}/parts/${index + 1}`, { method: "PUT", credentials: "include", headers: { "content-type": "application/octet-stream", "content-range": `bytes ${start}-${end - 1}/${file.size}`, "x-part-sha256": partHash }, body: part });
        if (!response.ok) { const detail = await response.json().catch(() => ({})) as { error?: string }; throw new ApiError(response.status, detail.error ?? "upload_part_failed"); }
        onProgress?.(index + 1, totalParts);
      }
      return await request<BlobSummary>(`${vaultPath}/uploads/${session.uploadId}/complete`, { method: "POST", body: JSON.stringify({ sha256: wholeHash, partCount: totalParts }) });
    } catch (error) {
      await request<void>(`${vaultPath}/uploads/${session.uploadId}`, { method: "DELETE" }).catch(() => undefined);
      throw error;
    }
  },
  tasks: () => request<{ items: Task[] }>(`${vaultPath}/tasks`),
  acceptNoteTask: (note:Note) => request<Task>(`${vaultPath}/notes/${note.id}/accept-task`,{method:"POST",body:JSON.stringify({expectedRevision:note.revision})}),
  task: (taskId:string) => request<Task>(`${vaultPath}/tasks/${taskId}`),
  taskExecutionHistory: (taskId: string, cursor?: string) => request<TaskExecutionHistory>(`${vaultPath}/tasks/${taskId}/execution-history?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  createTask: (title: string) => request<Task>(`${vaultPath}/tasks`, { method: "POST", body: JSON.stringify({ title }) }),
  toggleTask: (task: Task) => request<Task>(`${vaultPath}/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: task.revision, patch: { completed: !task.completed } }) }),
  deleteTask:(task:Task)=>request<void>(`${vaultPath}/tasks/${task.id}`,{method:"DELETE",body:JSON.stringify({expectedRevision:task.revision})}),
  reminders:(status?:Reminder["status"])=>request<{items:Reminder[];nextCursor:string|null}>(`${vaultPath}/reminders${status?`?status=${status}`:""}`),
  createReminder:(taskId:string|null,remindAt:string,timezone:string,channel:Reminder["channel"])=>request<Reminder>(`${vaultPath}/reminders`,{method:"POST",body:JSON.stringify({taskId,remindAt,timezone,channel})}),
  updateReminder:(reminder:Reminder,patch:{remindAt?:string;status?:"scheduled"|"snoozed"|"dismissed"})=>request<Reminder>(`${vaultPath}/reminders/${reminder.id}`,{method:"PATCH",body:JSON.stringify({...patch,expectedRevision:reminder.revision})}),
  deleteReminder:(reminder:Reminder)=>request<void>(`${vaultPath}/reminders/${reminder.id}`,{method:"DELETE",body:JSON.stringify({expectedRevision:reminder.revision})}),
  notifications:(unreadOnly=false)=>request<{items:Notification[];nextCursor:string|null}>(`${vaultPath}/notifications?unreadOnly=${unreadOnly}`),
  updateNotification:(notificationId:string,state:"read"|"dismissed")=>request<Notification>(`${vaultPath}/notifications/${notificationId}`,{method:"PATCH",body:JSON.stringify({state})}),
  createSyncSnapshot: (deviceId:string) => request<JobHandle>(`${vaultPath}/sync/snapshots`,{method:"POST",body:JSON.stringify({deviceId})}),
  pullSync: (cursor?:string) => request<SyncBatch>(`${vaultPath}/sync/pull?limit=500${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`),
  pushSync: (deviceId:string,operations:SyncOperation[],lastCursor:string) => request<SyncAck>(`${vaultPath}/sync/push`,{method:"POST",body:JSON.stringify({deviceId,operations,lastCursor})}),
  syncEventsUrl: (cursor:string) => `${BASE}${vaultPath}/events?cursor=${encodeURIComponent(cursor)}`,
  syncSocketUrl: () => {const url=new URL(`${BASE}${vaultPath}/sync/ws`,window.location.href);url.protocol=url.protocol==="https:"?"wss:":"ws:";return url.toString();},
  projects: () => request<{ items: Project[]; nextCursor: string | null }>(`${vaultPath}/projects`),
  createProject: (title: string) => request<Project>(`${vaultPath}/projects`, { method: "POST", body: JSON.stringify({ title }) }),
  updateProject: (project: Project, patch: { status?: Project["status"]; title?: string }) => request<Project>(`${vaultPath}/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: project.revision, patch }) }),
  archiveProject: (project: Project) => request<Project>(`${vaultPath}/projects/${project.id}`, { method: "DELETE", headers: { "if-match": `"${project.revision}"` } }),
  ideas: () => request<{ items: Idea[]; nextCursor: string | null }>(`${vaultPath}/ideas`),
  updateIdea: (idea: Idea, patch: { state?: Idea["state"]; projectId?: string | null; title?: string | null }) => request<Idea>(`${vaultPath}/ideas/${idea.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: idea.revision, patch }) }),
  goals: () => request<{ items: Goal[]; nextCursor: string | null }>(`${vaultPath}/goals`),
  createGoal: (title: string, kind: Goal["kind"], targetDate: string | null) => request<Goal>(`${vaultPath}/goals`, { method: "POST", body: JSON.stringify({ title, kind, targetDate }) }),
  updateGoal: (goal: Goal, patch: { status?: Goal["status"]; title?: string }) => request<Goal>(`${vaultPath}/goals/${goal.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: goal.revision, patch }) }),
  archiveGoal: (goal: Goal) => request<Goal>(`${vaultPath}/goals/${goal.id}`, { method: "DELETE", headers: { "if-match": `"${goal.revision}"` } }),
  memories: () => request<{ items: Memory[]; nextCursor: string | null }>(`${vaultPath}/memories`),
  createMemory: (kind: Memory["kind"], content: string) => request<Memory>(`${vaultPath}/memories`, { method: "POST", body: JSON.stringify({ kind, content, origin: "explicit", userConfirmed: true }) }),
  updateMemory: (memory: Memory, patch: { status?: Memory["status"]; userConfirmed?: boolean; content?: string }) => request<Memory>(`${vaultPath}/memories/${memory.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: memory.revision, patch }) }),
  archiveMemory: (memory: Memory) => request<Memory>(`${vaultPath}/memories/${memory.id}`, { method: "DELETE", headers: { "if-match": `"${memory.revision}"` } }),
  personalProfile: () => request<PersonalProfile>(`${vaultPath}/personal-profile`),
  connections: () => request<{items:IntegrationConnection[];nextCursor:string|null}>(`${vaultPath}/connections`),
  createConnection: (provider:IntegrationConnection["provider"],label:string) => request<IntegrationConnection>(`${vaultPath}/connections`,{method:"POST",body:JSON.stringify({provider,label})}),
  authorizeMicrosoft: (connection:IntegrationConnection) => request<{authorizationUrl:string}>(`${vaultPath}/connections/${connection.id}/authorize`,{method:"POST",body:JSON.stringify({requestedCapabilities:["calendar.read","teams.read","teams.channels.read","assignments.read","mail.read","files.read","files.read.all","sites.read","tasks.read","notes.read","contacts.read","offline.access"],registeredReturnTarget:"connections"})}),
  authorizeGoogleGmail: (connection:IntegrationConnection) => request<{authorizationUrl:string}>(`${vaultPath}/connections/${connection.id}/authorize`,{method:"POST",body:JSON.stringify({requestedCapabilities:["mail.read"],registeredReturnTarget:"connections"})}),
  connectionSelection: (connection:IntegrationConnection) => request<{selectedResourceIds:string[];window:{from:string|null;to:string|null}|null;sensitiveDataOptIns:Array<"grades"|"attendance"|"private_chats"|"personal_data_history">;revision:number}>(`${vaultPath}/connections/${connection.id}/selection`),
  setPrivateChatSelection: (connection:IntegrationConnection,selection:{selectedResourceIds:string[];window:{from:string|null;to:string|null}|null;sensitiveDataOptIns:string[];revision:number}) => request<{selectedResourceIds:string[];sensitiveDataOptIns:string[];revision:number}>(`${vaultPath}/connections/${connection.id}/selection`,{method:"PUT",headers:{"if-match":`"${selection.revision}"`},body:JSON.stringify({selectedResourceIds:selection.selectedResourceIds,window:selection.window,scopeExpansionApproval:true,sensitiveDataOptIns:[...new Set([...selection.sensitiveDataOptIns,"private_chats"]) ]})}),
  syncConnection: (connection:IntegrationConnection) => request<{coverage:Array<{dataset:string;imported:number;complete:boolean;contentComplete:boolean;limitations:string[];error:string|null}>;complete:boolean;privateChatsOptedIn:boolean}>(`${vaultPath}/connections/${connection.id}/sync`,{method:"POST",body:"{}"}),
  previewConnectionDisconnect: (connection:IntegrationConnection) => request<{id:string;retentionChoice:"retain_imported"|"delete_imported"|"retain_sources_delete_derived";impact:{sourceObjects:number;derivedArtifacts:number;importedRecords:number;providerCleanupMayBeIncomplete:true}}>(`${vaultPath}/connections/${connection.id}/disconnect-preview`,{method:"POST",body:JSON.stringify({retentionChoice:"retain_imported"})}),
  disconnectConnection: (connection:IntegrationConnection,previewId:string) => request<IntegrationConnection>(`${vaultPath}/connections/${connection.id}/disconnect`,{method:"POST",body:JSON.stringify({previewId,expectedRevision:connection.revision,confirmation:"disconnect"})}),
  insights: () => request<{items:Insight[];nextCursor:string|null}>(`${vaultPath}/insights`),
  generateWeeklyReview: (from:string,to:string) => request<JobHandle>(`${vaultPath}/insights`,{method:"POST",body:JSON.stringify({kind:"weekly_review",window:{from,to},scope:["tasks","study","attendance","assessments","projects","ideas","calendar","personal_data"]})}),
  updateInsight: (insight:Insight,state:Insight["state"]) => request<Insight>(`${vaultPath}/insights/${insight.id}`,{method:"PATCH",body:JSON.stringify({expectedRevision:insight.revision,state,annotation:insight.annotation})}),
  archiveInsight: (insight:Insight) => request<void>(`${vaultPath}/insights/${insight.id}`,{method:"DELETE",headers:{"if-match":`"${insight.revision}"`}}),
  personalDataItems: () => request<{items:PersonalDataItem[];nextCursor:string|null}>(`${vaultPath}/personal-data/items`),
  previewPersonalDataImport: (provider:string,accountLabel:string,records:unknown[]) => request<PersonalDataImportPreview>(`${vaultPath}/personal-data/import-preview`,{method:"POST",body:JSON.stringify({provider,accountLabel,exportFormat:"omega_normalized_json_v1",records})}),
  applyPersonalDataImport: (preview:PersonalDataImportPreview) => request<{previewId:string;insertedCount:number;duplicateCount:number;suppressedCount:number;appliedAt:string}>(`${vaultPath}/personal-data/import-previews/${preview.id}/apply`,{method:"POST",body:JSON.stringify({expectedRevision:preview.revision,confirmation:"apply_normalized_import"})}),
  deletePersonalDataItem: (item:PersonalDataItem) => request<void>(`${vaultPath}/personal-data/items/${item.id}`,{method:"DELETE",headers:{"if-match":`"${item.revision}"`}}),
  interests: () => request<{items:Interest[];nextCursor:string|null}>(`${vaultPath}/interests`),
  refreshPersonalProfile: (from:string,to:string,approvedTopicLabels:string[]) => request<JobHandle>(`${vaultPath}/personal-profile/refresh`,{method:"POST",body:JSON.stringify({window:{from,to},approvedTopicLabels})}),
  updateInterest: (interest:Interest,action:"confirm"|"correct"|"dismiss",value?:string,reason?:string) => request<Interest>(`${vaultPath}/interests/${interest.id}`,{method:"PATCH",body:JSON.stringify({expectedRevision:interest.revision,action,value,reason})}),
  entities: () => request<{ items: CalendarEntity[] }>(`${vaultPath}/calendar-entities`),
  createEntity: (kind: CalendarEntity["kind"], name: string) => request<CalendarEntity>(`${vaultPath}/calendar-entities`, { method: "POST", body: JSON.stringify({ kind, name }) }),
  commitments: () => request<{ items: Commitment[] }>(`${vaultPath}/commitments?status=active`),
  commitmentCandidates: () => request<{ items: NoteCommitmentCandidate[] }>(`${vaultPath}/commitment-candidates`),
  decideCommitmentCandidate: (candidate:NoteCommitmentCandidate,decision:"accept"|"dismiss") => request<NoteCommitmentCandidate>(`${vaultPath}/commitment-candidates/${candidate.id}/decision`,{method:"POST",body:JSON.stringify({expectedNoteRevision:candidate.noteRevision,decision})}),
  commitment: (commitmentId: string) => request<CommitmentDetail>(`${vaultPath}/commitments/${commitmentId}`),
  createCommitment: (input: { text: string; personEntityId: string; objectLabel: string; sourceNoteId?: string | null }) => request<Commitment>(`${vaultPath}/commitments`, {
    method: "POST", body: JSON.stringify({ ...input, conditionKind: "next_meeting_with_person" })
  }),
  updateCommitmentStatus: (item: Commitment, status: Commitment["status"], reason: string) => request<Commitment>(`${vaultPath}/commitments/${item.id}`, { method: "PATCH", headers: { "if-match": `"${item.revision}"` }, body: JSON.stringify({ status, evidenceKind: "owner_confirmed_action", reason }) }),
  archiveCommitment: (item: Commitment) => request<void>(`${vaultPath}/commitments/${item.id}`, { method: "DELETE", headers: { "if-match": `"${item.revision}"` } }),
  rematchCommitment: (item: Commitment) => request<JobHandle>(`${vaultPath}/commitments/${item.id}/match`, { method: "POST", body: JSON.stringify({ expectedRevision: item.revision, clientOperationId: crypto.randomUUID() }) }),
  calendarPolicies: () => request<CalendarPolicySet>(`${vaultPath}/calendar-policies`),
  setCalendarPolicies: (current: CalendarPolicySet, rules: CalendarPolicySet["rules"]) => request<CalendarPolicySet>(`${vaultPath}/calendar-policies`, { method: "PUT", headers: { "if-match": `"${current.revision}"` }, body: JSON.stringify({ rules }) }),
  dryRunCalendarPolicy: (policy: CalendarPolicySet["rules"][number], sourceIds: string[], from: string, to: string) => request<JobHandle>(`${vaultPath}/calendar-policies/dry-run`, { method: "POST", body: JSON.stringify({ policy, sourceIds, boundedWindow: { from, to } }) }),
  calendarDecisions: () => request<{items:AutomationDecision[];nextCursor:string|null}>(`${vaultPath}/calendar-decisions?limit=50`),
  undoCalendarDecision: (decision: AutomationDecision) => request<{decisionId:string;compensation:string;affectedRecordId:string;writesApplied:true;undoneAt:string}>(`${vaultPath}/calendar-decisions/${decision.id}/undo`, { method: "POST", body: JSON.stringify({ expectedRevision: decision.revision, clientOperationId: crypto.randomUUID() }) }),
  events: () => request<{ items: CalendarEvent[] }>(`${vaultPath}/calendar-events`),
  calendars: () => request<{items:CalendarRecord[];nextCursor:string|null}>(`${vaultPath}/calendars?limit=100`),
  createCalendar: (name:string,timezone:string,color:string) => request<CalendarRecord>(`${vaultPath}/calendars`,{method:"POST",body:JSON.stringify({name,timezone,origin:"sorta",displayPreferences:{color,showWeekends:true}})}),
  updateCalendar: (calendar:CalendarRecord,patch:{name?:string;timezone?:string;selectedVisible?:boolean;displayPreferences?:CalendarRecord["displayPreferences"];archived?:boolean}) => request<CalendarRecord>(`${vaultPath}/calendars/${calendar.id}`,{method:"PATCH",headers:{"if-match":`"${calendar.revision}"`},body:JSON.stringify(patch)}),
  archiveCalendar: (calendar:CalendarRecord) => request<void>(`${vaultPath}/calendars/${calendar.id}`,{method:"DELETE",headers:{"if-match":`"${calendar.revision}"`}}),
  calendarView: (from:string,to:string,timezone:string,view:CalendarView["view"],calendarIds:string[]) => request<CalendarView>(`${vaultPath}/calendar-view?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&timezone=${encodeURIComponent(timezone)}&view=${view}${calendarIds.length?`&calendar_ids=${encodeURIComponent(calendarIds.join(","))}`:""}`),
  calendarBrief:(date:string,timezone:string)=>request<CalendarBrief>(`${vaultPath}/calendar/brief?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`),
  refreshCalendarBrief:(date:string,timezone:string)=>request<JobHandle>(`${vaultPath}/calendar/brief-refresh`,{method:"POST",headers:{"idempotency-key":crypto.randomUUID()},body:JSON.stringify({date,timezone})}),
  exportCalendar:(calendarIds:string[],from:string,to:string)=>request<JobHandle>(`${vaultPath}/calendar-export`,{method:"POST",headers:{"idempotency-key":crypto.randomUUID()},body:JSON.stringify({calendarIds,from,to,format:"ics",privacy:"minimal"})}),
  exportManifest:(exportId:string)=>request<ExportManifest>(`${vaultPath}/exports/${exportId}`),
  exportDownloadUrl:(exportId:string)=>`${BASE}${vaultPath}/exports/${exportId}/download`,
  createVaultExport:(format:"markdown_bundle"|"full_fidelity",includeHistory:boolean)=>request<JobHandle>(`${vaultPath}/exports`,{method:"POST",body:JSON.stringify({scope:"all",format,includeHistory})}),
  previewCalendarImport:(attachmentId:string,timezone:string,targetCalendarId:string)=>request<JobHandle>(`${vaultPath}/calendar-import-preview`,{method:"POST",body:JSON.stringify({attachmentId,format:"ics",timezone,targetCalendarId})}),
  previewProviderCalendarAction:(event:CalendarEvent,connectionId:string,kind:"create"|"update"|"delete"|"respond",targetCalendarId:string,recipientAddresses:string[],response:"accepted"|"declined"|"tentative"|null)=>request<Proposal>(`${vaultPath}/calendar-events/${event.id}/provider-action-preview`,{method:"POST",body:JSON.stringify({connectionId,kind,targetCalendarId,recipients:recipientAddresses.map(address=>({address,displayName:null})),publicFields:{title:event.title,startsAt:event.startsAt,endsAt:event.endsAt,timezone:event.timezone},response})}),
  providerCalendarActions:()=>request<{items:ProviderCalendarAction[];nextCursor:string|null}>(`${vaultPath}/calendar-provider-actions`),
  acceptProviderCalendarProposal:(proposal:Proposal)=>request<JobHandle>(`${vaultPath}/proposals/${proposal.id}/accept`,{method:"POST",body:JSON.stringify({expectedProposalRevision:proposal.revision,confirmation:"queue_provider_calendar_action"})}),
  cancelProviderCalendarAction:(action:ProviderCalendarAction)=>request<ProviderCalendarAction>(`${vaultPath}/calendar-provider-actions/${action.id}/cancel`,{method:"POST",headers:{"if-match":`"${action.revision}"`},body:"{}"}),
  createEvent: (input: { calendarId?:string;title: string; startsAt: string; endsAt: string; timezone: string; recurrence?: { frequency: "weekly"; interval: number; timezone: string; count: number }; entityIds?: string[] }) => request<CalendarEvent>(`${vaultPath}/calendar-events`, { method: "POST", body: JSON.stringify(input) }),
  updateEventSeries:(event:CalendarEvent,patch:Partial<Pick<CalendarEvent,"title"|"startsAt"|"endsAt"|"timezone"|"recurrence">>)=>request<CalendarEvent>(`${vaultPath}/calendar-events/${event.id}`,{method:"PATCH",body:JSON.stringify({scope:"series",expectedRevision:event.revision,...patch})}),
  trashEventSeries:(event:CalendarEvent)=>request<void>(`${vaultPath}/calendar-events/${event.id}?scope=series&expectedRevision=${event.revision}`,{method:"DELETE"}),
  cancelEventOccurrence:(event:CalendarEvent,originalStartsAt:string)=>request<OccurrenceException>(`${vaultPath}/calendar-events/${event.id}/exceptions`,{method:"POST",body:JSON.stringify({scope:"occurrence",expectedRevision:event.revision,originalStartsAt,cancelled:true})}),
  calendarConflicts: (from: string, to: string) => request<{ items: Array<{ id: string; startsAt: string; endsAt: string; titles: [string, string] }> }>(`${vaultPath}/calendar/conflicts?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  privateEventContext: (eventId: string) => request<{ prepItems: PrepItem[]; linkedCommitments: Commitment[] }>(`${vaultPath}/calendar-events/${eventId}/private-context`),
  refreshPrivateEventContext:(event:CalendarEvent)=>request<JobHandle>(`${vaultPath}/calendar-events/${event.id}/context-refresh`,{method:"POST",headers:{"idempotency-key":crypto.randomUUID()},body:JSON.stringify({occurrenceId:null,expectedRevision:event.revision})}),
  eventReminderPlan:(eventId:string)=>request<EventReminderPlan>(`${vaultPath}/calendar-events/${eventId}/reminder-plan`),
  setEventReminderPlan:(eventId:string,currentRevision:number,minutesBefore:number,channels:EventReminderPlan["channels"]=["in_app"])=>request<EventReminderPlan>(`${vaultPath}/calendar-events/${eventId}/reminder-plan`,{method:"POST",headers:{"if-match":`"${currentRevision}"`},body:JSON.stringify({occurrenceScope:"series",occurrenceId:null,schedules:[{minutesBefore}],channels})}),
  createPrepItem: (eventId: string, text: string) => request<PrepItem>(`${vaultPath}/calendar-events/${eventId}/prep-items`, { method: "POST", body: JSON.stringify({ type: "custom", text }) }),
  updatePrepItem: (eventId: string, item: PrepItem, status: PrepItem["status"]) => request<PrepItem>(`${vaultPath}/calendar-events/${eventId}/prep-items/${item.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: item.revision, status }) }),
  search: (query: string, mode: "lexical" | "hybrid" | "semantic" = "lexical") => request<SearchResult | JobHandle>(`${vaultPath}/search`, {
    method: "POST", body: JSON.stringify({ query, mode, scope: { kinds: ["note", "task", "calendar_event"] }, limit: 20 })
  }),
  chats: () => request<{ items: Chat[] }>(`${vaultPath}/chats`),
  createChat: (mode: "notes" | "brainstorm" = "notes") => request<Chat>(`${vaultPath}/chats`, { method: "POST", body: JSON.stringify({ defaultMode: mode, defaultScope: { kinds: ["note", "school_assessment"] } }) }),
  chatMessages: (chatId: string) => request<{ items: ChatMessage[] }>(`${vaultPath}/chats/${chatId}/messages`),
  ask: (chatId: string, text: string, mode: "grounded" | "brainstorm") => request<AskHandle>(`${vaultPath}/chats/${chatId}/messages`, {
    method: "POST", body: JSON.stringify({ clientMessageId: crypto.randomUUID(), text, mode, scope: { kinds: ["note", "school_assessment"] }, queueWhenOffline: true })
  }),
  job: (jobId: string) => request<Job>(`${vaultPath}/jobs/${jobId}`),
  cancelJob: (jobId: string) => request<Job>(`${vaultPath}/jobs/${jobId}/cancel`, { method: "POST", body: "{}" }),
  aiStatus: () => request<AiStatus>(`${vaultPath}/ai/status`),
  indexStatus: () => request<IndexStatus>(`${vaultPath}/index/status`),
  rebuildIndex: () => request<JobHandle>(`${vaultPath}/index/rebuild`, { method: "POST", body: JSON.stringify({ modelProfileId: "local-qwen-embedding", chunkerVersion: "1" }) }),
  aiOperations: () => request<{ items: AiOperation[] }>(`${vaultPath}/ai-operations`),
  activity: () => request<{ items: ActivityEvent[]; nextCursor: string | null }>(`${vaultPath}/activity?limit=25`),
  schoolSubjects: () => request<{ items: SchoolSubject[]; nextCursor: string | null }>(`${vaultPath}/school/subjects`),
  createSchoolSubject: (name: string, code: string, academicPeriod: string) => request<SchoolSubject>(`${vaultPath}/school/subjects`, { method: "POST", body: JSON.stringify({ name, code: code.trim() || null, academicPeriod: academicPeriod.trim() || null, sourceAnchorIds: [] }) }),
  archiveSchoolSubject: (subject: SchoolSubject) => request<void>(`${vaultPath}/school/subjects/${subject.id}`, { method: "DELETE", headers: { "if-match": `"${subject.revision}"` } }),
  schoolCourses: () => request<{ items: SchoolCourse[]; nextCursor: string | null }>(`${vaultPath}/school/courses`),
  createSchoolCourse: (input: { name: string; subjectId: string; academicPeriod: string; teacherEntityIds: string[] }) => request<SchoolCourse>(`${vaultPath}/school/courses`, { method: "POST", body: JSON.stringify({ ...input, academicPeriod: input.academicPeriod.trim() || null, classEntityIds: [], sourceAnchorIds: [] }) }),
  archiveSchoolCourse: (course: SchoolCourse) => request<void>(`${vaultPath}/school/courses/${course.id}`, { method: "DELETE", headers: { "if-match": `"${course.revision}"` } }),
  schoolAssignments: () => request<{ items: SchoolAssignment[]; nextCursor: string | null }>(`${vaultPath}/school/assignments`),
  schoolAssignmentSources: (assignmentId: string) => request<{ items: Array<{ sourceId: string; role: "instructions" | "material"; kind: string; text: string | null; sourceUrl: string | null; mimeType: string | null; storedAt: string | null }> }>(`${vaultPath}/school/assignments/${assignmentId}/sources`),
  sourceObjectDetail: (sourceObjectId: string) => request<SourceObjectDetail>(`${vaultPath}/source-objects/${sourceObjectId}`),
  createSchoolAssignment: (courseId: string, title: string, dueAt: string) => request<SchoolAssignment>(`${vaultPath}/school/assignments`, { method: "POST", body: JSON.stringify({ courseId, title, due: dueAt ? { kind: "exact", dueAt: new Date(dueAt).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } : { kind: "unknown" }, instructionsSourceIds: [], materialSourceIds: [], taskIds: [] }) }),
  updateSchoolAssignmentPreparation: (assignment: SchoolAssignment, preparationStatus: SchoolAssignment["preparationStatus"]) => request<SchoolAssignment>(`${vaultPath}/school/assignments/${assignment.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: assignment.revision, patch: { preparationStatus } }) }),
  archiveSchoolAssignment: (assignment: SchoolAssignment) => request<void>(`${vaultPath}/school/assignments/${assignment.id}`, { method: "DELETE", headers: { "if-match": `"${assignment.revision}"` } }),
  schoolLessons: () => request<{ items: SchoolLesson[]; nextCursor: string | null }>(`${vaultPath}/school/lessons`),
  meetilyTranscripts: () => request<{ items: Transcript[]; nextCursor: string | null }>(`${vaultPath}/transcripts?source=meetily&limit=100`),
  importMeetilyRecording: (recording: MeetilyImport) => request<MeetilyImportResult>(`${vaultPath}/transcripts/meetily-import`, { method: "POST", body: JSON.stringify(recording) }),
  createSchoolLesson: (courseId: string, calendarEventId: string, room: string) => request<SchoolLesson>(`${vaultPath}/school/lessons`, { method: "POST", body: JSON.stringify({ courseId, calendarEventId: calendarEventId || null, timeSpec: { kind: "unknown" }, room: room.trim() || null, sourceAnchorIds: [] }) }),
  archiveSchoolLesson: (lesson: SchoolLesson) => request<void>(`${vaultPath}/school/lessons/${lesson.id}`, { method: "DELETE", headers: { "if-match": `"${lesson.revision}"` } }),
  schoolAssessments: () => request<{ items: SchoolAssessment[]; nextCursor: string | null }>(`${vaultPath}/school/assessments`),
  previewSchoolImport: (attachmentId: string, sourceTimestamp: string) => request<JobHandle>(`${vaultPath}/school/import-preview`, { method: "POST", body: JSON.stringify({ attachmentId, format: "omega_school_json_v1", mapping: null, sourceTimestamp, timezone: "Europe/Oslo", period: null }) }),
  applySchoolImport: (previewJobId: string) => request<JobHandle>(`${vaultPath}/school/import-apply`, { method: "POST", body: JSON.stringify({ previewJobId }) }),
  createSchoolAssessment: (input: { courseId: string; title: string; kind: SchoolAssessment["kind"]; date: string; scope: string; weight: string }) => request<SchoolAssessment>(`${vaultPath}/school/assessments`, { method: "POST", body: JSON.stringify({ courseId: input.courseId, title: input.title, kind: input.kind, timeSpec: input.date ? { kind: "date_only", date: input.date, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Oslo" } : { kind: "unknown" }, materialScope: input.scope.trim() ? { description: input.scope.trim(), sourceIds: [] } : null, officialWeight: input.weight.trim() ? Number(input.weight) / 100 : null, sourceAnchorIds: [] }) }),
  archiveSchoolAssessment: (assessment: SchoolAssessment) => request<void>(`${vaultPath}/school/assessments/${assessment.id}`, { method: "DELETE", headers: { "if-match": `"${assessment.revision}"` } }),
  attendanceRecords: () => request<{ items: AttendanceRecord[]; nextCursor: string | null }>(`${vaultPath}/attendance/records`),
  createAttendanceRecord: (input: { courseId: string; lessonId: string|null; date: string; normalizedStatus: AttendanceRecord["normalizedStatus"]; excusalStatus: AttendanceRecord["excusalStatus"] }) => request<AttendanceRecord>(`${vaultPath}/attendance/records`, { method: "POST", body: JSON.stringify({ ...input, rawStatus: input.normalizedStatus, timeSpec: { kind: "unknown" }, duration: null, units: null, sourceAnchorIds: [] }) }),
  createCatchUpPlan: (lessons: SchoolLesson[]) => request<JobHandle>(`${vaultPath}/school/catch-up-plans`, { method: "POST", body: JSON.stringify({ lessonIds: lessons.map(item=>item.id), authorizedSourceIds: [], estimatePolicy: "unknown_unless_explicit", expectedLessonRevisions: Object.fromEntries(lessons.map(item=>[item.id,item.revision])) }) }),
  archiveAttendanceRecord: (record: AttendanceRecord) => request<void>(`${vaultPath}/attendance/records/${record.id}`, { method: "DELETE", headers: { "if-match": `"${record.revision}"` } }),
  attendanceSummary: (from: string, to: string) => request<AttendanceSummary>(`${vaultPath}/attendance/summary?from=${from}&to=${to}&aggregation=lessons`),
  performanceGrades: () => request<{ items: PerformanceGrade[]; nextCursor: string | null }>(`${vaultPath}/performance/grades`),
  createPerformanceGrade: (input: { courseId: string; gradeValue: string; gradeScale: string; date: string; weight: string }) => request<PerformanceGrade>(`${vaultPath}/performance/grades`, { method: "POST", body: JSON.stringify({ courseId: input.courseId, gradeValue: input.gradeValue, gradeScale: input.gradeScale, date: input.date, officialWeight: input.weight.trim() ? Number(input.weight) / 100 : null, sourceAnchorIds: [] }) }),
  archivePerformanceGrade: (grade: PerformanceGrade) => request<void>(`${vaultPath}/performance/grades/${grade.id}`, { method: "DELETE", headers: { "if-match": `"${grade.revision}"` } }),
  performanceTargets: () => request<{ items: PerformanceTarget[]; nextCursor: string | null }>(`${vaultPath}/performance/targets`),
  setPerformanceTarget: (courseId: string, targetValue: string, scale: string, expectedRevision: number) => request<PerformanceTarget>(`${vaultPath}/performance/targets/${courseId}`, { method: "PUT", body: JSON.stringify({ targetValue, scale, expectedRevision }) }),
  performanceSummary: (courseId?: string) => request<PerformanceSummary>(`${vaultPath}/performance/summary?formulaId=descriptive-v1${courseId ? `&courseId=${encodeURIComponent(courseId)}` : ""}`),
  studyPlans: () => request<{ items: StudyPlan[]; nextCursor: string | null }>(`${vaultPath}/study/plans`),
  createStudyPlan: (input: { courseId: string | null; assessmentId: string | null; materialSourceIds: string[]; goals: string[] }) => request<JobHandle>(`${vaultPath}/study/plans`, { method: "POST", body: JSON.stringify({ ...input, taskIds: [], deadline: { kind: "unknown" }, constraints: {} }) }),
  updateStudyPlan: (plan: StudyPlan, patch: { status?: "draft" | "active" | "completed"; unitUpdates?: Array<{ unitId: string; expectedRevision: number; patch: { status?: "planned" | "in_progress" | "completed" | "skipped"; estimatedMinutes?: number } }> }) => request<StudyPlan>(`${vaultPath}/study/plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ expectedRevision: plan.revision, patch }) }),
  previewStudyPlanWithdrawal:(plan:StudyPlan,selectedUnstartedBlockIds:string[])=>request<Proposal>(`${vaultPath}/study/plans/${plan.id}/withdraw`,{method:"POST",headers:{"if-match":`"${plan.revision}"`},body:JSON.stringify({selectedUnstartedBlockIds,reason:"Owner reviewed removal of future flexible study blocks."})}),
  acceptStudyPlanWithdrawal:(proposal:Proposal)=>request<JobHandle>(`${vaultPath}/proposals/${proposal.id}/accept`,{method:"POST",body:JSON.stringify({expectedProposalRevision:proposal.revision,confirmation:"apply_study_withdrawal"})}),
  archiveStudyPlan: (plan: StudyPlan) => request<void>(`${vaultPath}/study/plans/${plan.id}`, { method: "DELETE", headers: { "if-match": `"${plan.revision}"` } }),
  studyExercises: () => request<{ items: StudyExercise[]; nextCursor: string | null }>(`${vaultPath}/study/exercises`),
  generateStudyExercises: (input: { mode: NonNullable<StudySession["mode"]>; difficulty: "introductory"|"standard"|"advanced"; count: number; courseId: string|null; materialSourceIds: string[] }) => request<JobHandle>(`${vaultPath}/study/exercises`, { method: "POST", body: JSON.stringify(input) }),
  studyAttempts: () => request<{ items: StudyAttempt[]; nextCursor: string | null }>(`${vaultPath}/study/attempts`),
  submitStudyAttempt: (exercise: StudyExercise, response: string, confidenceSelfReport: number|null) => request<StudyAttempt>(`${vaultPath}/study/exercises/${exercise.id}/attempts`, { method: "POST", body: JSON.stringify({ response, responseKind: "text", completedAt: new Date().toISOString(), hintsUsed: [], confidenceSelfReport, idempotencyKey: crypto.randomUUID() }) }),
  requestStudyFeedback: (attempt: StudyAttempt) => request<JobHandle>(`${vaultPath}/study/attempts/${attempt.id}/feedback`, { method: "POST", body: JSON.stringify({ expectedAttemptRevision: attempt.revision }) }),
  correctStudyFeedback: (attempt: StudyAttempt, correction: string) => request<StudyAttempt>(`${vaultPath}/study/attempts/${attempt.id}/feedback`, { method: "PATCH", body: JSON.stringify({ expectedAttemptRevision: attempt.revision, correction, scoreOverride: null, evidenceSourceIds: [] }) }),
  studySessions: () => request<{ items: StudySession[]; nextCursor: string | null }>(`${vaultPath}/study/sessions`),
  momentumSummary: (dateFrom: string, dateTo: string, courseId: string | null) => request<MomentumSummary>(`${vaultPath}/momentum/summary?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}${courseId ? `&course_id=${encodeURIComponent(courseId)}` : ""}`),
  setMomentumPreferences: (preferences: MomentumPreferences) => request<MomentumPreferences>(`${vaultPath}/momentum/preferences`, { method: "PATCH", headers: { "if-match": `"${preferences.revision}"` }, body: JSON.stringify({ enabled: preferences.enabled, evidenceWindowDays: preferences.evidenceWindowDays, minObservations: preferences.minObservations, userLockedParameters: preferences.userLockedParameters }) }),
  createStudySession: (input: { courseId: string | null; mode: NonNullable<StudySession["mode"]>; estimatedMinutes: number | null }) => request<StudySession>(`${vaultPath}/study/sessions`, { method: "POST", body: JSON.stringify({ ...input, materialSourceIds: [], taskIds: [], unitIds: [] }) }),
  startNextAction: (plan: TodayNextActionPlan) => request<StudySession>(`${vaultPath}/study/sessions`, { method: "POST", body: JSON.stringify({ courseId: plan.courseId, mode: "active_recall", estimatedMinutes: plan.durationMinutes, materialSourceIds: plan.materialSourceIds, taskIds: [plan.task.id], unitIds: [], calendarEventId: plan.calendarEventId, startImmediately: true, expectedTaskRevisions: { [plan.task.id]: plan.task.revision } }) }),
  applyStudySessionAction: (session: StudySession, action: "start" | "pause" | "resume" | "interrupt" | "complete" | "skip") => request<StudySession>(`${vaultPath}/study/sessions/${session.id}/actions`, { method: "POST", body: JSON.stringify({ action, observedAt: new Date().toISOString(), expectedRevision: session.revision }) }),
  archiveStudySession: (session: StudySession) => request<void>(`${vaultPath}/study/sessions/${session.id}`, { method: "DELETE", headers: { "if-match": `"${session.revision}"` } }),
  knowledgeGaps: () => request<{ items: KnowledgeGap[]; nextCursor: string | null }>(`${vaultPath}/study/knowledge-gaps`),
  createKnowledgeGap: (courseId: string | null, concept: string, statement: string) => request<KnowledgeGap>(`${vaultPath}/study/knowledge-gaps`, { method: "POST", body: JSON.stringify({ courseId, concept, statement, materialSourceIds: [], evidenceAnchorIds: [] }) }),
  updateKnowledgeGap: (gap: KnowledgeGap, status: "confirmed" | "dismissed" | "resolved") => request<KnowledgeGap>(`${vaultPath}/study/knowledge-gaps/${gap.id}`, { method: "PATCH", body: JSON.stringify({ status, expectedRevision: gap.revision }) }),
  flashcardDecks: () => request<{ items: FlashcardDeck[]; nextCursor: string | null }>(`${vaultPath}/study/decks`),
  createFlashcardDeck: (name: string, courseId: string | null) => request<FlashcardDeck>(`${vaultPath}/study/decks`, { method: "POST", body: JSON.stringify({ name, courseId, materialSourceIds: [] }) }),
  archiveFlashcardDeck: (deck: FlashcardDeck) => request<void>(`${vaultPath}/study/decks/${deck.id}`, { method: "DELETE", headers: { "if-match": `"${deck.revision}"` } }),
  flashcards: () => request<{ items: Flashcard[]; nextCursor: string | null }>(`${vaultPath}/study/cards`),
  createFlashcard: (deckId: string, prompt: string, answer: string) => request<Flashcard>(`${vaultPath}/study/cards`, { method: "POST", body: JSON.stringify({ deckId, prompt, answer, sourceAnchorIds: [], approvalStatus: "approved" }) }),
  archiveFlashcard: (card: Flashcard) => request<void>(`${vaultPath}/study/cards/${card.id}`, { method: "DELETE", headers: { "if-match": `"${card.revision}"` } }),
  flashcardReviewQueue: () => request<{ items: FlashcardReviewItem[]; at: string }>(`${vaultPath}/study/review-queue`),
  recordFlashcardReview: (card: Flashcard, rating: "again" | "hard" | "good" | "easy") => request<FlashcardReview>(`${vaultPath}/study/cards/${card.id}/reviews`, { method: "POST", body: JSON.stringify({ responseId: crypto.randomUUID(), rating, observedAt: new Date().toISOString(), expectedCardRevision: card.revision }) }),
  schedulerPreferences: () => request<SchedulerPreferences>(`${vaultPath}/scheduler/preferences`),
  setSchedulerPreferences: (preferences: SchedulerPreferences) => request<SchedulerPreferences>(`${vaultPath}/scheduler/preferences`, { method: "PUT", body: JSON.stringify({ preferences: { timezone: preferences.timezone, protectedWindows: preferences.protectedWindows, preferredWindows: preferences.preferredWindows, dailyLimitMinutes: preferences.dailyLimitMinutes, breakMinutes: preferences.breakMinutes, minBlockMinutes: preferences.minBlockMinutes, maxBlockMinutes: preferences.maxBlockMinutes, allowSplit: preferences.allowSplit, replanPolicy: preferences.replanPolicy, algorithmVersion: preferences.algorithmVersion }, expectedRevision: preferences.revision }) }),
  previewSchedule: (tasks: Task[], preferences: SchedulerPreferences, startsAt: string, endsAt: string) => request<JobHandle>(`${vaultPath}/scheduler/preview`, { method: "POST", body: JSON.stringify({ taskIds: tasks.map(task => task.id), horizon: { startsAt, endsAt }, expectedInputRevisions: { ...Object.fromEntries(tasks.map(task => [task.id, task.revision])), scheduler_preferences: preferences.revision } }) }),
  previewPreparationPlan:(tasks:Task[],preferences:SchedulerPreferences,lockedEvents:CalendarEvent[],startsAt:string,endsAt:string)=>request<JobHandle>(`${vaultPath}/calendar/preparation-plan`,{method:"POST",body:JSON.stringify({taskIds:tasks.map(task=>task.id),studyPlanId:null,window:{startsAt,endsAt},limits:{},estimates:Object.fromEntries(tasks.map(task=>[task.id,task.remainingMinutes??task.estimatedMinutes??null])),lockedEventIds:lockedEvents.map(event=>event.id),expectedInputRevisions:{...Object.fromEntries(tasks.map(task=>[task.id,task.revision])),...Object.fromEntries(lockedEvents.map(event=>[`calendar_event:${event.id}`,event.revision])),scheduler_preferences:preferences.revision}})}),
  previewReplan: (tasks: Task[], preferences: SchedulerPreferences, startsAt: string, endsAt: string) => request<JobHandle>(`${vaultPath}/scheduler/replan`, { method: "POST", body: JSON.stringify({ trigger: "owner_requested", affectedTaskIds: tasks.map(task=>task.id), priorProposalId: null, horizon: { startsAt, endsAt }, remainingWork: {}, expectedInputRevisions: { ...Object.fromEntries(tasks.map(task=>[task.id,task.revision])), scheduler_preferences: preferences.revision } }) }),
  scheduleExplanation: (proposalId: string) => request<ScheduleExplanation>(`${vaultPath}/scheduler/explanations/${proposalId}`),
  previewStudyPlan: (plan: StudyPlan, tasks: Task[], preferences: SchedulerPreferences, startsAt: string, endsAt: string) => request<JobHandle>(`${vaultPath}/scheduler/preview`, { method: "POST", body: JSON.stringify({ studyPlanId: plan.id, horizon: { startsAt, endsAt }, constraintOverrides: plan.constraints, expectedInputRevisions: { ...Object.fromEntries(tasks.filter(task => plan.taskIds.includes(task.id)).map(task => [task.id, task.revision])), [`study_plan:${plan.id}`]: plan.revision, scheduler_preferences: preferences.revision } }) }),
  proposal: (proposalId: string) => request<Proposal>(`${vaultPath}/proposals/${proposalId}`),
  acceptProposal: (proposal: Proposal) => request<JobHandle>(`${vaultPath}/proposals/${proposal.id}/accept`, { method: "POST", body: JSON.stringify({ expectedProposalRevision: proposal.revision, confirmation: "apply_schedule" }) }),
  undoProposal: (proposal: Proposal) => request<ProposalUndoReceipt>(`${vaultPath}/proposals/${proposal.id}/undo`, { method: "POST", body: JSON.stringify({ expectedProposalRevision: proposal.revision, confirmation: "undo_schedule" }) }),
  rejectProposal: (proposal: Proposal, reason?: string) => request<Proposal>(`${vaultPath}/proposals/${proposal.id}/reject`, { method: "POST", body: JSON.stringify({ expectedProposalRevision: proposal.revision, reason: reason || null }) }),
  undoAiOperation: (operationId: string, expectedCurrentRevision: number) => request<UndoReceipt>(`${vaultPath}/ai-operations/${operationId}/undo`, { method: "POST", body: JSON.stringify({ expectedCurrentRevision }) }),
  modelProfiles: () => request<{ items: ModelProfile[] }>("/api/v1/ai/models"),
  testAi: (workerId: string, modelProfileId: string) => request<JobHandle>(`${vaultPath}/ai/tests`, {
    method: "POST", body: JSON.stringify({ workerId, modelProfileId })
  })
};
