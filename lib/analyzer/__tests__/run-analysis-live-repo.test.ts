import { describe, expect, it, vi } from "vitest";
import { runAnalysis } from "../run-analysis";

vi.mock("@/lib/analyzer/gemini", () => ({
  generateGeminiReportPatch: vi.fn(async () => null)
}));

describe("runAnalysis for non-demo repositories", () => {
  it("builds a report from fetched GitHub files instead of returning the demo dashboard report", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);

      if (href === "https://api.github.com/repos/Huride/puppy") {
        return jsonResponse({
          default_branch: "main"
        });
      }

      if (href === "https://api.github.com/repos/Huride/puppy/git/trees/main?recursive=1") {
        return jsonResponse({
          tree: [
            { path: "package.json", type: "blob", size: 61 },
            { path: "app/admin/page.tsx", type: "blob", size: 86 },
            { path: "components/PuppyCard.tsx", type: "blob", size: 42 }
          ]
        });
      }

      if (href === "https://raw.githubusercontent.com/Huride/puppy/main/package.json") {
        return textResponse('{"scripts":{"test":"vitest","build":"next build"}}');
      }

      if (href === "https://raw.githubusercontent.com/Huride/puppy/main/app/admin/page.tsx") {
        return textResponse("'use client';\nconst session = localStorage.getItem('session');");
      }

      if (href === "https://raw.githubusercontent.com/Huride/puppy/main/components/PuppyCard.tsx") {
        return textResponse("export function PuppyCard() { return null; }");
      }

      throw new Error(`Unexpected fetch: ${href}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      const report = await runAnalysis({
        repoUrl: "https://github.com/Huride/puppy",
        intent: "비로그인 사용자는 /admin에 접근하면 /login으로 이동해야 합니다.",
        locale: "ko"
      });

      expect(report.repoUrl).toBe("https://github.com/Huride/puppy");
      expect(report.summary).toContain("Huride/puppy");
      expect(report.riskFiles.map((file) => file.path)).toContain("app/admin/page.tsx");
      expect(report.riskFiles.map((file) => file.path)).not.toContain("app/dashboard/page.tsx");
      expect(report.commandResults.map((result) => result.command)).toContain("npm test");
      expect(report.commandResults.map((result) => result.command)).toContain("npm run build");
      expect(report.findings.map((finding) => finding.title)).toContain(
        "보호 라우트가 클라이언트 상태에만 의존하는 것으로 보임"
      );
      expect(report.fixPrompt).toContain("AI로 만든 앱을 수정하세요.");
      expect(report.fixPrompt).not.toContain("You are fixing an AI-built app.");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not label documentation files as risk files when no risk signals are found", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);

      if (href === "https://api.github.com/repos/Huride/puppy") {
        return jsonResponse({
          default_branch: "main"
        });
      }

      if (href === "https://api.github.com/repos/Huride/puppy/git/trees/main?recursive=1") {
        return jsonResponse({
          tree: [
            { path: "CMUX_x_AIM_Hackathon_Guide_정리.md", type: "blob", size: 14383 },
            { path: "docs/superpowers/plans/2026-04-26-puppy-mvp.md", type: "blob", size: 34872 },
            { path: "docs/superpowers/specs/2026-04-26-puppy-design.md", type: "blob", size: 8047 }
          ]
        });
      }

      if (
        href ===
        "https://raw.githubusercontent.com/Huride/puppy/main/CMUX_x_AIM_Hackathon_Guide_%EC%A0%95%EB%A6%AC.md"
      ) {
        return textResponse("# Hackathon guide");
      }

      if (href === "https://raw.githubusercontent.com/Huride/puppy/main/docs/superpowers/plans/2026-04-26-puppy-mvp.md") {
        return textResponse("# Puppy MVP plan");
      }

      if (href === "https://raw.githubusercontent.com/Huride/puppy/main/docs/superpowers/specs/2026-04-26-puppy-design.md") {
        return textResponse("# Puppy design");
      }

      throw new Error(`Unexpected fetch: ${href}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      const report = await runAnalysis({
        repoUrl: "https://github.com/Huride/puppy",
        intent: "비로그인 사용자는 /admin에 접근하면 /login으로 이동해야 합니다.",
        locale: "ko"
      });

      expect(report.riskFiles).toEqual([]);
      expect(report.findings.map((finding) => finding.title)).toContain("분석 범위");
      expect(report.findings[0]?.evidence).toContain("3개 주요 파일");
      expect(report.fixPrompt).toContain("결정적 위험 파일 없음");
      expect(report.fixPrompt).not.toContain("CMUX_x_AIM_Hackathon_Guide_정리.md");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function textResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
