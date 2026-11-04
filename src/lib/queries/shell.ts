import { count, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { notes, projects, tickets, trackerFiles, workspaces } from "@/lib/db/schema";

export type ShellNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  time: Date;
  tone: "project" | "note" | "tracker" | "github" | "ticket";
};

export type ShellCounts = {
  projects: number;
  notes: number;
  workspaces: number;
  uploads: number;
  pendingUploads: number;
};

export async function getShellData(userId: string, githubUsername: string | null) {
  const db = await getDb();

  const [projectCount, noteCount, workspaceCount, trackerRows, recentProjects, recentNotes] =
    await Promise.all([
      db.select({ value: count() }).from(projects).where(eq(projects.userId, userId)),
      db.select({ value: count() }).from(notes).where(eq(notes.userId, userId)),
      db.select({ value: count() }).from(workspaces).where(eq(workspaces.userId, userId)),
      db.select().from(trackerFiles).where(eq(trackerFiles.userId, userId)),
      db
        .select({ id: projects.id, name: projects.name, updatedAt: projects.updatedAt })
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt))
        .limit(2),
      db
        .select({ id: notes.id, title: notes.title, updatedAt: notes.updatedAt })
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.updatedAt))
        .limit(3),
    ]);

  const uploads = trackerRows.filter((row) => row.uploadStatus === "uploaded").length;
  const pendingUploads = trackerRows.length - uploads;

  const ticketRows = await db
    .select({
      id: tickets.id,
      subject: tickets.subject,
      status: tickets.status,
      adminReply: tickets.adminReply,
      repliedAt: tickets.repliedAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.updatedAt))
    .limit(50);

  const openTickets = ticketRows.filter(
    (ticket) => ticket.status === "open" || ticket.status === "in_progress",
  ).length;
  const repliedTickets = ticketRows
    .filter((ticket) => ticket.adminReply && ticket.status !== "closed")
    .slice(0, 2);

  const counts: ShellCounts = {
    projects: Number(projectCount[0]?.value ?? 0),
    notes: Number(noteCount[0]?.value ?? 0),
    workspaces: Number(workspaceCount[0]?.value ?? 0),
    uploads,
    pendingUploads,
  };

  const notifications: ShellNotification[] = [
    ...recentProjects.map((project) => ({
      id: `project-${project.id}`,
      title: "Project updated",
      detail: project.name,
      href: "/projects",
      time: project.updatedAt,
      tone: "project" as const,
    })),
    ...recentNotes.map((note) => ({
      id: `note-${note.id}`,
      title: "Note edited",
      detail: note.title,
      href: "/notes",
      time: note.updatedAt,
      tone: "note" as const,
    })),
  ]
    .sort((a, b) => b.time.getTime() - a.time.getTime())
    .slice(0, 5);

  if (pendingUploads > 0) {
    notifications.unshift({
      id: "tracker-pending",
      title: "Markdown files awaiting upload",
      detail: `${pendingUploads} tracked file${pendingUploads === 1 ? "" : "s"} need attention`,
      href: "/tracker",
      time: new Date(),
      tone: "tracker",
    });
  }

  if (!githubUsername) {
    notifications.push({
      id: "github-connect",
      title: "Connect GitHub",
      detail: "Add your username to show live profile stats",
      href: "/github",
      time: new Date(Date.now() - 1),
      tone: "github",
    });
  }

  for (const ticket of repliedTickets) {
    notifications.unshift({
      id: `ticket-reply-${ticket.id}`,
      title: "Support replied to your ticket",
      detail: ticket.subject,
      href: "/support",
      time: ticket.repliedAt ?? ticket.updatedAt,
      tone: "ticket",
    });
  }

  return { counts, notifications: notifications.slice(0, 6), openTickets };
}
