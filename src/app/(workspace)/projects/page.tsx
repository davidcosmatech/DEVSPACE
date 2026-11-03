import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { ProjectsView } from "@/features/projects/projects-view";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { projects } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; project?: string }>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const db = await getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, viewer.id))
    .orderBy(desc(projects.updatedAt));

  return (
    <ProjectsView
      projects={rows}
      initialNew={params.new === "1"}
      initialProjectId={params.project}
    />
  );
}
