# VibeCheck MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the VibeCheck web MVP: public GitHub URL + intent input, progress UI, evidence-based report, and paste-ready fix prompt.

**Architecture:** Use a Next.js App Router web app with a typed analyzer boundary. The first shippable version supports hosted demo mode with deterministic sample analysis, while the analyzer modules are structured so live GitHub cloning, file scanning, command execution, and LLM prompt generation can be enabled behind the same `runAnalysis()` interface.

**Tech Stack:** Next.js, React, TypeScript, Node.js analyzer utilities, Vitest for unit tests, CSS modules/global CSS for UI styling.

---

## File Structure

- Create `package.json`: app scripts and dependencies.
- Create `tsconfig.json`: TypeScript config.
- Create `next.config.ts`: Next.js config.
- Create `vitest.config.ts`: Vitest config for analyzer tests.
- Create `app/layout.tsx`: app shell metadata.
- Create `app/page.tsx`: client-side analyze form, progress states, report rendering.
- Create `app/globals.css`: product UI styling.
- Create `app/api/analyze/route.ts`: POST endpoint that returns a `VibeReport`.
- Create `lib/report/types.ts`: shared report and API types.
- Create `lib/analyzer/run-analysis.ts`: top-level analyzer orchestration.
- Create `lib/analyzer/url.ts`: GitHub URL validation and parsing.
- Create `lib/analyzer/demo-report.ts`: deterministic hosted demo report.
- Create `lib/analyzer/project.ts`: project metadata helpers for live analyzer mode.
- Create `lib/analyzer/risk-scan.ts`: deterministic high-signal risk checks.
- Create `lib/analyzer/fix-prompt.ts`: fix prompt builder.
- Create `lib/analyzer/__tests__/url.test.ts`: URL validation tests.
- Create `lib/analyzer/__tests__/risk-scan.test.ts`: risk scanner tests.
- Create `lib/analyzer/__tests__/fix-prompt.test.ts`: fix prompt tests.
- Create `README.md`: setup, dev, demo, and pitch notes.

## Task 1: Scaffold the App and Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `vitest.config.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/page.tsx`

- [ ] **Step 1: Create package scripts and dependencies**

Create `package.json`:

```json
{
  "name": "vibecheck",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 2: Create TypeScript and framework config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Create `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"]
  }
});
```

- [ ] **Step 3: Create the minimal app shell**

Create `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeCheck",
  description: "Intent-aware validation and fix prompts for AI-built apps"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create a temporary `app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AI-built app validation</p>
        <h1>VibeCheck</h1>
        <p className="lead">
          Put in a repo and what you meant to build. Get evidence, risk files, and the next prompt.
        </p>
      </section>
    </main>
  );
}
```

Create initial `app/globals.css`:

```css
:root {
  color-scheme: light;
  --background: #f7f7f4;
  --panel: #ffffff;
  --text: #171717;
  --muted: #686a70;
  --line: #dcded8;
  --accent: #1f7a5f;
  --danger: #b42318;
  --warning: #a15c07;
  --ink: #202124;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--text);
  font-family: Arial, Helvetica, sans-serif;
}

button,
input,
textarea {
  font: inherit;
}

.shell {
  width: min(1180px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 40px 0;
}

.hero {
  padding: 32px 0 24px;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(40px, 7vw, 72px);
  line-height: 0.95;
}

.lead {
  max-width: 680px;
  color: var(--muted);
  font-size: 20px;
  line-height: 1.45;
}
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and dependencies install successfully.

- [ ] **Step 5: Verify scaffold builds**

Run:

```bash
npm run build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 6: Commit scaffold**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts app
git commit -m "feat: scaffold VibeCheck app"
```

## Task 2: Define Report Types and Demo Report

**Files:**
- Create: `lib/report/types.ts`
- Create: `lib/analyzer/demo-report.ts`
- Test: `lib/analyzer/__tests__/fix-prompt.test.ts` in Task 4

- [ ] **Step 1: Define shared report types**

Create `lib/report/types.ts`:

```ts
export type AnalyzeRequest = {
  repoUrl: string;
  intent: string;
};

export type AnalyzeResponse =
  | { ok: true; report: VibeReport }
  | { ok: false; error: string };

