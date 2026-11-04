import "server-only";

import { redirect } from "next/navigation";

import { isAdminUser } from "@/lib/admin";
import { requireViewer, type Viewer } from "@/lib/auth";

export function viewerIsAdmin(viewer: Pick<Viewer, "role">) {
  return isAdminUser(viewer);
}

/**
 * Server-side gate for every admin page and action. Only `profiles.role =
 * 'admin'` is accepted — there is no email allow-list. Non-admins are
 * redirected (pages) or rejected (actions); the client never decides this.
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
