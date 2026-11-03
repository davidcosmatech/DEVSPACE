"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { projectSchema } from "@/lib/validation/project";

export type ProjectActionResult = { ok: boolean; error?: string; id?: string };

function revalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
}

export async function createProjectAction(input: unknown): Promise<ProjectActionResult> {
  const viewer = await requireViewer();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the project details." };
  }

  const db = await getDb();
  try {
    const [created] = await db
      .insert(projects)
      .values({
        userId: viewer.id,
        ...parsed.data,
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

  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ ...parsed.data, repositoryUrl: parsed.data.repositoryUrl || null, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, viewer.id)))
    .returning({ id: projects.id });

  if (!updated) return { ok: false, error: "Project not found." };
  revalidate();
  return { ok: true, id: updated.id };
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
