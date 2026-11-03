import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  notes,
  projects,
  trackerFiles,
  workspaceLinks,
  workspaces,
} from "@/lib/db/schema";
import { backupSchema, type BackupData } from "@/lib/validation/backup";
import { normalizeUrl } from "@/lib/utils";

type Summary = {
  projects: { new: number; skipped: number };
  notes: { new: number; skipped: number };
  workspaces: { new: number; skipped: number };
  links: { new: number; skipped: number };
  trackerFiles: { new: number; skipped: number };
};

const normalize = (value: string) => value.trim().toLowerCase();

function emptySummary(): Summary {
  return {
    projects: { new: 0, skipped: 0 },
    notes: { new: 0, skipped: 0 },
    workspaces: { new: 0, skipped: 0 },
    links: { new: 0, skipped: 0 },
    trackerFiles: { new: 0, skipped: 0 },
  };
}

async function buildPlan(userId: string, backup: BackupData) {
  const db = await getDb();
  const [existingProjects, existingNotes, existingWorkspaces, existingLinks, existingFiles] =
    await Promise.all([
      db.select({ name: projects.name }).from(projects).where(eq(projects.userId, userId)),
      db.select({ title: notes.title }).from(notes).where(eq(notes.userId, userId)),
      db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.userId, userId)),
      db.select({ url: workspaceLinks.url }).from(workspaceLinks).where(eq(workspaceLinks.userId, userId)),
      db.select({ filename: trackerFiles.filename }).from(trackerFiles).where(eq(trackerFiles.userId, userId)),
    ]);

  const projectNames = new Set(existingProjects.map((item) => normalize(item.name)));
  const noteTitles = new Set(existingNotes.map((item) => normalize(item.title)));
  const workspaceNames = new Set(existingWorkspaces.map((item) => normalize(item.name)));
  const linkUrls = new Set(existingLinks.map((item) => item.url));
  const fileNames = new Set(existingFiles.map((item) => normalize(item.filename)));

  const summary = emptySummary();
  const conflicts: string[] = [];

  const newProjects = backup.projects.filter((project) => {
    if (projectNames.has(normalize(project.name))) {
      summary.projects.skipped += 1;
      if (conflicts.length < 5) conflicts.push(`Project: ${project.name}`);
      return false;
    }
    projectNames.add(normalize(project.name));
    summary.projects.new += 1;
    return true;
  });

  const newNotes = backup.notes.filter((note) => {
    if (noteTitles.has(normalize(note.title))) {
      summary.notes.skipped += 1;
      if (conflicts.length < 5) conflicts.push(`Note: ${note.title}`);
      return false;
    }
    noteTitles.add(normalize(note.title));
    summary.notes.new += 1;
    return true;
  });

  const newWorkspaces = backup.workspaces
    .map((workspace) => {
      if (workspaceNames.has(normalize(workspace.name))) {
        summary.workspaces.skipped += 1;
        summary.links.skipped += workspace.links.length;
        if (conflicts.length < 5) conflicts.push(`Workspace: ${workspace.name}`);
        return null;
      }
      workspaceNames.add(normalize(workspace.name));
      summary.workspaces.new += 1;

      const safeLinks: { title: string; url: string; category: string }[] = [];
      for (const link of workspace.links) {
        const normalized = normalizeUrl(link.url);
        if (!normalized) {
          summary.links.skipped += 1;
          continue;
        }
        if (linkUrls.has(normalized)) {
          summary.links.skipped += 1;
          continue;
        }
        linkUrls.add(normalized);
        summary.links.new += 1;
        safeLinks.push({ title: link.title, url: normalized, category: link.category });
      }
      return { ...workspace, links: safeLinks };
    })
    .filter((workspace): workspace is NonNullable<typeof workspace> => workspace !== null);

  const newTrackerFiles = backup.trackerFiles.filter((file) => {
    if (fileNames.has(normalize(file.filename))) {
      summary.trackerFiles.skipped += 1;
      if (conflicts.length < 5) conflicts.push(`File: ${file.filename}`);
      return false;
    }
    fileNames.add(normalize(file.filename));
    summary.trackerFiles.new += 1;
    return true;
  });

  return { summary, conflicts, newProjects, newNotes, newWorkspaces, newTrackerFiles };
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mode = new URL(request.url).searchParams.get("mode") === "apply" ? "apply" : "preview";
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a JSON backup file." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a DEVSPACE JSON backup." }, { status: 400 });
  }
  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Backup files must be 6 MB or smaller." }, { status: 400 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ error: "That file is not valid JSON." }, { status: 400 });
  }

  const parsed = backupSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue
          ? `Invalid backup: ${issue.path.join(".") || "root"} — ${issue.message}`
          : "Invalid backup file.",
      },
      { status: 400 },
    );
  }

  const backup = parsed.data;
  const plan = await buildPlan(viewer.id, backup);

  if (mode === "preview") {
    return NextResponse.json({
      mode,
      exportedAt: backup.exportedAt,
      summary: plan.summary,
      conflicts: plan.conflicts,
      trackerNote:
        "Tracker entries import as pending metadata only. Upload the matching files afterwards.",
      settingsPreserved: true,
    });
  }

  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      if (plan.newProjects.length) {
        await tx.insert(projects).values(
          plan.newProjects.map((project) => ({
            userId: viewer.id,
            name: project.name,
            description: project.description,
            status: project.status,
            technology: project.technology,
            repositoryUrl: project.repositoryUrl ?? null,
            priority: project.priority,
            createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
            updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
          })),
        );
      }

      if (plan.newNotes.length) {
        await tx.insert(notes).values(
          plan.newNotes.map((note) => ({
            userId: viewer.id,
            title: note.title,
            content: note.content,
            category: note.category,
            isPinned: note.isPinned,
            createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
          })),
        );
      }

      for (const workspace of plan.newWorkspaces) {
        const [created] = await tx
          .insert(workspaces)
          .values({
            userId: viewer.id,
            name: workspace.name,
            description: workspace.description,
            category: workspace.category,
            createdAt: workspace.createdAt ? new Date(workspace.createdAt) : new Date(),
            updatedAt: workspace.updatedAt ? new Date(workspace.updatedAt) : new Date(),
          })
          .returning({ id: workspaces.id });

        if (workspace.links.length) {
          await tx.insert(workspaceLinks).values(
            workspace.links.map((link) => ({
              workspaceId: created.id,
              userId: viewer.id,
              title: link.title,
              url: link.url,
              category: link.category,
            })),
          );
        }
      }

      if (plan.newTrackerFiles.length) {
        await tx.insert(trackerFiles).values(
          plan.newTrackerFiles.map((tracked) => ({
            userId: viewer.id,
            filename: tracked.filename,
            description: tracked.description,
            fileSize: 0,
            uploadStatus: "pending",
            storagePath: null,
            createdAt: tracked.createdAt ? new Date(tracked.createdAt) : new Date(),
            updatedAt: tracked.updatedAt ? new Date(tracked.updatedAt) : new Date(),
          })),
        );
      }
    });
  } catch {
    return NextResponse.json({ error: "Import failed and was rolled back." }, { status: 500 });
  }

  return NextResponse.json({
    mode,
    summary: plan.summary,
    conflicts: plan.conflicts,
    trackerNote:
      "Tracker entries imported as pending metadata. Upload the matching files to complete them.",
    settingsPreserved: true,
  });
}
