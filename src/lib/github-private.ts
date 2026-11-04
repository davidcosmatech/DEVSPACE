/**
 * Pure helpers for the private-repository section.
 *
 * Kept free of `server-only` imports so the rules can be unit tested and reused
 * by the client view. No token value ever crosses this module.
 */

export function normalizeLogin(value: string | null | undefined) {
  return (value ?? "").trim().replace(/^@/, "").toLowerCase();
}

/**
 * Private repositories are only exposed when the DEVSPACE profile is connected
 * to the exact account that owns the server-side GitHub token. Any other
 * connected username sees public data only.
 */
export function canViewPrivateRepos(
  connectedUsername: string | null | undefined,
  tokenLogin: string | null | undefined,
) {
  const connected = normalizeLogin(connectedUsername);
  const owner = normalizeLogin(tokenLogin);
  return connected !== "" && owner !== "" && connected === owner;
}

export type PrivateRepoSummary = {
  count: number;
  languages: string[];
  lastUpdatedAt: string | null;
};

export function summarizePrivateRepos(
  repos: Array<{ language: string | null; updatedAt: string; fork?: boolean }> = [],
): PrivateRepoSummary {
  const languages = Array.from(
    new Set(repos.map((repo) => repo.language).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));

  const lastUpdatedAt = repos.reduce<string | null>((latest, repo) => {
    if (!repo.updatedAt) return latest;
    if (!latest) return repo.updatedAt;
    return new Date(repo.updatedAt).getTime() > new Date(latest).getTime() ? repo.updatedAt : latest;
  }, null);

  return { count: repos.length, languages, lastUpdatedAt };
}
