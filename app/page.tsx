"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Claims, ProcessError, ProcessResult, RunSummary } from "@/lib/types";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button className="copy-button" type="button" onClick={copy} aria-live="polite">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function OutputSection({
  number,
  title,
  value,
  children,
  meta,
}: {
  number: string;
  title: string;
  value: string;
  children: ReactNode;
  meta?: string;
}) {
  return (
    <section className="output-card">
      <header className="output-header">
        <div>
          <span className="step-number">{number}</span>
          <h2>{title}</h2>
          {meta ? <span className="section-meta">{meta}</span> : null}
        </div>
        <CopyButton value={value} />
      </header>
      {children}
    </section>
  );
}

function claimsAsText(claims: Claims) {
  const list = (items: string[]) => items.map((item) => `- ${item}`).join("\n") || "- None stated";
  return `TOPIC\n${claims.topic}\n\nPROBLEM\n${claims.problem}\n\nTECHNICAL CLAIMS\n${list(claims.technicalClaims)}\n\nRECOMMENDED SOLUTION\n${claims.recommendedSolution}\n\nREASONING\n${list(claims.reasoning)}\n\nASSUMPTIONS / PRECONDITIONS\n${list(claims.assumptions)}\n\nTECHNOLOGIES / PATTERNS MENTIONED\n${list(claims.technologiesAndPatterns)}\n\nIMPLICATIONS\n${list(claims.implications.map((item) => `${item.category}: ${item.detail}`))}\n\nUNCERTAINTIES\n${list(claims.uncertainties)}`;
}

function ClaimList({ items }: { items: string[] }) {
  return items.length ? (
    <ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
  ) : (
    <p className="muted">None stated.</p>
  );
}

