import "server-only";

import { redirect } from "next/navigation";

import { isAdminUser, parseAdminEmails } from "@/lib/admin";
import { requireViewer, type Viewer } from "@/lib/auth";

export function adminEmails() {
  return parseAdminEmails(process.env.ADMIN_EMAILS);
}

export function viewerIsAdmin(viewer: Pick<Viewer, "email" | "role">) {
  return isAdminUser(viewer, adminEmails());
}

/**
 * Server-side gate for every admin page and action. Non-admins are redirected
 * (pages) or rejected (actions) — the client never decides this.
 */
export async function requireAdminViewer(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewerIsAdmin(viewer)) redirect("/dashboard");
  return viewer;
}

export async function assertAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewerIsAdmin(viewer)) throw new Error("Administrator access required.");
  return viewer;
}
