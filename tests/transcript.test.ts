import { describe, expect, it } from "vitest";
import {
  classifyOpenAITranscriptionError,
  classifyYtDlpError,
  cleanVtt,
} from "../lib/transcript";

describe("transcript helpers", () => {
  it("turns captions into readable wording without timestamps", () => {
    const transcript = cleanVtt(`WEBVTT\n\n00:00:00.000 --> 00:00:02.000\n<c>Use a cache</c>\n\n00:00:02.000 --> 00:00:03.000\nUse a cache\n\n00:00:03.000 --> 00:00:04.000\nto reduce load.`);
    expect(transcript).toBe("Use a cache\nto reduce load.");
  });

  it("returns a useful private-video failure", () => {
    const error = classifyYtDlpError("ERROR: Private video. Sign in if you've been granted access");
    expect(error.code).toBe("VIDEO_PRIVATE");
    expect(error.message).toMatch(/private/i);
  });

  it("identifies a missing downloader instead of reporting a generic failure", () => {
    const error = classifyYtDlpError("spawn yt-dlp ENOENT");
    expect(error.code).toBe("YT_DLP_NOT_FOUND");
    expect(error.message).toMatch(/install/i);
  });

  it("turns OpenAI transcription failures into actionable errors", () => {
    expect(classifyOpenAITranscriptionError(401).code).toBe("OPENAI_AUTH_FAILED");
    expect(classifyOpenAITranscriptionError(413).code).toBe("OPENAI_AUDIO_TOO_LARGE");
    expect(classifyOpenAITranscriptionError(429).code).toBe("OPENAI_RATE_LIMITED");
    expect(classifyOpenAITranscriptionError(500).code).toBe("OPENAI_TRANSCRIPTION_FAILED");
  });
});
