"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import {
  createFolder,
  createTextFile,
  deleteEntry,
  ensureWritePermission,
  extensionOf,
  fileKind,
  importLocalFiles,
  listStoredWorkspaces,
  pickParentDirectory,
  readDirectory,
  readFilePreview,
  renameEntry,
  sanitizeName,
  saveStoredWorkspace,
  supportsFileSystemAccess,
  type DirectoryHandle,
  type FileEntry,
  type PreviewData,
  type StoredWorkspace,
} from "@/features/files/local-fs";
import { cn, formatBytes } from "@/lib/utils";

const emptySubscribe = () => () => {};

type WorkspaceItem = StoredWorkspace & { permission: PermissionState };
type Crumb = { name: string; handle: DirectoryHandle };

export function FileWorkspaceView() {
  const supported = useSyncExternalStore(
    emptySubscribe,
    () => supportsFileSystemAccess(),
    () => false,
  );
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<WorkspaceItem | null>(null);
  const [stack, setStack] = useState<Crumb[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [workspaceModal, setWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [folderModal, setFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [fileModal, setFileModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const [preview, setPreview] = useState<{ entry: FileEntry; data: PreviewData } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const records = await listStoredWorkspaces();
        const checked = await Promise.all(
          records.map(async (record) => {
            let permission: PermissionState = "prompt";
            try {
              permission = await record.handle.queryPermission({ mode: "readwrite" });
            } catch {
              permission = "prompt";
            }
            return { ...record, permission };
          }),
        );
        if (alive) setWorkspaces(checked);
      } catch {
        if (alive) toast.error("Local workspaces could not be loaded in this browser.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const currentDir = stack[stack.length - 1]?.handle ?? null;

  async function refresh(handle = currentDir) {
    if (!handle) return;
    setBusy(true);
    try {
      setEntries(await readDirectory(handle));
    } catch {
      toast.error("Could not read that folder. Check the permission and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createLocalWorkspace() {
    setBusy(true);
    try {
      const name = sanitizeName(workspaceName, "directory");
      const parent = await pickParentDirectory();
      if (!(await ensureWritePermission(parent))) {
        toast.error("Write permission is required to create the workspace.");
        return;
      }
      const handle = (await parent.getDirectoryHandle(name, { create: true })) as DirectoryHandle;
      const record: StoredWorkspace = {
        id: crypto.randomUUID(),
        name,
        parentName: parent.name,
        createdAt: new Date().toISOString(),
        handle,
      };
      await saveStoredWorkspace(record);
      setWorkspaces((current) => [{ ...record, permission: "granted" }, ...current]);
      setWorkspaceModal(false);
      setWorkspaceName("");
      toast.success(`Workspace “${name}” created in ${parent.name}.`);
      await enterWorkspace({ ...record, permission: "granted" });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        toast.message("Location selection canceled.");
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create the workspace.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function enterWorkspace(workspace: WorkspaceItem) {
    setBusy(true);
    try {
      if (!(await ensureWritePermission(workspace.handle))) {
        toast.error("Allow file access so DEVSPACE can open this workspace.");
        return;
      }
      setActive({ ...workspace, permission: "granted" });
      setWorkspaces((current) =>
        current.map((item) => (item.id === workspace.id ? { ...item, permission: "granted" } : item)),
      );
      setStack([{ name: workspace.name, handle: workspace.handle }]);
      setEntries(await readDirectory(workspace.handle));
    } catch {
      toast.error("Could not open that workspace.");
    } finally {
      setBusy(false);
    }
  }

  async function openFolder(entry: FileEntry) {
    if (!currentDir || entry.kind !== "directory") return;
    try {
      const handle = (await currentDir.getDirectoryHandle(entry.name)) as DirectoryHandle;
      setStack((current) => [...current, { name: entry.name, handle }]);
      setEntries(await readDirectory(handle));
    } catch {
      toast.error("Could not open that folder.");
    }
  }

  function goToCrumb(index: number) {
    if (index < 0 || index >= stack.length) return;
    const next = stack.slice(0, index + 1);
    setStack(next);
    void refresh(next[next.length - 1].handle);
  }

  async function addFolder() {
    if (!currentDir) return;
    setBusy(true);
    try {
      const name = sanitizeName(folderName, "directory");
      await createFolder(currentDir, name);
      setFolderModal(false);
      setFolderName("");
      toast.success("Folder created.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the folder.");
    } finally {
      setBusy(false);
    }
  }

  async function addFile() {
    if (!currentDir) return;
    setBusy(true);
    try {
      const name = sanitizeName(fileName, "file");
      await createTextFile(currentDir, name, fileContent);
      setFileModal(false);
      setFileName("");
      setFileContent("");
      toast.success("File created.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the file.");
    } finally {
      setBusy(false);
    }
  }

  async function importFiles(files: File[]) {
    if (!currentDir || files.length === 0) return;
    setImporting(true);
    try {
      const imported = await importLocalFiles(currentDir, files);
      toast.success(`${imported.length} file${imported.length === 1 ? "" : "s"} imported.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import the files.");
    } finally {
      setImporting(false);
    }
  }

  async function openPreview(entry: FileEntry) {
    setPreview(null);
    setPreviewLoading(true);
    try {
      const data = await readFilePreview(entry);
      setPreview({ entry, data });
    } catch {
      toast.error("Could not open that document.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    if (preview?.data.url) URL.revokeObjectURL(preview.data.url);
    setPreview(null);
    setPreviewLoading(false);
  }

  async function rename() {
    if (!currentDir || !renameTarget) return;
    setBusy(true);
    try {
      await renameEntry(currentDir, renameTarget, newName);
      if (preview?.entry.name === renameTarget.name) closePreview();
      setRenameTarget(null);
      setNewName("");
      toast.success("Renamed.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rename.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!currentDir || !deleteTarget) return;
    try {
      if (preview?.entry.name === deleteTarget.name) closePreview();
      await deleteEntry(currentDir, deleteTarget.name);
      setDeleteTarget(null);
      toast.success(deleteTarget.kind === "directory" ? "Folder deleted." : "File deleted.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    }
  }

  function startRename(entry: FileEntry) {
    setRenameTarget(entry);
    setNewName(entry.name);
  }

  function openCreateFile() {
    const suggested = `note-${new Date().toISOString().slice(0, 10)}.md`;
    setFileName(suggested);
    setFileContent(`# ${suggested.replace(/\.[^.]+$/, "")}\n\n`);
    setFileModal(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Local files"
        icon={HardDrive}
        title="File Workspace"
        description="Create real folders and files on your computer, import documents and edit them in the browser."
        actions={
          supported ? (
            <button type="button" className="btn btn-primary" onClick={() => setWorkspaceModal(true)}>
              <Plus size={16} /> New Workspace
            </button>
          ) : undefined
        }
      />

      <div className="local-fs-note">
        <HardDrive size={15} />
        <span>
          Files are real and stay on this device. Browser security prevents launching Windows
          Explorer or default desktop apps: folders open inside DEVSPACE and documents preview in the
          browser.
        </span>
      </div>

      {!supported ? (
        <div className="data-panel">
          <div className="empty-state">
            <span className="empty-icon">
              <HardDrive size={21} />
            </span>
            <h3>Chrome or Edge is required</h3>
            <p>
              Local file workspaces use the File System Access API, available in Chromium browsers
              over HTTPS or localhost. Open DEVSPACE in Chrome/Edge, then return to this page.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="local-fs-loading">
          <Loader2 size={18} className="animate-spin" /> Loading local workspaces…
        </div>
      ) : !active ? (
        <>
          {workspaces.length === 0 ? (
            <div className="local-workspace-hero">
              <span className="local-workspace-hero-icon">
                <FolderOpen size={26} />
              </span>
              <h2>Create your first local workspace</h2>
              <p>
                Choose a location on your computer. DEVSPACE creates a real folder there, then you
                can add subfolders, Markdown files, text files and imported documents.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setWorkspaceModal(true)}>
                <Plus size={15} /> Choose location & create
              </button>
            </div>
          ) : (
            <div className="local-workspace-grid">
              {workspaces.map((workspace) => (
                <article key={workspace.id} className="local-workspace-card">
                  <div className="local-workspace-card-icon">
                    <Folder size={21} />
                  </div>
                  <div className="local-workspace-card-copy">
                    <h3>{workspace.name}</h3>
                    <p>Created in {workspace.parentName}</p>
                  </div>
                  <span
                    className={cn(
                      "badge",
                      workspace.permission === "granted" ? "badge-green" : "badge-amber",
                    )}
                  >
                    {workspace.permission === "granted" ? "Ready" : "Reconnect"}
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => enterWorkspace(workspace)}>
                    <FolderOpen size={13} /> Open
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <section className="local-explorer">
          <div className="local-explorer-head">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setActive(null);
                setStack([]);
                setEntries([]);
              }}
            >
              <ArrowLeft size={14} /> Workspaces
            </button>
            <nav className="local-breadcrumbs" aria-label="Folder path">
              {stack.map((crumb, index) => (
                <span key={`${crumb.name}-${index}`} className="local-crumb-wrap">
                  {index > 0 ? <ChevronRight size={12} /> : null}
                  <button type="button" onClick={() => goToCrumb(index)}>
                    {index === 0 ? <HardDrive size={12} /> : null}
                    {crumb.name}
                  </button>
                </span>
              ))}
            </nav>
            <button type="button" className="icon-button" onClick={() => refresh()} aria-label="Refresh folder">
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="local-toolbar">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFolderModal(true)}>
              <Folder size={14} /> New Folder
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={openCreateFile}>
              <FileText size={14} /> New File
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => importRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              Import / Upload
            </button>
            <span className="local-toolbar-meta">
              {entries.length} item{entries.length === 1 ? "" : "s"}
            </span>
            <input
              ref={importRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.currentTarget.value = "";
                void importFiles(files);
              }}
            />
          </div>

          {busy ? (
            <div className="local-fs-loading">
              <Loader2 size={18} className="animate-spin" /> Working with the folder…
            </div>
          ) : entries.length === 0 ? (
            <div className="local-folder-empty">
              <FolderOpen size={24} />
              <h3>This folder is empty</h3>
              <p>Create a folder, create a file or import existing documents.</p>
            </div>
          ) : (
            <div className="local-entry-list">
              <div className="local-entry-head">
                <span>Name</span>
                <span>Size</span>
                <span>Modified</span>
                <span />
              </div>
              {entries.map((entry) => (
                <div key={entry.name} className="local-entry-row">
                  <button
                    type="button"
                    className="local-entry-main"
                    onClick={() =>
                      entry.kind === "directory" ? void openFolder(entry) : void openPreview(entry)
                    }
                  >
                    <span className={cn("local-entry-icon", entry.kind)}>
                      {entry.kind === "directory" ? <Folder size={17} /> : <EntryFileIcon name={entry.name} />}
                    </span>
                    <span className="local-entry-name">
                      {entry.name}
                      {entry.kind === "file" && fileKind(entry.name) === "markdown" ? (
                        <span className="badge badge-slate" style={{ marginLeft: 7 }}>MD</span>
                      ) : null}
                    </span>
                  </button>
                  <span className="local-entry-meta">
                    {entry.kind === "file" ? formatBytes(entry.size ?? 0) : "Folder"}
                  </span>
                  <span className="local-entry-meta">
                    {entry.lastModified
                      ? new Intl.DateTimeFormat("ro-RO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(entry.lastModified))
                      : "—"}
                  </span>
                  <div className="row-actions">
                    {entry.kind === "file" ? (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => openPreview(entry)}
                        aria-label={`Open ${entry.name}`}
                        title="Open in DEVSPACE"
                      >
                        <FileText size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => openFolder(entry)}
                        aria-label={`Open folder ${entry.name}`}
                        title="Open folder"
                      >
                        <FolderOpen size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => startRename(entry)}
                      aria-label={`Rename ${entry.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => setDeleteTarget(entry)}
                      aria-label={`Delete ${entry.name}`}
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Modal
        open={workspaceModal}
        onClose={() => !busy && setWorkspaceModal(false)}
        title="Create a local workspace"
        description="DEVSPACE creates a real folder at the location you choose."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setWorkspaceModal(false)} disabled={busy}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={createLocalWorkspace}
              disabled={busy || !workspaceName.trim()}
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <FolderOpen size={15} />}
              Choose location & create
            </button>
          </>
        }
      >
        <div className="form-stack">
          <div className="field">
            <label className="label" htmlFor="local-workspace-name">
              Workspace folder name
            </label>
            <input
              id="local-workspace-name"
              className="input"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="e.g. DEVSPACE Documents"
              autoFocus
            />
          </div>
          <p style={{ color: "var(--muted)", fontSize: 11, lineHeight: 1.55 }}>
            After clicking the button, Chrome/Edge asks you to choose a parent folder. DEVSPACE
            creates the new folder inside it. The browser does not reveal the full disk path.
          </p>
        </div>
      </Modal>

      <Modal
        open={folderModal}
        onClose={() => !busy && setFolderModal(false)}
        title="New folder"
        description="Create a subfolder inside the current workspace folder."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFolderModal(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={addFolder} disabled={busy || !folderName.trim()}>
              {busy ? "Creating…" : "Create folder"}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="label" htmlFor="local-folder-name">
            Folder name
          </label>
          <input
            id="local-folder-name"
            className="input"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="e.g. Notes"
            autoFocus
          />
        </div>
      </Modal>

      <Modal
        open={fileModal}
        onClose={() => !busy && setFileModal(false)}
        title="New file"
        description="Create a text-based file inside the current folder."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setFileModal(false)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={addFile} disabled={busy || !fileName.trim()}>
              {busy ? "Creating…" : "Create file"}
            </button>
          </>
        }
      >
        <div className="form-stack">
          <div className="field">
            <label className="label" htmlFor="local-file-name">
              File name
            </label>
            <input
              id="local-file-name"
              className="input"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="notes.md"
            />
            <span className="label-hint">
              Supported: .md, .txt, .json, .csv, .html, .css, .js, .ts, .py, .yml, .xml, .sql and more.
            </span>
          </div>
          <div className="field">
            <label className="label" htmlFor="local-file-content">
              Initial content
            </label>
            <textarea
              id="local-file-content"
              className="textarea local-file-content"
              value={fileContent}
              onChange={(event) => setFileContent(event.target.value)}
              spellCheck
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => !busy && setRenameTarget(null)}
        title={`Rename ${renameTarget?.kind === "directory" ? "folder" : "file"}`}
        description="The item is copied to the new name and the old name is removed."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRenameTarget(null)} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={rename} disabled={busy || !newName.trim()}>
              {busy ? "Renaming…" : "Rename"}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="label" htmlFor="local-rename-name">
            New name
          </label>
          <input
            id="local-rename-name"
            className="input"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            autoFocus
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        title={`Delete ${deleteTarget?.name ?? "item"}?`}
        description={
          deleteTarget?.kind === "directory"
            ? "The real folder and everything inside it will be permanently deleted."
            : "The real file will be permanently deleted from your computer."
        }
      />

      <Modal
        open={Boolean(preview) || previewLoading}
        onClose={closePreview}
        title={preview?.entry.name ?? "Opening document…"}
        description="Browser preview. The file stays on your computer."
        size="lg"
        footer={
          preview ? (
            <>
              {preview.data.url ? (
                <a href={preview.data.url} target="_blank" rel="noreferrer noopener" className="btn btn-secondary">
                  <ExternalLink size={14} /> Open in new tab
                </a>
              ) : null}
              {preview.data.kind === "other" ? (
                <span className="label-hint">
                  This format cannot be rendered in the browser. Use the downloaded file with its desktop app.
                </span>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={closePreview}>
                Close
              </button>
            </>
          ) : null
        }
      >
        {previewLoading ? (
          <div className="local-preview-loading">
            <Loader2 size={19} className="animate-spin" /> Reading file…
          </div>
        ) : preview ? (
          <div className="local-preview">
            {preview.data.kind === "markdown" ? (
              <div className="markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noreferrer noopener">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {preview.data.text ?? ""}
                </ReactMarkdown>
              </div>
            ) : preview.data.kind === "text" ? (
              <pre className="local-preview-pre">{preview.data.text ?? ""}</pre>
            ) : preview.data.kind === "image" && preview.data.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.data.url} alt={preview.entry.name} className="local-preview-image" />
            ) : preview.data.kind === "pdf" && preview.data.url ? (
              <iframe src={preview.data.url} title={preview.entry.name} className="local-preview-pdf" />
            ) : (
              <div className="local-preview-other">
                <File size={28} />
                <p>This document type cannot be displayed in the browser.</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function EntryFileIcon({ name }: { name: string }) {
  const extension = extensionOf(name);
  if ([".md", ".markdown", ".mdx", ".txt", ".json", ".csv"].includes(extension)) {
    return <FileText size={17} />;
  }
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(extension)) {
    return <ImageIcon size={17} />;
  }
  return <File size={17} />;
}
