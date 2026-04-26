import { describe, expect, it, vi } from "vitest";
import { fetchGitHubRepoSnapshot } from "../github-repo";

describe("fetchGitHubRepoSnapshot", () => {
  it("fetches root markdown and docs files for documentation-heavy repos", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);

      if (href === "https://api.github.com/repos/Huride/puppy") {
        return jsonResponse({ default_branch: "main" });
      }

      if (href === "https://api.github.com/repos/Huride/puppy/git/trees/main?recursive=1") {
        return jsonResponse({
          tree: [
            { path: "CMUX_x_AIM_Hackathon_Guide_정리.md", type: "blob", size: 14383 },
            { path: "docs/superpowers/specs/2026-04-26-puppy-design.md", type: "blob", size: 8047 }
          ]
        });
      }

      if (
        href ===
        "https://raw.githubusercontent.com/Huride/puppy/main/CMUX_x_AIM_Hackathon_Guide_%EC%A0%95%EB%A6%AC.md"
      ) {
        return textResponse("# Hackathon guide");
      }

      if (
        href ===
        "https://raw.githubusercontent.com/Huride/puppy/main/docs/superpowers/specs/2026-04-26-puppy-design.md"
      ) {
        return textResponse("# Puppy design");
      }

      throw new Error(`Unexpected fetch: ${href}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      const snapshot = await fetchGitHubRepoSnapshot({
        owner: "Huride",
        repo: "puppy",
        normalizedUrl: "https://github.com/Huride/puppy"
      });

      expect(snapshot.textFiles.map((file) => file.path)).toEqual([
        "CMUX_x_AIM_Hackathon_Guide_정리.md",
        "docs/superpowers/specs/2026-04-26-puppy-design.md"
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function textResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/plain" }
  });
}
