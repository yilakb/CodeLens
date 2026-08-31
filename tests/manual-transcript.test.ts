import { describe, expect, it } from "vitest";
import { validateManualTranscript } from "../lib/manual-transcript";

describe("validateManualTranscript", () => {
  it("accepts and trims a complete pasted transcript", () => {
    const transcript = "  The speaker explains why repeated database queries can increase latency.  ";
    expect(validateManualTranscript(transcript)).toBe(transcript.trim());
  });

  it("rejects empty or implausibly short pasted content", () => {
    expect(() => validateManualTranscript("Short note")).toThrow(/too short/i);
    expect(() => validateManualTranscript(undefined)).toThrow(/paste/i);
  });

  it("rejects transcripts beyond the MVP input limit", () => {
    expect(() => validateManualTranscript("a".repeat(200_001))).toThrow(/too long/i);
  });
});
