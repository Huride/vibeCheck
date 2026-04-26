import { createDemoReport, DEMO_REPO_URL } from "@/lib/analyzer/demo-report";
import { buildFixPrompt } from "@/lib/analyzer/fix-prompt";
import { generateGeminiReportPatch } from "@/lib/analyzer/gemini";
import { fetchGitHubRepoSnapshot, type GitHubRepoSnapshot } from "@/lib/analyzer/github-repo";
import { scanTextFiles } from "@/lib/analyzer/risk-scan";
import { parseGitHubRepoUrl } from "@/lib/analyzer/url";
import type { AnalyzeRequest, CommandResult, Finding, Locale, RiskFile, SuggestedTest, VibeReport } from "@/lib/report/types";

const DEFAULT_INTENT =
  "Authenticated users should access /dashboard. Anonymous users should be redirected to /login before dashboard content renders.";

export async function runAnalysis(request: AnalyzeRequest): Promise<VibeReport> {
  const repo = parseGitHubRepoUrl(request.repoUrl);
  const intent = request.intent.trim() || DEFAULT_INTENT;
  const locale = normalizeLocale(request.locale);
  const report =
    repo.normalizedUrl === DEMO_REPO_URL
      ? createDemoReport(intent, repo.normalizedUrl, locale)
      : createLiveRepoReport(await fetchGitHubRepoSnapshot(repo), repo.normalizedUrl, intent, locale);

  const fixPrompt = buildFixPrompt({
    intent,
    files: report.riskFiles.map((file) => file.path),
    findings: report.findings,
    commands: report.commandResults
      .filter((result) => result.status !== "skipped")
      .map((result) => result.command),
    locale
  });

  const fallbackReport = { ...report, fixPrompt };
  const aiPatch = await generateGeminiReportPatch(fallbackReport, locale);

  if (!aiPatch) {
    return fallbackReport;
  }

  return {
    ...fallbackReport,
    summary: aiPatch.summary || fallbackReport.summary,
    findings: aiPatch.findings?.length ? aiPatch.findings : fallbackReport.findings,
    suggestedTests: aiPatch.suggestedTests?.length ? aiPatch.suggestedTests : fallbackReport.suggestedTests,
    fixPrompt: aiPatch.fixPrompt || fallbackReport.fixPrompt
  };
}

function normalizeLocale(locale: Locale | undefined): Locale {
  return locale === "ko" ? "ko" : "en";
}

function createLiveRepoReport(
  snapshot: GitHubRepoSnapshot,
  normalizedUrl: string,
  intent: string,
  locale: Locale
): VibeReport {
  const findings = localizeFindings(scanTextFiles(snapshot.textFiles, intent), locale);
  const riskFiles = buildRiskFiles(snapshot, findings, intent, locale);
  const commandResults = buildCommandResults(snapshot, locale);
  const suggestedTests = buildSuggestedTests(intent, locale);
  const score = calculateScore(findings);

  return {
    id: `github-${snapshot.owner}-${snapshot.repo}`,
    repoUrl: normalizedUrl,
    intent,
    status: "completed",
    score,
    verdict: score < 50 ? "not_ship_ready" : score < 75 ? "needs_review" : "looks_aligned",
    summary: buildSummary(snapshot, findings, riskFiles, locale),
    riskFiles,
    commandResults,
    findings,
    suggestedTests,
    fixPrompt: "",
    createdAt: new Date().toISOString()
  };
}

