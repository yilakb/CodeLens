# CodeLens

CodeLens turns an engineering video into a structured, evidence-oriented handoff for reviewing a real codebase.

Give it a public video URL—or paste a transcript—and it will:

1. obtain or accept the transcript;
2. extract the speaker's engineering claims without automatically agreeing with them;
3. generate a topic-aware repository onboarding prompt;
4. generate a claim-specific investigation prompt;
5. save the complete result locally as JSON for later review.

The application deliberately stops before repository access, agent execution, code changes, commits, or pull requests. Its purpose is to turn advice from a video into a testable engineering hypothesis. A human remains responsible for deciding whether anything should be implemented.

```text
Video URL or transcript
        ↓
Transcript acquisition
        ↓
Structured engineering claims
        ↓
Topic-aware onboarding prompt
        ↓
Claim-specific investigation prompt
        ↓
Local JSON history and human review
```

## What CodeLens produces
<img width="1068" height="917" alt="image" src="https://github.com/user-attachments/assets/a5acf0fa-800e-4e23-895e-e6d0497f9162" />

### Structured claims

Instead of merely summarizing or reformatting the transcript, CodeLens identifies:

- the broader engineering topic;
- the problem described by the speaker;
- distinct technical claims and their causal mechanisms;
- the recommended action, treated as a hypothesis rather than an instruction;
- the speaker's reasoning;
- assumptions and preconditions that must hold for the advice to apply;
- relevant technologies and architectural patterns;
- genuine security, performance, reliability, scalability, architecture, maintainability, operations, or developer-experience implications;
- uncertainty, missing context, oversimplification, tradeoffs, and claims requiring runtime evidence.

### Repository onboarding prompt

The first generated prompt prepares a repository-aware coding agent to map the relevant architecture. It adapts to the video's topic—for example database access, authentication, caching, outbound HTTP, queues, or observability—without revealing or advocating the video's proposed solution.

It requires read-only investigation, end-to-end flow tracing, precise repository evidence, and separation of confirmed facts from inference and unknowns. It then stops before beginning the focused audit.

### Investigation prompt

The second prompt converts the claims into a topic-specific audit methodology. It asks a repository-aware agent to test each major claim independently and determine:

- whether the claim is confirmed, partially applicable, refuted, not applicable, or needs runtime verification;
- what static repository evidence supports the conclusion;
- what cannot be established from source code alone;
- which runtime evidence would be required;
- the realistic impact and severity without exaggeration;
- whether the recommendation fits the actual architecture;
- what side effects, constraints, or safer alternatives exist;
- what should remain untouched.

The prompt requests an audit report only and ends with `STOP`. It never authorizes implementation.

## Features

- Public video URL input for YouTube, Instagram, X/Twitter, Vimeo, TikTok, and Facebook
- English creator-caption and automatic-caption preference
- OpenAI audio transcription when captions are unavailable
- Manual transcript fallback when a platform blocks automated access
- Structured OpenAI Responses API outputs validated with Zod
- High-reasoning engineering claim decomposition
- Dynamically generated onboarding and investigation prompts
- One-click copy controls for each result
- Local run history with reload support
- Downloadable JSON output
- Explicit transcript, analysis, validation, and storage errors
- No database, authentication system, queue, background service, or repository connection

## Requirements

- Node.js 20.9 or newer
- npm
- An OpenAI API key with API billing enabled
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) available on `PATH`, or an explicit path configured through `YT_DLP_PATH`

`ffmpeg` is optional for the default workflow because CodeLens can send the downloaded source audio container directly to OpenAI. Installing it may improve compatibility with some video platforms and formats.

## Quick start

### 1. Clone the repository

```bash
git clone https://github.com/yilakb/CodeLens.git
cd CodeLens
```

### 2. Install the application dependencies

```bash
npm install
```

### 3. Install `yt-dlp`

On Windows with Winget:

```powershell
winget install --id yt-dlp.yt-dlp
```

On macOS with Homebrew:

```bash
brew install yt-dlp
```

