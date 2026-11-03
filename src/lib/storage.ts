import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { dataRoot } from "@/lib/db/paths";

const BUCKET = "markdown-files";

export function sanitizeFilename(filename: string) {
  const base = path.basename(filename).replace(/[^\w.\- ()]/g, "_");
  return base.slice(0, 180) || "document.md";
}

export function buildStoragePath(userId: string, filename: string) {
  return `${userId}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

function localPath(storagePath: string) {
  const resolved = path.resolve(dataRoot(), "storage", storagePath);
  const root = path.resolve(dataRoot(), "storage");
  if (!resolved.startsWith(root + path.sep)) {
    throw new Error("Invalid storage path.");
  }
  return resolved;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function saveFile(input: {
  userId: string;
  filename: string;
  buffer: Buffer;
  contentType?: string;
}) {
  const storagePath = buildStoragePath(input.userId, input.filename);
  const admin = supabaseAdmin();

  if (admin) {
    const { error } = await admin.storage.from(BUCKET).upload(storagePath, input.buffer, {
      contentType: input.contentType ?? "text/markdown",
      upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
  } else {
    const target = localPath(storagePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.buffer);
  }

  return storagePath;
}

export async function readStoredFile(storagePath: string) {
  const admin = supabaseAdmin();
  if (admin) {
    const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
    if (error || !data) throw new Error(error?.message ?? "File not found.");
    return Buffer.from(await data.arrayBuffer());
  }
  return readFile(localPath(storagePath));
}

export async function deleteStoredFile(storagePath: string | null) {
  if (!storagePath) return;
  const admin = supabaseAdmin();
  if (admin) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return;
  }
  try {
    await unlink(localPath(storagePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
