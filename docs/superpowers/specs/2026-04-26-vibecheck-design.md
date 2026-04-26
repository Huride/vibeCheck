# VibeCheck Design Spec

Date: 2026-04-26

## Summary

VibeCheck is a web app for validating AI-built code before shipping. A user provides a public GitHub repo URL and describes the feature they meant to build. VibeCheck analyzes the repo, infers which files and behaviors are relevant to that intent, runs available build/test commands when safe, reports implementation risks, and generates a paste-ready fix prompt for Cursor, Claude, or another coding agent.

The MVP combines two product ideas:

- **VibeCheck Core:** intent-aware repo analysis and risk reporting.
- **PromptPatch:** failure-aware prompt generation for the next AI coding iteration.

The product should be framed as:

> Put in an AI-built repo and what you meant to build. VibeCheck tells you whether the code actually matches the intent, where it is risky, and what prompt to give your coding agent next.

## Goals

- Make the hackathon demo understandable in under 30 seconds.
- Support an end-to-end flow: GitHub repo URL -> intent text -> analysis -> report -> fix prompt.
- Focus on Next.js and Node.js repos for the MVP.
- Show enough technical depth for Developer Tooling while keeping the web UX clear for Business & Applications judging.
- Produce a report that is evidence-based, not just generic AI commentary.

## Non-Goals

- No automatic code modification in the MVP.
- No private GitHub authentication in the MVP.
- No broad language/runtime support beyond JavaScript/TypeScript Node projects.
- No full security scanner. Include only lightweight high-signal checks.
- No guarantee that generated tests are complete or executable. The MVP can suggest test cases without writing them into the target repo.

## Primary User

The primary user is a developer, founder, PM, or vibe coder who used AI coding tools to build an app and is unsure whether it is safe to demo or deploy.

Typical user question:

> I asked AI to build protected dashboard routes and checkout, but I do not know whether it really works. What should I check, and what should I ask AI to fix?

## MVP Experience

### 1. Analyze Page

The first screen contains:

- App name: `VibeCheck`.
- GitHub repo URL input.
- Feature intent textarea.
- Optional preset example button for the prepared demo repo.
- `Run VibeCheck` button.

Example intent:

```text
I wanted logged-in users to access /dashboard and anonymous users to be redirected to /login. The app should not rely only on client-side checks.
```

### 2. Progress Page

After submission, the app shows step-by-step progress:

1. Cloning repo.
2. Reading project structure.
3. Inferring relevant files from the user's intent.
4. Running lightweight risk scans.
5. Detecting package manager and available commands.
6. Running build/test commands when available.
7. Generating Vibe report and fix prompt.

The progress screen should show concise logs. This gives the tool credibility and makes failures understandable.

### 3. Report Page

The result page has two main columns.

Left column: verdict and evidence.

- Vibe Score: 0-100.
- Verdict: `Looks aligned`, `Needs review`, or `Not ship-ready`.
- Summary of intent mismatch.
- Risk files with reasons.
- Build/test command results.
- Lightweight runtime/security findings.
- Suggested test cases.

Right column: next action.

- Root cause summary.
- Paste-ready fix prompt.
- Copy button.
- Suggested verification commands to run after applying the fix.

## Report Model

The report should be stored as structured JSON and rendered by the UI.

```ts
type VibeReport = {
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

type RiskFile = {
  path: string;
  reason: string;
  confidence: "low" | "medium" | "high";
};

type CommandResult = {
  command: string;
  status: "passed" | "failed" | "skipped";
  outputExcerpt: string;
};

type Finding = {
  severity: "info" | "warning" | "critical";
  title: string;
  evidence: string;
  recommendation: string;
  relatedFiles: string[];
};

type SuggestedTest = {
  title: string;
  type: "unit" | "integration" | "e2e" | "manual";
  steps: string[];
  expectedResult: string;
};
```

## Architecture

Use a single web app with an internal analysis worker.

Recommended stack:

- Next.js app for the UI and API routes.
- Node.js worker functions for repo analysis.
- Temporary local workspace for cloned repos.
- LLM provider abstraction for intent analysis and prompt generation.
- Hosted demo mode for the prepared sample repo, so the submitted demo link works even if the live analyzer is run locally or on a non-serverless host.

High-level modules:

- `app/`: pages and report UI.
- `app/api/analyze/route.ts`: starts an analysis job.
- `lib/analyzer/clone.ts`: clones public GitHub repos into a temp workspace.
- `lib/analyzer/project.ts`: reads project metadata and file tree.
- `lib/analyzer/intent.ts`: uses the LLM to map user intent to likely files and behaviors.
- `lib/analyzer/risk-scan.ts`: performs deterministic scans for high-signal issues.
- `lib/analyzer/runner.ts`: detects and runs safe build/test commands.
- `lib/analyzer/report.ts`: merges deterministic evidence and LLM analysis into `VibeReport`.
- `lib/analyzer/fix-prompt.ts`: generates the paste-ready coding-agent prompt.

## Data Flow

1. User submits `repoUrl` and `intent`.
2. API validates that the repo URL is public GitHub.
3. Analyzer clones the repo into a temp directory.
4. Project scanner reads:
   - `package.json`
   - lockfiles
   - top-level directory structure
   - source file list
   - candidate config files
5. Intent analyzer receives:
   - user intent
   - file tree
   - package metadata
   - selected file excerpts
6. Risk scanner runs deterministic checks.
7. Runner executes safe commands:
   - Prefer `npm test`, `pnpm test`, or `yarn test` if present.
   - Run `build` if available and timeout is acceptable.
   - Skip commands that look destructive or deployment-related.
