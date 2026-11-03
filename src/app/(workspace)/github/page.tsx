import type { Metadata } from "next";

import { GitHubView } from "@/features/github/github-view";
import { requireViewer } from "@/lib/auth";
import { getGitHubDisplay, type GitHubDisplayResult } from "@/lib/github";

export const metadata: Metadata = { title: "GitHub" };

export default async function GitHubPage() {
  const viewer = await requireViewer();
  const result: GitHubDisplayResult | null = await getGitHubDisplay({
    userId: viewer.id,
    username: viewer.githubUsername,
    cache: viewer.githubCache,
    cacheUpdatedAt: viewer.githubCacheUpdatedAt,
  });

  return <GitHubView username={viewer.githubUsername} result={result} />;
}
