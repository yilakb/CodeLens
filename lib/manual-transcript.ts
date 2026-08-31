const MAX_TRANSCRIPT_CHARACTERS = 200_000;
const MIN_TRANSCRIPT_CHARACTERS = 40;

export function validateManualTranscript(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Paste the complete transcript before analyzing it.");
  }

  const transcript = input.trim();
  if (transcript.length < MIN_TRANSCRIPT_CHARACTERS) {
    throw new Error(
      "The pasted transcript is too short. Copy the complete transcript from the external service.",
    );
  }
  if (transcript.length > MAX_TRANSCRIPT_CHARACTERS) {
    throw new Error(
      "The pasted transcript is too long for this MVP. Keep it under 200,000 characters.",
    );
  }

  return transcript;
}
