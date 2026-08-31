import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);
const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 120_000;

export class TranscriptError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TranscriptError";
  }
}

export type TranscriptResult = {
  text: string;
  source: "captions" | "transcription";
};

async function runYtDlp(args: string[], cwd: string) {
  const binary = await resolveYtDlpBinary();
  return execFileAsync(binary, args, {
    cwd,
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
    shell: false,
  });
}

async function resolveYtDlpBinary() {
  const configured = process.env.YT_DLP_PATH?.trim();
  if (configured && configured.toLowerCase() !== "yt-dlp") {
    return configured;
  }

  // Winget updates PATH for future terminals, but an already-running Next.js
  // process cannot see that change. Discover the package location so the first
  // install works immediately without a machine-specific .env value.
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    const packageRoot = join(
      process.env.LOCALAPPDATA,
      "Microsoft",
      "WinGet",
      "Packages",
    );
    try {
      const packageDirectory = (await readdir(packageRoot))
        .filter((entry) => entry.startsWith("yt-dlp.yt-dlp_"))
        .sort()
        .at(-1);
      if (packageDirectory) {
        const candidate = join(packageRoot, packageDirectory, "yt-dlp.exe");
        await access(candidate);
        return candidate;
      }
    } catch {
      // Fall through to PATH lookup below.
    }
  }

  return configured || "yt-dlp";
}

export function cleanVtt(input: string): string {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  const output: string[] = [];
  let previous = "";

  for (const rawLine of lines) {
    const line = rawLine
      .replace(/<\/?c(?:\.[^>]*)?>/g, "")
      .replace(/<\/?[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();

    if (
      !line ||
      line === "WEBVTT" ||
      line.startsWith("Kind:") ||
      line.startsWith("Language:") ||
      /^\d+$/.test(line) ||
      /-->/u.test(line)
    ) {
      continue;
    }

    if (line !== previous) {
      output.push(line);
      previous = line;
    }
  }

  return output.join("\n").trim();
}

export function classifyYtDlpError(stderr: string): TranscriptError {
  const message = stderr.toLowerCase();
  if (
    message.includes("enoent") ||
    message.includes("not recognized") ||
    message.includes("cannot find the file")
  ) {
    return new TranscriptError(
      "yt-dlp is not installed or could not be found. Install it, then restart the app.",
      "YT_DLP_NOT_FOUND",
    );
  }
  if (message.includes("private video") || message.includes("login required")) {
    return new TranscriptError(
      "This video is private or requires a login, so its transcript cannot be accessed.",
      "VIDEO_PRIVATE",
    );
  }
  if (message.includes("unsupported url")) {
    return new TranscriptError(
      "The video platform or URL format is not supported by the installed downloader.",
      "PLATFORM_UNSUPPORTED",
    );
  }
  if (message.includes("video unavailable") || message.includes("not available")) {
    return new TranscriptError(
      "The video is unavailable or inaccessible from this machine.",
      "VIDEO_UNAVAILABLE",
    );
  }
  return new TranscriptError(
    "The transcript could not be obtained. Check that the video is public and yt-dlp is up to date.",
    "TRANSCRIPT_UNAVAILABLE",
  );
}

export function classifyOpenAITranscriptionError(status: number): TranscriptError {
  if (status === 401 || status === 403) {
    return new TranscriptError(
      "OpenAI rejected the API key for transcription. Check OPENAI_API_KEY in .env.local.",
      "OPENAI_AUTH_FAILED",
    );
  }
  if (status === 413) {
    return new TranscriptError(
      "The downloaded audio exceeds OpenAI's transcription file limit.",
      "OPENAI_AUDIO_TOO_LARGE",
    );
  }
  if (status === 429) {
    return new TranscriptError(
      "The OpenAI transcription rate limit was reached. Wait briefly and try again.",
      "OPENAI_RATE_LIMITED",
    );
  }
  return new TranscriptError(
    "OpenAI could not transcribe the downloaded audio. Check the model setting and try again.",
    "OPENAI_TRANSCRIPTION_FAILED",
  );
}

async function tryCaptions(videoUrl: string, workingDirectory: string) {
  try {
    await runYtDlp(
      [
        "--no-playlist",
        "--skip-download",
        "--write-subs",
        "--write-auto-subs",
        "--sub-langs",
        "en.*,en",
        "--sub-format",
        "vtt",
        "--output",
        "caption.%(ext)s",
        "--",
        videoUrl,
      ],
      workingDirectory,
    );
  } catch {
    return null;
  }

  const files = (await readdir(workingDirectory)).filter(
    (file) => file.startsWith("caption.") && file.endsWith(".vtt"),
  );
  if (files.length === 0) return null;

  const transcript = cleanVtt(await readFile(join(workingDirectory, files[0]), "utf8"));
  return transcript.length > 0 ? transcript : null;
}

async function downloadAudio(videoUrl: string, workingDirectory: string) {
  try {
    await runYtDlp(
      [
        "--no-playlist",
        "--no-write-subs",
        "--format",
        "bestaudio[filesize<24M]/bestaudio[filesize_approx<24M]/bestaudio/best[filesize<24M]/best[filesize_approx<24M]/best",
        "--max-filesize",
        "24M",
        "--output",
        "audio.%(ext)s",
        "--",
        videoUrl,
      ],
      workingDirectory,
    );
  } catch (error) {
    const stderr =
      typeof error === "object" && error && "stderr" in error
        ? String(error.stderr)
        : String(error);
    throw classifyYtDlpError(stderr);
  }

  const file = (await readdir(workingDirectory)).find((entry) => entry.startsWith("audio."));
  if (!file) {
    throw new TranscriptError("No downloadable audio stream was found.", "AUDIO_UNAVAILABLE");
  }

  const path = join(workingDirectory, file);
  const info = await stat(path);
  if (info.size > MAX_AUDIO_BYTES) {
    throw new TranscriptError(
      "The audio is too large to transcribe in this MVP. Try a shorter video or use available captions.",
      "AUDIO_TOO_LARGE",
    );
  }
  return path;
}

async function transcribeAudioWithOpenAI(audioPath: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new TranscriptError(
      "Captions were unavailable and OPENAI_API_KEY is not configured for audio transcription.",
      "OPENAI_NOT_CONFIGURED",
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.audio.transcriptions.create({
      file: createReadStream(audioPath),
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-transcribe",
      response_format: "text",
    });
    if (!response.trim()) {
      throw new TranscriptError(
        "OpenAI returned an empty transcript for the downloaded audio.",
        "OPENAI_EMPTY_TRANSCRIPT",
      );
    }
    return response.trim();
  } catch (error) {
    if (error instanceof TranscriptError) throw error;
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status)
        : 0;
    throw classifyOpenAITranscriptionError(status);
  }
}

export async function acquireTranscript(videoUrl: URL): Promise<TranscriptResult> {
  const workingDirectory = await mkdtemp(join(tmpdir(), "audit-scout-"));
  try {
    const captions = await tryCaptions(videoUrl.href, workingDirectory);
    if (captions) return { text: captions, source: "captions" };

    const audioPath = await downloadAudio(videoUrl.href, workingDirectory);
    return {
      text: await transcribeAudioWithOpenAI(audioPath),
      source: "transcription",
    };
  } finally {
    await rm(workingDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
