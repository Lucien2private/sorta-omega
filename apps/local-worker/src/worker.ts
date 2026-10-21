import { z } from "zod";
import { isDirectReminderRequest, workerEvidencePacketSchema, workerJobInputSchema, workerLeaseSchema, workerSourceInputSchema, type JobHandle } from "@sorta/contracts";
import { workerConfig, validatedHubUrl, validatedOllamaUrl, validatedOpenAiCompatibleUrl } from "./config.js";
import { OllamaProvider, OpenAiCompatibleProvider } from "./provider.js";
import { chunkText } from "./chunker.js";
import { answerSchema, answerValidator, assertCitationSelection, buildAnswerPrompt } from "./answer.js";
import { buildReminderIntentPrompt, reminderIntentSchema, reminderIntentValidator } from "./reminder-action.js";
import { assertStudyPlanSources, buildStudyPlanPrompt, studyPlanOutputSchema, studyPlanOutputValidator } from "./study-plan.js";
import { assertAuthorizedStudySources, buildStudyExercisePrompt, buildStudyFeedbackPrompt, studyExerciseOutputSchema, studyExerciseOutputValidator, studyFeedbackOutputSchema, studyFeedbackOutputValidator } from "./study-exercise.js";
import {assertTranscriptAnalysisSources,buildTranscriptAnalysisPrompt,transcriptAnalysisOutputSchema,transcriptAnalysisOutputValidator} from "./transcript-analysis.js";
import {artifactGenerationOutputSchema,artifactGenerationOutputValidator,assertArtifactSources,buildArtifactGenerationPrompt} from "./artifact-generation.js";
import {assertTaskBreakdown,buildTaskBreakdownPrompt,taskBreakdownOutputSchema,taskBreakdownOutputValidator} from "./task-breakdown.js";
import { classificationPrompt, classificationSchema, classificationValidator } from "./note-classification.js";

const hub = validatedHubUrl(workerConfig.OMEGA_API_URL);
const ollama = validatedOllamaUrl(workerConfig.OLLAMA_BASE_URL);
const openAiCompatible = validatedOpenAiCompatibleUrl(workerConfig.OPENAI_COMPATIBLE_BASE_URL);
const ollamaProvider = new OllamaProvider(ollama, workerConfig.OLLAMA_CHAT_MODEL, workerConfig.OLLAMA_EMBEDDING_MODEL);
const generationProvider = workerConfig.LOCAL_CHAT_BACKEND === "openai_compatible"
  ? new OpenAiCompatibleProvider(openAiCompatible, workerConfig.OPENAI_COMPATIBLE_CHAT_MODEL, workerConfig.OPENAI_COMPATIBLE_API_KEY)
  : ollamaProvider;
const embeddingProvider = ollamaProvider;
const generalProfile = { id: "local-qwen-general", model: workerConfig.LOCAL_CHAT_BACKEND === "openai_compatible" ? workerConfig.OPENAI_COMPATIBLE_CHAT_MODEL : workerConfig.OLLAMA_CHAT_MODEL, backend: workerConfig.LOCAL_CHAT_BACKEND } as const;
const embeddingProfile = { id: "local-qwen-embedding", model: workerConfig.OLLAMA_EMBEDDING_MODEL, backend: "ollama" } as const;
const headers = { authorization: `Bearer ${workerConfig.OMEGA_WORKER_TOKEN}`, "content-type": "application/json" };

async function hubRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(new URL(path, hub), { ...init, headers: { ...headers, ...init.headers }, signal: AbortSignal.timeout(130_000) });
  if (!response.ok && response.status !== 204) throw new Error(`hub_http_${response.status}`);
  return response;
}

