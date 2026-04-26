import { createDemoReport } from "@/lib/analyzer/demo-report";
import { buildFixPrompt } from "@/lib/analyzer/fix-prompt";
import { parseGitHubRepoUrl } from "@/lib/analyzer/url";
import type { AnalyzeRequest, VibeReport } from "@/lib/report/types";

const DEFAULT_INTENT =
  "Authenticated users should access /dashboard. Anonymous users should be redirected to /login before dashboard content renders.";

export async function runAnalysis(request: AnalyzeRequest): Promise<VibeReport> {
  const repo = parseGitHubRepoUrl(request.repoUrl);
  const intent = request.intent.trim() || DEFAULT_INTENT;
  const report = createDemoReport(intent, repo.normalizedUrl);

  const fixPrompt = buildFixPrompt({
    intent,
    files: report.riskFiles.map((file) => file.path),
    findings: report.findings,
    commands: report.commandResults
      .filter((result) => result.status !== "skipped")
      .map((result) => result.command)
  });

  return { ...report, fixPrompt };
}
