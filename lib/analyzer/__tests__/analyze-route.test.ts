import { describe, expect, it, vi } from "vitest";
import { POST } from "../../../app/api/analyze/route";

vi.mock("@/lib/analyzer/gemini", () => ({
  generateGeminiReportPatch: vi.fn(async () => null)
}));

describe("POST /api/analyze", () => {
  it("returns a 400 response for a null JSON body", async () => {
    const response = await POST(
      new Request("https://vibecheck.test/api/analyze", {
        method: "POST",
        body: "null"
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Request body must be a JSON object."
    });
  });

  it("passes Korean locale through to the report", async () => {
    const response = await POST(
      new Request("https://vibecheck.test/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: "https://github.com/Huride/vibecheck-demo-auth",
          intent: "로그인한 사용자만 /dashboard에 접근해야 합니다.",
          locale: "ko"
        })
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.report.summary).toContain("대시보드 보호");
  });
});
