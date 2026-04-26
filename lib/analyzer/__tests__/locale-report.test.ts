import { describe, expect, it } from "vitest";
import { createDemoReport } from "../demo-report";

describe("createDemoReport locale", () => {
  it("returns Korean report copy when locale is ko", () => {
    const report = createDemoReport(
      "로그인한 사용자만 /dashboard에 접근해야 합니다.",
      "https://github.com/Huride/vibecheck-demo-auth",
      "ko"
    );

    expect(report.summary).toContain("대시보드 보호");
    expect(report.riskFiles[0]?.reason).toContain("클라이언트");
    expect(report.findings[0]?.recommendation).toContain("서버");
    expect(report.suggestedTests[0]?.title).toContain("비로그인");
    expect(report.fixPrompt).toContain("Next.js 앱");
  });
});