async function installedProfiles() {
  const profiles: Array<{ id: string; model: string; digest: string; backend: "ollama" | "openai_compatible" }> = [];
  try {
    const response = await fetch(new URL("api/tags", ollama), { signal: AbortSignal.timeout(2_000) });
    if (response.ok) {
      const body = await response.json() as { models?: Array<{ name?: unknown; digest?: unknown }> };
      for (const model of body.models ?? []) {
        if (typeof model.name !== "string" || typeof model.digest !== "string") continue;
        if (model.name === embeddingProfile.model) profiles.push({ ...embeddingProfile, digest: model.digest });
        if (workerConfig.LOCAL_CHAT_BACKEND === "ollama" && model.name === generalProfile.model) profiles.push({ ...generalProfile, digest: model.digest });
      }
    }
  } catch { /* A missing Ollama runtime is reflected by absent profiles. */ }
  if (workerConfig.LOCAL_CHAT_BACKEND === "openai_compatible") {
    try {
      const response = await fetch(new URL("models", openAiCompatible), {
        headers: workerConfig.OPENAI_COMPATIBLE_API_KEY ? { authorization: `Bearer ${workerConfig.OPENAI_COMPATIBLE_API_KEY}` } : undefined,
        signal: AbortSignal.timeout(2_000)
      });
      if (response.ok) {
        const body = await response.json() as { data?: Array<{ id?: unknown }> };
        if ((body.data ?? []).some((model) => model.id === generalProfile.model)) {
          profiles.push({ ...generalProfile, digest: workerConfig.OPENAI_COMPATIBLE_CHAT_MODEL_DIGEST! });
        }
      }
    } catch { /* The heartbeat reports the selected model as absent. */ }
  }
  return profiles;
}

async function heartbeat() {
  const profiles = await installedProfiles();
  await hubRequest("api/v1/worker/heartbeat", {
    method: "POST",
    body: JSON.stringify({
      deviceId: workerConfig.OMEGA_WORKER_ID,
      installedProfiles: profiles,
      capacity: { generationSlots: 1, embeddingSlots: 1 },
      runtimeStatus: profiles.length ? "available" : "error"
    })
  });
}

const capabilitySchema = { type: "object", properties: { ok: { const: true } }, required: ["ok"], additionalProperties: false };