export type VibeReport = {
  id: string;
  repoUrl: string;
  intent: string;
  status: "completed" | "failed";
  score: number;
  verdict: "looks_aligned" | "needs_review" | "not_ship_ready";
  summary: string;
  riskFiles: RiskFile[];
  commandResults: CommandResult[];
  findings: Finding[];
  suggestedTests: SuggestedTest[];
  fixPrompt: string;
  createdAt: string;
};

export type RiskFile = {
  path: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

export type CommandResult = {
  command: string;
  status: "passed" | "failed" | "skipped";
  outputExcerpt: string;
};

export type Finding = {
  severity: "info" | "warning" | "critical";
  title: string;
  evidence: string;
  recommendation: string;
  relatedFiles: string[];
};

export type SuggestedTest = {
  title: string;
  type: "unit" | "integration" | "e2e" | "manual";
  steps: string[];
  expectedResult: string;
};
```

- [ ] **Step 2: Create deterministic demo report**

Create `lib/analyzer/demo-report.ts`:

```ts
import type { VibeReport } from "@/lib/report/types";

export const DEMO_REPO_URL = "https://github.com/Huride/vibecheck-demo-auth";

export function createDemoReport(intent: string, repoUrl = DEMO_REPO_URL): VibeReport {
  return {
    id: `demo-${Date.now()}`,
    repoUrl,
    intent,
    status: "completed",
    score: 42,
    verdict: "not_ship_ready",
    summary:
      "The dashboard protection intent is only partially implemented. The app appears to rely on client-side state for route protection, which can be bypassed and does not prove server-side access control.",
    riskFiles: [
      {
        path: "app/dashboard/page.tsx",
        reason: "Dashboard access appears guarded in the client component instead of at the server or middleware boundary.",
        confidence: "high"
      },
      {
        path: "lib/auth.ts",
        reason: "Auth helper exposes session state but does not show a server-side verification path for protected routes.",
        confidence: "medium"
      },
      {
        path: "middleware.ts",
        reason: "Expected route-level redirect behavior for /dashboard is missing from middleware.",
        confidence: "high"
      }
    ],
    commandResults: [
      {
        command: "npm test",
        status: "failed",
        outputExcerpt:
          "dashboard access control > redirects anonymous users: expected '/login' but received '/dashboard'"
      },
      {
        command: "npm run build",
        status: "passed",
        outputExcerpt: "Build completed, but build success does not validate protected-route behavior."
      }
    ],
    findings: [
      {
        severity: "critical",
        title: "Protected route can be reached without server-side verification",
        evidence:
          "The intended behavior requires anonymous users to redirect before dashboard content is reachable. The relevant files show no middleware or server-side guard enforcing that boundary.",
        recommendation:
          "Move the access check to middleware or a server-side layout and redirect anonymous users to /login before rendering dashboard content.",
        relatedFiles: ["middleware.ts", "app/dashboard/page.tsx", "lib/auth.ts"]
      },
      {
        severity: "warning",
        title: "Missing regression test for anonymous dashboard access",
        evidence:
          "The test output shows the expected redirect behavior is not covered by a passing test.",
        recommendation:
          "Add an integration or E2E test that visits /dashboard without a session and expects a /login redirect.",
        relatedFiles: ["app/dashboard/page.tsx"]
      }
    ],
    suggestedTests: [
      {
        title: "Anonymous users are redirected away from dashboard",
        type: "e2e",
        steps: ["Clear session cookies", "Visit /dashboard", "Observe the final URL"],
        expectedResult: "The user lands on /login and dashboard content is not rendered."
      },
      {
        title: "Authenticated users can access dashboard",
        type: "e2e",
        steps: ["Create a valid session", "Visit /dashboard", "Wait for dashboard heading"],
        expectedResult: "The dashboard renders without redirecting to /login."
      }
    ],
    fixPrompt:
      "You are fixing a Next.js app. The intended behavior is: authenticated users can access /dashboard, and anonymous users must be redirected to /login before dashboard content renders. VibeCheck found that dashboard protection appears to rely on client-side state and middleware.ts does not enforce /dashboard access. Start with middleware.ts, app/dashboard/page.tsx, and lib/auth.ts. Make the smallest change that verifies the session on the server or middleware boundary, redirects anonymous users to /login, and preserves authenticated dashboard access. Add or update a regression test for anonymous /dashboard access. After editing, run npm test and npm run build. The final result should pass tests and prevent anonymous dashboard rendering."
  };
}
```

- [ ] **Step 3: Run TypeScript check through build after Task 3 API exists**

No command yet; this task only defines shared data. Build verification happens after the API route imports these types.

- [ ] **Step 4: Commit report model**

```bash
git add lib/report/types.ts lib/analyzer/demo-report.ts
git commit -m "feat: add VibeCheck report model"
```

## Task 3: Add Analyzer Request Validation and API Route

**Files:**
- Create: `lib/analyzer/url.ts`
- Create: `lib/analyzer/run-analysis.ts`
- Create: `app/api/analyze/route.ts`
- Test: `lib/analyzer/__tests__/url.test.ts`

- [ ] **Step 1: Write URL validation tests**

Create `lib/analyzer/__tests__/url.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseGitHubRepoUrl } from "../url";

