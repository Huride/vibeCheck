import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Home form defaults", () => {
  it("starts with empty inputs, shows placeholders, and loads demo only from the demo button", async () => {
    const source = await readFile(join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain('const [repoUrl, setRepoUrl] = useState("");');
    expect(source).toContain('const [intent, setIntent] = useState("");');
    expect(source).toContain("repoPlaceholder");
    expect(source).toContain("intentPlaceholder");
    expect(source).toContain('placeholder={activeCopy.repoPlaceholder as string}');
    expect(source).toContain('placeholder={activeCopy.intentPlaceholder as string}');
    expect(source).toContain("scoreCardLabel");
    expect(source).toContain("waitingVerdict");
    expect(source).toContain("const scoreCardLabel = report ? (activeCopy.report as string) : (activeCopy.scoreCardLabel as string);");
    expect(source).toContain("const scoreCardVerdict = report ? formatVerdict(report.verdict, locale) : (activeCopy.waitingVerdict as string);");
    expect(source).toContain("setRepoUrl(DEMO_REPO_URL);");
    expect(source).toContain("setIntent(demoIntent);");
    expect(source).not.toContain("setIntent(nextLocale ===");
    expect(source).not.toContain("<span>{activeCopy.demoVerdict}</span>");
    expect(source).not.toContain("<strong>{activeCopy.notShipReady}</strong>");
  });
});
