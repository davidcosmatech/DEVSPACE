import { describe, expect, it, vi } from "vitest";

import {
  createFolder,
  createTextFile,
  deleteEntry,
  importLocalFiles,
  readDirectory,
  readFilePreview,
  renameEntry,
  type DirectoryHandle,
} from "@/features/files/local-fs";

type Node = FakeFile | FakeDirectory;

class FakeWritable {
  constructor(private file: FakeFile) {}
  async write(data: string | Blob | File) {
    if (typeof data === "string") this.file.content = data;
    else if (data instanceof File) this.file.content = await data.text();
    else this.file.content = await data.text();
  }
  async close() {}
}

class FakeFile {
  kind = "file" as const;
  content = "";
  lastModified = Date.now();
  constructor(public name: string) {}
  async getFile() {
    return new File([this.content], this.name, { lastModified: this.lastModified });
  }
  async createWritable() {
    return new FakeWritable(this);
  }
}

class FakeDirectory {
  kind = "directory" as const;
  children = new Map<string, Node>();
  constructor(public name: string) {}

  async *entries() {
    for (const [name, node] of this.children) {
      yield [name, node] as [string, Node];
    }
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    const existing = this.children.get(name);
    if (existing && existing.kind === "file") return existing;
    if (existing) throw new DOMException("Type mismatch", "TypeMismatchError");
    if (!options?.create) throw new DOMException("Not found", "NotFoundError");
    const file = new FakeFile(name);
    this.children.set(name, file);
    return file;
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    const existing = this.children.get(name);
    if (existing && existing.kind === "directory") return existing;
    if (existing) throw new DOMException("Type mismatch", "TypeMismatchError");
    if (!options?.create) throw new DOMException("Not found", "NotFoundError");
    const directory = new FakeDirectory(name);
    this.children.set(name, directory);
    return directory;
  }

  async removeEntry(name: string) {
    this.children.delete(name);
  }

  async queryPermission() {
    return "granted" as PermissionState;
  }

  async requestPermission() {
    return "granted" as PermissionState;
  }
}

function directory(name = "root") {
  return new FakeDirectory(name) as unknown as DirectoryHandle;
}

describe("local file workspace helpers", () => {
  it("creates folders and text files in a real directory handle", async () => {
    const root = directory();
    await createFolder(root, "Notes");
    await createTextFile(root, "readme.md", "# Hello");

    const entries = await readDirectory(root);
    expect(entries.map((entry) => entry.name)).toEqual(["Notes", "readme.md"]);
    expect(entries[0].kind).toBe("directory");
    expect(entries[1].size).toBeGreaterThan(0);
  });

  it("imports files with unique names instead of overwriting", async () => {
    const root = directory();
    await createTextFile(root, "notes.md", "original");
    const imported = await importLocalFiles(root, [
      new File(["new"], "notes.md", { type: "text/markdown" }),
      new File(["readme"], "README", { type: "text/plain" }),
    ]);
    expect(imported).toEqual(["notes (1).md", "README"]);
    const entries = await readDirectory(root);
    expect(entries).toHaveLength(3);
  });

  it("renames and deletes files", async () => {
    const root = directory();
    await createTextFile(root, "draft.md", "# Draft");
    const [entry] = await readDirectory(root);
    await renameEntry(root, entry, "final.md");
    expect((await readDirectory(root)).map((item) => item.name)).toEqual(["final.md"]);

    const [renamed] = await readDirectory(root);
    await deleteEntry(root, renamed.name);
    expect(await readDirectory(root)).toHaveLength(0);
  });

  it("renames a folder with its contents", async () => {
    const root = directory();
    const notes = await createFolder(root, "Notes");
    await createTextFile(notes, "inside.md", "inside");
    const [entry] = await readDirectory(root);
    await renameEntry(root, entry, "Archive");

    const entries = await readDirectory(root);
    expect(entries[0].name).toBe("Archive");
    const archive = entries[0].handle as DirectoryHandle;
    expect((await readDirectory(archive))[0].name).toBe("inside.md");
  });

  it("returns text previews for Markdown files", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:preview") });
    const root = directory();
    await createTextFile(root, "note.md", "# Preview");
    const [entry] = await readDirectory(root);
    const preview = await readFilePreview(entry);
    expect(preview.kind).toBe("markdown");
    expect(preview.text).toContain("# Preview");
    vi.unstubAllGlobals();
  });

  it("rejects duplicate names and sanitizes unsafe characters", async () => {
    const root = directory();
    await createFolder(root, "Docs");
    await expect(createFolder(root, "Docs")).rejects.toThrow(/already exists/i);
    const safe = await createTextFile(root, "bad/name", "");
    expect(safe).toBe("bad-name.md");
  });
});
