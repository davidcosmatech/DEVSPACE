"use server";

import { createClient } from "@supabase/supabase-js";
import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/lib/db";
import { auditLogs, localAccounts, profiles, roles, tickets, trackerFiles } from "@/lib/db/schema";
import { createSupabaseServerClient, isSupabaseAuthEnabled, type Viewer } from "@/lib/auth";
import { authorize, getViewerRole } from "@/lib/auth/rbac";
import {
  canDeleteRole,
  canModifyUser,
  isValidRoleKey,
  normalizePermissions,
  slugifyRoleKey,
  type RoleLike,
} from "@/lib/rbac";
import { deleteStoredFile } from "@/lib/storage";
import {
  adminEmailSchema,
  adminProfileSchema,
  createRoleSchema,
  deleteRoleSchema,
  deleteUserSchema,
  ticketReplySchema,
  updateRoleSchema,
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

async function writeAudit(
  actor: Viewer,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown>,
) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    targetType,
    targetId,
    details,
  });
}

async function ownerCount() {
  const db = await getDb();
  const rows = await db.select({ value: count() }).from(profiles).where(eq(profiles.role, "owner"));
  return Number(rows[0]?.value ?? 0);
}

/* -------------------------------------------------------------------------- */
/* Support tickets                                                            */
/* -------------------------------------------------------------------------- */

export async function replyTicketAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("support.manage");
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
    .select({ id: tickets.id, status: tickets.status })
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

  await writeAudit(actor, "ticket.replied", "ticket", parsed.data.ticketId, {
    from: existing[0].status,
    to: parsed.data.status,
    replied: reply !== "",
  });

  refreshAdmin();
  return {
    ok: true,
    message: `Ticket ${parsed.data.status === "open" ? "reopened" : `marked ${parsed.data.status.replace("_", " ")}`} by ${actor.displayName}.`,
  };
}

export async function deleteTicketAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("support.manage");
  const parsed = ticketReplySchema.pick({ ticketId: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid ticket." };

  const db = await getDb();
  await db.delete(tickets).where(eq(tickets.id, parsed.data.ticketId));
  await writeAudit(actor, "ticket.deleted", "ticket", parsed.data.ticketId, {});
  refreshAdmin();
  return { ok: true, message: "Ticket deleted." };
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export async function setUserRoleAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("roles.manage");
  const parsed = userRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a valid role." };
  }

  const db = await getDb();
  const targetRows = await db
    .select({ id: profiles.id, role: profiles.role, email: profiles.email, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "That user no longer exists." };

  const roleRows = await db
    .select({ key: roles.key })
    .from(roles)
    .where(eq(roles.key, parsed.data.roleKey))
    .limit(1);
  if (!roleRows[0]) return { ok: false, error: "That role no longer exists." };

  const actorRole = await getViewerRole(actor);
  const targetRole: RoleLike = { key: target.role };
  const lastOwner = target.role === "owner" ? (await ownerCount()) <= 1 : false;

  const guard = canModifyUser({
    action: "role",
    actorId: actor.id,
    actorRole,
    targetId: target.id,
    targetRole,
    targetIsLastOwner: lastOwner,
    nextRoleKey: parsed.data.roleKey,
  });
  if (!guard.allowed) return { ok: false, error: guard.reason };

  await db
    .update(profiles)
    .set({ role: parsed.data.roleKey, updatedAt: new Date() })
    .where(eq(profiles.id, target.id));

  await writeAudit(actor, "user.role_changed", "user", target.id, {
    from: target.role,
    to: parsed.data.roleKey,
    email: target.email,
    username: target.username,
  });

  refreshAdmin();
  return { ok: true, message: `Role changed to ${parsed.data.roleKey}.` };
}

export async function setUserStatusAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("users.manage");
  const parsed = userStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a valid account status." };
  }

  const db = await getDb();
  const targetRows = await db
    .select({ id: profiles.id, role: profiles.role, status: profiles.status, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "That user no longer exists." };

  const actorRole = await getViewerRole(actor);
  const lastOwner = target.role === "owner" ? (await ownerCount()) <= 1 : false;
  const guard = canModifyUser({
    action: "status",
    actorId: actor.id,
    actorRole,
    targetId: target.id,
    targetRole: { key: target.role },
    targetIsLastOwner: lastOwner,
    nextStatus: parsed.data.status,
  });
  if (!guard.allowed) return { ok: false, error: guard.reason };

  await db
    .update(profiles)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(profiles.id, target.id));

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

  await writeAudit(actor, "user.status_changed", "user", target.id, {
    from: target.status,
    to: parsed.data.status,
    email: target.email,
  });

  refreshAdmin();
  return {
    ok: true,
    message:
      parsed.data.status === "suspended"
        ? "Account suspended. The user is signed out on their next request."
        : "Account reactivated.",
  };
}

