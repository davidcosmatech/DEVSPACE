import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { localAccounts, profiles, userSettings } from "@/lib/db/schema";
import { SESSION_COOKIE, readSessionToken } from "./session";

export type Viewer = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  githubUsername: string | null;
  createdAt: Date;
};

export function isSupabaseAuthEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function supabasePublicKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  );
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = supabasePublicKey();
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot mutate cookies. Proxy/route handlers can.
        }
      },
    },
  });
}

function uniqueUsername(base: string) {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 28);
  return `${cleaned || "developer"}_${Math.random().toString(36).slice(2, 6)}`.slice(0, 40);
}

async function ensureSupabaseProfile(input: {
  id: string;
  email: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
}): Promise<Viewer> {
  const db = await getDb();
  const existing = await db.select().from(profiles).where(eq(profiles.id, input.id)).limit(1);
  if (existing[0]) {
    return { ...existing[0], email: input.email };
  }

  const baseUsername = input.username || input.email.split("@")[0];
  const username = uniqueUsername(baseUsername);
  const [created] = await db
    .insert(profiles)
    .values({
      id: input.id,
      username,
      displayName: input.displayName || input.email.split("@")[0] || "Developer",
      avatarUrl: input.avatarUrl ?? null,
      bio: "",
    })
    .returning();

  await db
    .insert(userSettings)
    .values({ userId: input.id, theme: "dark", language: "en", preferences: {} })
    .onConflictDoNothing();

  return { ...created, email: input.email };
}

async function loadLocalViewer(userId: string, sessionVersion: number): Promise<Viewer | null> {
  const db = await getDb();
  const rows = await db
    .select({
      profile: profiles,
      email: localAccounts.email,
      sessionVersion: localAccounts.sessionVersion,
    })
    .from(profiles)
    .innerJoin(localAccounts, eq(localAccounts.id, profiles.id))
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!rows[0] || rows[0].sessionVersion !== sessionVersion) return null;
  return { ...rows[0].profile, email: rows[0].email };
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (isSupabaseAuthEnabled()) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    return ensureSupabaseProfile({
      id: user.id,
      email: user.email,
      displayName: typeof metadata.display_name === "string" ? metadata.display_name : undefined,
      username: typeof metadata.username === "string" ? metadata.username : undefined,
      avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
    });
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;
  return loadLocalViewer(session.userId, session.version);
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function getViewerSettings() {
  const viewer = await requireViewer();
  const db = await getDb();
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, viewer.id)).limit(1);
  if (rows[0]) return { viewer, settings: rows[0] };
  const [created] = await db
    .insert(userSettings)
    .values({ userId: viewer.id })
    .returning();
  return { viewer, settings: created };
}