async function processJob(lease: z.infer<typeof workerLeaseSchema>) {
  let stage = "starting";
  const heartbeatTimer = setInterval(() => {
    void hubRequest(`api/v1/worker/jobs/${lease.jobId}/heartbeat`, { method: "POST", body: JSON.stringify({ leaseToken: lease.leaseToken, stage }) }).catch(() => undefined);
  }, 20_000);
  try {
    const inputResponse = await hubRequest(`api/v1/worker/jobs/${lease.jobId}/input`, { headers: { "x-job-lease-token": lease.leaseToken } });
    const input = workerJobInputSchema.parse(await inputResponse.json());
    let result: unknown;
    if (input.payload.type === "note_processing") {
      stage = "classifying";
      const classification = await generationProvider.extract(classificationPrompt(input.payload.source.text, input.payload.subjects), classificationSchema(input.payload.subjects), (value) => classificationValidator.parse(value));
      result = { type: "note_processing", noteId: input.payload.noteId, processedRevision: input.payload.revision, ...classification };
    } else if (input.payload.type === "ai_setup_test") {
      stage = "testing_model";
      if (input.payload.modelProfileId === generalProfile.id) {
        const parsed = await generationProvider.extract("Return {\"ok\":true}.", capabilitySchema, (value) => z.object({ ok: z.literal(true) }).parse(value));
        result = { type: "ai_setup_test", completion: parsed.ok, structuredOutput: parsed.ok, embeddings: false };
      } else if (input.payload.modelProfileId === embeddingProfile.id) {
        const embeddings = await embeddingProvider.embed("Sorta Omega harmless embedding capability test", 1024);
        result = { type: "ai_setup_test", completion: false, structuredOutput: false, embeddings: embeddings.length === 1 };
      } else throw new Error("model_profile_not_allowlisted");
    } else if (input.payload.type === "search") {
      stage = "embedding_query";
      const embeddings = await embeddingProvider.embed(input.payload.query, 1024);
      result = { type: "search_embedding", query: input.payload.query, mode: input.payload.mode, modelProfileId: embeddingProfile.id, embedding: embeddings[0] };
    } else if (input.payload.type === "answer_generation") {
      if(input.payload.actionType === "reminder"){
        if(!isDirectReminderRequest(input.payload.question)||!input.payload.requestedAt||!input.payload.timezone)throw new Error("reminder_context_missing");
        stage = "interpreting_reminder";
        const generated = await generationProvider.extract(buildReminderIntentPrompt(input.payload.question,input.payload.requestedAt,input.payload.timezone),reminderIntentSchema,value=>reminderIntentValidator.parse(value));
        result = {type:"worker_answer",chatId:input.payload.chatId,messageId:input.payload.assistantMessageId,answer:"Reminder request interpreted.",citationIds:[],insufficientEvidence:input.payload.mode==="grounded",proposedReminder:generated.proposedReminder};
      }else{
        let evidence: z.infer<typeof workerEvidencePacketSchema> = { items: [] };
        if (input.payload.mode === "grounded") {
          stage = "retrieving_evidence";
          const embeddings = await embeddingProvider.embed(input.payload.question, 1024);
          const evidenceResponse = await hubRequest(`api/v1/worker/jobs/${lease.jobId}/evidence`, {
            method: "POST",
            body: JSON.stringify({ leaseToken: lease.leaseToken, modelProfileId: embeddingProfile.id, embedding: embeddings[0] })
          });
          evidence = workerEvidencePacketSchema.parse(await evidenceResponse.json());
        }
        stage = "generating_answer";
        const prompt = buildAnswerPrompt(input.payload.question, input.payload.mode, evidence.items);
        const generated = await generationProvider.extract(prompt, answerSchema, (value) => answerValidator.parse(value));
        assertCitationSelection(input.payload.mode, evidence.items, generated.citationIds, generated.insufficientEvidence);
        result = { type: "worker_answer", chatId: input.payload.chatId, messageId: input.payload.assistantMessageId, answer: generated.answer, citationIds: generated.citationIds, insufficientEvidence: generated.insufficientEvidence };
      }
    } else if (input.payload.type === "study_plan_generation") {
      stage = "generating_study_plan";
      const prompt = buildStudyPlanPrompt(input.payload);
      const generated = await generationProvider.extract(prompt, studyPlanOutputSchema, (value) => studyPlanOutputValidator.parse(value));
      assertStudyPlanSources(input.payload.sources, generated.units);
      result = { type: "worker_study_plan", studyPlanId: input.payload.studyPlanId, units: generated.units };
    } else if(input.payload.type==="study_exercise_generation"){
      stage="generating_study_exercises";const generated=await generationProvider.extract(buildStudyExercisePrompt(input.payload),studyExerciseOutputSchema,value=>studyExerciseOutputValidator.parse(value));for(const exercise of generated.exercises)assertAuthorizedStudySources(input.payload.sources,exercise.materialSourceIds);result={type:"worker_study_exercises",requestId:input.payload.requestId,exercises:generated.exercises};
    } else if(input.payload.type==="study_attempt_feedback"){
      stage="evaluating_study_attempt";const feedback=await generationProvider.extract(buildStudyFeedbackPrompt(input.payload),studyFeedbackOutputSchema,value=>studyFeedbackOutputValidator.parse(value));assertAuthorizedStudySources(input.payload.sources,feedback.materialSourceIds);result={type:"worker_study_feedback",attemptId:input.payload.attemptId,feedback};
    } else if(input.payload.type==="transcript_analysis"){
      stage="analyzing_transcript";const generated=await generationProvider.extract(buildTranscriptAnalysisPrompt(input.payload),transcriptAnalysisOutputSchema,value=>transcriptAnalysisOutputValidator.parse(value));assertTranscriptAnalysisSources(input.payload.segments,generated.sourceSegmentIds);result={type:"worker_transcript_analysis",transcriptId:input.payload.transcriptId,sourceRevision:input.payload.sourceRevision,scope:input.payload.scope,...generated};
    } else if(input.payload.type==="artifact_generation"){
      stage="generating_artifact";const generated=await generationProvider.extract(buildArtifactGenerationPrompt(input.payload),artifactGenerationOutputSchema,value=>artifactGenerationOutputValidator.parse(value));assertArtifactSources(input.payload,generated.sourceRecordIds);result={type:"worker_artifact_generation",kind:input.payload.kind,...generated};
    } else if(input.payload.type==="task_breakdown"){
      stage="generating_task_breakdown";const generated=await generationProvider.extract(buildTaskBreakdownPrompt(input.payload),taskBreakdownOutputSchema,value=>taskBreakdownOutputValidator.parse(value));assertTaskBreakdown(input.payload,generated.steps);result={type:"worker_task_breakdown",taskId:input.payload.taskId,...generated};
    } else if (input.payload.type === "index_rebuild") {
      let indexedRevisions = 0;
      for (const [noteIndex, note] of input.payload.notes.entries()) {
        stage = `embedding_${noteIndex + 1}_of_${input.payload.notes.length}`;
        const sourceResponse = await hubRequest(`api/v1/worker/jobs/${lease.jobId}/sources/${note.sourceId}`, { headers: { "x-job-lease-token": lease.leaseToken } });
        const source = workerSourceInputSchema.parse(await sourceResponse.json());
        if (source.contentHash !== note.contentHash || source.revision !== note.revision) throw new Error("source_revision_mismatch");
        const chunks = chunkText(source.text);
        if (!chunks.length) throw new Error("source_has_no_indexable_text");
        for (let offset = 0; offset < chunks.length; offset += 16) {
          stage = `embedding_${noteIndex + 1}_of_${input.payload.notes.length}_batch_${Math.floor(offset / 16) + 1}`;
          const batch = chunks.slice(offset, offset + 16);
          const embeddings = await embeddingProvider.embed(batch.map((chunk) => chunk.text), 1024);
          await hubRequest(`api/v1/worker/jobs/${lease.jobId}/index-batches`, {
            method: "POST",
            body: JSON.stringify({
              leaseToken: lease.leaseToken,
              generationId: input.payload.generationId,
              noteId: note.noteId,
              noteRevision: note.revision,
              sourceHash: note.contentHash,
              chunks: batch.map((chunk, index) => ({ ...chunk, embedding: embeddings[index] }))
            })
          });
        }
        indexedRevisions += 1;
      }
      result = { type: "index_rebuild", indexedRevisions };
    } else throw new Error("job_kind_not_supported");
    stage = "committing";
    const completed = await hubRequest(`api/v1/worker/jobs/${lease.jobId}/complete`, {
      method: "POST",
      body: JSON.stringify({ leaseToken: lease.leaseToken, inputHash: input.inputHash, result })
    });
    return await completed.json() as JobHandle;
  } catch (error) {
    const code = error instanceof z.ZodError ? "model_output_invalid" : error instanceof SyntaxError ? "model_json_invalid" : error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : "worker_execution_failed";
    await hubRequest(`api/v1/worker/jobs/${lease.jobId}/fail`, {
      method: "POST",
      body: JSON.stringify({ leaseToken: lease.leaseToken, errorCode: code, safeDetail: "The local worker could not complete the validated operation.", retryable: code.startsWith("ollama_") || code.startsWith("openai_compatible_") || code === "worker_execution_failed" })
    }).catch(() => undefined);
    throw error;
  } finally {
    clearInterval(heartbeatTimer);
  }
}

async function run() {
  for (;;) {
    try {
      await heartbeat();
      const response = await hubRequest("api/v1/worker/jobs/claim", {
        method: "POST",
        body: JSON.stringify({ supportedJobTypes: ["note_process", "ai_setup_test", "index_rebuild", "hybrid_search", "semantic_search", "answer_generation", "study_plan_generate", "study_exercise_generate", "study_attempt_feedback", "transcript_analysis", "artifact_generate", "task_breakdown"], availableCapacity: 1 })
      });
      if (response.status === 204) {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        continue;
      }
      await processJob(workerLeaseSchema.parse(await response.json()));
    } catch (error) {
      const safeCode = error instanceof z.ZodError ? "worker_input_or_result_invalid"
        : error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message
        : "worker_unhandled_error";
      process.stderr.write(`worker_loop_error=${safeCode}\n`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

await run();
