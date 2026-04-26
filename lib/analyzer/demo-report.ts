import type { VibeReport } from "@/lib/report/types";

export const DEMO_REPO_URL = "https://github.com/Huride/vibecheck-demo-auth";
export const DEMO_REPORT_ID = "demo-dashboard-auth";
export const DEMO_CREATED_AT = "2026-04-26T00:00:00.000Z";

export function createDemoReport(intent: string, repoUrl = DEMO_REPO_URL): VibeReport {
  return {
    id: DEMO_REPORT_ID,
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
      "You are fixing a Next.js app. The intended behavior is: authenticated users can access /dashboard, and anonymous users must be redirected to /login before dashboard content renders. VibeCheck found that dashboard protection appears to rely on client-side state and middleware.ts does not enforce /dashboard access. Start with middleware.ts, app/dashboard/page.tsx, and lib/auth.ts. Make the smallest change that verifies the session on the server or middleware boundary, redirects anonymous users to /login, and preserves authenticated dashboard access. Add or update a regression test for anonymous /dashboard access. After editing, run npm test and npm run build. The final result should pass tests and prevent anonymous dashboard rendering.",
    createdAt: DEMO_CREATED_AT
  };
}