function buildRiskFiles(
  snapshot: GitHubRepoSnapshot,
  findings: Finding[],
  intent: string,
  locale: Locale
): RiskFile[] {
  const byPath = new Map<string, RiskFile>();

  for (const finding of findings) {
    for (const file of finding.relatedFiles) {
      byPath.set(file, {
        path: file,
        reason: locale === "ko" ? "스캔 결과 이 파일이 요청 의도와 관련된 위험 신호에 연결됩니다." : "The scan connected this file to a risk signal related to the requested intent.",
        confidence: finding.severity === "critical" ? "high" : "medium"
      });
    }
  }

  for (const path of findIntentRelatedPaths(snapshot.filePaths, intent).slice(0, 5)) {
    if (!byPath.has(path)) {
      byPath.set(path, {
        path,
        reason: locale === "ko" ? "파일 경로나 기능명이 입력한 의도와 관련되어 먼저 확인할 후보입니다." : "The file path or feature name matches the requested intent and should be reviewed first.",
        confidence: "medium"
      });
    }
  }

  if (byPath.size === 0) {
    for (const path of snapshot.textFiles.slice(0, 3).map((file) => file.path)) {
      byPath.set(path, {
        path,
        reason:
          locale === "ko"
            ? "가져온 repo 구조에서 우선 검토할 수 있는 주요 파일입니다."
            : "A primary file fetched from the repository for initial review.",
        confidence: "low"
      });
    }
  }

  return Array.from(byPath.values()).slice(0, 8);
}

