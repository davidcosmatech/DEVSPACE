import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";

import { ProjectsView } from "@/features/projects/projects-view";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects, workspaces } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; project?: string; workspace?: string }>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const db = await getDb();
  const [rows, workspaceRows] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, viewer.id))
      .orderBy(desc(projects.updatedAt)),
    db
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.userId, viewer.id))
      .orderBy(asc(workspaces.name)),
  ]);

  return (
    <ProjectsView
      projects={rows}
      workspaces={workspaceRows}
      initialNew={params.new === "1"}
      initialProjectId={params.project}
      initialWorkspaceId={params.workspace}
    />
  );
}
