"use server";

import { createClient } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { profiles, tickets, trackerFiles } from "@/lib/db/schema";
import { isSupabaseAuthEnabled } from "@/lib/auth";
import { assertAdmin } from "@/lib/auth/admin";
import { deleteStoredFile } from "@/lib/storage";
import {
  deleteUserSchema,
  ticketReplySchema,
  userRoleSchema,
  userStatusSchema,
} from "@/lib/validation/admin";

export type AdminActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

function supabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function refreshAdmin() {
  revalidatePath("/admin");
  revalidatePath("/support");
  revalidatePath("/dashboard");
}

/* -------------------------------------------------------------------------- */
/* User support tickets                                                       */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Admin: tickets                                                             */
/* -------------------------------------------------------------------------- */

export async function replyTicketAction(input: unknown): Promise<AdminActionResult> {
  const admin = await assertAdmin();
  const parsed = ticketReplySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the reply." };
  }

  const reply = parsed.data.reply?.trim() ?? "";
  if (parsed.data.status === "resolved" && reply === "") {
    return { ok: false, error: "Write a reply before resolving the ticket." };
  }

  const db = await getDb();
  const existing = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, parsed.data.ticketId))
    .limit(1);
  if (!existing[0]) return { ok: false, error: "That ticket no longer exists." };

  await db
    .update(tickets)
    .set({
      status: parsed.data.status,
      adminReply: reply === "" ? null : reply,
      repliedAt: reply === "" ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, parsed.data.ticketId));

  refreshAdmin();
  revalidatePath(`/admin?tab=tickets`);
  return {
    ok: true,
    message: `Ticket ${parsed.data.status === "open" ? "reopened" : `marked ${parsed.data.status.replace("_", " ")}`} by ${admin.displayName}.`,
  };
}

export async function deleteTicketAction(input: unknown): Promise<AdminActionResult> {
  await assertAdmin();
  const parsed = ticketReplySchema.pick({ ticketId: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid ticket." };

  const db = await getDb();
  await db.delete(tickets).where(eq(tickets.id, parsed.data.ticketId));
  refreshAdmin();
  return { ok: true, message: "Ticket deleted." };
}

/* -------------------------------------------------------------------------- */
/* Admin: users                                                               */
/* -------------------------------------------------------------------------- */

async function adminCount() {
  const db = await getDb();
  const rows = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.role, "admin"));
  return rows.length;
}

export async function setUserRoleAction(input: unknown): Promise<AdminActionResult> {
  const admin = await assertAdmin();
  const parsed = userRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose a valid role." };
  }
  if (parsed.data.userId === admin.id && parsed.data.role !== "admin") {
    return { ok: false, error: "You cannot remove your own administrator role." };
  }

  const db = await getDb();
  const target = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  if (!target[0]) return { ok: false, error: "That user no longer exists." };

  if (target[0].role === "admin" && parsed.data.role === "user") {
    const admins = await adminCount();
    if (admins <= 1) return { ok: false, error: "At least one administrator must remain." };
  }

  await db
    .update(profiles)
    .set({ role: parsed.data.role, updatedAt: new Date() })
    .where(eq(profiles.id, parsed.data.userId));

  refreshAdmin();
  return {
    ok: true,
    message:
      parsed.data.role === "admin"
        ? "Administrator access granted."
        : "Administrator access removed.",
  };
}

export async function setUserStatusAction(input: unknown): Promise<AdminActionResult> {
  const admin = await assertAdmin();
  const parsed = userStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Choose a valid account status." };
  }
  if (parsed.data.userId === admin.id) {
    return { ok: false, error: "You cannot suspend your own account." };
  }

  const db = await getDb();
  const target = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  if (!target[0]) return { ok: false, error: "That user no longer exists." };

  await db
    .update(profiles)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(profiles.id, parsed.data.userId));

  if (isSupabaseAuthEnabled()) {
    const client = supabaseAdminClient();
    if (client) {
      await client.auth.admin
        .updateUserById(parsed.data.userId, {
          ban_duration: parsed.data.status === "suspended" ? "876000h" : "none",
        })
        .catch(() => {});
    }
  }

  refreshAdmin();
  return {
    ok: true,
    message:
      parsed.data.status === "suspended"
        ? "Account suspended. The user is signed out on their next request."
        : "Account reactivated.",
  };
}

export async function deleteUserAction(input: unknown): Promise<AdminActionResult> {
  const admin = await assertAdmin();
  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Type DELETE to confirm." };
  if (parsed.data.confirmation !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm." };
  }
  if (parsed.data.userId === admin.id) {
    return { ok: false, error: "Use Settings → Account to delete your own account." };
  }

  const db = await getDb();
  const target = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, parsed.data.userId)))
    .limit(1);
  if (!target[0]) return { ok: false, error: "That user no longer exists." };

  if (isSupabaseAuthEnabled()) {
    const client = supabaseAdminClient();
    if (!client) {
      return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is required to delete accounts." };
    }
    const { error } = await client.auth.admin.deleteUser(parsed.data.userId);
    if (error) return { ok: false, error: "Could not delete the authentication account." };
  }

  const files = await db
    .select({ storagePath: trackerFiles.storagePath })
    .from(trackerFiles)
    .where(eq(trackerFiles.userId, parsed.data.userId));
  for (const file of files) {
    if (file.storagePath) await deleteStoredFile(file.storagePath).catch(() => {});
  }

  await db.delete(profiles).where(eq(profiles.id, parsed.data.userId));
  refreshAdmin();
  return { ok: true, message: "User and all owned records deleted." };
}

