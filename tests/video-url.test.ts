import { describe, expect, it } from "vitest";
import { validateVideoUrl } from "../lib/video-url";

describe("validateVideoUrl", () => {
  it("accepts supported video URLs and normalizes them", () => {
    expect(validateVideoUrl("https://www.youtube.com/watch?v=abc").hostname).toBe("www.youtube.com");
    expect(validateVideoUrl("https://x.com/example/status/123").hostname).toBe("x.com");
  });

  it.each([
    "not a url",
    "file:///etc/passwd",
    "https://user:secret@youtube.com/watch?v=abc",
    "https://example.com/video",
    "https://youtube.com.evil.example/video",
  ])("rejects unsafe or unsupported input: %s", (value) => {
    expect(() => validateVideoUrl(value)).toThrow();
  });
});
