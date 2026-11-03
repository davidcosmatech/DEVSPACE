"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  HardDrive,
  Loader2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badges";
import { deleteTrackerFileAction } from "@/features/tracker/actions";
import type { TrackerFile } from "@/lib/db/schema";
import { cn, formatBytes, relativeTime } from "@/lib/utils";

type UploadTarget = {
  file: File;
  fileId?: string;
  filename: string;
  description: string;
};

type FilePreview = {
  file: TrackerFile;
  loading: boolean;
  content: string;
  error: string | null;
};

export function TrackerView({ files }: { files: TrackerFile[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState<UploadTarget | null>(null);
  const [deleting, setDeleting] = useState<TrackerFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<FilePreview | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploaded = files.filter((file) => file.uploadStatus === "uploaded");
  const pending = files.filter((file) => file.uploadStatus !== "uploaded");
  const totalBytes = uploaded.reduce((total, file) => total + file.fileSize, 0);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return files.filter((file) => {
      if (status !== "All" && file.uploadStatus !== status) return false;
      if (!search) return true;
      return `${file.filename} ${file.description}`.toLowerCase().includes(search);
    });
  }, [files, query, status]);

  function chooseFile(file: File | undefined) {
    if (!file) return;
    setTarget({
      file,
      filename: file.name,
      description: "",
    });
    setDescription("");
    setProgress(0);
  }

  function chooseReplacement(file: File | undefined, tracked: TrackerFile) {
    if (!file) return;
    setTarget({
      file,
      fileId: tracked.id,
      filename: tracked.filename,
      description: tracked.description,
    });
    setDescription(tracked.description);
    setProgress(0);
  }

  async function upload() {
    if (!target) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.set("file", target.file);
    formData.set("description", description);
    if (target.fileId) formData.set("fileId", target.fileId);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/tracker/upload");
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100);
            resolve();
            return;
          }
          try {
            const payload = JSON.parse(xhr.responseText) as { error?: string };
            reject(new Error(payload.error ?? "Upload failed."));
          } catch {
            reject(new Error("Upload failed."));
          }
        };
        xhr.onerror = () => reject(new Error("Network error while uploading."));
        xhr.send(formData);
      });

      toast.success(target.fileId ? "File attached to tracked document." : "Markdown file uploaded.");
      setTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    const result = await deleteTrackerFileAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete file.");
      return;
    }
    toast.success("Tracked file deleted.");
    if (preview?.file.id === deleting.id) setPreview(null);
    setDeleting(null);
    router.refresh();
  }

  async function openPreview(file: TrackerFile) {
    if (file.uploadStatus !== "uploaded") {
      setPreview({
        file,
        loading: false,
        content: "",
        error: "This tracked document does not have an uploaded file yet.",
      });
      return;
    }

    setPreview({ file, loading: true, content: "", error: null });
    try {
      const response = await fetch(`/api/tracker/${file.id}/content`, { cache: "no-store" });
      const payload = (await response.json()) as { content?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not open this file.");
      setPreview({ file, loading: false, content: payload.content ?? "", error: null });
    } catch (error) {
      setPreview({
        file,
        loading: false,
        content: "",
        error: error instanceof Error ? error.message : "Could not open this file.",
      });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Library"
        icon={UploadCloud}
        title="Markdown Tracker"
        description="Upload Markdown documents and know exactly which files are safely stored."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
            <Plus size={16} /> Add Markdown
          </button>
        }
      />

      <section className="tracker-stats">
        <MiniStat label="Tracked files" value={String(files.length)} icon={<FileText size={15} />} />
        <MiniStat label="Uploaded" value={String(uploaded.length)} icon={<CheckCircle2 size={15} />} />
        <MiniStat label="Pending" value={String(pending.length)} icon={<Clock3 size={15} />} />
        <MiniStat label="Storage used" value={formatBytes(totalBytes)} icon={<HardDrive size={15} />} />
      </section>

      <section
        className={cn("upload-zone", dragging && "dragging")}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
      >
        <span className="upload-icon">
          <UploadCloud size={24} />
        </span>
        <div className="upload-copy">
          <strong>Drop a Markdown file here, or choose one to upload</strong>
          <p>.md, .markdown, .mdx or .txt · up to 4 MB · stored privately per user</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          Browse files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.markdown,.mdx,.txt,text/markdown,text/plain"
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
          aria-label="Choose Markdown file"
        />
      </section>

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input
            className="input"
            placeholder="Search tracked files…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search tracked files"
          />
        </div>
        <select
          className="select filter-select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by upload status"
        >
          <option value="All">All files</option>
          <option value="uploaded">Uploaded</option>
          <option value="pending">Pending</option>
        </select>
        <span className="toolbar-meta">
          {uploaded.length} of {files.length} uploaded
        </span>
      </div>

      {preview ? (
        <section className="file-preview-panel" aria-live="polite">
          <header className="file-preview-head">
            <span className="file-icon">
              <FileText size={17} />
            </span>
            <div className="file-preview-copy">
              <h2>{preview.file.filename}</h2>
              <p>
                {preview.file.description || "No description"} ·{" "}
                {preview.file.fileSize ? formatBytes(preview.file.fileSize) : "Not uploaded"}
              </p>
            </div>
            {preview.file.uploadStatus === "uploaded" ? (
              <a
                href={`/api/tracker/${preview.file.id}/download`}
                className="btn btn-secondary btn-sm"
                aria-label={`Download ${preview.file.filename}`}
              >
                <Download size={13} /> Download
              </a>
            ) : null}
            <button
              type="button"
              className="icon-button"
              onClick={() => setPreview(null)}
              aria-label="Close file preview"
            >
              <X size={16} />
            </button>
          </header>
          <div className="file-preview-body">
            {preview.loading ? (
              <div className="file-preview-loading">
                <Loader2 size={18} className="animate-spin" /> Loading document…
              </div>
            ) : preview.error ? (
              <div className="file-preview-error">{preview.error}</div>
            ) : preview.content.trim() ? (
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
                  {preview.content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="file-preview-error">This document is empty.</div>
            )}
          </div>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <div className="data-panel">
          <div className="empty-state">
            <span className="empty-icon">
              <UploadCloud size={20} />
            </span>
            <h3>{files.length === 0 ? "Your Markdown library is empty" : "No files match"}</h3>
            <p>
              {files.length === 0
                ? "Upload a Markdown file to start tracking your documents."
                : "Try a different search or status filter."}
            </p>
            {files.length === 0 ? (
              <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 13 }} onClick={() => inputRef.current?.click()}>
                <Plus size={14} /> Add Markdown
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="data-panel">
          <div className="data-head tracker-table-cols">
            <span>File</span>
            <span className="tracker-desc-col">Description</span>
            <span className="tracker-size-col">Size</span>
            <span className="status-col">Status</span>
            <span className="tracker-updated-col">Updated</span>
            <span />
          </div>
          {filtered.map((file) => (
            <div key={file.id} className="data-row tracker-table-cols">
              <div className="file-cell">
                <span className="file-icon">
                  <FileText size={16} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    className="file-name file-name-button"
                    onClick={() => openPreview(file)}
                    title={`Preview ${file.filename}`}
                  >
                    <Eye size={12} />
                    {file.filename}
                  </button>
                  <div className="file-desc">
                    {file.uploadStatus === "uploaded"
                      ? `Stored privately · ${formatBytes(file.fileSize)}`
                      : "No file attached yet"}
                  </div>
                </div>
              </div>
              <span className="file-desc tracker-desc-col" style={{ whiteSpace: "normal" }}>
                {file.description || "No description"}
              </span>
              <span className="tech-text tracker-size-col">{file.fileSize ? formatBytes(file.fileSize) : "—"}</span>
              <span className="status-col">
                <StatusBadge status={file.uploadStatus} />
              </span>
              <span className="tech-text tracker-updated-col">{relativeTime(file.updatedAt)}</span>
              <div className="row-actions">
                {file.uploadStatus === "uploaded" ? (
                  <a
                    href={`/api/tracker/${file.id}/download`}
                    className="icon-button"
                    aria-label={`Download ${file.filename}`}
                    title="Download"
                  >
                    <Download size={14} />
                  </a>
                ) : (
                  <label
                    htmlFor={`replace-${file.id}`}
                    className="icon-button"
                    title="Attach the file"
                    style={{ cursor: "pointer" }}
                  >
                    <UploadCloud size={14} />
                    <input
                      id={`replace-${file.id}`}
                      type="file"
                      accept=".md,.markdown,.mdx,.txt,text/markdown,text/plain"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        chooseReplacement(event.target.files?.[0], file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setDeleting(file)}
                  aria-label={`Delete ${file.filename}`}
                  style={{ color: "var(--danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(target)}
        onClose={() => !uploading && setTarget(null)}
        title={target?.fileId ? "Attach the tracked file" : "Upload Markdown file"}
        description={
          target?.fileId
            ? "This document already has a tracker record. Attach the real file to complete it."
            : "Add a short description so you can find this document later."
        }
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setTarget(null)} disabled={uploading}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={upload} disabled={uploading}>
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {uploading ? `Uploading ${progress}%` : "Upload file"}
            </button>
          </>
        }
      >
        {target ? (
          <div className="form-stack">
            <div
              className="surface-soft"
              style={{ display: "flex", alignItems: "center", gap: 11, padding: 12 }}
            >
              <span className="file-icon">
                <FileText size={16} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="file-name">{target.filename}</div>
                <div className="file-desc">{formatBytes(target.file.size)} · ready to upload</div>
              </div>
              {!uploading ? (
                <button type="button" className="icon-button" onClick={() => setTarget(null)} aria-label="Remove selected file">
                  <X size={14} />
                </button>
              ) : null}
            </div>

            <div className="field">
              <label className="label" htmlFor="tracker-description">
                Description <span className="label-hint">Optional</span>
              </label>
              <textarea
                id="tracker-description"
                className="textarea"
                style={{ minHeight: 86 }}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this document about?"
                disabled={uploading}
              />
            </div>

            {uploading || progress > 0 ? (
              <div>
                <div className="progress-row">
                  <span>{uploading ? "Uploading to private storage" : "Uploaded"}</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title={`Delete ${deleting?.filename ?? "file"}?`}
        description="The tracker record and its stored file will both be permanently removed."
      />
    </>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="mini-stat">
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon} {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
