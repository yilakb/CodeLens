import { NextResponse } from "next/server";
import { extractClaims, generateAuditPrompts } from "@/lib/ai";
import { validateManualTranscript } from "@/lib/manual-transcript";
import { saveRun } from "@/lib/run-storage";
import { acquireTranscript, TranscriptError } from "@/lib/transcript";
import type { AuditOutput, ProcessError, ProcessResult } from "@/lib/types";
import { validateVideoUrl } from "@/lib/video-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

function errorResponse(
  status: number,
  stage: ProcessError["error"]["stage"],
  code: string,
  message: string,
) {
  return NextResponse.json<ProcessError>({ error: { stage, code, message } }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "validation", "INVALID_JSON", "The request body is invalid.");
  }

  const bodyRecord =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const hasManualTranscript = Object.prototype.hasOwnProperty.call(
    bodyRecord,
    "transcript",
  );

  let transcript: {
    text: string;
    source: ProcessResult["transcriptSource"];
  };
  let sourceUrl: string | undefined;

  if (hasManualTranscript) {
    try {
      transcript = {
        text: validateManualTranscript(bodyRecord.transcript),
        source: "pasted",
      };
    } catch (error) {
      return errorResponse(
        400,
        "validation",
        "INVALID_TRANSCRIPT",
        error instanceof Error ? error.message : "Paste a valid transcript.",
      );
    }
  } else {
    let videoUrl: URL;
    try {
      videoUrl = validateVideoUrl(bodyRecord.url);
      sourceUrl = videoUrl.href;
    } catch (error) {
      return errorResponse(
        400,
        "validation",
        "INVALID_VIDEO_URL",
        error instanceof Error ? error.message : "Enter a valid video URL.",
      );
    }

    try {
      transcript = await acquireTranscript(videoUrl);
    } catch (error) {
      if (error instanceof TranscriptError) {
        return errorResponse(422, "transcript", error.code, error.message);
      }
      return errorResponse(
        500,
        "transcript",
        "TRANSCRIPT_FAILED",
        "Transcript acquisition failed unexpectedly.",
      );
    }
  }

  try {
    const claims = await extractClaims(transcript.text);
    const prompts = await generateAuditPrompts(claims);
    const output: AuditOutput = {
      transcript: transcript.text,
      transcriptSource: transcript.source,
      claims,
      ...prompts,
    };
    try {
      const result: ProcessResult = await saveRun(output, sourceUrl);
      return NextResponse.json(result);
    } catch {
      return errorResponse(
        500,
        "storage",
        "RUN_SAVE_FAILED",
        "The analysis completed, but its local JSON file could not be saved.",
      );
    }
  } catch (error) {
    return errorResponse(
      502,
      "analysis",
      "ANALYSIS_FAILED",
      error instanceof Error
        ? error.message
        : "The transcript was obtained, but claim extraction failed.",
    );
  }
}