export async function updateUserProfileAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("users.manage");
  const parsed = adminProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the profile details." };
  }

  const db = await getDb();
  const targetRows = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      username: profiles.username,
      githubUsername: profiles.githubUsername,
    })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "That user no longer exists." };

  const duplicate = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.username, parsed.data.username))
    .limit(1);
  if (duplicate[0] && duplicate[0].id !== target.id) {
    return { ok: false, error: "That username is already taken." };
  }

  const githubUsername = parsed.data.githubUsername?.replace(/^@/, "") || null;
  await db
    .update(profiles)
    .set({
      displayName: parsed.data.displayName,
      username: parsed.data.username,
      bio: parsed.data.bio,
      githubUsername,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, target.id));

  await writeAudit(actor, "user.profile_updated", "user", target.id, {
    displayName: { from: target.displayName, to: parsed.data.displayName },
    username: { from: target.username, to: parsed.data.username },
    githubUsername: { from: target.githubUsername, to: githubUsername },
  });

  refreshAdmin();
  return { ok: true, message: "Profile updated." };
}

/**
 * Updates the Supabase Auth login email without changing the Auth UUID, so the
 * profile and every owned record stay attached. The service-role key never
 * leaves the server; only administrators with `users.manage` can call this.
 */
export async function updateUserEmailAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("users.manage");
  const parsed = adminEmailSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  const email = parsed.data.email;
  const db = await getDb();
  const targetRows = await db
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "That user no longer exists." };

  const conflict = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
  if (conflict[0] && conflict[0].id !== target.id) {
    return { ok: false, error: "That email address is already used by another account." };
  }

  if (isSupabaseAuthEnabled()) {
    const client = supabaseAdminClient();
    if (!client) {
      return {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY is required on the server to change login emails.",
      };
    }

    const authUser = await client.auth.admin.getUserById(target.id);
    if (authUser.error || !authUser.data.user) {
      return { ok: false, error: "The Supabase Auth account could not be loaded." };
    }

    if (authUser.data.user.email !== email) {
      const { error } = await client.auth.admin.updateUserById(target.id, {
        email,
        // Custom SMTP is not configured, so the new address is confirmed by the
        // admin operation. Set this to false to send a verification email once
        // SMTP and the Auth URL configuration are in place.
        email_confirm: true,
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
          return { ok: false, error: "That email address is already registered in Supabase Auth." };
        }
        return { ok: false, error: error.message };
      }
    }
  } else {
    const localConflict = await db
      .select({ id: localAccounts.id })
      .from(localAccounts)
      .where(eq(localAccounts.email, email))
      .limit(1);
    if (localConflict[0] && localConflict[0].id !== target.id) {
      return { ok: false, error: "That email address is already used by another account." };
    }
    await db.update(localAccounts).set({ email }).where(eq(localAccounts.id, target.id));
  }

  await db
    .update(profiles)
    .set({ email, updatedAt: new Date() })
    .where(eq(profiles.id, target.id));

  await writeAudit(actor, "user.email_changed", "user", target.id, {
    from: target.email,
    to: email,
  });

  let sessionRefreshed = false;
  if (actor.id === target.id && isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.refreshSession();
      sessionRefreshed = !error;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return {
    ok: true,
    message:
      sessionRefreshed
        ? `Login email updated to ${email}. Your session was refreshed.`
        : `Login email updated to ${email}.${actor.id === target.id ? " Sign in again if your session shows the old address." : ""}`,
  };
}

