import { NextResponse } from "next/server";
import { count, desc, eq } from "drizzle-orm";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notes, projects, trackerFiles, workspaces } from "@/lib/db/schema";

type AssistantBody = { message?: unknown };

function isRomanian(text: string) {
  return /[ăâîșț]|\b(salut|bună|buna|proiect|proiecte|notițe|notite|fișier|fisier|fișiere|fisiere|rezumat|ajutor|mulțumesc)\b/i.test(
    text,
  );
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: AssistantBody;
  try {
    body = (await request.json()) as AssistantBody;
  } catch {
    return NextResponse.json({ error: "Invalid chat message." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const db = await getDb();
  const [projectRows, noteRows, noteCount, workspaceRows, trackerRows] = await Promise.all([
    db
      .select({
        name: projects.name,
        status: projects.status,
        visibility: projects.visibility,
        workspaceId: projects.workspaceId,
      })
      .from(projects)
      .where(eq(projects.userId, viewer.id))
      .orderBy(desc(projects.updatedAt)),
    db
      .select({ title: notes.title, category: notes.category, updatedAt: notes.updatedAt })
      .from(notes)
      .where(eq(notes.userId, viewer.id))
      .orderBy(desc(notes.updatedAt))
      .limit(5),
    db.select({ value: count() }).from(notes).where(eq(notes.userId, viewer.id)),
    db
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.userId, viewer.id)),
    db
      .select({ filename: trackerFiles.filename, status: trackerFiles.uploadStatus })
      .from(trackerFiles)
      .where(eq(trackerFiles.userId, viewer.id)),
  ]);

  const totalNotes = Number(noteCount[0]?.value ?? 0);

  const workspaceNames = new Map(workspaceRows.map((workspace) => [workspace.id, workspace.name]));
  const publicProjects = projectRows.filter((project) => project.visibility === "public");
  const privateProjects = projectRows.filter((project) => project.visibility !== "public");
  const pending = trackerRows.filter((file) => file.status !== "uploaded");
  const uploaded = trackerRows.length - pending.length;
  const ro = isRomanian(message);
  const lower = message.toLowerCase();

  let reply: string;

  if (
    /summar|overview|status|rezumat|general|salut|hello|hi\b|bună|buna|help|ajutor/.test(lower) ||
    message.length < 4
  ) {
    reply = ro
      ? `Salut, ${viewer.displayName.split(" ")[0]}! Ai ${projectRows.length} proiecte (${publicProjects.length} publice, ${privateProjects.length} private), ${totalNotes} notițe, ${workspaceRows.length} workspace-uri și ${uploaded}/${trackerRows.length} fișiere Markdown încărcate.${pending.length ? ` ${pending.length} fișier(e) așteaptă upload.` : ""}`
      : `Hi ${viewer.displayName.split(" ")[0]}! You have ${projectRows.length} projects (${publicProjects.length} public, ${privateProjects.length} private), ${totalNotes} notes, ${workspaceRows.length} workspaces and ${uploaded}/${trackerRows.length} Markdown files uploaded.${pending.length ? ` ${pending.length} file(s) are waiting for upload.` : ""}`;
  } else if (/privat|private/.test(lower)) {
    reply = privateProjects.length
      ? (ro ? "Proiectele tale private sunt:\n" : "Your private projects are:\n") +
        privateProjects
          .map(
            (project) =>
              `• ${project.name} — ${project.status}${
                project.workspaceId ? ` · ${workspaceNames.get(project.workspaceId) ?? "Workspace"}` : ""
              }`,
          )
          .join("\n")
      : ro
        ? "Nu ai niciun proiect privat momentan."
        : "You have no private projects right now.";
  } else if (/public/.test(lower)) {
    reply = publicProjects.length
      ? (ro ? "Proiectele tale publice sunt:\n" : "Your public projects are:\n") +
        publicProjects.map((project) => `• ${project.name} — ${project.status}`).join("\n")
      : ro
        ? "Nu ai niciun proiect public momentan."
        : "You have no public projects right now.";
  } else if (/workspace/.test(lower)) {
    const counts = workspaceRows.map((workspace) => {
      const count = projectRows.filter((project) => project.workspaceId === workspace.id).length;
      return `• ${workspace.name} — ${count} project${count === 1 ? "" : "s"}`;
    });
    reply = counts.length
      ? (ro ? "Workspace-urile tale:\n" : "Your workspaces:\n") + counts.join("\n")
      : ro
        ? "Nu ai workspace-uri momentan."
        : "You have no workspaces yet.";
  } else if (/notiț|notit|note/.test(lower)) {
    reply = noteRows.length
      ? (ro ? "Cele mai recente notițe:\n" : "Your most recent notes:\n") +
        noteRows.map((note) => `• ${note.title} — ${note.category}`).join("\n")
      : ro
        ? "Nu ai notițe momentan."
        : "You have no notes yet.";
  } else if (/markdown|tracker|upload|fișier|fisier|file/.test(lower)) {
    reply = trackerRows.length
      ? ro
        ? `${uploaded} din ${trackerRows.length} fișiere sunt încărcate. În așteptare: ${
            pending.length ? pending.map((file) => file.filename).join(", ") : "niciunul"
          }.`
        : `${uploaded} of ${trackerRows.length} files are uploaded. Pending: ${
            pending.length ? pending.map((file) => file.filename).join(", ") : "none"
          }.`
      : ro
        ? "Nu ai fișiere Markdown trackuite momentan."
        : "You have no tracked Markdown files yet.";
  } else if (/github/.test(lower)) {
    reply = viewer.githubUsername
      ? ro
        ? `GitHub este conectat ca @${viewer.githubUsername}. Deschide pagina GitHub pentru profilul live și repository-uri.`
        : `GitHub is connected as @${viewer.githubUsername}. Open the GitHub page for the live profile and repositories.`
      : ro
        ? "GitHub nu este conectat. Îl poți conecta din pagina GitHub."
        : "GitHub is not connected yet. Connect it from the GitHub page.";
  } else {
    reply = ro
      ? "Pot să-ți arăt un rezumat, proiectele publice sau private, workspace-urile, notițele recente, fișierele Markdown și statusul GitHub."
      : "I can summarise your workspace, list public or private projects, show workspaces, recent notes, Markdown files and GitHub status.";
  }

  return NextResponse.json({ reply });
}
