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

  it("rejects empty repo names after stripping .git", () => {
    expect(() => parseGitHubRepoUrl("https://github.com/Huride/.git")).toThrow(
      "Enter a GitHub repo URL in the form https://github.com/owner/repo."
    );
  });
});
