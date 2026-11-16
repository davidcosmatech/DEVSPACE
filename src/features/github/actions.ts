"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { authorize, getViewerRole } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { profiles, projects } from "@/lib/db/schema";
import { getGitHubDeleteOwner, githubDeleteToken } from "@/lib/github-delete";
import { parseGitHubRepo } from "@/lib/github-repo";
import {
  deleteGitHubRepositorySchema,
  githubUsernameSchema,
} from "@/lib/validation/github";

export type GitHubActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  username?: string | null;
};

export async function saveGitHubUsernameAction(input: unknown): Promise<GitHubActionResult> {
  const viewer = await requireViewer();
  const parsed = githubUsernameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid username." };
  }

  const db = await getDb();
  await db
    .update(profiles)
    .set({ githubUsername: parsed.data.username, updatedAt: new Date() })
    .where(eq(profiles.id, viewer.id));

  revalidatePath("/github");
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true, username: parsed.data.username };
}

export async function refreshGitHubAction() {
  revalidatePath("/github");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Deletes one of the connected account's own GitHub repositories. */
export async function deleteGitHubRepositoryAction(input: unknown): Promise<GitHubActionResult> {
  const viewer = await authorize("content.manage");
  const parsed = deleteGitHubRepositorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the repository details." };
  }

  const owner = parsed.data.owner.trim();
  const repo = parsed.data.repo.trim();
  const fullName = `${owner}/${repo}`;

  if (parsed.data.confirmation.trim().toLowerCase() !== fullName.toLowerCase()) {
    return { ok: false, error: `Type ${fullName} to confirm.` };
  }

  const viewerRole = await getViewerRole(viewer);
  if (viewerRole?.key !== "owner") {
    return { ok: false, error: "Only the workspace Owner can delete GitHub repositories." };
  }

  const connected = (viewer.githubUsername ?? "").trim();
  if (!connected || connected.toLowerCase() !== owner.toLowerCase()) {
    return { ok: false, error: "You can only delete repositories from your connected GitHub account." };
  }

  const token = githubDeleteToken();
  const tokenOwner = await getGitHubDeleteOwner();
  if (!token || !tokenOwner) {
    return { ok: false, error: "GitHub repository deletion is not configured on this server." };
  }
  if (tokenOwner.toLowerCase() !== owner.toLowerCase()) {
    return {
      ok: false,
      error: "The server's GitHub token does not have permission to delete this repository.",
    };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      method: "DELETE",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "DEVSPACE-3.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status !== 204) {
      if (response.status === 401) return { ok: false, error: "The GitHub token is invalid or expired." };
      if (response.status === 403) {
        return {
          ok: false,
          error:
            "GitHub refused the deletion. The token needs the delete_repo permission and access to this repository.",
        };
      }
      if (response.status === 404) {
        return { ok: false, error: "Repository not found, or the token cannot access it." };
      }
      if (response.status === 429) {
        return { ok: false, error: "GitHub rate limit reached. Try again later." };
      }
      return { ok: false, error: `GitHub returned ${response.status}. The repository was not deleted.` };
    }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? "GitHub took too long to respond. The repository was not deleted."
        : "Could not reach GitHub. The repository was not deleted.",
    };
  }

  // Clear matching repository links so project cards do not point at a deleted repository.
  const db = await getDb();
  const rows = await db
    .select({ id: projects.id, repositoryUrl: projects.repositoryUrl })
    .from(projects)
    .where(eq(projects.userId, viewer.id));
  for (const project of rows) {
    const ref = parseGitHubRepo(project.repositoryUrl);
    if (ref && ref.fullName.toLowerCase() === fullName.toLowerCase()) {
      await db.update(projects).set({ repositoryUrl: null, updatedAt: new Date() }).where(eq(projects.id, project.id));
    }
  }

  revalidatePath("/github");
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true, message: `GitHub repository ${fullName} was deleted.` };
}

