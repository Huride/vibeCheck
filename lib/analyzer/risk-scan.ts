import type { Finding } from "@/lib/report/types";

type TextFile = {
  path: string;
  content: string;
};

export function scanTextFiles(files: TextFile[], intent: string): Finding[] {
  const findings: Finding[] = [];
  const wantsProtectedRoute = /dashboard|protected|auth|login|redirect/i.test(intent);
  const intentRoutes = Array.from(intent.matchAll(/\/[A-Za-z0-9_/-]+/g), (match) => match[0].toLowerCase());

  for (const file of files) {
    const normalizedPath = file.path.toLowerCase();
    const isLikelyProtectedPath = /(^|\/)(dashboard|admin|account|settings|profile|protected)(\/|$)/i.test(file.path);
    const matchesIntentRoute = intentRoutes.some((route) => normalizedPath.includes(route.replace(/^\//, "")));
    const hasClientDirective = /['"]use client['"]/.test(file.content);
    const hasBrowserStorageSignal = /localStorage|sessionStorage/.test(file.content);
    const hasAuthAccessSignal = /\b(auth|session|token|user|currentUser|isAuthenticated)\b/i.test(file.content);

    if (
      wantsProtectedRoute &&
      (isLikelyProtectedPath || matchesIntentRoute) &&
      hasClientDirective &&
      hasBrowserStorageSignal &&
      hasAuthAccessSignal
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