export async function deleteUserAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("users.manage");
  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Type DELETE to confirm." };
  if (parsed.data.confirmation !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };

  const db = await getDb();
  const targetRows = await db
    .select({ id: profiles.id, role: profiles.role, email: profiles.email, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.id, parsed.data.userId))
    .limit(1);
  const target = targetRows[0];
  if (!target) return { ok: false, error: "That user no longer exists." };

  const actorRole = await getViewerRole(actor);
  const lastOwner = target.role === "owner" ? (await ownerCount()) <= 1 : false;
  const guard = canModifyUser({
    action: "delete",
    actorId: actor.id,
    actorRole,
    targetId: target.id,
    targetRole: { key: target.role },
    targetIsLastOwner: lastOwner,
  });
  if (!guard.allowed) return { ok: false, error: guard.reason };

  if (isSupabaseAuthEnabled()) {
    const client = supabaseAdminClient();
    if (!client) {
      return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is required to delete accounts." };
    }
    const { error } = await client.auth.admin.deleteUser(target.id);
    if (error) return { ok: false, error: "Could not delete the authentication account." };
  }

  const files = await db
    .select({ storagePath: trackerFiles.storagePath })
    .from(trackerFiles)
    .where(eq(trackerFiles.userId, target.id));
  for (const file of files) {
    if (file.storagePath) await deleteStoredFile(file.storagePath).catch(() => {});
  }

  await db.delete(profiles).where(eq(profiles.id, target.id));
  await writeAudit(actor, "user.deleted", "user", target.id, {
    email: target.email,
    username: target.username,
    role: target.role,
  });

  refreshAdmin();
  return { ok: true, message: "User and all owned records deleted." };
}

/* -------------------------------------------------------------------------- */
/* Roles                                                                      */
/* -------------------------------------------------------------------------- */

export async function createRoleAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("roles.manage");
  const parsed = createRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the role details." };
  }

  const rawKey = parsed.data.key?.trim() || slugifyRoleKey(parsed.data.name);
  if (!isValidRoleKey(rawKey)) {
    return { ok: false, error: "The generated role key is not valid. Use a different name." };
  }

  const db = await getDb();
  const existing = await db.select({ key: roles.key }).from(roles).where(eq(roles.key, rawKey)).limit(1);
  if (existing[0]) return { ok: false, error: "A role with that key already exists." };

  await db.insert(roles).values({
    key: rawKey,
    name: parsed.data.name,
    description: parsed.data.description,
    permissions: normalizePermissions(parsed.data.permissions),
    isSystem: false,
  });

  await writeAudit(actor, "role.created", "role", rawKey, {
    name: parsed.data.name,
    permissions: parsed.data.permissions,
  });
  refreshAdmin();
  return { ok: true, message: "Role created." };
}

export async function updateRoleAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("roles.manage");
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the role details." };
  }

  const db = await getDb();
  const existingRows = await db.select().from(roles).where(eq(roles.key, parsed.data.key)).limit(1);
  const existing = existingRows[0];
  if (!existing) return { ok: false, error: "That role no longer exists." };
  if (existing.key === "owner") {
    return { ok: false, error: "The Owner role always keeps every permission and cannot be edited." };
  }

  await db
    .update(roles)
    .set({
      name: parsed.data.name,
      description: parsed.data.description,
      permissions: normalizePermissions(parsed.data.permissions),
      updatedAt: new Date(),
    })
    .where(eq(roles.key, parsed.data.key));

  await writeAudit(actor, "role.updated", "role", parsed.data.key, {
    name: { from: existing.name, to: parsed.data.name },
    permissions: { from: existing.permissions, to: parsed.data.permissions },
  });
  refreshAdmin();
  return { ok: true, message: "Role updated." };
}

export async function deleteRoleAction(input: unknown): Promise<AdminActionResult> {
  const actor = await authorize("roles.manage");
  const parsed = deleteRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a valid role." };

  const db = await getDb();
  const existingRows = await db.select().from(roles).where(eq(roles.key, parsed.data.key)).limit(1);
  const existing = existingRows[0];
  if (!existing) return { ok: false, error: "That role no longer exists." };

  const assignedRows = await db
    .select({ value: count() })
    .from(profiles)
    .where(eq(profiles.role, parsed.data.key));
  const assigned = Number(assignedRows[0]?.value ?? 0);

  const guard = canDeleteRole(existing, assigned);
  if (!guard.allowed) return { ok: false, error: guard.reason };

  await db.delete(roles).where(eq(roles.key, parsed.data.key));
  await writeAudit(actor, "role.deleted", "role", parsed.data.key, { name: existing.name });
  refreshAdmin();
  return { ok: true, message: "Role deleted." };
}

