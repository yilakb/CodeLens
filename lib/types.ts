import { z } from "zod";

const implicationCategories = [
  "Security",
  "Performance",
  "Reliability",
  "Scalability",
  "Architecture",
  "Maintainability",
  "Operations",
  "Developer Experience",
] as const;

export const ImplicationSchema = z.object({
  category: z.enum(implicationCategories),
  detail: z.string().min(1),
});

export const ClaimsSchema = z.object({
  topic: z.string().min(1),
  problem: z.string().min(1),
  technicalClaims: z.array(z.string().min(1)),
  recommendedSolution: z.string().min(1),
  reasoning: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  technologiesAndPatterns: z.array(z.string().min(1)),
  implications: z.array(ImplicationSchema),
  uncertainties: z.array(z.string().min(1)),
});

export type Claims = z.infer<typeof ClaimsSchema>;

export const GeneratedPromptsSchema = z.object({
  onboardingPrompt: z.string().min(1),
  investigationPrompt: z.string().min(1),
});

export type GeneratedPrompts = z.infer<typeof GeneratedPromptsSchema>;

export type AuditOutput = {
  transcript: string;
  transcriptSource: "captions" | "transcription" | "pasted";
  claims: Claims;
  onboardingPrompt: string;
  investigationPrompt: string;
};

export type ProcessResult = AuditOutput & {
  runId: string;
  createdAt: string;
  sourceUrl?: string;
};

export type RunSummary = {
  runId: string;
  createdAt: string;
  sourceUrl?: string;
  transcriptSource: ProcessResult["transcriptSource"];
  topic: string;
};

export type ProcessError = {
  error: {
    code: string;
    stage: "validation" | "transcript" | "analysis" | "storage";
    message: string;
  };
};
