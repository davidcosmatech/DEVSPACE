import { desc, eq } from "drizzle-orm";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  notes,
  profiles,
  projects,
  trackerFiles,
  userSettings,
  workspaceLinks,
  workspaces,
} from "@/lib/db/schema";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  const db = await getDb();
  const [profileRows, settingsRows, projectRows, noteRows, workspaceRows, linkRows, trackerRows] =
    await Promise.all([
      db.select().from(profiles).where(eq(profiles.id, viewer.id)).limit(1),
      db.select().from(userSettings).where(eq(userSettings.userId, viewer.id)).limit(1),
      db.select().from(projects).where(eq(projects.userId, viewer.id)),
      db.select().from(notes).where(eq(notes.userId, viewer.id)),
      db.select().from(workspaces).where(eq(workspaces.userId, viewer.id)),
      db.select().from(workspaceLinks).where(eq(workspaceLinks.userId, viewer.id)),
      db
        .select()
        .from(trackerFiles)
        .where(eq(trackerFiles.userId, viewer.id))
        .orderBy(desc(trackerFiles.createdAt)),
    ]);

  const profile = profileRows[0];
  const settings = settingsRows[0];

  const payload = {
    app: "DEVSPACE",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: profile
      ? {
          username: profile.username,
          displayName: profile.displayName,
          bio: profile.bio,
          avatarUrl: profile.avatarUrl,
          githubUsername: profile.githubUsername,
        }
      : undefined,
    settings: settings
      ? {
          theme: settings.theme,
          language: settings.language,
          preferences: settings.preferences,
        }
      : undefined,
    projects: projectRows.map((project) => ({
      name: project.name,
      description: project.description,
      status: project.status,
      technology: project.technology,
      repositoryUrl: project.repositoryUrl,
      priority: project.priority,
      visibility: project.visibility,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })),
    notes: noteRows.map((note) => ({
      title: note.title,
      content: note.content,
      category: note.category,
      isPinned: note.isPinned,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
    workspaces: workspaceRows.map((workspace) => ({
      name: workspace.name,
      description: workspace.description,
      category: workspace.category,
      links: linkRows
        .filter((link) => link.workspaceId === workspace.id)
        .map((link) => ({ title: link.title, url: link.url, category: link.category })),
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    })),
    trackerFiles: trackerRows.map((file) => ({
      filename: file.filename,
      description: file.description,
      fileSize: file.fileSize,
      uploadStatus: file.uploadStatus,
      createdAt: file.createdAt.toISOString(),
      updatedAt: file.updatedAt.toISOString(),
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="devspace-backup-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
