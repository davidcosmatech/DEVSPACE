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
  if (!viewer) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const db = await getDb();
  const rows = await db
    .select()
    .from(trackerFiles)
    .where(and(eq(trackerFiles.id, id), eq(trackerFiles.userId, viewer.id)))
    .limit(1);

  const file = rows[0];
  if (!file || file.uploadStatus !== "uploaded" || !file.storagePath) {
    return new Response("File not found", { status: 404 });
  }

  try {
    const buffer = await readStoredFile(file.storagePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response("File could not be read", { status: 500 });
  }
}
