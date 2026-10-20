import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assignmentSchoolFileRelativePath, postSchoolFileRelativePath, readSchoolDownload, retryInvalidDownload, safeSegment, schoolFileByteLimit, skippableSchoolFileError, validateSchoolOriginal } from "./teams-powerpoints.js";

describe("Teams PowerPoint path segments", () => {
  it("removes path separators without losing Norwegian names", () => {
    expect(safeSegment("Matematikk 2P / vår: prøve")).toBe("Matematikk 2P vår prøve");
    expect(safeSegment("Økonomistyring.pptx")).toBe("Økonomistyring.pptx");
  });

  it("rejects empty segments", () => {
    expect(() => safeSegment("../")).toThrow("teams_file_path_segment_invalid");
    expect(() => safeSegment("\u0000")).toThrow("teams_file_path_segment_invalid");
  });
});

describe("Teams PowerPoint download retry", () => {
  it("saves a download into controlled staging and removes the transient copy", async () => {
    const stagingRoot = await mkdtemp(path.join(tmpdir(), "sorta-teams-download-"));
    try {
      await mkdir(path.join(stagingRoot, "files"));
      const contents = Buffer.from("%PDF school handout");
      const actual = await readSchoolDownload({
        saveAs: async target => { await writeFile(target, contents); },
        suggestedFilename: () => "handout.pdf",
        cancel: async () => {},
      }, stagingRoot, "handout.pdf", 0);
      expect(actual).toEqual(contents);
      expect(await readdir(path.join(stagingRoot, "files"))).toEqual([]);
    } finally { await rm(stagingRoot, { recursive: true, force: true }); }
  });

  it("normalizes a failed controlled download and leaves no transient copy", async () => {
    const stagingRoot = await mkdtemp(path.join(tmpdir(), "sorta-teams-download-"));
    try {
      await mkdir(path.join(stagingRoot, "files"));
      await expect(readSchoolDownload({
        saveAs: async () => { throw new Error("browser download failed"); },
        suggestedFilename: () => "handout.pdf",
        cancel: async () => {},
      }, stagingRoot, "handout.pdf", 0)).rejects.toThrow("teams_powerpoint_download_path_failed");
      expect(await readdir(path.join(stagingRoot, "files"))).toEqual([]);
    } finally { await rm(stagingRoot, { recursive: true, force: true }); }
  });

  it("retries one invalid archive and returns the valid download", async () => {
    let attempts = 0;
    const result = await retryInvalidDownload(async () => {
      if (++attempts === 1) throw new Error("teams_powerpoint_archive_invalid");
      return "valid";
    }, async () => {});
    expect(result).toBe("valid");
    expect(attempts).toBe(2);
  });

  it("stops after four invalid downloads", async () => {
    let attempts = 0;
    await expect(retryInvalidDownload(async () => {
      attempts++;
      throw new Error("teams_powerpoint_download_invalid");
    }, async () => {})).rejects.toThrow("teams_powerpoint_download_invalid");
    expect(attempts).toBe(4);
  });

  it("does not retry limits or changed rows", async () => {
    let attempts = 0;
    await expect(retryInvalidDownload(async () => {
      attempts++;
      throw new Error("teams_powerpoint_file_limit_exceeded:1");
    })).rejects.toThrow("teams_powerpoint_file_limit_exceeded:1");
    expect(attempts).toBe(1);
  });

  it("isolates only exhausted invalid downloads, never limits or changed rows", () => {
    expect(skippableSchoolFileError(new Error("teams_powerpoint_download_invalid"))).toBe("teams_powerpoint_download_invalid");
    expect(skippableSchoolFileError(new Error("teams_powerpoint_download_event_timeout"))).toBe("teams_powerpoint_download_event_timeout");
    expect(skippableSchoolFileError(new Error("teams_school_file_signature_invalid"))).toBe("teams_school_file_signature_invalid");
    expect(skippableSchoolFileError(new Error("teams_powerpoint_file_limit_exceeded:1"))).toBeNull();
    expect(skippableSchoolFileError(new Error("teams_powerpoint_row_changed"))).toBeNull();
  });
});