describe("parseGitHubRepoUrl", () => {
  it("accepts public GitHub HTTPS repo URLs", () => {
    expect(parseGitHubRepoUrl("https://github.com/Huride/vibeCheck")).toEqual({
      owner: "Huride",
      repo: "vibeCheck",
      normalizedUrl: "https://github.com/Huride/vibeCheck"
    });
  });

  it("strips trailing .git and path suffixes", () => {
    expect(parseGitHubRepoUrl("https://github.com/Huride/vibeCheck.git/tree/main").normalizedUrl).toBe(
      "https://github.com/Huride/vibeCheck"
    );
  });

  it("rejects non-GitHub hosts", () => {
    expect(() => parseGitHubRepoUrl("https://gitlab.com/Huride/vibeCheck")).toThrow(
      "Only public GitHub repo URLs are supported in this MVP."
    );
  });

  it("rejects incomplete URLs", () => {
    expect(() => parseGitHubRepoUrl("https://github.com/Huride")).toThrow(
      "Enter a GitHub repo URL in the form https://github.com/owner/repo."
    );
  });
});
```

- [ ] **Step 2: Run URL tests and verify failure**

Run:

```bash
npm test -- lib/analyzer/__tests__/url.test.ts
```

Expected: FAIL because `lib/analyzer/url.ts` does not exist.

- [ ] **Step 3: Implement URL parser**

Create `lib/analyzer/url.ts`:

```ts
export type ParsedGitHubRepo = {
  owner: string;
  repo: string;
  normalizedUrl: string;
};

export function parseGitHubRepoUrl(value: string): ParsedGitHubRepo {
  let url: URL;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a GitHub repo URL in the form https://github.com/owner/repo.");
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Only public GitHub repo URLs are supported in this MVP.");
  }

  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !rawRepo) {
    throw new Error("Enter a GitHub repo URL in the form https://github.com/owner/repo.");
  }

  const repo = rawRepo.replace(/\.git$/, "");
  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`
  };
}
```

- [ ] **Step 4: Implement top-level analyzer**

Create `lib/analyzer/run-analysis.ts`:

```ts
import { createDemoReport, DEMO_REPO_URL } from "@/lib/analyzer/demo-report";
import { parseGitHubRepoUrl } from "@/lib/analyzer/url";
import type { AnalyzeRequest, VibeReport } from "@/lib/report/types";

const DEFAULT_INTENT =
  "Authenticated users should access /dashboard. Anonymous users should be redirected to /login before dashboard content renders.";

export async function runAnalysis(request: AnalyzeRequest): Promise<VibeReport> {
  const repo = parseGitHubRepoUrl(request.repoUrl);
  const intent = request.intent.trim() || DEFAULT_INTENT;

  if (repo.normalizedUrl === DEMO_REPO_URL || process.env.VIBECHECK_FORCE_DEMO === "1") {
    return createDemoReport(intent, repo.normalizedUrl);
  }

  return createDemoReport(intent, repo.normalizedUrl);
}
```

- [ ] **Step 5: Implement API route**

Create `app/api/analyze/route.ts`:

