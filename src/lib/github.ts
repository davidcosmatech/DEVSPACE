import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export type GitHubProfile = {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
};

export type GitHubRepo = {
  id: number;
  name: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  fork: boolean;
};

export type GitHubResult =
  | { ok: true; profile: GitHubProfile; repos: GitHubRepo[] }
  | {
      ok: false;
      reason: "not_found" | "rate_limit" | "network" | "invalid";
      error: string;
    };

export type GitHubDisplayResult =
  | {
      ok: true;
      profile: GitHubProfile;
      repos: GitHubRepo[];
      cached: boolean;
      cachedAt: string | null;
      warning?: string;
    }
  | Extract<GitHubResult, { ok: false }>;

type GitHubSnapshot = {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  savedAt: string;
};

function parseSnapshot(value: Record<string, unknown> | null): GitHubSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const profile = value.profile as GitHubProfile | undefined;
  const repos = value.repos as GitHubRepo[] | undefined;
  const savedAt = value.savedAt as string | undefined;
  if (
    !profile ||
    typeof profile.login !== "string" ||
    typeof profile.publicRepos !== "number" ||
    !Array.isArray(repos) ||
    typeof savedAt !== "string"
  ) {
    return null;
  }
  return { profile, repos, savedAt };
}

/**
 * Returns live GitHub data when possible. If GitHub is rate limited or
 * unreachable, a previously verified snapshot belonging to this user is shown
 * instead with a cached timestamp. Snapshots are written only from successful
 * GitHub responses.
 */
export async function getGitHubDisplay(input: {
  userId: string;
  username: string | null;
  cache: Record<string, unknown> | null;
  cacheUpdatedAt: Date | null;
}): Promise<GitHubDisplayResult | null> {
  if (!input.username) return null;

  const live = await fetchGitHubProfile(input.username);
  if (live.ok) {
    const snapshot: GitHubSnapshot = {
      profile: live.profile,
      repos: live.repos,
      savedAt: new Date().toISOString(),
    };
    const stale =
      !input.cacheUpdatedAt || Date.now() - input.cacheUpdatedAt.getTime() > 15 * 60_000;
    if (stale) {
      try {
        const db = await getDb();
        await db
          .update(profiles)
          .set({ githubCache: snapshot, githubCacheUpdatedAt: new Date() })
          .where(eq(profiles.id, input.userId));
      } catch {
        // A cache write failure must not break the live GitHub view.
      }
    }
    return { ...live, cached: false, cachedAt: null };
  }

  const snapshot = parseSnapshot(input.cache);
  if (snapshot) {
    return {
      ok: true,
      profile: snapshot.profile,
      repos: snapshot.repos,
      cached: true,
      cachedAt: snapshot.savedAt,
      warning: live.error,
    };
  }

  return live;
}

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "DEVSPACE-3.0",
  "X-GitHub-Api-Version": "2022-11-28",
};

export function isValidGitHubUsername(value: string) {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value);
}

export async function fetchGitHubProfile(username: string): Promise<GitHubResult> {
  const cleaned = username.trim().replace(/^@/, "");
  if (!isValidGitHubUsername(cleaned)) {
    return { ok: false, reason: "invalid", error: "That GitHub username is not valid." };
  }

  try {
    const [profileResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(cleaned)}`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      }),
      fetch(`https://api.github.com/users/${encodeURIComponent(cleaned)}/repos?per_page=100&sort=updated`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(9000),
      }),
    ]);

    if (profileResponse.status === 404) {
      return { ok: false, reason: "not_found", error: `No GitHub user found for @${cleaned}.` };
    }

    if (profileResponse.status === 403 || profileResponse.status === 429) {
      const remaining = profileResponse.headers.get("x-ratelimit-remaining");
      return {
        ok: false,
        reason: "rate_limit",
        error:
          remaining === "0"
            ? "GitHub's public API rate limit has been reached. Try again later."
            : "GitHub temporarily refused the request. Try again shortly.",
      };
    }

    if (!profileResponse.ok) {
      return {
        ok: false,
        reason: "network",
        error: `GitHub returned ${profileResponse.status}. Try again shortly.`,
      };
    }

    const profileData = (await profileResponse.json()) as {
      login: string;
      name: string | null;
      bio: string | null;
      avatar_url: string;
      html_url: string;
      public_repos: number;
      followers: number;
      following: number;
      created_at: string;
    };

    let repos: GitHubRepo[] = [];
    if (reposResponse.ok) {
      const repoData = (await reposResponse.json()) as Array<{
        id: number;
        name: string;
        description: string | null;
        html_url: string;
        language: string | null;
        stargazers_count: number;
        forks_count: number;
        updated_at: string;
        fork: boolean;
      }>;
      repos = repoData
        .filter((repo) => !repo.fork)
        .map((repo) => ({
          id: repo.id,
          name: repo.name,
          description: repo.description,
          htmlUrl: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updatedAt: repo.updated_at,
          fork: repo.fork,
        }))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return {
      ok: true,
      profile: {
        login: profileData.login,
        name: profileData.name,
        bio: profileData.bio,
        avatarUrl: profileData.avatar_url,
        htmlUrl: profileData.html_url,
        publicRepos: profileData.public_repos,
        followers: profileData.followers,
        following: profileData.following,
        createdAt: profileData.created_at,
      },
      repos,
    };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      reason: "network",
      error: timedOut
        ? "GitHub took too long to respond. Try refreshing."
        : "Could not reach GitHub. Check your connection and try again.",
    };
  }
}
