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
  if (!repo) {
    throw new Error("Enter a GitHub repo URL in the form https://github.com/owner/repo.");
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`
  };
}
