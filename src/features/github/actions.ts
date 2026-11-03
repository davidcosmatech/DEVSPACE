"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { githubUsernameSchema } from "@/lib/validation/github";

export type GitHubActionResult = { ok: boolean; error?: string; username?: string | null };

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
