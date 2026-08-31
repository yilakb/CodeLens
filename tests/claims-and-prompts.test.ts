import { describe, expect, it } from "vitest";
import { CLAIMS_INSTRUCTIONS } from "../lib/ai";
import {
  buildPromptGenerationInput,
  PROMPT_GENERATION_INSTRUCTIONS,
} from "../lib/prompts";
import { ClaimsSchema, GeneratedPromptsSchema } from "../lib/types";

const claims = ClaimsSchema.parse({
  topic: "Caching",
  problem: "Repeated database reads",
  technicalClaims: ["A cache can reduce database load"],
  recommendedSolution: "Add a cache for repeated reads",
  reasoning: ["Cached values avoid repeated queries"],
  assumptions: ["Reads repeat often"],
  technologiesAndPatterns: ["Cache-aside"],
  implications: [{ category: "Performance", detail: "May reduce latency" }],
  uncertainties: ["Invalidation behavior was not discussed"],
});

describe("structured claims and prompt boundaries", () => {
  it("rejects malformed structured claims", () => {
    expect(() => ClaimsSchema.parse({ topic: "Caching" })).toThrow();
  });

  it("requires claim decomposition, causality, qualifications, and uncertainty", () => {
    expect(CLAIMS_INSTRUCTIONS).toMatch(/testable technical claims/i);
    expect(CLAIMS_INSTRUCTIONS).toMatch(/3 to 5 conceptual claims/i);
    expect(CLAIMS_INSTRUCTIONS).toMatch(/belongs in recommendedSolution/i);
    expect(CLAIMS_INSTRUCTIONS).toMatch(/causal reasoning/i);
    expect(CLAIMS_INSTRUCTIONS).toMatch(/qualifications and scope limits/i);
    expect(CLAIMS_INSTRUCTIONS).toMatch(/runtime or production evidence/i);
  });

  it("passes the complete validated claims into prompt synthesis", () => {
    const input = buildPromptGenerationInput(claims);
    expect(input).toContain(claims.topic);
    expect(input).toContain(claims.recommendedSolution);
    expect(input).toContain(claims.uncertainties[0]);
  });

  it("requires unbiased onboarding and a claim-specific, read-only audit", () => {
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/Do not reveal, advocate, or anchor/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/claim-specific investigation methodology/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/static repository evidence/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/runtime evidence/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/Needs Runtime Verification/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/Critical, High, Medium, Low, or Informational/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/Proceed, Modify Recommendation, Reject, or Gather More Evidence/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/areas that should remain untouched/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/explicit STOP/i);
    expect(PROMPT_GENERATION_INSTRUCTIONS).toMatch(/No code changes/i);
  });

  it("validates both generated prompts without changing the saved output shape", () => {
    expect(
      GeneratedPromptsSchema.parse({
        onboardingPrompt: "Map the relevant architecture, then stop.",
        investigationPrompt: "Test each claim with evidence, then stop.",
      }),
    ).toBeTruthy();
  });
});
