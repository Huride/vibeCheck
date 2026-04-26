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

  it("prioritizes iOS app source files and skips vendored or user-specific Xcode files", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);

      if (href === "https://api.github.com/repos/ProjectInTheClass/mogrige") {
        return jsonResponse({ default_branch: "master" });
      }

      if (href === "https://api.github.com/repos/ProjectInTheClass/mogrige/git/trees/master?recursive=1") {
        return jsonResponse({
          tree: [
            { path: "Application/mogrige_update/Pods/YPImagePicker/Source/Picker.swift", type: "blob", size: 1200 },
            {
              path: "Application/mogrige_update/NewMogrige.xcodeproj/project.xcworkspace/xcuserdata/user.xcuserdatad/UserInterfaceState.xcuserstate",
              type: "blob",
              size: 50000
            },
            { path: "sandbox/example/ExampleApp/ViewController.swift", type: "blob", size: 900 },
            { path: "Application/mogrige_update/NewMogrige/DataManager.swift", type: "blob", size: 1000 },
            { path: "Application/mogrige_update/NewMogrige/Info.plist", type: "blob", size: 1600 },
            { path: "Application/mogrige_update/NewMogrige/Base.lproj/Main.storyboard", type: "blob", size: 1800 },
            { path: "Application/mogrige_update/NewMogrige.xcodeproj/project.pbxproj", type: "blob", size: 25065 }
          ]
        });
      }

      if (href === "https://raw.githubusercontent.com/ProjectInTheClass/mogrige/master/Application/mogrige_update/NewMogrige/DataManager.swift") {
        return textResponse("import UIKit\nfinal class DataManager {}");
      }

      if (href === "https://raw.githubusercontent.com/ProjectInTheClass/mogrige/master/Application/mogrige_update/NewMogrige/Info.plist") {
        return textResponse("<plist><dict></dict></plist>");
      }

      if (
        href ===
        "https://raw.githubusercontent.com/ProjectInTheClass/mogrige/master/Application/mogrige_update/NewMogrige/Base.lproj/Main.storyboard"
      ) {
        return textResponse("<document></document>");
      }

      if (href === "https://raw.githubusercontent.com/ProjectInTheClass/mogrige/master/Application/mogrige_update/NewMogrige.xcodeproj/project.pbxproj") {
        return textResponse("// !$*UTF8*$!");
      }

      throw new Error(`Unexpected fetch: ${href}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    try {
      const snapshot = await fetchGitHubRepoSnapshot({
        owner: "ProjectInTheClass",
        repo: "mogrige",
        normalizedUrl: "https://github.com/ProjectInTheClass/mogrige"
      });

      expect(snapshot.textFiles.map((file) => file.path)).toEqual([
        "Application/mogrige_update/NewMogrige/DataManager.swift",
        "Application/mogrige_update/NewMogrige/Info.plist",
        "Application/mogrige_update/NewMogrige/Base.lproj/Main.storyboard",
        "Application/mogrige_update/NewMogrige.xcodeproj/project.pbxproj"
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
