import { describe, expect, it, vi } from "vitest";
vi.mock("./db.js", () => ({ transaction: vi.fn() }));
import { acceptedAiOrganization, noteProcessingInput, sourceOrganization, subjectName } from "./note-sorting.js";

const subjects = ["Matematikk 2P", "Økonomistyring"];
const source = (body: string, sourceKind: string | null = "provider", relativePath: string | null = null) => sourceOrganization({ body, sourceKind, relativePath, revision: 4 }, subjects);

describe("source-based note sorting", () => {
  it("reads the class from the provider header rather than the post content", () => {
    expect(source("Source: Teams class channel post\nClass: Matematikk 2P 26_27 med Benedicte - VGMAI\nChannel: General\n\nClass: Wrong")).toMatchObject({ subject: "Matematikk 2P", origin: "source", sourceRevision: 4 });
    expect(source("Source: Teams class channel post\n\nClass: Wrong").subject).toBeNull();
  });
  it("takes a file's class from its verified manifest path", () => {
    expect(source("Imported from teams: Teams/Økonomistyring 2026/27 - VGMAI/Shared/deck.pptx\n\nIgnore the source", "file", "Teams/Økonomistyring 2026/27 - VGMAI/Shared/deck.pptx")).toMatchObject({ subject: "Økonomistyring", origin: "source" });
    expect(source("Imported from teams: Teams/Maths/a.txt\n\ntext", "file").subject).toBeNull();
  });
  it("never treats a filename or arbitrary personal content as provider metadata", () => {
    expect(source("Source: Teams class channel post\nClass: False\n\ntext", "capture").subject).toBeNull();
    expect(source("Source: Teams chat\nConversation: Maths\n\ntext").subject).toBeNull();
  });
  it("recognizes an exact subject heading on an owner capture without guessing from keywords", () => {
    expect(source("Matematikk 2P\nProsentregning", "capture").subject).toBe("Matematikk 2P");
    expect(source("Math is interesting", "capture").subject).toBeNull();
    expect(source("ØKONOMISTYRING\nNotater", null).subject).toBe("Økonomistyring");
  });
  it("leaves missing or ambiguous headings unassigned", () => {
    expect(source("\n", "capture")).toMatchObject({ subject: null, origin: "unassigned" });
    expect(sourceOrganization({ body: "norsk", sourceKind: "capture", relativePath: null, revision: 1 }, ["Norsk", "NORSK"]).subject).toBeNull();
  });
  it("cleans academic-period suffixes without losing Norwegian characters or course levels", () => {
    expect(subjectName("Entreprenørskap og bedriftsutvikling 1 2026-27 - VGMAI")).toBe("Entreprenørskap og bedriftsutvikling 1");
    expect(subjectName("Matematikk 2P 26/27 med Benedicte")).toBe("Matematikk 2P");
    expect(subjectName("Økonomistyring")).toBe("Økonomistyring");
    expect(subjectName("Økonomistyring 2026 27 - VGMAI")).toBe("Økonomistyring");
  });
  it("normalizes only observed legacy OEM label damage without editing originals", () => {
    expect(subjectName("├ÿkonomistyring 2026 27 - VGMAI")).toBe("Økonomistyring");
    expect(subjectName("Entrepren├╕rskap og bedriftsutvikling 1 2026-27 - VGMAI")).toBe("Entreprenørskap og bedriftsutvikling 1");
  });
  it("does not include the General channel in a file's class name", () => {
    expect(source("Imported from teams: Teams/History - VGMAI/General/Posts/file.pdf", "file", "Teams/History - VGMAI/General/Posts/file.pdf").subject).toBe("History");
  });
});

describe("AI organization evidence gate", () => {
  const body = "Matematikk: Prosentpoeng og vekstfaktor";
  const proposal = { subject: "Matematikk 2P", topic: "Prosentpoeng", evidenceQuote: body, confidence: .95 };
  it("accepts a known subject and verbatim topic with high confidence", () => {
    expect(acceptedAiOrganization(proposal, body, subjects, 2)).toMatchObject({ subject: "Matematikk 2P", topic: "Prosentpoeng", origin: "ai", sourceRevision: 2 });
  });
  it("rejects unknown subjects, fabricated evidence, invented topics and low confidence", () => {
    expect(acceptedAiOrganization({ ...proposal, subject: "Biology" }, body, subjects, 1)).toBeNull();
    expect(acceptedAiOrganization({ ...proposal, evidenceQuote: "Not in the note" }, body, subjects, 1)).toBeNull();
    expect(acceptedAiOrganization({ ...proposal, topic: "Algebra" }, body, subjects, 1)).toBeNull();
    expect(acceptedAiOrganization({ ...proposal, confidence: .84 }, body, subjects, 1)).toBeNull();
  });
  it("accepts a topic-only grouping but rejects empty/no-evidence proposals", () => {
    expect(acceptedAiOrganization({ ...proposal, subject: null }, body, subjects, 1)?.topic).toBe("Prosentpoeng");
    expect(acceptedAiOrganization({ ...proposal, subject: null, topic: null }, body, subjects, 1)).toBeNull();
    expect(acceptedAiOrganization({ ...proposal, evidenceQuote: " " }, body, subjects, 1)).toBeNull();
    expect(acceptedAiOrganization(null, body, subjects, 1)).toBeNull();
  });
  it("queues the exact saved revision and a finite subject manifest", () => {
    expect(noteProcessingInput({ id: "note", source_id: "source", revision: 3 }, subjects)).toEqual({ type: "note_processing", noteId: "note", sourceId: "source", revision: 3, stages: ["classify"], subjects });
  });
});
