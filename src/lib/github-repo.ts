/**
 * Parses a GitHub repository reference from a project's repository URL.
 * Supports https URLs, the optional `www.` host, a `.git` suffix and the
 * `git@github.com:owner/repo.git` SSH form. Returns null for anything that is
 * not a GitHub repository URL.
 */
export type GitHubRepoRef = {
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
};

const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const namePattern = /^[A-Za-z0-9._-]{1,100}$/;

function clean(value: string) {
  return value.replace(/\.git$/i, "").replace(/\/+$/, "");
}

export function parseGitHubRepo(url: string | null | undefined): GitHubRepoRef | null {
  const value = (url ?? "").trim();
  if (!value) return null;

  let owner = "";
  let name = "";

  const ssh = value.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  if (ssh) {
    owner = ssh[1];
    name = clean(ssh[2]);
  } else {
    let parsed: URL;
    try {
      const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
      parsed = new URL(withProtocol);
    } catch {
      return null;
    }
    if (!/^(www\.)?github\.com$/i.test(parsed.hostname)) return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    owner = decodeURIComponent(segments[0]);
    name = clean(decodeURIComponent(segments[1]));
  }

  if (!ownerPattern.test(owner) || !namePattern.test(name)) return null;
  if (name === "." || name === "..") return null;

  return {
    owner,
    name,
    fullName: `${owner}/${name}`,
    htmlUrl: `https://github.com/${owner}/${name}`,
  };
}
