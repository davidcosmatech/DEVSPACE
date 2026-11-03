import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notes, projects, trackerFiles, workspaces } from "@/lib/db/schema";

export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ projects: [], notes: [], workspaces: [], files: [] });
  }

  const term = `%${q.replace(/[%_]/g, "")}%`;
  const db = await getDb();

  const [projectRows, noteRows, workspaceRows, fileRows] = await Promise.all([
    db
      .select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(
        and(
          eq(projects.userId, viewer.id),
          or(ilike(projects.name, term), ilike(projects.description, term), ilike(projects.technology, term)),
        ),
      )
      .orderBy(desc(projects.updatedAt))
      .limit(5),
    db
      .select({ id: notes.id, title: notes.title, category: notes.category })
      .from(notes)
      .where(
        and(
          eq(notes.userId, viewer.id),
          or(ilike(notes.title, term), ilike(notes.content, term), ilike(notes.category, term)),
        ),
      )
      .orderBy(desc(notes.updatedAt))
      .limit(5),
    db
      .select({ id: workspaces.id, name: workspaces.name, category: workspaces.category })
      .from(workspaces)
      .where(
        and(
          eq(workspaces.userId, viewer.id),
          or(ilike(workspaces.name, term), ilike(workspaces.description, term)),
        ),
      )
      .limit(4),
    db
      .select({ id: trackerFiles.id, filename: trackerFiles.filename })
      .from(trackerFiles)
      .where(and(eq(trackerFiles.userId, viewer.id), ilike(trackerFiles.filename, term)))
      .limit(4),
  ]);

  return NextResponse.json({
    projects: projectRows,
    notes: noteRows,
    workspaces: workspaceRows,
    files: fileRows,
  });
}
