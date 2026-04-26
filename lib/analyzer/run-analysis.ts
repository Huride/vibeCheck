import { createDemoReport, DEMO_REPO_URL } from "@/lib/analyzer/demo-report";
import { parseGitHubRepoUrl } from "@/lib/analyzer/url";
import type { AnalyzeRequest, VibeReport } from "@/lib/report/types";

const DEFAULT_INTENT =
  "Authenticated users should access /dashboard. Anonymous users should be redirected to /login before dashboard content renders.";

export async function runAnalysis(request: AnalyzeRequest): Promise<VibeReport> {
  const repo = parseGitHubRepoUrl(request.repoUrl);
  const intent = request.intent.trim() || DEFAULT_INTENT;

  if (repo.normalizedUrl === DEMO_REPO_URL || process.env.VIBECHECK_FORCE_DEMO === "1") {
    return createDemoReport(intent, repo.normalizedUrl);
  }

  return createDemoReport(intent, repo.normalizedUrl);
}
