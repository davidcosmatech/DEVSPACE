import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { trackerFiles } from "@/lib/db/schema";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(trackerFiles)
    .where(and(eq(trackerFiles.id, id), eq(trackerFiles.userId, viewer.id)))
    .limit(1);

  const file = rows[0];
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.uploadStatus !== "uploaded" || !file.storagePath) {
    return NextResponse.json(
      { error: "This tracked document does not have an uploaded file yet." },
      { status: 409 },
    );
  }

  try {
    const buffer = await readStoredFile(file.storagePath);
    return NextResponse.json(
      {
        id: file.id,
        filename: file.filename,
        description: file.description,
        size: file.fileSize,
        updatedAt: file.updatedAt,
        content: buffer.toString("utf8"),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "The stored file could not be read." }, { status: 500 });
  }
}
