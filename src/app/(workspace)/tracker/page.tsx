import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { TrackerView } from "@/features/tracker/trackerView";
import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { trackerFiles } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Markdown Tracker" };

export default async function TrackerPage() {
  const viewer = await requireViewer();
  const db = await getDb();
  const rows = await db
    .select()
    .from(trackerFiles)
    .where(eq(trackerFiles.userId, viewer.id))
    .orderBy(desc(trackerFiles.updatedAt));

  return <TrackerView files={rows} />;
}