```ts
import { runAnalysis } from "@/lib/analyzer/run-analysis";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/report/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: Partial<AnalyzeRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!body.repoUrl || typeof body.repoUrl !== "string") {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "GitHub repo URL is required." },
      { status: 400 }
    );
  }

  if (!body.intent || typeof body.intent !== "string" || body.intent.trim().length < 12) {
    return NextResponse.json<AnalyzeResponse>(
      { ok: false, error: "Describe the feature you meant to build in at least one sentence." },
      { status: 400 }
    );
  }

  try {
    const report = await runAnalysis({ repoUrl: body.repoUrl, intent: body.intent });
    return NextResponse.json<AnalyzeResponse>({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "VibeCheck failed to analyze this repo.";
    return NextResponse.json<AnalyzeResponse>({ ok: false, error: message }, { status: 400 });
  }
}
```

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- lib/analyzer/__tests__/url.test.ts
npm run build
```

Expected: URL tests pass and Next.js build completes.

- [ ] **Step 7: Commit API foundation**

```bash
git add app/api/analyze/route.ts lib/analyzer/url.ts lib/analyzer/run-analysis.ts lib/analyzer/__tests__/url.test.ts
git commit -m "feat: add analysis API foundation"
```

## Task 4: Add Deterministic Risk Scan and Fix Prompt Builder

**Files:**
- Create: `lib/analyzer/risk-scan.ts`
- Create: `lib/analyzer/fix-prompt.ts`
- Test: `lib/analyzer/__tests__/risk-scan.test.ts`
- Test: `lib/analyzer/__tests__/fix-prompt.test.ts`
- Modify: `lib/analyzer/run-analysis.ts`

- [ ] **Step 1: Write risk scanner tests**

Create `lib/analyzer/__tests__/risk-scan.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { scanTextFiles } from "../risk-scan";

describe("scanTextFiles", () => {
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

  it("detects hardcoded secret-like values", () => {
    const findings = scanTextFiles(
      [{ path: "lib/payments.ts", content: "const key = 'sk_live_123456789abcdef';" }],
      "Add checkout."
    );

    expect(findings.map((finding) => finding.title)).toContain("Possible hardcoded secret");
  });
});
```

- [ ] **Step 2: Write fix prompt tests**

Create `lib/analyzer/__tests__/fix-prompt.test.ts`:

```ts
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
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm test -- lib/analyzer/__tests__/risk-scan.test.ts lib/analyzer/__tests__/fix-prompt.test.ts
```

Expected: FAIL because implementation files do not exist.

- [ ] **Step 4: Implement deterministic scanner**

Create `lib/analyzer/risk-scan.ts`:

```ts
import type { Finding } from "@/lib/report/types";

type TextFile = {
  path: string;
  content: string;
};

