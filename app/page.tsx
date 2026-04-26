"use client";

import { DEMO_REPO_URL } from "@/lib/analyzer/demo-report";
import type { AnalyzeResponse, Locale, VibeReport } from "@/lib/report/types";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const DEMO_INTENT_EN =
  "I wanted logged-in users to access /dashboard and anonymous users to be redirected to /login. The app should not rely only on client-side checks.";
const DEMO_INTENT_KO =
  "로그인한 사용자만 /dashboard에 접근할 수 있어야 하고, 비로그인 사용자는 /login으로 이동해야 합니다. 클라이언트 상태에만 의존하면 안 됩니다.";

const copy = {
  en: {
    toggle: "한국어",
    eyebrow: "Intent-aware validation for AI-built apps",
    lead:
      "Put in a repo and what you meant to build. Get evidence, risk files, failed checks, and the next prompt for your coding agent.",
    scoreCardLabel: "Ready when you are",
    waitingVerdict: "No report yet",
    scoreCardText: "Enter a repo or load the demo to start.",
    repoLabel: "GitHub repo URL",
    repoPlaceholder: "Enter a GitHub repository URL.",
    intentLabel: "Review request",
    intentPlaceholder: "Briefly describe what kind of project this is and what you want VibeCheck to verify.",
    run: "Run VibeCheck",
    running: "Running...",
    loadingStatus: "Analyzing",
    loadingText: "VibeCheck is scanning the repository step by step.",
    progressUnit: "steps",
    progressStatus: "Analysis progress",
    loadDemo: "Load demo",
    networkError: "VibeCheck could not reach the analyzer. Try again from the hosted demo or local dev server.",
    analysisLog: "Analysis log",
    report: "Vibe report",
    vibeScore: "Vibe Score",
    riskFiles: "Risk files",
    noRiskFiles: "No deterministic risk files found.",
    evidence: "Evidence",
    noEvidence: "No evidence items were generated for this scan.",
    nextPrompt: "Next prompt",
    pastePrompt: "Paste this into Cursor or Claude",
    copyPrompt: "Copy fix prompt",
    copied: "Copied",
    copyFailed: "Copy failed",
    verification: "Verification",
    suggestedTests: "Suggested tests",
    confidence: "confidence",
    progressSteps: [
      "Cloning repo",
      "Reading project structure",
      "Mapping intent to files",
      "Running risk scans",
      "Checking build and tests",
      "Generating fix prompt"
    ],
    progressLogs: [
      "Queued repo fetch and workspace preparation.",
      "Read package metadata and source file map.",
      "Matched the requested feature to likely auth and route files.",
      "Checked deterministic runtime and security risk signals.",
      "Collected available verification commands and command evidence.",
      "Generated a paste-ready repair prompt with verification steps."
    ]
  },
  ko: {
    toggle: "English",
    eyebrow: "AI로 만든 앱을 위한 의도 기반 검증",
    lead:
      "repo와 만들려던 기능을 넣으면 근거, 위험 파일, 실패한 검증, 코딩 에이전트에게 다시 줄 다음 프롬프트를 보여줍니다.",
    scoreCardLabel: "분석 대기",
    waitingVerdict: "아직 리포트 없음",
    scoreCardText: "repo를 입력하거나 데모를 불러오면 시작합니다.",
    repoLabel: "GitHub repo URL",
    repoPlaceholder: "깃허브 URL을 입력해주세요.",
    intentLabel: "검토 요청사항",
    intentPlaceholder: "어떤 프로젝트인지, 무엇을 검증하고 싶은지 간단하게 설명해주세요.",
    run: "VibeCheck 실행",
    running: "실행 중...",
    loadingStatus: "분석 중",
    loadingText: "VibeCheck가 repo를 단계별로 확인하고 있습니다.",
    progressUnit: "단계",
    progressStatus: "분석 진행률",
    loadDemo: "데모 불러오기",
    networkError: "분석기에 연결하지 못했습니다. 호스팅 데모 또는 로컬 개발 서버에서 다시 시도하세요.",
    analysisLog: "분석 로그",
    report: "Vibe 리포트",
    vibeScore: "Vibe 점수",
    riskFiles: "위험 파일",
    noRiskFiles: "결정적 위험 파일이 발견되지 않았습니다.",
    evidence: "근거",
    noEvidence: "이번 스캔에서 생성된 근거 항목이 없습니다.",
    nextPrompt: "다음 프롬프트",
    pastePrompt: "Cursor 또는 Claude에 붙여넣기",
    copyPrompt: "수정 프롬프트 복사",
    copied: "복사됨",
    copyFailed: "복사 실패",
    verification: "검증",
    suggestedTests: "추천 테스트",
    confidence: "신뢰도",
    progressSteps: [
      "repo 준비",
      "프로젝트 구조 읽기",
      "의도와 파일 매핑",
      "위험 신호 스캔",
      "빌드와 테스트 확인",
      "수정 프롬프트 생성"
    ],
    progressLogs: [
      "repo 가져오기와 작업 공간 준비를 시작했습니다.",
      "패키지 정보와 소스 파일 구조를 읽었습니다.",
      "요청한 기능을 인증 및 라우트 관련 파일과 매칭했습니다.",
      "런타임과 보안 위험 신호를 확인했습니다.",
      "사용 가능한 검증 명령과 실행 근거를 정리했습니다.",
      "검증 단계가 포함된 붙여넣기용 수정 프롬프트를 생성했습니다."
    ]
  }
} satisfies Record<Locale, Record<string, string | string[]>>;

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ko");
  const [repoUrl, setRepoUrl] = useState("");
  const [intent, setIntent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [error, setError] = useState("");
  const [report, setReport] = useState<VibeReport | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const requestSequenceRef = useRef(0);

  const activeCopy = copy[locale];
  const progressSteps = activeCopy.progressSteps as string[];
  const progressLogs = activeCopy.progressLogs as string[];
  const demoIntent = locale === "ko" ? DEMO_INTENT_KO : DEMO_INTENT_EN;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const interval = window.setInterval(() => {
      setCurrentStepCount((step) => Math.min(step + 1, progressSteps.length));
    }, 700);

    return () => window.clearInterval(interval);
  }, [isLoading, progressSteps.length]);

  const activeStepCount = useMemo(() => (isLoading || report ? currentStepCount : 0), [
    currentStepCount,
    isLoading,
    report
  ]);
  const progressPercent = Math.round((activeStepCount / progressSteps.length) * 100);
  const progressStatus = `${activeCopy.progressStatus}: ${activeStepCount}/${progressSteps.length} ${activeCopy.progressUnit}`;
  const scoreCardLabel = isLoading
    ? (activeCopy.loadingStatus as string)
    : report
      ? (activeCopy.report as string)
      : (activeCopy.scoreCardLabel as string);
  const scoreCardVerdict = isLoading
    ? `${activeStepCount}/${progressSteps.length} ${activeCopy.progressUnit}`
    : report
      ? formatVerdict(report.verdict, locale)
      : (activeCopy.waitingVerdict as string);
  const scoreCardText = isLoading ? (activeCopy.loadingText as string) : (activeCopy.scoreCardText as string);

  async function runVibeCheck() {
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    setIsLoading(true);
    setCurrentStepCount(1);
    setError("");
    setReport(null);
    setCopyStatus("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, intent, locale })
      });
      const payload = (await response.json()) as AnalyzeResponse;

      if (requestSequenceRef.current !== requestSequence) {
        return;
      }

      if (!payload.ok) {
        setError(payload.error);
        setCurrentStepCount(0);
        return;
      }

      setCurrentStepCount(progressSteps.length);
      setReport(payload.report);
    } catch {
      if (requestSequenceRef.current === requestSequence) {
        setError(activeCopy.networkError as string);
        setCurrentStepCount(0);
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
      setCopyStatus(activeCopy.copied as string);
    } catch {
      setCopyStatus(activeCopy.copyFailed as string);
    }
  }

  function switchLocale() {
    const nextLocale = locale === "ko" ? "en" : "ko";
    setLocale(nextLocale);
    setReport(null);
    setError("");
    setCopyStatus("");
    setCurrentStepCount(0);
  }

  return (
    <main className="shell">
      <div className="top-actions">
        <button type="button" className="secondary" onClick={switchLocale} disabled={isLoading}>
          {activeCopy.toggle}
        </button>
      </div>

      <section className="hero">
        <div>
          <p className="eyebrow">{activeCopy.eyebrow}</p>
          <h1>VibeCheck</h1>
          <p className="lead">{activeCopy.lead}</p>
        </div>
        <div className="score-card">
          <span>{scoreCardLabel}</span>
          <strong>{scoreCardVerdict}</strong>
          <p>{scoreCardText}</p>
        </div>
      </section>

      <form className="panel input-panel" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="repoUrl">{activeCopy.repoLabel}</label>
          <input
            disabled={isLoading}
            id="repoUrl"
            placeholder={activeCopy.repoPlaceholder as string}
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="intent">{activeCopy.intentLabel}</label>
          <textarea
            disabled={isLoading}
            id="intent"
            placeholder={activeCopy.intentPlaceholder as string}
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            rows={5}
          />
        </div>
        <div className="actions">
          <button type="submit" disabled={isLoading}>
            {isLoading ? activeCopy.running : activeCopy.run}
          </button>
          <button
            type="button"
            className="secondary"
            disabled={isLoading}
            onClick={() => {
              setRepoUrl(DEMO_REPO_URL);
              setIntent(demoIntent);
              setReport(null);
              setError("");
              setCopyStatus("");
              setCurrentStepCount(0);
            }}
          >
            {activeCopy.loadDemo}
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

      {activeStepCount > 0 ? (
        <section className="panel progress-log" aria-live="polite">
          <div className="progress-log-header">
            <p className="eyebrow">{activeCopy.analysisLog}</p>
            <span>{progressStatus}</span>
          </div>
          <div aria-hidden="true" className="progress-meter">
            <span style={{ width: `${progressPercent}%` }} />
          </div>
          <ul>
            {progressLogs.slice(0, activeStepCount).map((log) => (
              <li key={log}>{log}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report ? (
        <ReportView
          copyStatus={copyStatus}
          locale={locale}
          onCopyFixPrompt={copyFixPrompt}
          report={report}
          text={activeCopy}
        />
      ) : null}
    </main>
  );
}

function ReportView({
  copyStatus,
  locale,
  onCopyFixPrompt,
  report,
  text
}: {
  copyStatus: string;
  locale: Locale;
  onCopyFixPrompt: (prompt: string) => Promise<void>;
  report: VibeReport;
  text: typeof copy.en | typeof copy.ko;
}) {
  return (
    <section className="report-grid">
      <div className="panel report-panel">
        <p className="eyebrow">{text.report}</p>
        <div className="score-row">
          <strong>{report.score}</strong>
          <div>
            <span>{text.vibeScore}</span>
            <p>{formatVerdict(report.verdict, locale)}</p>
          </div>
        </div>
        <p className="summary">{report.summary}</p>

        <h2>{text.riskFiles}</h2>
        <div className="list">
          {report.riskFiles.length > 0 ? (
            report.riskFiles.map((file) => (
              <article key={file.path} className="list-item">
                <strong>{file.path}</strong>
                <span>{file.confidence} {text.confidence}</span>
                <p>{file.reason}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">{text.noRiskFiles}</p>
          )}
        </div>

        <h2>{text.evidence}</h2>
        <div className="list">
          {report.findings.length > 0 ? (
            report.findings.map((finding) => (
              <article key={finding.title} className={`list-item severity-${finding.severity}`}>
                <strong>{finding.title}</strong>
                <span>{finding.severity}</span>
                <p>{finding.evidence}</p>
                <p>{finding.recommendation}</p>
              </article>
            ))
          ) : (
            <p className="empty-state">{text.noEvidence}</p>
          )}
        </div>
      </div>

      <div className="panel report-panel">
        <p className="eyebrow">{text.nextPrompt}</p>
        <h2>{text.pastePrompt}</h2>
        <pre className="prompt-box">{report.fixPrompt}</pre>
        <div className="copy-row">
          <button type="button" onClick={() => onCopyFixPrompt(report.fixPrompt)}>
            {text.copyPrompt}
          </button>
          <span className="copy-status" aria-live="polite">
            {copyStatus}
          </span>
        </div>

        <h2>{text.verification}</h2>
        <div className="list">
          {report.commandResults.map((result) => (
            <article key={result.command} className="list-item">
              <strong>{result.command}</strong>
              <span>{result.status}</span>
              <p>{result.outputExcerpt}</p>
            </article>
          ))}
        </div>

        <h2>{text.suggestedTests}</h2>
        <div className="list">
          {report.suggestedTests.map((test) => (
            <article key={test.title} className="list-item">
              <strong>{test.title}</strong>
              <span>{test.type}</span>
              <ul className="steps-list">
                {test.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <p>{test.expectedResult}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatVerdict(verdict: VibeReport["verdict"], locale: Locale) {
  if (locale === "ko") {
    if (verdict === "looks_aligned") return "의도와 대체로 일치";
    if (verdict === "needs_review") return "검토 필요";
    return "배포 보류";
  }

  if (verdict === "looks_aligned") return "Looks aligned";
  if (verdict === "needs_review") return "Needs review";
  return "Not ship-ready";
}
