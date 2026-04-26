import { describe, expect, it } from "vitest";
import { buildFixPrompt } from "../fix-prompt";

describe("buildFixPrompt", () => {
  it("includes intent, files, findings, and verification commands", () => {
    const prompt = buildFixPrompt({
      intent: "Protect /dashboard from anonymous users.",
      files: ["middleware.ts", "app/dashboard/page.tsx"],
      findings: ["Protected route appears client-only"],
      commands: ["npm test", "npm run build"]
    });

    expect(prompt).toContain("Protect /dashboard from anonymous users.");
    expect(prompt).toContain("middleware.ts");
    expect(prompt).toContain("Protected route appears client-only");
    expect(prompt).toContain("npm test");
  });

  it("includes defaults when files, findings, and commands are empty", () => {
    const prompt = buildFixPrompt({
      intent: "Check the app.",
      files: [],
      findings: [],
      commands: []
    });

    expect(prompt).toContain("- No specific files identified");
    expect(prompt).toContain("- No deterministic findings");
    expect(prompt).toContain("- npm test");
    expect(prompt).toContain("- npm run build");
  });

  it("includes recommendations when structured findings are provided", () => {
    const prompt = buildFixPrompt({
      intent: "Protect admin pages.",
      files: ["middleware.ts"],
      findings: [
        {
          title: "Protected route appears client-only",
          severity: "critical",
          evidence: "app/admin/page.tsx reads sessionStorage before rendering.",
          recommendation: "Move admin access checks to middleware before content renders."
        }
      ],
      commands: ["npm test"]
    });

    expect(prompt).toContain("Protected route appears client-only");
    expect(prompt).toContain("Move admin access checks to middleware before content renders.");
  });
});
