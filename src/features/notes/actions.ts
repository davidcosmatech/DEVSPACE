"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { noteSchema } from "@/lib/validation/note";

export type NoteActionResult = {
  ok: boolean;
  error?: string;
  note?: { id: string; updatedAt: string };
};

export async function createNoteAction(): Promise<NoteActionResult> {
  const viewer = await authorize("content.manage");
  const db = await getDb();
  const [created] = await db
    .insert(notes)
    .values({
      userId: viewer.id,
      title: "Untitled note",
      content: "",
      category: "General",
      isPinned: false,
    })
    .returning({ id: notes.id, updatedAt: notes.updatedAt });

  revalidatePath("/dashboard");
  revalidatePath("/notes");
  return { ok: true, note: { id: created.id, updatedAt: created.updatedAt.toISOString() } };
}

export async function updateNoteAction(id: string, input: unknown): Promise<NoteActionResult> {
  const viewer = await authorize("content.manage");
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the note." };
  }

  const db = await getDb();
  const [updated] = await db
    .update(notes)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, viewer.id)))
    .returning({ id: notes.id, updatedAt: notes.updatedAt });

  if (!updated) return { ok: false, error: "Note not found." };
  return { ok: true, note: { id: updated.id, updatedAt: updated.updatedAt.toISOString() } };
}

export async function deleteNoteAction(id: string): Promise<NoteActionResult> {
  const viewer = await authorize("content.manage");
  const db = await getDb();
  const [deleted] = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, viewer.id)))
    .returning({ id: notes.id });

  if (!deleted) return { ok: false, error: "Note not found." };
  revalidatePath("/dashboard");
  revalidatePath("/notes");
  return { ok: true };
}

