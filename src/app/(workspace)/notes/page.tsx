import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { NotesView } from "@/features/notes/notes-view";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notes } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; note?: string }>;
}) {
  const viewer = await requireViewer();
  const params = await searchParams;
  const db = await getDb();
  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, viewer.id))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt));

  return (
    <NotesView
      initialNotes={rows}
      initialNew={params.new === "1"}
      initialNoteId={params.note}
    />
  );
}
