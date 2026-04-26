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
    findings: mergeFindings(fallbackReport.findings, aiPatch.findings),
    suggestedTests: aiPatch.suggestedTests?.length ? aiPatch.suggestedTests : fallbackReport.suggestedTests,
    fixPrompt: aiPatch.fixPrompt || fallbackReport.fixPrompt
  };
}

function mergeFindings(baseFindings: Finding[], aiFindings: Finding[] | undefined): Finding[] {
  if (!aiFindings?.length) {
    return baseFindings;
  }

  const merged = [...baseFindings];
  const existingKeys = new Set(baseFindings.map((finding) => `${finding.title}:${finding.relatedFiles.join(",")}`));

  for (const finding of aiFindings) {
    const key = `${finding.title}:${finding.relatedFiles.join(",")}`;
    if (!existingKeys.has(key)) {
      merged.push(finding);
      existingKeys.add(key);
    }
  }

  return merged;
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
  const deterministicFindings = [
    ...buildRepositoryStructureFindings(snapshot, locale),
    ...localizeFindings(scanTextFiles(snapshot.textFiles, intent), locale)
  ];
  const findings = deterministicFindings.length > 0 ? deterministicFindings : [buildCoverageFinding(snapshot, locale)];
  const riskFiles = buildRiskFiles(snapshot, findings, intent, locale);
  const commandResults = buildCommandResults(snapshot, locale);
  const suggestedTests = buildSuggestedTests(intent, locale, riskFiles.length > 0);
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
    if (finding.severity === "info") {
      continue;
    }

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

  return Array.from(byPath.values()).slice(0, 8);
}

