import type { ParsedGitHubRepo } from "@/lib/analyzer/url";

export type GitHubTextFile = {
  path: string;
  content: string;
};

export type GitHubRepoSnapshot = {
  owner: string;
  repo: string;
  defaultBranch: string;
  filePaths: string[];
  textFiles: GitHubTextFile[];
  packageJson: Record<string, unknown> | null;
};

type GitHubRepoResponse = {
  default_branch?: string;
};

type GitHubTreeResponse = {
  tree?: Array<{
    path?: string;
    type?: string;
    size?: number;
  }>;
};

const MAX_TEXT_FILES = 24;
const MAX_TEXT_FILE_SIZE = 120_000;

export async function fetchGitHubRepoSnapshot(repo: ParsedGitHubRepo): Promise<GitHubRepoSnapshot> {
  const repoResponse = await fetchJson<GitHubRepoResponse>(`https://api.github.com/repos/${repo.owner}/${repo.repo}`);
  const defaultBranch = repoResponse.default_branch || "main";
  const treeResponse = await fetchJson<GitHubTreeResponse>(
    `https://api.github.com/repos/${repo.owner}/${repo.repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  );
  const filePaths = (treeResponse.tree ?? [])
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => ({ path: item.path as string, size: item.size ?? 0 }));
  const selectedFiles = filePaths.filter(isUsefulTextFile).slice(0, MAX_TEXT_FILES);
  const textFiles: GitHubTextFile[] = [];

  for (const file of selectedFiles) {
    const content = await fetchTextFile(repo, defaultBranch, file.path);
    if (content) {
      textFiles.push({ path: file.path, content });
    }
  }

  const packageJsonFile = textFiles.find((file) => file.path === "package.json");

  return {
    owner: repo.owner,
    repo: repo.repo,
    defaultBranch,
    filePaths: filePaths.map((file) => file.path),
    textFiles,
    packageJson: packageJsonFile ? parsePackageJson(packageJsonFile.content) : null
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "VibeCheck"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchTextFile(repo: ParsedGitHubRepo, branch: string, path: string): Promise<string | null> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${repo.owner}/${repo.repo}/${encodeURIComponent(branch)}/${encodePath(path)}`
  );

  if (!response.ok) {
    return null;
  }

  return response.text();
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function isUsefulTextFile(file: { path: string; size: number }): boolean {
  if (file.size > MAX_TEXT_FILE_SIZE) {
    return false;
  }

  if (file.path === "package.json") {
    return true;
  }

  if (/\.(ts|tsx|js|jsx|mjs|cjs|json|md|env\.example|css)$/.test(file.path) === false) {
    return false;
  }

  if (/^[^/]+\.md$/.test(file.path) || file.path.startsWith("docs/")) {
    return true;
  }

  return /^(app|pages|src|lib|components|middleware|server|api|routes|utils|hooks|styles|config|prisma|supabase)\b/.test(
    file.path
  );
}

function parsePackageJson(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
