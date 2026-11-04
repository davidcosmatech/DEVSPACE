import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { requireViewer, type Viewer } from "@/lib/auth";
import {
  hasAdminAreaAccess,
  hasPermission,
  rolePermissions,
  type PermissionKey,
  type RoleLike,
} from "@/lib/rbac";

/** Role definitions are cached per request so guards stay cheap. */
export const getRoleByKey = cache(async (key: string): Promise<RoleLike | null> => {
  const db = await getDb();
  const rows = await db
    .select({
      key: roles.key,
      name: roles.name,
      permissions: roles.permissions,
      isSystem: roles.isSystem,
    })
    .from(roles)
    .where(eq(roles.key, key))
    .limit(1);
  if (!rows[0]) return null;
  return {
    key: rows[0].key,
    name: rows[0].name,
    permissions: rolePermissions(rows[0]),
  };
});

export async function getViewerRole(viewer: Pick<Viewer, "role">): Promise<RoleLike | null> {
  return getRoleByKey(viewer.role);
}

export async function viewerHasPermission(
  viewer: Pick<Viewer, "role">,
  permission: PermissionKey,
) {
  const role = await getViewerRole(viewer);
  return hasPermission(role, permission);
}

export async function viewerAdminPermissions(
  viewer: Pick<Viewer, "role">,
): Promise<PermissionKey[]> {
  const role = await getViewerRole(viewer);
  return rolePermissions(role);
}

export async function viewerHasAdminAccess(viewer: Pick<Viewer, "role">) {
  const role = await getViewerRole(viewer);
  return hasAdminAreaAccess(role);
}

/** Page guard: redirects visitors without the permission to the dashboard. */
export async function requirePermission(permission: PermissionKey): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await viewerHasPermission(viewer, permission))) redirect("/dashboard");
  return viewer;
}

/** Server Action guard: throws so mutations never run without permission. */
export async function authorize(permission: PermissionKey): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await viewerHasPermission(viewer, permission))) {
    throw new Error("You do not have permission to perform this action.");
  }
  return viewer;
}

export async function requireAdminArea(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await viewerHasAdminAccess(viewer))) redirect("/dashboard");
  return viewer;
}

export async function authorizeAdminArea(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await viewerHasAdminAccess(viewer))) {
    throw new Error("Administrator access required.");
  }
  return viewer;
}
