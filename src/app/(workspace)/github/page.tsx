import type { Metadata } from "next";

import { GitHubView } from "@/features/github/github-view";
import { requireViewer } from "@/lib/auth";
import { fetchGitHubProfile, type GitHubResult } from "@/lib/github";

export const metadata: Metadata = { title: "GitHub" };

export default async function GitHubPage() {
  const viewer = await requireViewer();
  const result: GitHubResult | null = viewer.githubUsername
    ? await fetchGitHubProfile(viewer.githubUsername)
    : null;

  return <GitHubView username={viewer.githubUsername} result={result} />;
}
