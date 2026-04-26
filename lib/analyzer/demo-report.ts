import type { Locale, VibeReport } from "@/lib/report/types";

export const DEMO_REPO_URL = "https://github.com/Huride/vibecheck-demo-auth";
export const DEMO_REPORT_ID = "demo-dashboard-auth";
export const DEMO_CREATED_AT = "2026-04-26T00:00:00.000Z";

export function createDemoReport(intent: string, repoUrl = DEMO_REPO_URL, locale: Locale = "en"): VibeReport {
  if (locale === "ko") {
    return createKoreanDemoReport(intent, repoUrl);
  }

  return createEnglishDemoReport(intent, repoUrl);
}

function createEnglishDemoReport(intent: string, repoUrl: string): VibeReport {
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

function createKoreanDemoReport(intent: string, repoUrl: string): VibeReport {
  return {
    id: DEMO_REPORT_ID,
    repoUrl,
    intent,
    status: "completed",
    score: 42,
    verdict: "not_ship_ready",
    summary:
      "대시보드 보호 기능이 의도대로 완성되지 않았습니다. 현재 앱은 라우트 보호를 클라이언트 상태에 의존하는 것으로 보이며, 이는 우회될 수 있고 서버 측 접근 제어를 증명하지 못합니다.",
    riskFiles: [
      {
        path: "app/dashboard/page.tsx",
        reason: "대시보드 접근 제어가 서버 또는 middleware 경계가 아니라 클라이언트 컴포넌트에서 처리되는 것으로 보입니다.",
        confidence: "high"
      },
      {
        path: "lib/auth.ts",
        reason: "인증 helper가 세션 상태를 노출하지만 보호 라우트를 위한 서버 측 검증 경로가 명확하지 않습니다.",
        confidence: "medium"
      },
      {
        path: "middleware.ts",
        reason: "/dashboard에 대한 라우트 레벨 redirect 동작이 middleware에서 확인되지 않습니다.",
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
        outputExcerpt: "빌드는 성공했지만, 빌드 성공만으로 보호 라우트 동작이 검증되지는 않습니다."
      }
    ],
    findings: [
      {
        severity: "critical",
        title: "서버 측 검증 없이 보호 라우트에 접근할 수 있음",
        evidence:
          "요구사항은 대시보드 콘텐츠가 렌더링되기 전에 비로그인 사용자를 redirect하는 것입니다. 관련 파일에서는 이를 강제하는 middleware 또는 서버 측 guard가 확인되지 않습니다.",
        recommendation:
          "대시보드 콘텐츠가 렌더링되기 전에 middleware 또는 서버 측 layout에서 세션을 확인하고, 비로그인 사용자는 /login으로 redirect하세요.",
        relatedFiles: ["middleware.ts", "app/dashboard/page.tsx", "lib/auth.ts"]
      },
      {
        severity: "warning",
        title: "비로그인 대시보드 접근 회귀 테스트 누락",
        evidence:
          "테스트 출력은 기대한 redirect 동작이 통과하는 테스트로 보장되지 않는다는 점을 보여줍니다.",
        recommendation:
          "세션 없이 /dashboard에 접근했을 때 /login으로 redirect되는 integration 또는 E2E 테스트를 추가하세요.",
        relatedFiles: ["app/dashboard/page.tsx"]
      }
    ],
    suggestedTests: [
      {
        title: "비로그인 사용자는 대시보드에서 redirect된다",
        type: "e2e",
        steps: ["세션 쿠키를 제거한다", "/dashboard에 접근한다", "최종 URL을 확인한다"],
        expectedResult: "사용자는 /login으로 이동하고 대시보드 콘텐츠는 렌더링되지 않습니다."
      },
      {
        title: "로그인 사용자는 대시보드에 접근할 수 있다",
        type: "e2e",
        steps: ["유효한 세션을 만든다", "/dashboard에 접근한다", "대시보드 heading을 기다린다"],
        expectedResult: "대시보드가 렌더링되고 /login으로 redirect되지 않습니다."
      }
    ],
    fixPrompt:
      "Next.js 앱을 수정하세요. 의도한 동작은 로그인 사용자는 /dashboard에 접근할 수 있고, 비로그인 사용자는 대시보드 콘텐츠가 렌더링되기 전에 /login으로 redirect되는 것입니다. VibeCheck는 현재 대시보드 보호가 클라이언트 상태에 의존하고 있으며 middleware.ts에서 /dashboard 접근 제어가 강제되지 않는 것으로 판단했습니다. 먼저 middleware.ts, app/dashboard/page.tsx, lib/auth.ts를 확인하세요. 서버 또는 middleware 경계에서 세션을 검증하고, 비로그인 사용자를 /login으로 redirect하며, 로그인 사용자의 대시보드 접근은 유지하는 최소 변경을 적용하세요. 비로그인 /dashboard 접근 회귀 테스트를 추가하거나 수정하세요. 수정 후 npm test와 npm run build를 실행하세요. 최종 결과는 테스트를 통과하고 비로그인 대시보드 렌더링을 막아야 합니다.",
    createdAt: DEMO_CREATED_AT
  };
}
