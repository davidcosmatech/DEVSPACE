const DB_NAME = "devspace-local-workspaces";
const DB_VERSION = 1;
const STORE = "workspaces";

export type DirectoryHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  queryPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
};

export type WritableFileHandle = FileSystemFileHandle & {
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
};

export type StoredWorkspace = {
  id: string;
  name: string;
  parentName: string;
  createdAt: string;
  handle: DirectoryHandle;
};

export type FileEntry = {
  name: string;
  kind: "file" | "directory";
  handle: FileSystemFileHandle | DirectoryHandle;
  size?: number;
  lastModified?: number;
};

export type PreviewData = {
  name: string;
  kind: "markdown" | "text" | "image" | "pdf" | "other";
  text?: string;
  url?: string;
};

export const textFileExtensions = [
  ".md",
  ".markdown",
  ".mdx",
  ".txt",
  ".json",
  ".csv",
  ".html",
  ".css",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".py",
  ".yml",
  ".yaml",
  ".xml",
  ".sql",
  ".sh",
  ".log",
];

export function supportsFileSystemAccess() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickParentDirectory(): Promise<DirectoryHandle> {
  if (!supportsFileSystemAccess()) {
    throw new Error("Browserul nu suportă accesul la foldere locale.");
  }
  const picker = (window as unknown as {
    showDirectoryPicker: (options?: {
      mode?: "read" | "readwrite";
      id?: string;
      startIn?: string;
    }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  return (await picker({
    mode: "readwrite",
    id: "devspace-workspace-parent",
    startIn: "documents",
  })) as DirectoryHandle;
}

export function sanitizeName(value: string, kind: "file" | "directory") {
  let name = value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);
  if (!name || name === "." || name === "..") {
    throw new Error("Enter a valid name.");
  }
  if (kind === "file" && !name.includes(".")) {
    name += ".md";
  }
  return name;
}

export function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

export function isTextFile(name: string) {
  return textFileExtensions.includes(extensionOf(name));
}

export function fileKind(name: string): PreviewData["kind"] {
  const extension = extensionOf(name);
  if ([".md", ".markdown", ".mdx"].includes(extension)) return "markdown";
  if (isTextFile(name)) return "text";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"].includes(extension)) return "image";
  if (extension === ".pdf") return "pdf";
  return "other";
}

export async function ensureWritePermission(handle: DirectoryHandle) {
  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") return true;
  return (await handle.requestPermission(descriptor)) === "granted";
}

export async function readDirectory(handle: DirectoryHandle): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === "directory") {
      entries.push({ name, kind: "directory", handle: entry as DirectoryHandle });
    } else {
      const fileHandle = entry as WritableFileHandle;
      let size = 0;
      let lastModified = 0;
      try {
        const file = await fileHandle.getFile();
        size = file.size;
        lastModified = file.lastModified;
      } catch {
        // Metadata can be unavailable if permission was revoked.
      }
      entries.push({ name, kind: "file", handle: fileHandle, size, lastModified });
    }
  }
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, "ro", { sensitivity: "base" });
  });
}

export async function createFolder(parent: DirectoryHandle, name: string) {
  const safe = sanitizeName(name, "directory");
  const existing = await hasEntry(parent, safe);
  if (existing) throw new Error("A file or folder with that name already exists.");
  return parent.getDirectoryHandle(safe, { create: true }) as Promise<DirectoryHandle>;
}

export async function createTextFile(parent: DirectoryHandle, name: string, content: string) {
  const safe = sanitizeName(name, "file");
  const existing = await hasEntry(parent, safe);
  if (existing) throw new Error("A file or folder with that name already exists.");
  const handle = (await parent.getFileHandle(safe, { create: true })) as WritableFileHandle;
  await writeText(handle, content);
  return safe;
}

