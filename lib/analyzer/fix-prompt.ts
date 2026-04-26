type FixPromptFinding =
  | string
  | {
      title: string;
      severity?: string;
      recommendation?: string;
      evidence?: string;
    };

type BuildFixPromptInput = {
  intent: string;
  files: string[];
  findings: FixPromptFinding[];
  commands: string[];
};

function formatFinding(finding: FixPromptFinding): string {
  if (typeof finding === "string") {
    return `- ${finding}`;
  }

  const details = [
    finding.severity ? `Severity: ${finding.severity}` : undefined,
    finding.evidence ? `Evidence: ${finding.evidence}` : undefined,
    finding.recommendation ? `Recommendation: ${finding.recommendation}` : undefined
  ].filter(Boolean);

  return [`- ${finding.title}`, ...details.map((detail) => `  ${detail}`)].join("\n");
}

export function buildFixPrompt(input: BuildFixPromptInput): string {
  const files = input.files.length > 0 ? input.files.map((file) => `- ${file}`).join("\n") : "- No specific files identified";
  const findings =
    input.findings.length > 0 ? input.findings.map((finding) => formatFinding(finding)).join("\n") : "- No deterministic findings";
  const commands =
    input.commands.length > 0 ? input.commands.map((command) => `- ${command}`).join("\n") : "- npm test\n- npm run build";

  return `You are fixing an AI-built app.

Original intent:
${input.intent}

VibeCheck found these issues:
${findings}

Inspect these files first:
${files}

Make the smallest change that satisfies the intent. Preserve unrelated behavior and avoid broad rewrites.

After editing, run:
${commands}

The final result should satisfy the original intent, pass the listed verification commands, and avoid introducing unrelated changes.`;
}