8. Report generator combines:
   - user intent
   - relevant files
   - deterministic findings
   - command results
   - LLM reasoning
9. UI renders the report and copyable fix prompt.

## Lightweight Risk Scans

For the MVP, include deterministic checks that are easy to explain:

- Missing test script for a repo with non-trivial app structure.
- Build/test script exists but fails.
- Client-only auth guard for route protection intents.
- Use of `dangerouslySetInnerHTML`.
- Hardcoded secrets or API keys by simple pattern matching.
- Missing `.env.example` when environment variables are referenced.
- Obvious TODO/FIXME markers in files related to the intent.
- Package manager mismatch, such as lockfile present but command unavailable.

These scans should be treated as evidence signals, not final truth.

## LLM Responsibilities

The LLM should do tasks where static rules are weak:

- Rewrite the user's intent as concrete expected behaviors.
- Select likely relevant files from the project map.
- Explain why a finding matters in the context of the intent.
- Generate suggested tests.
- Generate the final fix prompt.

The LLM should not be the only source of truth. Reports must cite file paths, command results, or scan evidence wherever possible.

## Fix Prompt Format

The generated fix prompt should be specific enough to paste into a coding agent.

It should include:

- Original user intent.
- Observed failure or risk.
- Files to inspect first.
- Concrete implementation requirements.
- Constraints to preserve existing behavior.
- Verification commands to run.
- Expected final result.

Example structure:

```text
You are fixing a Next.js app. The intended behavior is:
...

VibeCheck found these issues:
...

Start with these files:
...

Make the smallest change that satisfies the intent. Do not rewrite unrelated code.

After editing, run:
...
```

## Error Handling

User-facing errors should be explicit and actionable.

- Invalid URL: explain that only public GitHub URLs are supported in the MVP.
- Clone failure: show the repo may be private, too large, or unreachable.
- Unsupported project: show that the MVP works best with Node/Next.js repos.
- Missing scripts: skip test execution and still generate static/LLM findings.
- Command timeout: show partial logs and mark the command as timed out.
- LLM failure: return deterministic scan results and explain that AI summary generation failed.

The product should still produce a partial report whenever possible.

## Demo Scenario

Prepare a small broken Next.js sample app with an auth-related flaw.

Demo script:

1. Show the app was built by AI and appears mostly correct.
2. Enter the GitHub repo URL.
3. Enter intent: authenticated users should access `/dashboard`; anonymous users should redirect to `/login`; this must not rely only on client-side state.
4. Run VibeCheck.
5. Show relevant files selected by the analyzer.
6. Show test/build result or deterministic auth finding.
7. Show `Not ship-ready` verdict.
8. Copy the generated fix prompt.
9. Explain that this closes the AI coding loop: vague concern -> evidence -> next prompt.

## Deployment Strategy

The hackathon requires a non-localhost demo link, so the MVP must support a hosted experience.

Use two execution modes:

- **Live analyzer mode:** the real analyzer clones a public repo, scans files, runs safe commands, and generates a report. This can run locally during live judging or on a Node-capable host that permits shell commands and temporary files.
- **Hosted demo mode:** the deployed web app includes a prepared sample repo path and deterministic demo report generation. It should still show the same product flow and report UI, but it can avoid shell execution if the hosting platform does not support it reliably.

The submitted demo link should point to the hosted web app. During judging, the team can additionally show live analyzer mode from a controlled environment to prove the backend is real.

## Success Metrics for Hackathon

- The full demo flow completes in under 90 seconds using the prepared repo.
- The report names at least two relevant files correctly.
- The report includes at least one evidence-backed critical or warning finding.
- The generated fix prompt is specific enough that a coding agent could act on it.
- The UI makes the value clear without requiring explanation of internal implementation.

## Testing Plan

Product tests:

- Submit a valid public GitHub URL and intent; receive a completed report.
- Submit an invalid URL; receive a useful validation error.
- Submit a repo without `package.json`; receive unsupported-project partial report.
- Submit a repo with failing tests; report includes failed command and log excerpt.
- Submit the prepared demo repo; report identifies the expected auth-related files.

Module tests:

- URL validation accepts GitHub HTTPS URLs and rejects unsupported hosts.
- Project scanner extracts package scripts and file tree.
- Risk scanner detects simple hardcoded secret patterns.
- Runner skips unsafe scripts and handles timeouts.
- Report generator always returns required `VibeReport` fields.

Manual demo verification:

- Run the prepared demo from a clean environment.
- Confirm progress steps render in order.
- Confirm the copy prompt button works.
- Confirm failure states are readable on projector-sized screens.

## MVP Decisions

- Zip upload is deferred. The MVP supports public GitHub URLs first.
- Reports are kept in memory or local file storage. No database is required for the first demo.
- The LLM call goes through a provider wrapper so the model can be swapped quickly.
- Shell-based analysis should not depend on Vercel serverless. Use a Node-capable host for live analysis, or use hosted demo mode for the submitted link.

## Implementation Recommendation

Build the MVP as a Next.js web app with a real local analysis worker first. Then add hosted demo mode for the prepared repo so the public demo link remains reliable. If there is time, deploy the live analyzer to a Node-capable host; otherwise, present live analyzer mode locally during judging and use the hosted link for product review.

The strongest pitch is not "we built another code review bot." It is:

> AI coding made it easy to generate apps, but hard to know whether they are actually correct. VibeCheck turns that uncertainty into evidence and the next exact prompt.
