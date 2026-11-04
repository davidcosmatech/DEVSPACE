"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { getDb, isLocalMode } from "@/lib/db";
import { localAccounts, passwordResets, profiles, userSettings } from "@/lib/db/schema";
import {
  createSupabaseServerClient,
  isSupabaseAuthEnabled,
  supabasePublicKey,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export type AuthActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  resetUrl?: string;
  requiresConfirmation?: boolean;
};

const GENERIC_LOGIN_ERROR = "Email or password is incorrect.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAction(input: unknown): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Authentication is not configured." };
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const db = await getDb();
  const rows = await db
    .select({
      id: localAccounts.id,
      passwordHash: localAccounts.passwordHash,
      sessionVersion: localAccounts.sessionVersion,
    })
    .from(localAccounts)
    .where(eq(localAccounts.email, parsed.data.email))
    .limit(1);

  const account = rows[0];
  if (!account || !(await verifyPassword(parsed.data.password, account.passwordHash))) {
    return { ok: false, error: GENERIC_LOGIN_ERROR };
  }

  const accountProfile = await db
    .select({ status: profiles.status })
    .from(profiles)
    .where(eq(profiles.id, account.id))
    .limit(1);
  if (accountProfile[0]?.status === "suspended") {
    return {
      ok: false,
      error: "This account is suspended. Contact the workspace administrator.",
    };
  }

  await setSessionCookie(account.id, account.sessionVersion);
  return { ok: true };
}

export async function registerAction(input: unknown): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }
  const { displayName, username, email, password } = parsed.data;

  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Authentication is not configured." };

    if (process.env.SUPABASE_SKIP_EMAIL_CONFIRMATION === "true") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) {
        return {
          ok: false,
          error: "Registration is not configured. The server is missing Supabase admin credentials.",
        };
      }

      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName, username },
      });

      if (createError) {
        if (/already|registered|exists/i.test(createError.message)) {
          return { ok: false, error: "An account with that email already exists. Sign in instead." };
        }
        if (createError.status === 429) {
          return { ok: false, error: "Supabase is temporarily limiting auth requests. Try again shortly." };
        }
        return { ok: false, error: createError.message };
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        return {
          ok: false,
          error: "Your account was created, but automatic sign-in failed. Sign in with your credentials.",
        };
      }
      return { ok: true };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, username },
        emailRedirectTo: await callbackUrl("/dashboard"),
      },
    });
    if (error) {
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        return {
          ok: false,
          error: "Email sending is temporarily limited by Supabase. Try again later or use another sign-in method.",
        };
      }
      return { ok: false, error: error.message };
    }

    if (!data.session) {
      return {
        ok: true,
        message: "Check your inbox to confirm your email, then sign in.",
        requiresConfirmation: true,
      };
    }
    return { ok: true };
  }

  const db = await getDb();
  const existingEmail = await db
    .select({ id: localAccounts.id })
    .from(localAccounts)
    .where(eq(localAccounts.email, email))
    .limit(1);
  if (existingEmail.length > 0) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const existingUsername = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);
  if (existingUsername.length > 0) {
    return { ok: false, error: "That username is already taken." };
  }

  const passwordHash = await hashPassword(password);
  const id = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(profiles).values({
        id,
        username,
        displayName,
        bio: "",
        avatarUrl: null,
        githubUsername: null,
      });
      await tx.insert(localAccounts).values({
        id,
        email,
        passwordHash,
        sessionVersion: 0,
      });
      await tx.insert(userSettings).values({
        userId: id,
        theme: "dark",
        language: "en",
        preferences: {
          emailDigest: true,
          compactSidebar: false,
          defaultProjectView: "list",
          showGitHubStats: true,
        },
      });
    });
  } catch {
    return { ok: false, error: "We could not create that account. Try a different username." };
  }

  await setSessionCookie(id, 0);
  return { ok: true };
}

export async function logoutAction() {
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }
  await clearSessionCookie();
  return { ok: true };
}

export async function requestPasswordResetAction(
  input: unknown,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }

  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Authentication is not configured." };
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: await callbackUrl("/reset-password"),
    });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      message: "If that account exists, a password reset email is on its way.",
    };
  }

  if (!isLocalMode()) {
    return { ok: false, error: "Password reset is unavailable in this configuration." };
  }

  const db = await getDb();
  const rows = await db
    .select({ id: localAccounts.id })
    .from(localAccounts)
    .where(eq(localAccounts.email, parsed.data.email))
    .limit(1);

  if (!rows[0]) {
    return {
      ok: true,
      message: "If that account exists, a password reset link has been created.",
    };
  }

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResets).values({
    accountId: rows[0].id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  // Local development has no mail provider. The link is returned only for the
  // local PGlite provider so the flow remains fully testable.
  return {
    ok: true,
    message: "Local development reset link created. It expires in one hour.",
    resetUrl: `/reset-password?token=${encodeURIComponent(token)}`,
  };
}

export async function resetPasswordAction(input: unknown): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { ok: false, error: "Authentication is not configured." };
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Open the latest reset link from your email first." };
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { ok: false, error: error.message };
    return { ok: true, message: "Password updated. You can sign in now." };
  }

  const db = await getDb();
  const tokenHash = hashToken(parsed.data.token);
  const rows = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const reset = rows[0];
  if (!reset) return { ok: false, error: "This reset link is invalid or has expired." };

  const passwordHash = await hashPassword(parsed.data.password);
  await db.transaction(async (tx) => {
    await tx
      .update(localAccounts)
      .set({
        passwordHash,
        sessionVersion: sql`${localAccounts.sessionVersion} + 1`,
      })
      .where(eq(localAccounts.id, reset.accountId));
    await tx
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, reset.id));
  });

  await clearSessionCookie();
  return { ok: true, message: "Password updated. Sign in with your new password." };
}

async function callbackUrl(next: string) {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/callback?next=${encodeURIComponent(next)}`;
  }
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/callback?next=${encodeURIComponent(next)}`;
}

export async function authConfigInfo() {
  return {
    supabase: isSupabaseAuthEnabled(),
    local: isLocalMode(),
    hasPublishableKey: Boolean(supabasePublicKey()),
  };
}
