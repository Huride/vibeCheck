"use client";

import { DEMO_REPO_URL } from "@/lib/analyzer/demo-report";
import type { AnalyzeResponse, VibeReport } from "@/lib/report/types";
import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

const DEMO_INTENT =
  "I wanted logged-in users to access /dashboard and anonymous users to be redirected to /login. The app should not rely only on client-side checks.";

const progressSteps = [
  "Cloning repo",
  "Reading project structure",
  "Mapping intent to files",
  "Running risk scans",
  "Checking build and tests",
  "Generating fix prompt"
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState(DEMO_REPO_URL);
  const [intent, setIntent] = useState(DEMO_INTENT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<VibeReport | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const requestSequenceRef = useRef(0);

  const activeStepCount = useMemo(() => (isLoading ? progressSteps.length : report ? progressSteps.length : 0), [
    isLoading,
    report
  ]);

  async function runVibeCheck() {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    setIsLoading(true);
    setError("");
    setReport(null);
    setCopyStatus("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, intent })
      });
      const payload = (await response.json()) as AnalyzeResponse;

      if (requestSequenceRef.current !== requestSequence) {
        return;
      }

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      setReport(payload.report);
    } catch {
      if (requestSequenceRef.current === requestSequence) {
        setError("VibeCheck could not reach the analyzer. Try again from the hosted demo or local dev server.");
      }
    } finally {
      if (requestSequenceRef.current === requestSequence) {
        setIsLoading(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isLoading) {
      void runVibeCheck();
    }
  }

  async function copyFixPrompt(prompt: string) {
    setCopyStatus("");

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(prompt);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Intent-aware validation for AI-built apps</p>
          <h1>VibeCheck</h1>
          <p className="lead">
            Put in a repo and what you meant to build. Get evidence, risk files, failed checks, and the next prompt for
            your coding agent.
          </p>
        </div>
        <div className="score-card">
          <span>Demo verdict</span>
          <strong>Not ship-ready</strong>
          <p>Find the gap before users do.</p>
        </div>
      </section>

      <form className="panel input-panel" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="repoUrl">GitHub repo URL</label>
          <input
            disabled={isLoading}
            id="repoUrl"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="intent">What did you mean to build?</label>
          <textarea
            disabled={isLoading}
            id="intent"
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={5}
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Running..." : "Run VibeCheck"}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={isLoading}
            onClick={() => {
              setRepoUrl(DEMO_REPO_URL);
              setIntent(DEMO_INTENT);
              setReport(null);
              setError("");
              setCopyStatus("");
            }}
          >
            Load demo
          </button>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <section className="progress-grid">
        {progressSteps.map((step, index) => (
          <div className={index < activeStepCount ? "progress-step active" : "progress-step"} key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </section>

      {report ? (
        <ReportView
          copyStatus={copyStatus}
          onCopyFixPrompt={copyFixPrompt}
          report={report}
        />
      ) : null}
    </main>
  );
}

function ReportView({
  copyStatus,
  onCopyFixPrompt,
  report
}: {
  copyStatus: string;
  onCopyFixPrompt: (prompt: string) => Promise<void>;
  report: VibeReport;
}) {
  return (
    <section className="report-grid">
      <div className="panel report-panel">
        <p className="eyebrow">Vibe report</p>
        <div className="score-row">
          <strong>{report.score}</strong>
          <div>
            <span>Vibe Score</span>
            <p>{formatVerdict(report.verdict)}</p>
          </div>
        </div>
        <p className="summary">{report.summary}</p>

        <h2>Risk files</h2>
        <div className="list">
          {report.riskFiles.map((file) => (
            <article key={file.path} className="list-item">
              <strong>{file.path}</strong>
              <span>{file.confidence} confidence</span>
              <p>{file.reason}</p>
            </article>
          ))}
        </div>

        <h2>Evidence</h2>
        <div className="list">
          {report.findings.map((finding) => (
            <article key={finding.title} className={`list-item severity-${finding.severity}`}>
              <strong>{finding.title}</strong>
              <span>{finding.severity}</span>
              <p>{finding.evidence}</p>
              <p>{finding.recommendation}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="panel report-panel">
        <p className="eyebrow">Next prompt</p>
        <h2>Paste this into Cursor or Claude</h2>
        <pre className="prompt-box">{report.fixPrompt}</pre>
        <div className="copy-row">
          <button type="button" onClick={() => onCopyFixPrompt(report.fixPrompt)}>
            Copy fix prompt
          </button>
          <span className="copy-status" aria-live="polite">
            {copyStatus}
          </span>
        </div>

        <h2>Verification</h2>
        <div className="list">
          {report.commandResults.map((result) => (
            <article key={result.command} className="list-item">
              <strong>{result.command}</strong>
              <span>{result.status}</span>
              <p>{result.outputExcerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatVerdict(verdict: VibeReport["verdict"]) {
  if (verdict === "looks_aligned") return "Looks aligned";
  if (verdict === "needs_review") return "Needs review";
  return "Not ship-ready";
}
