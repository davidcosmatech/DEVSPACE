import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";

import { WorkspacesView, type WorkspaceWithLinks } from "@/features/workspaces/workspaces-view";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects, workspaceLinks, workspaces } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Browser Workspaces" };

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const db = await getDb();
  const [workspaceRows, linkRows, projectRows] = await Promise.all([
    db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, viewer.id))
      .orderBy(desc(workspaces.updatedAt)),
    db
      .select()
      .from(workspaceLinks)
      .where(eq(workspaceLinks.userId, viewer.id))
      .orderBy(asc(workspaceLinks.createdAt)),
    db
      .select({ id: projects.id, name: projects.name, status: projects.status, workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.userId, viewer.id)),
  ]);

  const grouped: WorkspaceWithLinks[] = workspaceRows.map((workspace) => ({
    ...workspace,
    links: linkRows.filter((link) => link.workspaceId === workspace.id),
    projects: projectRows.filter((project) => project.workspaceId === workspace.id),
  }));

  return <WorkspacesView workspaces={grouped} initialNew={params.new === "1"} />;
}
