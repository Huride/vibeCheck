import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Home form defaults", () => {
  it("starts with empty inputs, shows placeholders, and loads demo only from the demo button", async () => {
    const source = await readFile(join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain('const [repoUrl, setRepoUrl] = useState("");');
    expect(source).toContain('const [intent, setIntent] = useState("");');
    expect(source).toContain("repoPlaceholder");
    expect(source).toContain('intentLabel: "검토 요청사항"');
    expect(source).toContain("intentPlaceholder");
    expect(source).toContain('placeholder={activeCopy.repoPlaceholder as string}');
    expect(source).toContain('placeholder={activeCopy.intentPlaceholder as string}');
    expect(source).toContain("scoreCardLabel");
    expect(source).toContain("waitingVerdict");
    expect(source).toContain('const [currentStepCount, setCurrentStepCount] = useState(0);');
    expect(source).toContain("setCurrentStepCount((step) => Math.min(step + 1, progressSteps.length));");
    expect(source).toContain("const PROGRESS_STEP_INTERVAL_MS = 1500;");
    expect(source).toContain("}, PROGRESS_STEP_INTERVAL_MS);");
    expect(source).toContain("setCurrentStepCount(1);");
    expect(source).toContain("setIsLoading(true);");
    expect(source).toContain("progressStatus");
    expect(source).toContain("progressPercent");
    expect(source).toContain("const scoreCardLabel = isLoading");
    expect(source).toContain("const scoreCardVerdict = isLoading");
    expect(source).toContain("const scoreCardText = isLoading ? (activeCopy.loadingText as string) : (activeCopy.scoreCardText as string);");
    expect(source).toContain("function clearAnalysisState()");
    expect(source).toContain("function updateRepoUrl(nextRepoUrl: string)");
    expect(source).toContain("function updateIntent(nextIntent: string)");
    expect(source).toContain("setCurrentStepCount(0);");
    expect(source).toContain("onChange={(event) => updateRepoUrl(event.target.value)}");
    expect(source).toContain("onChange={(event) => updateIntent(event.target.value)}");
    expect(source).toContain("isLoading ? currentStepCount : report ? progressSteps.length : 0");
    expect(source).toContain("setRepoUrl(DEMO_REPO_URL);");
    expect(source).toContain("setIntent(demoIntent);");
    expect(source).not.toContain("setIntent(nextLocale ===");
    expect(source).not.toContain("<span>{activeCopy.demoVerdict}</span>");
    expect(source).not.toContain("<strong>{activeCopy.notShipReady}</strong>");
  });
});
