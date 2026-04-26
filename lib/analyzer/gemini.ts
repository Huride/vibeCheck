import type { Finding, Locale, SuggestedTest, VibeReport } from "@/lib/report/types";

type EnvLike = Record<string, string | undefined>;

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export type AiReportPatch = {
  summary?: string;
  findings?: Finding[];
  suggestedTests?: SuggestedTest[];
  fixPrompt?: string;
};

export function selectGeminiApiKey(env: EnvLike = process.env): string | null {
  return getGeminiApiKeys(env)[0] ?? null;
}

export function getGeminiApiKeys(env: EnvLike = process.env): string[] {
  const primary = env.GEMINI_API_KEY?.trim() ? [env.GEMINI_API_KEY.trim()] : [];
  const numbered = Object.keys(env)
    .filter((key) => /^GEMINI_API_KEY_\d+$/.test(key) && env[key]?.trim())
    .sort((a, b) => Number(a.split("_").at(-1)) - Number(b.split("_").at(-1)))
    .map((key) => env[key]?.trim())
    .filter((key): key is string => Boolean(key));

  return [...primary, ...numbered];
}

export function parseGeminiJson(text: string): AiReportPatch {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as AiReportPatch;
}

export async function generateGeminiReportPatch(report: VibeReport, locale: Locale): Promise<AiReportPatch | null> {
  const apiKeys = getGeminiApiKeys();

  if (apiKeys.length === 0) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [
          {
            text: buildGeminiPrompt(report, locale)
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1800,
      responseMimeType: "application/json"
    }
  });

  for (const apiKey of apiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody
        }
      );

      if (!response.ok) {
        continue;
      }

      const body = (await response.json()) as GeminiApiResponse;
      const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();

      if (!text) {
        continue;
      }

      return parseGeminiJson(text);
    } catch {
      continue;
    }
  }

  return null;
}

function buildGeminiPrompt(report: VibeReport, locale: Locale) {
  const language = locale === "ko" ? "Korean" : "English";

  return `You are VibeCheck, an AI code review assistant for AI-built apps.
Return only JSON with optional keys: summary, findings, suggestedTests, fixPrompt.
Write all natural-language fields in ${language}.
Keep file paths, commands, and route names exactly as provided.
Do not invent files or commands.

Input report:
${JSON.stringify(
  {
    repoUrl: report.repoUrl,
    intent: report.intent,
    score: report.score,
    verdict: report.verdict,
    riskFiles: report.riskFiles,
    commandResults: report.commandResults,
    findings: report.findings,
    suggestedTests: report.suggestedTests
  },
  null,
  2
)}`;
}