describe("Teams post school-file identity", () => {
  it("keeps Norwegian class names and stable post identity", () => {
    const first = postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Prøve.pptx");
    expect(first).toMatch(/^Teams\/Økonomistyring\/General\/Posts\/[0-9a-f]{24}\/Prøve\.pptx$/);
    expect(postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Prøve.pptx")).toBe(first);
    expect(postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Prøve.pptx", 1)).toMatch(/\/2-Prøve\.pptx$/);
    expect(postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Prøve.pptx", 0, "Kapittel 3")).toMatch(/^Teams\/Økonomistyring\/Kapittel 3\/Posts\/[0-9a-f]{24}\/Prøve\.pptx$/);
    expect(postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Oppgaver.pdf")).toMatch(/\/Oppgaver\.pdf$/);
    expect(postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Notater.docx")).toMatch(/\/Notater\.docx$/);
    expect(postSchoolFileRelativePath("Økonomistyring", "chain", "message", "Tabell.xlsx")).toMatch(/\/Tabell\.xlsx$/);
  });

  it("rejects missing identities and other file types", () => {
    expect(() => postSchoolFileRelativePath("Class", "", "message", "Slides.pptx")).toThrow("teams_post_powerpoint_identity_invalid");
    expect(() => postSchoolFileRelativePath("Class", "chain", "message", "File.exe")).toThrow("teams_post_school_file_name_invalid");
  });
});

describe("Teams assignment school-file identity", () => {
  it("uses a stable assignment identity and preserves the original extension", () => {
    const file = assignmentSchoolFileRelativePath("Matematikk 2P", "class-id", "assignment-id", "Øving.pptx");
    expect(file).toMatch(/^Teams\/Matematikk 2P\/Assignments\/[0-9a-f]{24}\/Øving\.pptx$/);
    expect(assignmentSchoolFileRelativePath("Matematikk 2P", "class-id", "assignment-id", "Øving.pptx", 1)).toMatch(/\/2-Øving\.pptx$/);
    expect(assignmentSchoolFileRelativePath("Matematikk 2P", "class-id", "assignment-id", "Øving.pptx")).toBe(file);
  });

  it("rejects missing identities and unsupported file types", () => {
    expect(() => assignmentSchoolFileRelativePath("Class", "", "assignment", "slides.pptx")).toThrow("teams_assignment_file_identity_invalid");
    expect(() => assignmentSchoolFileRelativePath("Class", "class", "assignment", "program.exe")).toThrow("teams_assignment_school_file_name_invalid");
  });
});

describe("downloaded school originals", () => {
  it("accepts supported signatures and bounds each file type", () => {
    expect(schoolFileByteLimit("slides.pptx")).toBe(100 * 1024 * 1024);
    expect(schoolFileByteLimit("handout.pdf")).toBe(25 * 1024 * 1024);
    expect(schoolFileByteLimit("table.xlsx")).toBe(25 * 1024 * 1024);
    expect(() => validateSchoolOriginal("handout.pdf", Buffer.from("%PDF-1.7"))).not.toThrow();
    expect(() => validateSchoolOriginal("notes.docx", Buffer.from("PKxxword/document.xml"))).not.toThrow();
    expect(() => validateSchoolOriginal("slides.pptx", Buffer.from("PKxxppt/presentation.xml"))).not.toThrow();
    expect(() => validateSchoolOriginal("table.xlsx", Buffer.from("PKxxxl/workbook.xml"))).not.toThrow();
  });

  it("rejects bundles, wrong signatures and unsupported types", () => {
    expect(() => schoolFileByteLimit("malware.exe")).toThrow("teams_school_file_type_unsupported");
    expect(() => validateSchoolOriginal("handout.pdf", Buffer.from("<html>not a PDF</html>"))).toThrow("teams_school_file_signature_invalid");
    expect(() => validateSchoolOriginal("notes.docx", Buffer.from("PKxxppt/presentation.xml"))).toThrow("teams_school_file_signature_invalid");
  });
});