function findIntentRelatedPaths(paths: string[], intent: string): string[] {
  const routeTokens = Array.from(intent.matchAll(/\/[A-Za-z0-9_/-]+/g), (match) => match[0].replace(/^\//, ""));
  const wordTokens = Array.from(new Set(intent.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? []));
  const tokens = [...routeTokens, ...wordTokens].filter((token) => !["the", "and", "with", "should"].includes(token));

  return paths.filter((path) => {
    const normalizedPath = path.toLowerCase();
    return tokens.some((token) => normalizedPath.includes(token.toLowerCase()));
  });
}

function buildCommandResults(snapshot: GitHubRepoSnapshot, locale: Locale): CommandResult[] {
  const scripts = getPackageScripts(snapshot.packageJson);
  const results: CommandResult[] = [];

  if (scripts.test) {
    results.push({
      command: "npm test",
      status: "skipped",
      outputExcerpt:
        locale === "ko"
          ? "원격 GitHub 스캔에서는 의존성 설치와 테스트 실행을 수행하지 않았습니다. package.json에 test 스크립트가 있습니다."
          : "Remote GitHub scan did not install dependencies or run tests. package.json defines a test script."
    });
  }

  if (scripts.build) {
    results.push({
      command: "npm run build",
      status: "skipped",
      outputExcerpt:
        locale === "ko"
          ? "원격 GitHub 스캔에서는 빌드를 실행하지 않았습니다. package.json에 build 스크립트가 있습니다."
          : "Remote GitHub scan did not run the build. package.json defines a build script."
    });
  }

  if (results.length === 0) {
    results.push({
      command: "repo static scan",
      status: "passed",
      outputExcerpt:
        locale === "ko"
          ? `${snapshot.textFiles.length}개 주요 텍스트 파일과 ${snapshot.filePaths.length}개 파일 경로를 확인했습니다.`
          : `Checked ${snapshot.textFiles.length} key text files and ${snapshot.filePaths.length} file paths.`
    });
  }

  return results;
}

function getPackageScripts(packageJson: Record<string, unknown> | null): Record<string, string | undefined> {
  const scripts = packageJson?.scripts;
  return scripts && typeof scripts === "object" && !Array.isArray(scripts) ? (scripts as Record<string, string | undefined>) : {};
}

function buildSuggestedTests(intent: string, locale: Locale): SuggestedTest[] {
  if (locale === "ko") {
    return [
      {
        title: "요구사항 핵심 흐름 검증",
        type: "e2e",
        steps: ["앱을 실행한다", `사용자 의도에 적힌 흐름을 수행한다: ${intent}`, "화면 상태와 URL 변화를 확인한다"],
        expectedResult: "구현 결과가 입력한 의도와 일치하고, 관련 화면에서 예외가 발생하지 않습니다."
      },
      {
        title: "회귀 방지 테스트 추가",
        type: "integration",
        steps: ["위험 파일 중 첫 번째 파일의 동작을 격리한다", "성공/실패 케이스를 각각 추가한다", "테스트 명령을 실행한다"],
        expectedResult: "향후 AI 수정이 같은 요구사항을 깨면 테스트가 실패합니다."
      }
    ];
  }

  return [
    {
      title: "Validate the requested core flow",
      type: "e2e",
      steps: ["Run the app", `Exercise the requested flow: ${intent}`, "Check the screen state and URL changes"],
      expectedResult: "The implementation matches the stated intent without runtime errors."
    },
    {
      title: "Add a regression test",
      type: "integration",
      steps: ["Isolate the first risky file behavior", "Add passing and failing cases", "Run the test command"],
      expectedResult: "Future AI edits fail tests if they break the same requirement."
    }
  ];
}

function calculateScore(findings: Finding[]): number {
  if (findings.some((finding) => finding.severity === "critical")) {
    return 38;
  }

  if (findings.some((finding) => finding.severity === "warning")) {
    return 64;
  }

  return 78;
}

function buildSummary(
  snapshot: GitHubRepoSnapshot,
  findings: Finding[],
  riskFiles: RiskFile[],
  locale: Locale
): string {
  if (locale === "ko") {
    if (findings.length > 0) {
      return `${snapshot.owner}/${snapshot.repo}의 ${snapshot.filePaths.length}개 파일 경로와 ${snapshot.textFiles.length}개 주요 파일을 스캔했습니다. 입력한 의도와 관련된 위험 신호 ${findings.length}개를 발견했고, 우선 확인할 파일은 ${riskFiles.map((file) => file.path).join(", ")}입니다.`;
    }

    return `${snapshot.owner}/${snapshot.repo}의 ${snapshot.filePaths.length}개 파일 경로와 ${snapshot.textFiles.length}개 주요 파일을 스캔했습니다. 결정적 스캐너 기준의 치명적 위험은 발견하지 못했지만, 원격 스캔이라 실제 테스트 실행은 별도로 필요합니다.`;
  }

  if (findings.length > 0) {
    return `Scanned ${snapshot.filePaths.length} file paths and ${snapshot.textFiles.length} key files from ${snapshot.owner}/${snapshot.repo}. Found ${findings.length} risk signal(s) related to the requested intent. Review ${riskFiles.map((file) => file.path).join(", ")} first.`;
  }

  return `Scanned ${snapshot.filePaths.length} file paths and ${snapshot.textFiles.length} key files from ${snapshot.owner}/${snapshot.repo}. No critical deterministic risks were found, but remote scans still need real test execution before shipping.`;
}

function localizeFindings(findings: Finding[], locale: Locale): Finding[] {
  if (locale !== "ko") {
    return findings;
  }

  return findings.map((finding) => {
    if (finding.title === "Protected route appears client-only") {
      return {
        ...finding,
        title: "보호 라우트가 클라이언트 상태에만 의존하는 것으로 보임",
        evidence: `${finding.relatedFiles[0]} 파일이 클라이언트 컴포넌트이며 브라우저 상태로 접근 제어를 처리하는 신호가 있습니다.`,
        recommendation:
          "콘텐츠가 렌더링되기 전에 middleware, 서버 컴포넌트, 서버 layout 중 하나에서 라우트 보호를 강제하세요."
      };
    }

    if (finding.title === "Possible hardcoded secret") {
      return {
        ...finding,
        title: "하드코딩된 secret 가능성",
        evidence: `${finding.relatedFiles[0]} 파일에 알려진 secret 패턴과 유사한 문자열이 있습니다.`,
        recommendation: "배포 전에 값을 환경 변수로 옮기고 노출된 값은 교체하세요."
      };
    }

    if (finding.title === "Raw HTML rendering needs review") {
      return {
        ...finding,
        title: "원시 HTML 렌더링 검토 필요",
        evidence: `${finding.relatedFiles[0]} 파일이 dangerouslySetInnerHTML을 사용합니다.`,
        recommendation: "입력이 sanitize되는지 확인하고 테스트로 보호하세요."
      };
    }

    return finding;
  });
}
