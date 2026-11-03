"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects, workspaces } from "@/lib/db/schema";
import {
  bulkProjectPatchSchema,
  projectSchema,
  type ProjectInput,
} from "@/lib/validation/project";

export type ProjectActionResult = { ok: boolean; error?: string; id?: string };

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
  const viewer = await requireViewer();
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
  const viewer = await requireViewer();
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
  const viewer = await requireViewer();
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

export async function deleteProjectAction(id: string): Promise<ProjectActionResult> {
  const viewer = await requireViewer();
  const db = await getDb();
  const [deleted] = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, viewer.id)))
    .returning({ id: projects.id });

  if (!deleted) return { ok: false, error: "Project not found." };
  revalidate();
  return { ok: true };
}
