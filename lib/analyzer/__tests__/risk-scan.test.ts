import { describe, expect, it } from "vitest";
import { scanTextFiles } from "../risk-scan";

describe("scanTextFiles", () => {
  // Utility coverage for the deterministic text scanner that future live analysis can call with fetched files.
  it("detects client-only dashboard auth risk when intent mentions protected routes", () => {
    const findings = scanTextFiles(
      [
        {
          path: "app/dashboard/page.tsx",
          content: "'use client';\nconst user = localStorage.getItem('user');"
        }
      ],
      "Anonymous users should be redirected from /dashboard to /login."
    );

    expect(findings.map((finding) => finding.title)).toContain("Protected route appears client-only");
  });

  it("detects client-only auth risk on non-dashboard protected routes", () => {
    const findings = scanTextFiles(
      [
        {
          path: "app/admin/page.tsx",
          content: "'use client';\nconst session = sessionStorage.getItem('session');"
        }
      ],
      "Anonymous users should be redirected from /admin to /login."
    );

    expect(findings.map((finding) => finding.title)).toContain("Protected route appears client-only");
  });

  it("does not flag normal client dashboard UI state as protected route risk", () => {
    const findings = scanTextFiles(
      [
        {
          path: "app/dashboard/page.tsx",
          content: "'use client';\nconst [tab, setTab] = useState('overview');\nuseEffect(() => setTab('overview'), []);"
        }
      ],
      "Anonymous users should be redirected from /dashboard to /login."
    );

    expect(findings.map((finding) => finding.title)).not.toContain("Protected route appears client-only");
  });

  it("detects hardcoded secret-like values", () => {
    const findings = scanTextFiles(
      [{ path: "lib/payments.ts", content: "const key = 'sk_live_123456789abcdef';" }],
      "Add checkout."
    );

    expect(findings.map((finding) => finding.title)).toContain("Possible hardcoded secret");
  });

  it("detects raw HTML rendering", () => {
    const findings = scanTextFiles(
      [{ path: "app/page.tsx", content: "<div dangerouslySetInnerHTML={{ __html: html }} />" }],
      "Render blog content."
    );

    expect(findings.map((finding) => finding.title)).toContain("Raw HTML rendering needs review");
  });
});