async function writeText(handle: WritableFileHandle, content: string) {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function importLocalFiles(parent: DirectoryHandle, files: File[]) {
  const existing = new Set((await readDirectory(parent)).map((entry) => entry.name));
  const imported: string[] = [];
  for (const file of files) {
    const safe = uniqueName(existing, sanitizeName(file.name, "directory"));
    existing.add(safe);
    const handle = (await parent.getFileHandle(safe, { create: true })) as WritableFileHandle;
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    imported.push(safe);
  }
  return imported;
}

export async function readFilePreview(entry: FileEntry): Promise<PreviewData> {
  if (entry.kind !== "file") throw new Error("Choose a file.");
  const file = await (entry.handle as FileSystemFileHandle).getFile();
  const kind = fileKind(entry.name);
  if (kind === "markdown" || kind === "text") {
    const text = await file.text();
    return {
      name: entry.name,
      kind,
      text: text.slice(0, 500_000),
      url: URL.createObjectURL(file),
    };
  }
  if (kind === "image" || kind === "pdf") {
    return { name: entry.name, kind, url: URL.createObjectURL(file) };
  }
  return { name: entry.name, kind: "other", url: URL.createObjectURL(file) };
}

export async function deleteEntry(parent: DirectoryHandle, name: string) {
  await parent.removeEntry(name, { recursive: true });
}

export async function renameEntry(
  parent: DirectoryHandle,
  entry: FileEntry,
  newName: string,
) {
  const safe = sanitizeName(newName, entry.kind === "directory" ? "directory" : "file");
  if (safe === entry.name) return;
  if (await hasEntry(parent, safe)) {
    throw new Error("A file or folder with that name already exists.");
  }

  if (entry.kind === "file") {
    const source = await (entry.handle as FileSystemFileHandle).getFile();
    const target = (await parent.getFileHandle(safe, { create: true })) as WritableFileHandle;
    const writable = await target.createWritable();
    await writable.write(source);
    await writable.close();
    await parent.removeEntry(entry.name);
    return;
  }

  const source = await parent.getDirectoryHandle(entry.name);
  const target = (await parent.getDirectoryHandle(safe, {
    create: true,
  })) as DirectoryHandle;
  await copyDirectory(source as DirectoryHandle, target);
  await parent.removeEntry(entry.name, { recursive: true });
}

async function copyDirectory(source: DirectoryHandle, target: DirectoryHandle) {
  for await (const [name, entry] of source.entries()) {
    if (entry.kind === "directory") {
      const child = (await target.getDirectoryHandle(name, {
        create: true,
      })) as DirectoryHandle;
      await copyDirectory(entry as DirectoryHandle, child);
    } else {
      const file = await (entry as FileSystemFileHandle).getFile();
      const writableHandle = (await target.getFileHandle(name, {
        create: true,
      })) as WritableFileHandle;
      const writable = await writableHandle.createWritable();
      await writable.write(file);
      await writable.close();
    }
  }
}

async function hasEntry(parent: DirectoryHandle, name: string) {
  try {
    await parent.getFileHandle(name);
    return true;
  } catch {
    // Not a file; try a directory.
  }
  try {
    await parent.getDirectoryHandle(name);
    return true;
  } catch {
    return false;
  }
}

function uniqueName(existing: Set<string>, desired: string) {
  if (!existing.has(desired)) return desired;
  const dot = desired.lastIndexOf(".");
  const base = dot > 0 ? desired.slice(0, dot) : desired;
  const extension = dot > 0 ? desired.slice(dot) : "";
  let index = 1;
  while (existing.has(`${base} (${index})${extension}`)) index += 1;
  return `${base} (${index})${extension}`;
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listStoredWorkspaces(): Promise<StoredWorkspace[]> {
  const db = await openDb();
  try {
    return await new Promise<StoredWorkspace[]>((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result as StoredWorkspace[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveStoredWorkspace(workspace: StoredWorkspace) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(workspace);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function removeStoredWorkspace(id: string) {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
