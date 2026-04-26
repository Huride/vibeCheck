import { runAnalysis } from "@/lib/analyzer/run-analysis";
import type { AnalyzeRequest, AnalyzeResponse, Locale } from "@/lib/report/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const analyzeRequest = body as Partial<AnalyzeRequest>;

  if (!analyzeRequest.repoUrl || typeof analyzeRequest.repoUrl !== "string") {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "GitHub repo URL is required." },
      { status: 400 }
    );
  }

  if (
    !analyzeRequest.intent ||
    typeof analyzeRequest.intent !== "string" ||
    analyzeRequest.intent.trim().length < 12
  ) {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "Describe the feature you meant to build in at least one sentence." },
      { status: 400 }
    );
  }

  const locale = normalizeLocale(analyzeRequest.locale);

  try {
    const report = await runAnalysis({
      repoUrl: analyzeRequest.repoUrl,
      intent: analyzeRequest.intent,
      locale
    });
    return NextResponse.json<AnalyzeResponse>({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "VibeCheck failed to analyze this repo.";
    return NextResponse.json<AnalyzeResponse>({ ok: false, error: message }, { status: 400 });
  }
}

function normalizeLocale(locale: unknown): Locale {
  return locale === "ko" ? "ko" : "en";
}
