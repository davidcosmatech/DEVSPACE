"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { authorize, getViewerRole } from "@/lib/auth/rbac";
import { getGitHubDeleteOwner, githubDeleteToken } from "@/lib/github-delete";
import { parseGitHubRepo } from "@/lib/github-repo";
import { getDb } from "@/lib/db";
import { projects, workspaces } from "@/lib/db/schema";
import {
  bulkProjectPatchSchema,
  deleteGitHubRepoSchema,
  projectSchema,
  type ProjectInput,
} from "@/lib/validation/project";

export type ProjectActionResult = { ok: boolean; error?: string; id?: string; message?: string };

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/workspaces");
}

function normalizeWorkspaceId(value: ProjectInput["workspaceId"]) {
  return value && value.length > 0 ? value : null;
}

async function assertWorkspaceOwnership(userId: string, workspaceId: string | null) {
  if (!workspaceId) return true;
  const db = await getDb();
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function createProjectAction(input: unknown): Promise<ProjectActionResult> {
  const viewer = await authorize("content.manage");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the project details." };
  }

  const workspaceId = normalizeWorkspaceId(parsed.data.workspaceId);
  if (!(await assertWorkspaceOwnership(viewer.id, workspaceId))) {
    return { ok: false, error: "Workspace not found." };
  }

  const db = await getDb();
  try {
    const [created] = await db
      .insert(projects)
      .values({
        userId: viewer.id,
        ...parsed.data,
        workspaceId,
        repositoryUrl: parsed.data.repositoryUrl || null,
      })
      .returning({ id: projects.id });
    revalidate();
    return { ok: true, id: created.id };
  } catch {
    return { ok: false, error: "Could not create the project. Please try again." };
  }
}

export async function updateProjectAction(id: string, input: unknown): Promise<ProjectActionResult> {
  const viewer = await authorize("content.manage");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the project details." };
  }

  const workspaceId = normalizeWorkspaceId(parsed.data.workspaceId);
  if (!(await assertWorkspaceOwnership(viewer.id, workspaceId))) {
    return { ok: false, error: "Workspace not found." };
  }

  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({
      ...parsed.data,
      workspaceId,
      repositoryUrl: parsed.data.repositoryUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, viewer.id)))
    .returning({ id: projects.id });

  if (!updated) return { ok: false, error: "Project not found." };
  revalidate();
  return { ok: true, id: updated.id };
}

export async function bulkUpdateProjectsAction(input: unknown): Promise<ProjectActionResult> {
  const viewer = await authorize("content.manage");
  const parsed = bulkProjectPatchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Select projects first." };
  }

  const { ids, visibility, workspaceId } = parsed.data;
  if (visibility === undefined && workspaceId === undefined) {
    return { ok: false, error: "Choose a visibility or workspace to apply." };
  }
  if (workspaceId !== undefined && workspaceId !== null) {
    if (!(await assertWorkspaceOwnership(viewer.id, workspaceId))) {
      return { ok: false, error: "Workspace not found." };
    }
  }

  const db = await getDb();
  const updated = await db
    .update(projects)
    .set({
      ...(visibility ? { visibility } : {}),
      ...(workspaceId !== undefined ? { workspaceId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.userId, viewer.id), inArray(projects.id, ids)))
    .returning({ id: projects.id });

  if (updated.length === 0) return { ok: false, error: "No projects were updated." };
  revalidate();
  return { ok: true };
}

/**
 * Deletes the real GitHub repository referenced by a project. This is a
 * separate, explicitly confirmed operation; deleting a project from DEVSPACE
 * never calls it. The token is read from the server environment only.
 */
export async function deleteGitHubRepoAction(input: unknown): Promise<ProjectActionResult> {
  const viewer = await authorize("content.manage");
  const parsed = deleteGitHubRepoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the confirmation." };
  }

  const db = await getDb();
  const rows = await db
    .select({ id: projects.id, name: projects.name, repositoryUrl: projects.repositoryUrl })
    .from(projects)
    .where(and(eq(projects.id, parsed.data.projectId), eq(projects.userId, viewer.id)))
    .limit(1);
  const project = rows[0];
  if (!project) return { ok: false, error: "Project not found." };

  const repo = parseGitHubRepo(project.repositoryUrl);
  if (!repo) return { ok: false, error: "This project is not linked to a valid GitHub repository." };
  if (parsed.data.confirmation.trim().toLowerCase() !== repo.fullName.toLowerCase()) {
    return { ok: false, error: `Type ${repo.fullName} to confirm.` };
  }

  const viewerRole = await getViewerRole(viewer);
  if (viewerRole?.key !== "owner") {
    return { ok: false, error: "Only the workspace Owner can delete GitHub repositories." };
  }

  const token = githubDeleteToken();
  const tokenOwner = await getGitHubDeleteOwner();
  if (!token || !tokenOwner) {
    return {
      ok: false,
      error: "Deleting GitHub repositories is not configured on this server.",
    };
  }
  if (tokenOwner.toLowerCase() !== repo.owner.toLowerCase()) {
    return { ok: false, error: "The server GitHub token cannot delete this repository." };
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}`, {
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

    if (response.status === 204) {
      await db
        .update(projects)
        .set({ repositoryUrl: null, updatedAt: new Date() })
        .where(and(eq(projects.id, project.id), eq(projects.userId, viewer.id)));
      revalidate();
      return {
        ok: true,
        id: project.id,
        message: `GitHub repository ${repo.fullName} was deleted. The DEVSPACE project was kept.`,
      };
    }

    if (response.status === 401) {
      return { ok: false, error: "The GitHub token is invalid or expired." };
    }
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
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? "GitHub took too long to respond. The repository was not deleted."
        : "Could not reach GitHub. The repository was not deleted.",
    };
  }
}
export async function deleteProjectAction(id: string): Promise<ProjectActionResult> {
  const viewer = await authorize("content.manage");
  const db = await getDb();
  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, viewer.id)))
    .returning({ id: projects.id });

  if (!deleted) return { ok: false, error: "Project not found." };
  revalidate();
  return { ok: true };
}