For other systems, follow the official [`yt-dlp` installation instructions](https://github.com/yt-dlp/yt-dlp/wiki/Installation).

### 4. Create the local environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS or Linux:

```bash
cp .env.example .env.local
```

Open `.env.local` and replace the placeholder API key:

```dotenv
OPENAI_API_KEY=sk-your-key-here
OPENAI_ANALYSIS_MODEL=gpt-5.5
OPENAI_REASONING_EFFORT=high
OPENAI_TRANSCRIPTION_MODEL=gpt-transcribe
YT_DLP_PATH=yt-dlp
```

Create an API key from the [OpenAI API key page](https://platform.openai.com/api-keys). Keep it private. The OpenAI API is billed separately from a ChatGPT subscription.

### 5. Start CodeLens

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How to use it

### Process a public video

1. Copy the public video URL.
2. Paste it into the **Engineering video URL** field.
3. Select **Process video**.
4. Wait while CodeLens obtains the transcript and performs two structured analysis calls.
5. Review the transcript and structured claims before using either prompt.
6. Copy the onboarding prompt into a repository-aware coding agent.
7. After that agent returns its architecture briefing and stops, send it the investigation prompt.
8. Review the resulting audit report yourself before authorizing any separate implementation work.

Processing may take several minutes when CodeLens must download audio, transcribe it, and use high-reasoning analysis.

### Use a transcript directly

If a platform blocks `yt-dlp`, expand **Bring your own transcript**:

1. obtain a transcript from a source you trust;
2. paste the complete transcript into CodeLens;
3. select the transcript-processing action;
4. review the generated claims and prompts normally.

The interface links to SaveTo as a convenience for public Instagram content. SaveTo is an independent third-party service with no documented public API used by this application. CodeLens does not automate, scrape, or send requests to SaveTo. Review its terms and privacy policy before submitting content.

### Reopen or export a previous run

Every successful result is written atomically to:

```text
data/runs/<run-id>.json
```

The page lists the 50 most recent saved runs. Select a run to reload its transcript, claims, and prompts, or use **Download JSON** to create a portable browser download.

Set `RUNS_DIR` to another local directory if you want saved runs stored elsewhere.

## Output format

CodeLens keeps the full workflow in one JSON document:

```json
{
  "runId": "uuid",
  "createdAt": "ISO-8601 timestamp",
  "sourceUrl": "optional original video URL",
  "transcript": "complete transcript text",
  "transcriptSource": "captions | transcription | pasted",
  "claims": {
    "topic": "...",
    "problem": "...",
    "technicalClaims": ["..."],
    "recommendedSolution": "...",
    "reasoning": ["..."],
    "assumptions": ["..."],
    "technologiesAndPatterns": ["..."],
    "implications": [
      { "category": "Performance", "detail": "..." }
    ],
    "uncertainties": ["..."]
  },
  "onboardingPrompt": "...",
  "investigationPrompt": "..."
}
```

API keys are never included in saved output.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | — | Server-side OpenAI authentication for transcription and analysis |
| `OPENAI_ANALYSIS_MODEL` | No | `gpt-5.5` | Responses API model used for claims and prompt generation; must support Structured Outputs |
| `OPENAI_REASONING_EFFORT` | No | `high` | Analysis depth: `low`, `medium`, or `high` |
| `OPENAI_TRANSCRIPTION_MODEL` | No | `gpt-transcribe` | Speech-to-text model used when captions are unavailable |
| `YT_DLP_PATH` | No | `yt-dlp` | Executable name or explicit local path |
| `RUNS_DIR` | No | `data/runs` | Local directory used for saved JSON runs |

## How transcript acquisition works

For a validated and allowlisted video URL, the server:

1. asks `yt-dlp` for English creator or automatic captions;
2. cleans VTT caption markup without summarizing the content;
3. downloads one audio stream when captions are unavailable;
4. rejects audio larger than the configured 24 MiB safety limit;
5. sends acceptable audio to the configured OpenAI transcription model;
6. removes temporary files in a `finally` block.

URLs are passed to `yt-dlp` as discrete process arguments with shell execution disabled, and playlists are disabled. Successful access still depends on video visibility, platform behavior, local networking, and the installed `yt-dlp` version.

CodeLens never fabricates a transcript. Private, login-gated, inaccessible, unsupported, oversized, or failed transcription cases return an explicit error.

## AI analysis strategy

CodeLens makes two structured analysis calls after obtaining a transcript:

1. **Claim extraction** decomposes the source into a small set of conceptual engineering claims, recommendations, causal reasoning, assumptions, implications, and uncertainty.
2. **Prompt synthesis** uses those validated claims to create both repository investigation prompts.

The onboarding prompt remains independent from the proposed solution to limit confirmation bias, while still focusing discovery on the architecture relevant to the topic. The investigation prompt derives its sections from the claims instead of injecting them into a universal checklist.

Both calls use Structured Outputs and are validated on the server before anything is saved or displayed. Model outputs can still be imperfect, so human review is required.

## Application boundaries

CodeLens does not:

- connect to GitHub or another source-code host;
- inspect a repository;
- run a coding agent;
- modify files or database objects;
- execute migrations or performance tests;
- create commits, branches, issues, or pull requests;
- confirm production behavior without evidence;
- decide that a video's recommendation is correct.

The generated prompts can be copied into a separate repository-aware agent. Any implementation must be explicitly authorized as a later task.

## API routes

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/process` | `POST` | Process `{ "url": "..." }` or `{ "transcript": "..." }`, save the result, and return it |
| `/api/runs` | `GET` | List recent saved runs |
| `/api/runs/:runId` | `GET` | Load one saved run |

The app is designed for trusted local use and does not include authentication or rate limiting. Do not expose it directly to an untrusted network without adding appropriate protections.

## Project structure

```text
app/
  api/process/          Workflow orchestration
  api/runs/             Saved-run history APIs
  page.tsx              Local web interface
lib/
  ai.ts                 OpenAI claim extraction and prompt synthesis
  prompts.ts            Generalizable prompt-generation instructions
  run-storage.ts        Atomic local JSON persistence
  transcript.ts         Caption, audio, and transcription workflow
  types.ts              Zod schemas and TypeScript output types
  video-url.ts          Video URL validation and host allowlist
tests/                  Unit tests
data/runs/              Local generated results; ignored by Git
```

## Development commands

```bash
npm run dev        # Start the local development server
npm test           # Run the Vitest suite
npm run typecheck  # Validate TypeScript without emitting files
npm run build      # Create and verify the production build
npm start          # Run the production build
```

Before opening a pull request, run:

```bash
npm test
npm run typecheck
npm run build
```

## Troubleshooting

### “Transcript unavailable”

- Confirm that the video is public and opens without signing in.
- Update `yt-dlp`:

  ```powershell
  winget upgrade --id yt-dlp.yt-dlp
  ```

- Restart the terminal and development server after installing or upgrading `yt-dlp`.
- Run `yt-dlp --version` to confirm it is available.
- Set `YT_DLP_PATH` to the full executable path if it is installed but not discoverable.
- Use the manual transcript workflow when the platform blocks automated access.

### “OPENAI_API_KEY is not configured”

Confirm that `.env.local` exists in the repository root, contains the key without surrounding quotes, and that the development server was restarted after the file changed.

### Analysis takes a long time

High reasoning improves technical decomposition but increases latency and API usage. For faster local experiments, set:

```dotenv
OPENAI_REASONING_EFFORT=medium
```

Restart the application after changing environment variables.

### A saved run is missing

Confirm that the process completed successfully and that the application can write to `data/runs`, or inspect the directory configured by `RUNS_DIR`.

## Privacy and security

- `.env.local` is ignored by Git and must never be committed.
- `data/runs` is ignored because transcripts and generated audits may contain sensitive information.
- Saved JSON is local but not encrypted.
- Video or transcript content sent through OpenAI is subject to the applicable OpenAI API data terms.
- Third-party transcript services have their own privacy and retention policies.
- Review outputs before sharing them or sending them to another agent.

## Known limitations

- Caption selection is English-first; other languages generally use audio transcription.
- Audio fallback is limited to 24 MiB and a two-minute downloader timeout.
- Platform anti-bot behavior changes frequently and can break public-video access.
- Long videos without captions may exceed the single-file transcription limit; audio chunking is not included.
- Static repository inspection cannot prove production latency, traffic frequency, query plans, resource usage, cache hit rates, billing impact, or security exploitability.
- LLM output is non-deterministic and always requires engineering judgment.
- The local app has no authentication or rate limiter.

## Contributing

Bug reports and focused pull requests are welcome. Please avoid changes that make CodeLens autonomously modify repositories or implement a video's recommendation—the human-in-the-loop boundary is a core design principle.
