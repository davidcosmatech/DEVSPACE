import { and, count, desc, eq, gte } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { notes, projects, trackerFiles, workspaces } from "@/lib/db/schema";

export async function getDashboardData(userId: string) {
  const db = await getDb();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);

  const [
    projectTotal,
    noteTotal,
    workspaceTotal,
    trackerRows,
    projectWeek,
    noteWeek,
    workspaceWeek,
    recentProjects,
    recentNotes,
  ] = await Promise.all([
    db.select({ value: count() }).from(projects).where(eq(projects.userId, userId)),
    db.select({ value: count() }).from(notes).where(eq(notes.userId, userId)),
    db.select({ value: count() }).from(workspaces).where(eq(workspaces.userId, userId)),
    db.select().from(trackerFiles).where(eq(trackerFiles.userId, userId)),
    db
      .select({ value: count() })
      .from(projects)
      .where(and(eq(projects.userId, userId), gte(projects.updatedAt, weekAgo))),
    db
      .select({ value: count() })
      .from(notes)
      .where(and(eq(notes.userId, userId), gte(notes.updatedAt, weekAgo))),
    db
      .select({ value: count() })
      .from(workspaces)
      .where(and(eq(workspaces.userId, userId), gte(workspaces.updatedAt, weekAgo))),
    db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt))
      .limit(5),
    db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(desc(notes.updatedAt))
      .limit(3),
  ]);

  const uploaded = trackerRows.filter((row) => row.uploadStatus === "uploaded").length;

  return {
    counts: {
      projects: Number(projectTotal[0]?.value ?? 0),
      notes: Number(noteTotal[0]?.value ?? 0),
      workspaces: Number(workspaceTotal[0]?.value ?? 0),
      uploads: uploaded,
      tracked: trackerRows.length,
    },
    recent: {
      projects: Number(projectWeek[0]?.value ?? 0),
      notes: Number(noteWeek[0]?.value ?? 0),
      workspaces: Number(workspaceWeek[0]?.value ?? 0),
    },
    recentProjects,
    recentNotes,
  };
}