function findIntentRelatedPaths(paths: string[], intent: string): string[] {
  const routeTokens = Array.from(intent.matchAll(/\/[A-Za-z0-9_/-]+/g), (match) => match[0].replace(/^\//, ""));
  const wordTokens = Array.from(new Set(intent.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g) ?? []));
  const tokens = [...routeTokens, ...wordTokens].filter((token) => !["the", "and", "with", "should"].includes(token));

  return paths.filter((path) => {
    if (isVendoredOrSandboxPath(path)) {
      return false;
    }

    const normalizedPath = path.toLowerCase();
    return tokens.some((token) => normalizedPath.includes(token.toLowerCase()));
  });
}

function buildCommandResults(snapshot: GitHubRepoSnapshot, locale: Locale): CommandResult[] {
  const scripts = getPackageScripts(snapshot.packageJson);
  const xcodeProject = findPrimaryXcodeProject(snapshot.filePaths);
  const results: CommandResult[] = [];

  if (xcodeProject) {
    const scheme = xcodeProject.split("/").at(-1)?.replace(/\.xcodeproj$/, "") || "App";
    results.push({
      command: `xcodebuild -project ${xcodeProject} -scheme ${scheme} test`,
      status: "skipped",
      outputExcerpt:
        locale === "ko"
          ? "원격 GitHub 스캔에서는 Xcode 테스트를 실행하지 않았습니다. 로컬 macOS/Xcode 환경에서 실행해야 합니다."
          : "Remote GitHub scan did not run Xcode tests. Run this locally on macOS with Xcode."
    });
  }

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

function findPrimaryXcodeProject(paths: string[]): string | null {
  const projects = paths.filter((path) => path.endsWith(".xcodeproj/project.pbxproj") && path.includes("/Pods/") === false);
  const project = projects.sort((a, b) => scoreProjectPath(b) - scoreProjectPath(a))[0];
  return project ? project.replace(/\/project\.pbxproj$/, "") : null;
}

function scoreProjectPath(path: string): number {
  let score = 0;
  if (path.startsWith("Application/")) score += 20;
  if (path.includes("/NewMogrige.")) score += 20;
  if (path.includes("/Pods/")) score -= 50;
  if (path.includes("/sandbox/")) score -= 40;
  return score;
}

function getPackageScripts(packageJson: Record<string, unknown> | null): Record<string, string | undefined> {
  const scripts = packageJson?.scripts;
  return scripts && typeof scripts === "object" && !Array.isArray(scripts) ? (scripts as Record<string, string | undefined>) : {};
}

function buildSuggestedTests(intent: string, locale: Locale, hasRiskFiles: boolean): SuggestedTest[] {
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
        steps: [
          hasRiskFiles ? "위험 파일 중 첫 번째 파일의 동작을 격리한다" : "입력한 의도와 가장 가까운 화면 또는 문서를 기준으로 기대 동작을 정의한다",
          "성공/실패 케이스를 각각 추가한다",
          "테스트 명령을 실행한다"
        ],
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
      steps: [
        hasRiskFiles ? "Isolate the first risky file behavior" : "Define expected behavior from the closest matching screen or docs",
        "Add passing and failing cases",
        "Run the test command"
      ],
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

function buildRepositoryStructureFindings(snapshot: GitHubRepoSnapshot, locale: Locale): Finding[] {
  const findings: Finding[] = [];
  const swiftFiles = snapshot.filePaths.filter((path) => path.endsWith(".swift") && isVendoredOrSandboxPath(path) === false);
  const xcodeProjects = snapshot.filePaths.filter((path) => path.endsWith(".xcodeproj/project.pbxproj") && isVendoredOrSandboxPath(path) === false);
  const xcodeUserFiles = snapshot.filePaths.filter(
    (path) => isVendoredOrSandboxPath(path) === false && /(^|\/)xcuserdata(\/|$)|UserInterfaceState\.xcuserstate$/.test(path)
  );
  const podsFiles = Array.from(new Set(snapshot.filePaths.filter((path) => /(^|\/)Pods(\/|$)/.test(path)).map(getPodsRoot)));
  const testFiles = snapshot.filePaths.filter(
    (path) => isVendoredOrSandboxPath(path) === false && /(^|\/)(Tests?|UITests?)(\/|$)|Tests?\.swift$|UITests?\.swift$/i.test(path)
  );
  const ciFiles = snapshot.filePaths.filter((path) => /^\.github\/workflows\/.+\.ya?ml$|^\.circleci\/config\.yml$|^bitrise\.yml$|^fastlane\//.test(path));

  if (swiftFiles.length > 0 || xcodeProjects.length > 0) {
    findings.push({
      severity: "info",
      title: locale === "ko" ? "iOS 앱 소스 분석 범위" : "iOS app source coverage",
      evidence:
        locale === "ko"
          ? `${snapshot.owner}/${snapshot.repo}에서 Swift 파일 ${swiftFiles.length}개, Xcode 프로젝트 ${xcodeProjects.length}개, 주요 텍스트 파일 ${snapshot.textFiles.length}개를 확인했습니다.`
          : `Checked ${swiftFiles.length} Swift files, ${xcodeProjects.length} Xcode project(s), and ${snapshot.textFiles.length} key text files from ${snapshot.owner}/${snapshot.repo}.`,
      recommendation:
        locale === "ko"
          ? "원격 스캔은 코드를 읽는 단계이며, 최종 배포 판단에는 xcodebuild test/build 실행 결과가 필요합니다."
          : "Remote scanning reads code only; final ship-readiness still needs xcodebuild test/build results.",
      relatedFiles: xcodeProjects.slice(0, 2)
    });
  }

  if (xcodeUserFiles.length > 0) {
    findings.push({
      severity: "warning",
      title: locale === "ko" ? "Xcode 사용자 상태 파일이 repo에 포함됨" : "Xcode user state files are committed",
      evidence:
        locale === "ko"
          ? `${xcodeUserFiles.length}개 xcuserdata/UserInterfaceState 파일이 repository에 포함되어 있습니다. 예: ${xcodeUserFiles[0]}`
          : `${xcodeUserFiles.length} xcuserdata/UserInterfaceState file(s) are committed. Example: ${xcodeUserFiles[0]}`,
      recommendation:
        locale === "ko"
          ? "xcuserdata와 UserInterfaceState.xcuserstate를 .gitignore에 추가하고 repo에서 제거하세요."
          : "Add xcuserdata and UserInterfaceState.xcuserstate to .gitignore and remove them from the repository.",
      relatedFiles: xcodeUserFiles.slice(0, 3)
    });
  }

  if ((swiftFiles.length > 0 || xcodeProjects.length > 0) && testFiles.length === 0) {
    findings.push({
      severity: "warning",
      title: locale === "ko" ? "테스트 타깃 또는 테스트 파일이 확인되지 않음" : "No test target or test files found",
      evidence:
        locale === "ko"
          ? "Swift/Xcode 앱 파일은 확인됐지만 Tests, UITests 또는 *Tests.swift 파일을 찾지 못했습니다."
          : "Swift/Xcode app files were found, but no Tests, UITests, or *Tests.swift files were detected.",
      recommendation:
        locale === "ko"
          ? "핵심 플로우에 대한 Unit/UI 테스트 타깃을 추가하고 xcodebuild test를 배포 전 필수 검증으로 두세요."
          : "Add Unit/UI test targets for core flows and require xcodebuild test before shipping.",
      relatedFiles: xcodeProjects.slice(0, 1)
    });
  }

  if ((swiftFiles.length > 0 || xcodeProjects.length > 0) && ciFiles.length === 0) {
    findings.push({
      severity: "warning",
      title: locale === "ko" ? "CI 검증 workflow가 확인되지 않음" : "No CI verification workflow found",
      evidence:
        locale === "ko"
          ? ".github/workflows, fastlane, bitrise.yml 등 자동 빌드/테스트 구성이 확인되지 않았습니다."
          : "No .github/workflows, fastlane, bitrise.yml, or equivalent automated build/test config was found.",
      recommendation:
        locale === "ko"
          ? "PR마다 xcodebuild build/test를 실행하는 CI 또는 배포 전 체크를 추가하세요."
          : "Add CI or a pre-release check that runs xcodebuild build/test on every PR.",
      relatedFiles: xcodeProjects.slice(0, 1)
    });
  }

  if (podsFiles.length > 0) {
    findings.push({
      severity: "warning",
      title: locale === "ko" ? "Pods 디렉터리가 repo에 포함됨" : "Pods directory is committed",
      evidence:
        locale === "ko"
          ? `${podsFiles.length}개 Pods 디렉터리가 repository에 포함되어 있습니다. 의존성 코드까지 함께 추적되어 리뷰와 보안 스캔 노이즈가 커집니다.`
          : `${podsFiles.length} Pods directories are committed, which adds dependency code to reviews and security scans.`,
      recommendation:
        locale === "ko"
          ? "팀 정책상 vendoring이 꼭 필요하지 않다면 Podfile/Podfile.lock 중심으로 관리하고 Pods는 제외하는 방식을 검토하세요."
          : "Unless your team intentionally vendors dependencies, consider tracking Podfile/Podfile.lock and excluding Pods.",
      relatedFiles: podsFiles.slice(0, 1)
    });
  }

  return findings;
}

function isVendoredOrSandboxPath(path: string): boolean {
  return /(^|\/)(Pods|Carthage|DerivedData|build|\.build|node_modules|vendor|sandbox)(\/|$)/.test(path);
}

function getPodsRoot(path: string): string {
  const parts = path.split("/");
  const podsIndex = parts.indexOf("Pods");
  return podsIndex >= 0 ? parts.slice(0, podsIndex + 1).join("/") : path;
}

function buildSummary(
  snapshot: GitHubRepoSnapshot,
  findings: Finding[],
  riskFiles: RiskFile[],
  locale: Locale
): string {
  const riskFindings = findings.filter((finding) => finding.severity !== "info");

  if (locale === "ko") {
    if (riskFindings.length > 0) {
      return `${snapshot.owner}/${snapshot.repo}의 ${snapshot.filePaths.length}개 파일 경로와 ${snapshot.textFiles.length}개 주요 파일을 스캔했습니다. 입력한 의도와 관련된 위험 신호 ${riskFindings.length}개를 발견했고, 우선 확인할 파일은 ${riskFiles.map((file) => file.path).join(", ")}입니다.`;
    }

    return `${snapshot.owner}/${snapshot.repo}의 ${snapshot.filePaths.length}개 파일 경로와 ${snapshot.textFiles.length}개 주요 파일을 스캔했습니다. 결정적 스캐너 기준의 치명적 위험은 발견하지 못했지만, 원격 스캔이라 실제 테스트 실행은 별도로 필요합니다.`;
  }

  if (riskFindings.length > 0) {
    return `Scanned ${snapshot.filePaths.length} file paths and ${snapshot.textFiles.length} key files from ${snapshot.owner}/${snapshot.repo}. Found ${riskFindings.length} risk signal(s) related to the requested intent. Review ${riskFiles.map((file) => file.path).join(", ")} first.`;
  }

  return `Scanned ${snapshot.filePaths.length} file paths and ${snapshot.textFiles.length} key files from ${snapshot.owner}/${snapshot.repo}. No critical deterministic risks were found, but remote scans still need real test execution before shipping.`;
}

function buildCoverageFinding(snapshot: GitHubRepoSnapshot, locale: Locale): Finding {
  if (locale === "ko") {
    return {
      severity: "info",
      title: "분석 범위",
      evidence: `${snapshot.owner}/${snapshot.repo}에서 ${snapshot.filePaths.length}개 파일 경로와 ${snapshot.textFiles.length}개 주요 파일을 가져와 static scan을 수행했습니다.`,
      recommendation:
        "결정적 위험 신호는 발견되지 않았습니다. 이 repo가 문서/spec 중심이라면 실제 앱 소스 repo를 연결하거나, 배포 전 로컬 테스트/E2E 검증을 추가하세요.",
      relatedFiles: []
    };
  }

  return {
    severity: "info",
    title: "Analysis coverage",
    evidence: `Fetched ${snapshot.filePaths.length} file paths and ${snapshot.textFiles.length} key files from ${snapshot.owner}/${snapshot.repo} for static scanning.`,
    recommendation:
      "No deterministic risk signals were found. If this repository is docs/spec-heavy, connect the actual app source repository or add local test/E2E verification before shipping.",
    relatedFiles: []
  };
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