export function scanTextFiles(files: TextFile[], intent: string): Finding[] {
  const findings: Finding[] = [];
  const wantsProtectedRoute = /dashboard|protected|auth|login|redirect/i.test(intent);

  for (const file of files) {
    if (
      wantsProtectedRoute &&
      /dashboard/i.test(file.path) &&
      /['"]use client['"]/.test(file.content) &&
      /localStorage|sessionStorage|useState|useEffect/.test(file.content)
    ) {
      findings.push({
        severity: "critical",
        title: "Protected route appears client-only",
        evidence: `${file.path} is a client component and appears to rely on browser state for access control.`,
        recommendation:
          "Move the route protection to middleware, a server component, or a server-side layout before dashboard content renders.",
        relatedFiles: [file.path]
      });
    }

    if (/(sk_live_|ghp_|AIza|AKIA)[A-Za-z0-9_\-]{8,}/.test(file.content)) {
      findings.push({
        severity: "critical",
        title: "Possible hardcoded secret",
        evidence: `${file.path} contains a token-like literal matching a known secret pattern.`,
        recommendation: "Move secrets into environment variables and rotate the exposed value before shipping.",
        relatedFiles: [file.path]
      });
    }

    if (/dangerouslySetInnerHTML/.test(file.content)) {
      findings.push({
        severity: "warning",
        title: "Raw HTML rendering needs review",
        evidence: `${file.path} uses dangerouslySetInnerHTML.`,
        recommendation: "Ensure input is sanitized and covered by tests before shipping.",
        relatedFiles: [file.path]
      });
    }
  }

  return findings;
}
```

- [ ] **Step 5: Implement fix prompt builder**

Create `lib/analyzer/fix-prompt.ts`:

```ts
type BuildFixPromptInput = {
  intent: string;
  files: string[];
  findings: string[];
  commands: string[];
};

export function buildFixPrompt(input: BuildFixPromptInput): string {
  const files = input.files.length > 0 ? input.files.map((file) => `- ${file}`).join("\n") : "- No specific files identified";
  const findings =
    input.findings.length > 0 ? input.findings.map((finding) => `- ${finding}`).join("\n") : "- No deterministic findings";
  const commands =
    input.commands.length > 0 ? input.commands.map((command) => `- ${command}`).join("\n") : "- npm test\n- npm run build";

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
```

- [ ] **Step 6: Wire prompt builder into `run-analysis.ts` demo fallback**

Modify `lib/analyzer/run-analysis.ts` so returned demo reports use `buildFixPrompt`:

```ts
import { createDemoReport, DEMO_REPO_URL } from "@/lib/analyzer/demo-report";
import { buildFixPrompt } from "@/lib/analyzer/fix-prompt";
import { parseGitHubRepoUrl } from "@/lib/analyzer/url";
import type { AnalyzeRequest, VibeReport } from "@/lib/report/types";

const DEFAULT_INTENT =
  "Authenticated users should access /dashboard. Anonymous users should be redirected to /login before dashboard content renders.";

export async function runAnalysis(request: AnalyzeRequest): Promise<VibeReport> {
  const repo = parseGitHubRepoUrl(request.repoUrl);
  const intent = request.intent.trim() || DEFAULT_INTENT;
  const report = createDemoReport(intent, repo.normalizedUrl);

  report.fixPrompt = buildFixPrompt({
    intent,
    files: report.riskFiles.map((file) => file.path),
    findings: report.findings.map((finding) => finding.title),
    commands: report.commandResults
      .filter((result) => result.status !== "skipped")
      .map((result) => result.command)
  });

  return report;
}
```

- [ ] **Step 7: Run analyzer tests**

Run:

```bash
npm test
```

Expected: all Vitest tests pass.

- [ ] **Step 8: Commit scanner and prompt builder**

```bash
git add lib/analyzer
git commit -m "feat: add risk scan and fix prompt builder"
```

## Task 5: Build the Analyze and Report UI

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Replace home page with client flow**

Replace `app/page.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import type { AnalyzeResponse, VibeReport } from "@/lib/report/types";

const DEMO_REPO = "https://github.com/Huride/vibecheck-demo-auth";
const DEMO_INTENT =
  "I wanted logged-in users to access /dashboard and anonymous users to be redirected to /login. The app should not rely only on client-side checks.";

const progressSteps = [
  "Cloning repo",
  "Reading project structure",
  "Mapping intent to files",
  "Running risk scans",
  "Checking build and tests",
  "Generating fix prompt"
];

export default function Home() {
  const [repoUrl, setRepoUrl] = useState(DEMO_REPO);
  const [intent, setIntent] = useState(DEMO_INTENT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<VibeReport | null>(null);

  const activeStepCount = useMemo(() => (isLoading ? progressSteps.length : report ? progressSteps.length : 0), [
    isLoading,
    report
  ]);

  async function runVibeCheck() {
    setIsLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, intent })
      });
      const payload = (await response.json()) as AnalyzeResponse;

      if (!payload.ok) {
        setError(payload.error);
        return;
      }

      setReport(payload.report);
    } catch {
      setError("VibeCheck could not reach the analyzer. Try again from the hosted demo or local dev server.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Intent-aware validation for AI-built apps</p>
          <h1>VibeCheck</h1>
          <p className="lead">
            Put in a repo and what you meant to build. Get evidence, risk files, failed checks, and the next prompt for your coding agent.
          </p>
        </div>
        <div className="score-card">
          <span>Demo verdict</span>
          <strong>Not ship-ready</strong>
          <p>Find the gap before users do.</p>
        </div>
      </section>

      <section className="panel input-panel">
        <div className="field">
          <label htmlFor="repoUrl">GitHub repo URL</label>
          <input id="repoUrl" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="intent">What did you mean to build?</label>
          <textarea id="intent" value={intent} onChange={(event) => setIntent(event.target.value)} rows={5} />
        </div>
        <div className="actions">
          <button type="button" onClick={runVibeCheck} disabled={isLoading}>
            {isLoading ? "Running..." : "Run VibeCheck"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setRepoUrl(DEMO_REPO);
              setIntent(DEMO_INTENT);
            }}
          >
            Load demo
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="progress-grid">
        {progressSteps.map((step, index) => (
          <div className={index < activeStepCount ? "progress-step active" : "progress-step"} key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </section>

      {report ? <ReportView report={report} /> : null}
    </main>
  );
}

function ReportView({ report }: { report: VibeReport }) {
  return (
    <section className="report-grid">
      <div className="panel report-panel">
        <p className="eyebrow">Vibe report</p>
        <div className="score-row">
          <strong>{report.score}</strong>
          <div>
            <span>Vibe Score</span>
            <p>{formatVerdict(report.verdict)}</p>
          </div>
        </div>
        <p className="summary">{report.summary}</p>

        <h2>Risk files</h2>
        <div className="list">
          {report.riskFiles.map((file) => (
            <article key={file.path} className="list-item">
              <strong>{file.path}</strong>
              <span>{file.confidence} confidence</span>
              <p>{file.reason}</p>
            </article>
          ))}
        </div>

        <h2>Evidence</h2>
        <div className="list">
          {report.findings.map((finding) => (
            <article key={finding.title} className={`list-item severity-${finding.severity}`}>
              <strong>{finding.title}</strong>
              <span>{finding.severity}</span>
              <p>{finding.evidence}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="panel report-panel">
        <p className="eyebrow">Next prompt</p>
        <h2>Paste this into Cursor or Claude</h2>
        <pre className="prompt-box">{report.fixPrompt}</pre>
        <button type="button" onClick={() => navigator.clipboard.writeText(report.fixPrompt)}>
          Copy fix prompt
        </button>

        <h2>Verification</h2>
        <div className="list">
          {report.commandResults.map((result) => (
            <article key={result.command} className="list-item">
              <strong>{result.command}</strong>
              <span>{result.status}</span>
              <p>{result.outputExcerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatVerdict(verdict: VibeReport["verdict"]) {
  if (verdict === "looks_aligned") return "Looks aligned";
  if (verdict === "needs_review") return "Needs review";
  return "Not ship-ready";
}
```

- [ ] **Step 2: Replace CSS with full product UI**

Replace `app/globals.css` with the CSS from Task 1 plus these additions:

```css
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 24px;
  align-items: end;
}

.score-card,
.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 18px 50px rgba(20, 20, 20, 0.06);
}

.score-card {
  padding: 20px;
}

.score-card span {
  color: var(--muted);
  font-size: 13px;
}

.score-card strong {
  display: block;
  margin: 8px 0;
  color: var(--danger);
  font-size: 28px;
}

.input-panel {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.field {
  display: grid;
  gap: 8px;
}

label {
  font-weight: 700;
}

input,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 12px;
  background: #fbfbf9;
  color: var(--ink);
}

textarea {
  resize: vertical;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

button {
  border: 0;
  border-radius: 6px;
  padding: 11px 16px;
  background: var(--accent);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.65;
}

button.secondary {
  background: #303236;
}

.error {
  margin: 0;
  color: var(--danger);
  font-weight: 700;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin: 18px 0;
}

.progress-step {
  min-height: 92px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  background: #ededeb;
  color: var(--muted);
}

.progress-step.active {
  background: #e3f2ea;
  color: var(--text);
  border-color: #9ccbb8;
}

.progress-step span {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 12px;
  font-weight: 700;
}

.progress-step p {
  margin: 10px 0 0;
  font-weight: 700;
}

.report-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.report-panel {
  padding: 22px;
}

.score-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.score-row > strong {
  color: var(--danger);
  font-size: 64px;
  line-height: 1;
}

.score-row span {
  color: var(--muted);
  font-weight: 700;
}

.score-row p,
.summary {
  margin: 4px 0 0;
  font-size: 18px;
}

h2 {
  margin: 24px 0 12px;
  font-size: 20px;
}

.list {
  display: grid;
  gap: 10px;
}

.list-item {
  border: 1px solid var(--line);
  border-left: 4px solid var(--accent);
  border-radius: 6px;
  padding: 12px;
  background: #fbfbf9;
}

.list-item strong,
.list-item span {
  display: block;
}

.list-item span {
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
}

.list-item p {
  margin: 8px 0 0;
  color: var(--muted);
  line-height: 1.45;
}

.severity-critical {
  border-left-color: var(--danger);
}

.severity-warning {
  border-left-color: var(--warning);
}

.prompt-box {
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px;
  background: #202124;
  color: #f7f7f4;
  line-height: 1.45;
}

@media (max-width: 900px) {
  .hero,
  .report-grid {
    grid-template-columns: 1fr;
  }

  .progress-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 4: Manual UI check**

Run:

```bash
npm run dev
```

Open the printed localhost URL. Submit the prefilled demo. Expected: progress cards activate, report renders, and copy button does not throw.

- [ ] **Step 5: Commit UI**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: build VibeCheck report UI"
```

## Task 6: Add README and Demo Instructions

**Files:**
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# VibeCheck

VibeCheck validates AI-built apps before shipping. Provide a public GitHub repo URL and describe the feature you meant to build. VibeCheck returns a risk report, relevant files, command evidence, suggested tests, and a paste-ready fix prompt for Cursor or Claude.

## MVP Scope

- Public GitHub URL input
- Intent text input
- Hosted demo report for the prepared auth scenario
- Typed report model
- Deterministic risk scanner utilities
- Fix prompt builder
- Web report UI

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

## Demo Flow

1. Open the app.
2. Keep the prefilled demo repo URL.
3. Keep the prefilled intent about protecting `/dashboard`.
4. Click `Run VibeCheck`.
5. Show the Vibe Score, risk files, critical finding, failed test evidence, and generated fix prompt.

## Product Positioning

AI coding made it easy to generate apps, but hard to know whether they are actually correct. VibeCheck turns that uncertainty into evidence and the next exact prompt.
```

- [ ] **Step 2: Ensure generated files are ignored**

Modify `.gitignore` to include:

```gitignore
.next/
coverage/
```

- [ ] **Step 3: Run final checks**

Run:

```bash
npm test
npm run build
git status -sb
```

Expected: tests and build pass. `git status` only shows README and `.gitignore` before commit.

- [ ] **Step 4: Commit docs**

```bash
git add README.md .gitignore
git commit -m "docs: add VibeCheck demo instructions"
```

## Task 7: Push and Run the Demo

**Files:**
- No source changes expected.

- [ ] **Step 1: Push all commits**

Run:

```bash
git push
```

Expected: all new commits are pushed to `origin/main`.

- [ ] **Step 2: Start local demo server**

Run:

```bash
npm run dev
```

Expected: app starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Verify primary demo path**

In the browser:

1. Open the local URL.
2. Click `Run VibeCheck`.
3. Confirm the report renders.
4. Click `Copy fix prompt`.
5. Confirm no UI overflow on a narrow browser width.

- [ ] **Step 4: Prepare hosted deployment**

If Vercel is available, deploy the Next.js app as a hosted demo:

```bash
vercel --prod
```

Expected: Vercel returns a public production URL. If Vercel is not configured, keep the local live demo and use the GitHub repo plus screenshots until deployment credentials are available.

## Self-Review

- Spec coverage: The plan covers the web input flow, progress UI, report model, deterministic demo mode, analyzer boundary, URL validation, risk scanning, fix prompt generation, README, and verification.
- Known intentional gap: Live GitHub cloning and command execution are not in the first implementation slice. The interface is prepared for it, but hosted demo mode is prioritized for hackathon reliability.
- Placeholder scan: No placeholder markers or unspecified implementation steps remain.
- Type consistency: `VibeReport`, `AnalyzeRequest`, and `AnalyzeResponse` are defined once in `lib/report/types.ts` and imported everywhere.
