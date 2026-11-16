import type { Metadata } from "next";

import { GitHubView } from "@/features/github/github-view";
import { requireViewer } from "@/lib/auth";
import { getViewerRole } from "@/lib/auth/rbac";
import { getGitHubDisplay, type GitHubDisplayResult } from "@/lib/github";
import { getGitHubDeleteOwner } from "@/lib/github-delete";

export const metadata: Metadata = { title: "GitHub" };

export default async function GitHubPage() {
  const viewer = await requireViewer();
  const result: GitHubDisplayResult | null = await getGitHubDisplay({
    userId: viewer.id,
    username: viewer.githubUsername,
    cache: viewer.githubCache,
    cacheUpdatedAt: viewer.githubCacheUpdatedAt,
  });

  const deleteOwner = await getGitHubDeleteOwner();
  const viewerRole = await getViewerRole(viewer);
  const githubDeleteEnabled = Boolean(
    viewerRole?.key === "owner" &&
      deleteOwner &&
      viewer.githubUsername &&
      deleteOwner.toLowerCase() === viewer.githubUsername.toLowerCase(),
  );

  return (
    <GitHubView
      username={viewer.githubUsername}
      result={result}
      githubDeleteEnabled={githubDeleteEnabled}
    />
  );
}


