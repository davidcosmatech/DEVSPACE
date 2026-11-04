"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { trackerFiles } from "@/lib/db/schema";
import { deleteStoredFile } from "@/lib/storage";

export async function deleteTrackerFileAction(id: string) {
  const viewer = await authorize("content.manage");
  const db = await getDb();
  const rows = await db
    .select()
    .from(trackerFiles)
    .where(and(eq(trackerFiles.id, id), eq(trackerFiles.userId, viewer.id)))
    .limit(1);

  const file = rows[0];
  if (!file) return { ok: false, error: "Tracked file not found." };

  if (file.storagePath) {
    await deleteStoredFile(file.storagePath).catch(() => {});
  }

  await db
    .delete(trackerFiles)
    .where(and(eq(trackerFiles.id, id), eq(trackerFiles.userId, viewer.id)));

  revalidatePath("/tracker");
  revalidatePath("/dashboard");
  return { ok: true };
}

