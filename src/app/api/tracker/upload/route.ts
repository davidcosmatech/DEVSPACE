import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { trackerFiles } from "@/lib/db/schema";
import { deleteStoredFile, saveFile } from "@/lib/storage";

const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".md", ".markdown", ".mdx", ".txt"];

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });
  }

  const file = formData.get("file");
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const fileId = String(formData.get("fileId") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a Markdown file to upload." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Files must be 4 MB or smaller." }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return NextResponse.json(
      { error: "Upload a .md, .markdown, .mdx or .txt file." },
      { status: 400 },
    );
  }

  const db = await getDb();
  let existing: typeof trackerFiles.$inferSelect | undefined;

  if (fileId) {
    const rows = await db
      .select()
      .from(trackerFiles)
      .where(and(eq(trackerFiles.id, fileId), eq(trackerFiles.userId, viewer.id)))
      .limit(1);
    existing = rows[0];
    if (!existing) {
      return NextResponse.json({ error: "Tracked file not found." }, { status: 404 });
    }
    if (existing.uploadStatus === "uploaded") {
      return NextResponse.json({ error: "This file is already uploaded." }, { status: 409 });
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let storagePath: string | null = null;

  try {
    storagePath = await saveFile({
      userId: viewer.id,
      filename: file.name,
      buffer,
      contentType: file.type || "text/markdown",
    });

    if (existing) {
      await db
        .update(trackerFiles)
        .set({
          filename: file.name,
          description: description || existing.description,
          fileSize: buffer.byteLength,
          uploadStatus: "uploaded",
          storagePath,
          updatedAt: new Date(),
        })
        .where(and(eq(trackerFiles.id, existing.id), eq(trackerFiles.userId, viewer.id)));
    } else {
      await db.insert(trackerFiles).values({
        userId: viewer.id,
        filename: file.name,
        description,
        fileSize: buffer.byteLength,
        uploadStatus: "uploaded",
        storagePath,
      });
    }
  } catch (error) {
    if (storagePath) await deleteStoredFile(storagePath).catch(() => {});
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The upload failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
