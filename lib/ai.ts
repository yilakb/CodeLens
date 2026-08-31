import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import {
  ClaimsSchema,
  GeneratedPromptsSchema,
  type Claims,
  type GeneratedPrompts,
} from "./types";
import {
  buildPromptGenerationInput,
  PROMPT_GENERATION_INSTRUCTIONS,
} from "./prompts";

export const CLAIMS_INSTRUCTIONS = `You are a senior software architect extracting testable engineering claims from a video transcript for a later repository audit.

Your output must be faithful to the speaker while being more useful than a transcript summary.

- Identify the core engineering problem and decompose the source into a small set of distinct, testable technical claims. technicalClaims should normally contain 3 to 5 conceptual claims and never more than 7, not a chronology of statements. Group mechanisms, examples, consequences, and proposed validation that belong to the same engineering proposition; do not turn each sentence into a claim. Do not create a separate technical claim merely to restate an action that belongs in recommendedSolution. For example, missing indexes plus their alleged scan mechanism is one conceptual claim, while the proposed index audit and benchmarking belong in the recommendation and reasoning.
- Preserve the difference between observation, causal claim, recommendation, example, qualification, and speculation. Do not decide whether the speaker is correct.
- Capture the causal reasoning explicitly: what mechanism allegedly causes the problem, how the recommendation changes that mechanism, and what outcome is claimed.
- Preserve qualifications and scope limits such as "often," "can," environment-specific constraints, tradeoffs, prerequisites, exceptions, and any warnings against overgeneralization.
- Put unstated prerequisites needed for the reasoning to hold in assumptions, clearly phrased as assumptions rather than speaker claims.
- Record what repository inspection could establish and what remains dependent on runtime or production evidence in uncertainties when that distinction matters.
- Include only implications grounded in the transcript's reasoning. Do not add a broad checklist of security, performance, or reliability concerns merely because they might be relevant.
- Name technologies and patterns precisely, but do not invent versions, architecture, metrics, or repository facts.
- Treat the recommendation as a hypothesis for later testing. Never strengthen, repair, or silently generalize it. If no solution is offered, say so explicitly in recommendedSolution.
- Make every field self-contained, concise, non-duplicative, and technically precise.`;

type ReasoningEffort = "low" | "medium" | "high";

function getReasoningEffort(): ReasoningEffort {
  const configured = process.env.OPENAI_REASONING_EFFORT?.toLowerCase();
  if (configured === "low" || configured === "medium" || configured === "high") {
    return configured;
  }
  return "high";
}

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured for transcript analysis.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getAnalysisModel(): string {
  return process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.5";
}

export async function extractClaims(transcript: string): Promise<Claims> {
  const response = await getClient().responses.parse({
    model: getAnalysisModel(),
    instructions: CLAIMS_INSTRUCTIONS,
    input: `Extract the engineering claims from this transcript. Preserve the speaker's level of certainty.\n\n<transcript>\n${transcript}\n</transcript>`,
    reasoning: { effort: getReasoningEffort() },
    max_output_tokens: 10_000,
    store: false,
    text: {
      format: zodTextFormat(ClaimsSchema, "engineering_video_claims"),
      verbosity: "high",
    },
  });

  if (!response.output_parsed) {
    throw new Error("The analysis model did not return valid structured claims.");
  }
  return ClaimsSchema.parse(response.output_parsed);
}

export async function generateAuditPrompts(claims: Claims): Promise<GeneratedPrompts> {
  const response = await getClient().responses.parse({
    model: getAnalysisModel(),
    instructions: PROMPT_GENERATION_INSTRUCTIONS,
    input: buildPromptGenerationInput(claims),
    reasoning: { effort: getReasoningEffort() },
    max_output_tokens: 10_000,
    store: false,
    text: {
      format: zodTextFormat(GeneratedPromptsSchema, "repository_audit_prompts"),
      verbosity: "medium",
    },
  });

  if (!response.output_parsed) {
    throw new Error("The analysis model did not return valid repository prompts.");
  }
  return GeneratedPromptsSchema.parse(response.output_parsed);
}
