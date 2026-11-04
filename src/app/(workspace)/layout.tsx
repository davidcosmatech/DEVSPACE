import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { requireViewer, type Viewer } from "@/lib/auth";
import { getViewerRole } from "@/lib/auth/rbac";
import { adminAreaPermissions, rolePermissions, type PermissionKey } from "@/lib/rbac";
import { getShellData } from "@/lib/queries/shell";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const viewer: Viewer = await requireViewer();
  const db = await getDb();
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, viewer.id)).limit(1);
  const theme = rows[0]?.theme === "light" ? "light" : "dark";
  const { notifications, openTickets } = await getShellData(viewer.id, viewer.githubUsername);
  const role = await getViewerRole(viewer);
  const adminPermissions = rolePermissions(role).filter((permission): permission is PermissionKey =>
    adminAreaPermissions.includes(permission as PermissionKey),
  ) as PermissionKey[];

  return (
    <AppShell
      viewer={viewer}
      notifications={notifications}
      theme={theme}
      adminPermissions={adminPermissions}
      openTickets={openTickets}
    >
      {children}
    </AppShell>
  );
}
