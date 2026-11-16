import "server-only";

/**
 * Server-only helpers for deleting GitHub repositories from DEVSPACE.
 * The token is read from the environment and never returned to the browser.
 */

export function githubDeleteToken() {
  return (process.env.GITHUB_DELETE_TOKEN ?? "").trim();
}

let tokenOwnerPromise: Promise<string | null> | null = null;

/** Login of the account that owns the delete token (cached per server process). */
export function getGitHubDeleteOwner(): Promise<string | null> {
  const token = githubDeleteToken();
  if (!token) return Promise.resolve(null);
  tokenOwnerPromise ??= (async () => {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "DEVSPACE-3.0",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { login?: string };
      return typeof data.login === "string" ? data.login : null;
    } catch {
      return null;
    }
  })();
  return tokenOwnerPromise;
}
