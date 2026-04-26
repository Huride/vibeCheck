export type AnalyzeRequest = {
  repoUrl: string;
  intent: string;
};

export type AnalyzeResponse =
  | { ok: true; report: VibeReport }
  | { ok: false; error: string };

export type VibeReport = {
  id: string;
  repoUrl: string;
  intent: string;
  status: "completed" | "failed";
  score: number;
  verdict: "looks_aligned" | "needs_review" | "not_ship_ready";
  summary: string;
  riskFiles: RiskFile[];
  commandResults: CommandResult[];
  findings: Finding[];
  suggestedTests: SuggestedTest[];
  fixPrompt: string;
  createdAt: string;
};

export type RiskFile = {
  path: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

export type CommandResult = {
  command: string;
  status: "passed" | "failed" | "skipped";
  outputExcerpt: string;
};

export type Finding = {
  severity: "info" | "warning" | "critical";
  title: string;
  evidence: string;
  recommendation: string;
  relatedFiles: string[];
};

export type SuggestedTest = {
  title: string;
  type: "unit" | "integration" | "e2e" | "manual";
  steps: string[];
  expectedResult: string;
};
