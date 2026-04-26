import { createDemoReport } from "@/lib/analyzer/demo-report";
import { buildFixPrompt } from "@/lib/analyzer/fix-prompt";
import { generateGeminiReportPatch } from "@/lib/analyzer/gemini";
import { parseGitHubRepoUrl } from "@/lib/analyzer/url";
import type { AnalyzeRequest, Locale, VibeReport } from "@/lib/report/types";

const DEFAULT_INTENT =
  "Authenticated users should access /dashboard. Anonymous users should be redirected to /login before dashboard content renders.";

export async function runAnalysis(request: AnalyzeRequest): Promise<VibeReport> {
  const repo = parseGitHubRepoUrl(request.repoUrl);
  const intent = request.intent.trim() || DEFAULT_INTENT;
  const locale = normalizeLocale(request.locale);
  const report = createDemoReport(intent, repo.normalizedUrl, locale);

  const fixPrompt = buildFixPrompt({
    intent,
    files: report.riskFiles.map((file) => file.path),
    findings: report.findings,
    commands: report.commandResults
      .filter((result) => result.status !== "skipped")
      .map((result) => result.command)
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
