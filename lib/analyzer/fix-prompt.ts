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
  locale?: "en" | "ko";
};

function formatFinding(finding: FixPromptFinding, locale: "en" | "ko"): string {
  if (typeof finding === "string") {
    return `- ${finding}`;
  }

  const details = [
    finding.severity ? `${locale === "ko" ? "심각도" : "Severity"}: ${finding.severity}` : undefined,
    finding.evidence ? `${locale === "ko" ? "근거" : "Evidence"}: ${finding.evidence}` : undefined,
    finding.recommendation ? `${locale === "ko" ? "권장 수정" : "Recommendation"}: ${finding.recommendation}` : undefined
  ].filter(Boolean);

  return [`- ${finding.title}`, ...details.map((detail) => `  ${detail}`)].join("\n");
}

export function buildFixPrompt(input: BuildFixPromptInput): string {
  const locale = input.locale === "ko" ? "ko" : "en";
  const files = input.files.length > 0 ? input.files.map((file) => `- ${file}`).join("\n") : "- No specific files identified";
  const findings =
    input.findings.length > 0
      ? input.findings.map((finding) => formatFinding(finding, locale)).join("\n")
      : locale === "ko"
        ? "- 결정적 스캐너에서 발견한 이슈 없음"
        : "- No deterministic findings";
  const commands =
    input.commands.length > 0 ? input.commands.map((command) => `- ${command}`).join("\n") : "- npm test\n- npm run build";

  if (locale === "ko") {
    return `AI로 만든 앱을 수정하세요.

원래 의도:
${input.intent}

VibeCheck가 찾은 이슈:
${findings}

먼저 확인할 파일:
${files}

의도를 만족하는 가장 작은 변경을 적용하세요. 관련 없는 동작은 유지하고 큰 재작성은 피하세요.

수정 후 실행:
${commands}

최종 결과는 원래 의도를 만족하고, 위 검증 명령을 통과하며, 관련 없는 변경을 만들지 않아야 합니다.`;
  }

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