function ClaimsView({ claims }: { claims: Claims }) {
  return (
    <div className="claims-grid">
      <div className="claim-block claim-wide"><h3>Topic</h3><p>{claims.topic}</p></div>
      <div className="claim-block claim-wide"><h3>Problem</h3><p>{claims.problem}</p></div>
      <div className="claim-block"><h3>Technical claims</h3><ClaimList items={claims.technicalClaims} /></div>
      <div className="claim-block"><h3>Recommended solution</h3><p>{claims.recommendedSolution}</p></div>
      <div className="claim-block"><h3>Reasoning</h3><ClaimList items={claims.reasoning} /></div>
      <div className="claim-block"><h3>Assumptions / preconditions</h3><ClaimList items={claims.assumptions} /></div>
      <div className="claim-block"><h3>Technologies / patterns</h3><div className="tags">{claims.technologiesAndPatterns.map((item) => <span key={item}>{item}</span>)}</div></div>
      <div className="claim-block"><h3>Implications</h3><ul>{claims.implications.map((item, index) => <li key={`${index}-${item.category}`}><strong>{item.category}:</strong> {item.detail}</li>)}</ul></div>
      <div className="claim-block claim-wide uncertainty"><h3>Uncertainties</h3><ClaimList items={claims.uncertainties} /></div>
    </div>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<ProcessError["error"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<"video" | "transcript">("video");
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const refreshRuns = useCallback(async () => {
    try {
      const response = await fetch("/api/runs", { cache: "no-store" });
      const body = (await response.json()) as { runs?: RunSummary[] };
      if (response.ok && body.runs) setRuns(body.runs);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRuns();
  }, [refreshRuns]);

  async function submitForAnalysis(
    payload: { url: string } | { transcript: string },
    mode: "video" | "transcript",
  ) {
    if (loading) return;
    setLoadingMode(mode);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as ProcessResult | ProcessError;
      if (!response.ok || "error" in body) {
        setError("error" in body ? body.error : { code: "UNKNOWN", stage: "analysis", message: "Processing failed." });
        return;
      }
      setResult(body);
      await refreshRuns();
    } catch {
      setError({ code: "NETWORK_ERROR", stage: "analysis", message: "The app could not reach its server. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function processVideo(event: FormEvent) {
    event.preventDefault();
    await submitForAnalysis({ url }, "video");
  }

  async function processManualTranscript(event: FormEvent) {
    event.preventDefault();
    await submitForAnalysis({ transcript: manualTranscript }, "transcript");
  }

  async function loadSavedRun(runId: string) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${encodeURIComponent(runId)}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as ProcessResult | { error: { message: string } };
      if (!response.ok || "error" in body) {
        setError({
          code: "RUN_LOAD_FAILED",
          stage: "storage",
          message: "error" in body ? body.error.message : "The saved run could not be loaded.",
        });
        return;
      }
      setResult(body);
    } catch {
      setError({ code: "RUN_LOAD_FAILED", stage: "storage", message: "The saved run could not be loaded." });
    } finally {
      setLoading(false);
    }
  }

  function downloadCurrentRun() {
    if (!result) return;
    const blob = new Blob([`${JSON.stringify(result, null, 2)}\n`], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `audit-scout-${result.runId}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  const transcriptSourceLabel = result
    ? result.transcriptSource === "captions"
      ? "Source · Captions"
      : result.transcriptSource === "transcription"
        ? "Source · OpenAI transcription"
        : "Source · Pasted transcript"
    : "";

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="shell">
        <header className="intro">
          <div className="eyebrow"><span className="status-dot" /> Human-reviewed engineering workflow</div>
          <h1>Engineering Video<br /><span>Audit Scout</span></h1>
          <p>Turn engineering videos into focused codebase investigation prompts without automatically changing your code.</p>
        </header>

        <section className="input-panel" aria-labelledby="video-input-title">
          <div className="input-heading">
            <div><span className="step-number">00</span><h2 id="video-input-title">Start with a video</h2></div>
            <span className="local-badge">LOCAL · NO REPO ACCESS</span>
          </div>
          <form onSubmit={processVideo}>
            <label htmlFor="video-url">Video URL</label>
            <div className="input-row">
              <input id="video-url" type="url" required maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtube.com/watch?v=…" disabled={loading} />
              <button className="process-button" type="submit" disabled={loading || !url.trim()}>
                {loading ? <><span className="spinner" /> Processing</> : <>Process video <span aria-hidden="true">→</span></>}
              </button>
            </div>
            <p className="support-copy">YouTube · Instagram · X · Vimeo · TikTok · Facebook</p>
          </form>

          <div className="path-divider"><span>or use a transcript service</span></div>

          <section className="external-path" aria-labelledby="external-path-title">
            <div className="external-path-heading">
              <div>
                <span className="external-kicker">Instagram fallback</span>
                <h3 id="external-path-title">Bring your own transcript</h3>
              </div>
              <a
                className="external-link"
                href="https://saveto.ai/instagram-transcript-generator/"
                target="_blank"
                rel="noreferrer noopener"
              >
                Open SaveTo <span aria-hidden="true">↗</span>
              </a>
            </div>
            <ol className="external-steps">
              <li>Open SaveTo and paste the public Instagram URL.</li>
              <li>Generate, then copy the complete transcript.</li>
              <li>Paste it below. Audit Scout handles the analysis.</li>
            </ol>
            <form onSubmit={processManualTranscript} className="transcript-form">
              <label htmlFor="manual-transcript">Full transcript</label>
              <textarea
                id="manual-transcript"
                value={manualTranscript}
                onChange={(event) => setManualTranscript(event.target.value)}
                placeholder="Paste the full transcript here…"
                maxLength={200000}
                disabled={loading}
              />
              <div className="transcript-actions">
                <span>{manualTranscript.trim().length.toLocaleString()} characters</span>
                <button
                  className="secondary-button"
                  type="submit"
                  disabled={loading || manualTranscript.trim().length < 40}
                >
                  {loading && loadingMode === "transcript" ? (
                    <><span className="spinner light-spinner" /> Analyzing</>
                  ) : (
                    <>Analyze transcript <span aria-hidden="true">→</span></>
                  )}
                </button>
              </div>
            </form>
            <p className="external-note">
              SaveTo is an independent third-party service. Audit Scout does not automate, scrape,
              or send data to it.
            </p>
          </section>
        </section>

        <section className="history-panel" aria-labelledby="history-title">
          <header className="history-header">
            <div><span className="step-number">↺</span><h2 id="history-title">Previous runs</h2></div>
            <span className="local-badge">LOCAL JSON · {runs.length} SAVED</span>
          </header>
          {historyLoading ? (
            <p className="history-empty">Loading saved runs…</p>
          ) : runs.length === 0 ? (
            <p className="history-empty">Your first successful analysis will appear here automatically.</p>
          ) : (
            <div className="run-list">
              {runs.map((run) => (
                <button
                  className={`run-row ${result?.runId === run.runId ? "active" : ""}`}
                  type="button"
                  key={run.runId}
                  onClick={() => void loadSavedRun(run.runId)}
                  disabled={loading}
                >
                  <span className="run-topic">{run.topic}</span>
                  <span className="run-meta">
                    {new Date(run.createdAt).toLocaleString()} · {run.transcriptSource}
                  </span>
                  <span className="run-action">Load →</span>
                </button>
              ))}
            </div>
          )}
          <p className="history-privacy">Saved on this computer in <code>data/runs</code>. JSON files contain the transcript, claims, and prompts—never API keys.</p>
        </section>

        {loading ? (
          <section className="progress-panel" aria-live="polite">
            <div className="progress-line"><span /></div>
            <div>
              <strong>{loadingMode === "transcript" ? "Analyzing the pasted transcript" : "Scouting the engineering signal"}</strong>
              <p>{loadingMode === "transcript" ? "Extracting claims and preparing the human handoff prompts." : "Looking for captions, preparing OpenAI audio fallback, then extracting claims."}</p>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="error-panel" role="alert">
            <span className="error-mark">!</span>
            <div><strong>{error.stage === "transcript" ? "Transcript unavailable" : error.stage === "validation" ? "Check the URL" : "Analysis failed"}</strong><p>{error.message}</p></div>
          </section>
        ) : null}

        {result ? (
          <div className="outputs">
            <div className="handoff-line">
              <span>Video evidence</span><i /><span>Human handoff package</span>
              <button className="download-button" type="button" onClick={downloadCurrentRun}>Download JSON ↓</button>
            </div>
            <div className="saved-confirmation">Saved locally · {new Date(result.createdAt).toLocaleString()} · Run {result.runId.slice(0, 8)}</div>
            <OutputSection number="01" title="Transcript" value={result.transcript} meta={transcriptSourceLabel}>
              <pre className="long-text transcript">{result.transcript}</pre>
            </OutputSection>
            <OutputSection number="02" title="Claims extracted" value={claimsAsText(result.claims)}>
              <ClaimsView claims={result.claims} />
            </OutputSection>
            <OutputSection number="03" title="Agent onboarding prompt" value={result.onboardingPrompt} meta="Video-independent">
              <pre className="long-text prompt">{result.onboardingPrompt}</pre>
            </OutputSection>
            <OutputSection number="04" title="Investigation prompt" value={result.investigationPrompt} meta="Hypothesis, not instruction">
              <pre className="long-text prompt">{result.investigationPrompt}</pre>
            </OutputSection>
            <aside className="stop-boundary"><span>STOP</span><div><strong>The scout stops here.</strong><p>Copy the prompts into your repository-aware coding agent. A human decides what happens next.</p></div></aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
