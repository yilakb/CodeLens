import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import {
  ClaimsSchema,
  type AuditOutput,
  type ProcessResult,
  type RunSummary,
} from "./types";

const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const StoredRunSchema = z.object({
  runId: z.string().regex(RUN_ID_PATTERN),
  createdAt: z.string().datetime(),
  sourceUrl: z.string().url().optional(),
  transcript: z.string().min(1),
  transcriptSource: z.enum(["captions", "transcription", "pasted"]),
  claims: ClaimsSchema,
  onboardingPrompt: z.string().min(1),
  investigationPrompt: z.string().min(1),
});

function runsDirectory() {
  return process.env.RUNS_DIR?.trim() || join(process.cwd(), "data", "runs");
}

function runPath(runId: string) {
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new Error("Invalid run identifier.");
  }
  return join(runsDirectory(), `${runId}.json`);
}

export async function saveRun(
  output: AuditOutput,
  sourceUrl?: string,
): Promise<ProcessResult> {
  const run: ProcessResult = StoredRunSchema.parse({
    ...output,
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    ...(sourceUrl ? { sourceUrl } : {}),
  });

  const directory = runsDirectory();
  await mkdir(directory, { recursive: true });
  const destination = runPath(run.runId);
  const temporary = join(directory, `${run.runId}.tmp`);
  await writeFile(temporary, `${JSON.stringify(run, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  await rename(temporary, destination);
  return run;
}

export async function loadRun(runId: string): Promise<ProcessResult> {
  const content = await readFile(runPath(runId), "utf8");
  return StoredRunSchema.parse(JSON.parse(content));
}

export async function listRuns(limit = 50): Promise<RunSummary[]> {
  let files: string[];
  try {
    files = await readdir(runsDirectory());
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    if (code === "ENOENT") return [];
    throw error;
  }

  const runs = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map(async (file) => {
        try {
          return await loadRun(file.slice(0, -5));
        } catch {
          return null;
        }
      }),
  );

  return runs
    .filter((run): run is ProcessResult => run !== null)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, Math.max(0, limit))
    .map((run) => ({
      runId: run.runId,
      createdAt: run.createdAt,
      sourceUrl: run.sourceUrl,
      transcriptSource: run.transcriptSource,
      topic: run.claims.topic,
    }));
}
