import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deleteRun, listRuns, loadRun, saveRun } from "../lib/run-storage";
import type { AuditOutput } from "../lib/types";

let testDirectory: string | undefined;

afterEach(async () => {
  delete process.env.RUNS_DIR;
  if (testDirectory) await rm(testDirectory, { recursive: true, force: true });
  testDirectory = undefined;
});

const output: AuditOutput = {
  transcript: "The speaker recommends measuring database queries before changing the architecture.",
  transcriptSource: "pasted",
  claims: {
    topic: "Database performance",
    problem: "Slow queries",
    technicalClaims: ["Queries should be measured"],
    recommendedSolution: "Add query monitoring",
    reasoning: ["Evidence should guide optimization"],
    assumptions: ["The database exposes query metrics"],
    technologiesAndPatterns: ["Query monitoring"],
    implications: [{ category: "Performance", detail: "Can identify bottlenecks" }],
    uncertainties: ["No database engine was named"],
  },
  onboardingPrompt: "Do NOT modify files. Inspect the repository and report evidence.",
  investigationPrompt: "Treat this as a hypothesis. Do NOT modify any files.",
};

describe("local JSON run storage", () => {
  it("atomically saves, lists, and reloads a complete run", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "audit-scout-storage-"));
    process.env.RUNS_DIR = testDirectory;

    const saved = await saveRun(output, "https://www.instagram.com/p/example/");
    const raw = await readFile(join(testDirectory, `${saved.runId}.json`), "utf8");
    expect(JSON.parse(raw).claims.topic).toBe("Database performance");

    const summaries = await listRuns();
    expect(summaries).toHaveLength(1);
    expect(summaries[0].runId).toBe(saved.runId);

    const loaded = await loadRun(saved.runId);
    expect(loaded).toEqual(saved);
  });

  it("rejects unsafe run identifiers", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "audit-scout-storage-"));
    process.env.RUNS_DIR = testDirectory;
    await expect(loadRun("../.env.local")).rejects.toThrow(/invalid run/i);
    await expect(deleteRun("../.env.local")).rejects.toThrow(/invalid run/i);
  });

  it("deletes only the selected saved run", async () => {
    testDirectory = await mkdtemp(join(tmpdir(), "audit-scout-storage-"));
    process.env.RUNS_DIR = testDirectory;

    const first = await saveRun(output);
    const second = await saveRun({
      ...output,
      claims: { ...output.claims, topic: "API performance" },
    });

    await deleteRun(first.runId);

    await expect(loadRun(first.runId)).rejects.toThrow();
    await expect(loadRun(second.runId)).resolves.toEqual(second);
    await expect(listRuns()).resolves.toEqual([
      expect.objectContaining({ runId: second.runId, topic: "API performance" }),
    ]);
  });
});
