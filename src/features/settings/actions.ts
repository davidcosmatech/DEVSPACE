"use server";

import { createClient } from "@supabase/supabase-js";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  createSupabaseServerClient,
  isSupabaseAuthEnabled,
  requireViewer,
} from "@/lib/auth";
import { verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { localAccounts, profiles, trackerFiles, userSettings } from "@/lib/db/schema";
import { deleteStoredFile } from "@/lib/storage";
import {
  appearanceSchema,
  deleteAccountSchema,
  profileSchema,
} from "@/lib/validation/settings";

export type SettingsActionResult = { ok: boolean; error?: string; message?: string };

export async function updateProfileAction(input: unknown): Promise<SettingsActionResult> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your profile details." };
  }

  const db = await getDb();
  const conflict = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.username, parsed.data.username), ne(profiles.id, viewer.id)))
    .limit(1);
  if (conflict[0]) return { ok: false, error: "That username is already taken." };

  try {
    await db
      .update(profiles)
      .set({
        displayName: parsed.data.displayName,
        username: parsed.data.username,
        bio: parsed.data.bio,
        avatarUrl: parsed.data.avatarUrl || null,
        githubUsername: parsed.data.githubUsername?.replace(/^@/, "") || null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, viewer.id));
  } catch {
    return { ok: false, error: "Could not save your profile. The username may be taken." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/github");
  return { ok: true, message: "Profile saved." };
}

export async function updateAppearanceAction(input: unknown): Promise<SettingsActionResult> {
  const viewer = await requireViewer();
  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose valid appearance settings." };
  }

  const db = await getDb();
  await db
    .update(userSettings)
    .set({ theme: parsed.data.theme, language: parsed.data.language, updatedAt: new Date() })
    .where(eq(userSettings.userId, viewer.id));

  const store = await cookies();
  store.set("devspace_theme", parsed.data.theme, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 31_536_000,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Appearance saved." };
}

export async function persistThemeAction(theme: "dark" | "light") {
  const viewer = await requireViewer();
  const db = await getDb();
  await db
    .update(userSettings)
    .set({ theme, updatedAt: new Date() })
    .where(eq(userSettings.userId, viewer.id));
  return { ok: true };
}

export async function deleteAccountAction(input: unknown): Promise<SettingsActionResult> {
  const viewer = await requireViewer();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confirm account deletion." };
  }
  if (parsed.data.confirmation !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm account deletion." };
  }

  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Authentication is not configured." };
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: viewer.email,
      password: parsed.data.password,
    });
    if (signInError) return { ok: false, error: "That password is incorrect." };

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !url) {
      return {
        ok: false,
        error: "Account deletion requires SUPABASE_SERVICE_ROLE_KEY on the server.",
      };
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.auth.admin.deleteUser(viewer.id);
    if (error) return { ok: false, error: "Could not delete the authentication account." };

    const db = await getDb();
    await db.delete(profiles).where(eq(profiles.id, viewer.id));
    await clearSessionCookie();
    return { ok: true, message: "Account deleted." };
  }

  const db = await getDb();
  const accounts = await db
    .select()
    .from(localAccounts)
    .where(eq(localAccounts.id, viewer.id))
    .limit(1);
  const account = accounts[0];
  if (!account || !(await verifyPassword(parsed.data.password, account.passwordHash))) {
    return { ok: false, error: "That password is incorrect." };
  }

  const files = await db
    .select({ storagePath: trackerFiles.storagePath })
    .from(trackerFiles)
    .where(eq(trackerFiles.userId, viewer.id));
  for (const file of files) {
    if (file.storagePath) await deleteStoredFile(file.storagePath).catch(() => {});
  }

  await db.delete(profiles).where(eq(profiles.id, viewer.id));
  await clearSessionCookie();
  return { ok: true, message: "Account deleted." };
}
