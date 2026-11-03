"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { workspaceLinks, workspaces } from "@/lib/db/schema";
import { normalizeUrl } from "@/lib/utils";
import { workspaceLinkSchema, workspaceSchema } from "@/lib/validation/workspace";

export type WorkspaceActionResult = { ok: boolean; error?: string; id?: string };

function revalidate() {
  revalidatePath("/workspaces");
  revalidatePath("/dashboard");
}

export async function createWorkspaceAction(input: unknown): Promise<WorkspaceActionResult> {
  const viewer = await requireViewer();
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the workspace details." };
  }
  const db = await getDb();
  const [created] = await db
    .insert(workspaces)
    .values({ userId: viewer.id, ...parsed.data })
    .returning({ id: workspaces.id });
  revalidate();
  return { ok: true, id: created.id };
}

export async function updateWorkspaceAction(
  id: string,
  input: unknown,
): Promise<WorkspaceActionResult> {
  const viewer = await requireViewer();
  const parsed = workspaceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the workspace details." };
  }
  const db = await getDb();
  const [updated] = await db
    .update(workspaces)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, viewer.id)))
    .returning({ id: workspaces.id });
  if (!updated) return { ok: false, error: "Workspace not found." };
  revalidate();
  return { ok: true, id: updated.id };
}

export async function deleteWorkspaceAction(id: string): Promise<WorkspaceActionResult> {
  const viewer = await requireViewer();
  const db = await getDb();
  const [deleted] = await db
    .delete(workspaces)
    .where(and(eq(workspaces.id, id), eq(workspaces.userId, viewer.id)))
    .returning({ id: workspaces.id });
  if (!deleted) return { ok: false, error: "Workspace not found." };
  revalidate();
  return { ok: true };
}

export async function createWorkspaceLinkAction(input: unknown): Promise<WorkspaceActionResult> {
  const viewer = await requireViewer();
  const parsed = workspaceLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the link details." };
  }
  const normalized = normalizeUrl(parsed.data.url);
  if (!normalized) return { ok: false, error: "Enter a valid http(s) URL." };

  const db = await getDb();
  const owned = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, parsed.data.workspaceId), eq(workspaces.userId, viewer.id)))
    .limit(1);
  if (!owned[0]) return { ok: false, error: "Workspace not found." };

  const [created] = await db
    .insert(workspaceLinks)
    .values({
      workspaceId: parsed.data.workspaceId,
      userId: viewer.id,
      title: parsed.data.title,
      url: normalized,
      category: parsed.data.category,
    })
    .returning({ id: workspaceLinks.id });
  revalidate();
  return { ok: true, id: created.id };
}

export async function updateWorkspaceLinkAction(
  id: string,
  input: unknown,
): Promise<WorkspaceActionResult> {
  const viewer = await requireViewer();
  const parsed = workspaceLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the link details." };
  }
  const normalized = normalizeUrl(parsed.data.url);
  if (!normalized) return { ok: false, error: "Enter a valid http(s) URL." };

  const db = await getDb();
  const owned = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, parsed.data.workspaceId), eq(workspaces.userId, viewer.id)))
    .limit(1);
  if (!owned[0]) return { ok: false, error: "Workspace not found." };

  const [updated] = await db
    .update(workspaceLinks)
    .set({
      workspaceId: parsed.data.workspaceId,
      title: parsed.data.title,
      url: normalized,
      category: parsed.data.category,
    })
    .where(and(eq(workspaceLinks.id, id), eq(workspaceLinks.userId, viewer.id)))
    .returning({ id: workspaceLinks.id });
  if (!updated) return { ok: false, error: "Link not found." };
  revalidate();
  return { ok: true, id: updated.id };
}

export async function deleteWorkspaceLinkAction(id: string): Promise<WorkspaceActionResult> {
  const viewer = await requireViewer();
  const db = await getDb();
  const [deleted] = await db
    .delete(workspaceLinks)
    .where(and(eq(workspaceLinks.id, id), eq(workspaceLinks.userId, viewer.id)))
    .returning({ id: workspaceLinks.id });
  if (!deleted) return { ok: false, error: "Link not found." };
  revalidate();
  return { ok: true };
}
