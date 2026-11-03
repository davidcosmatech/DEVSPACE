"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Check,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createNoteAction, deleteNoteAction, updateNoteAction } from "@/features/notes/actions";
import type { Note } from "@/lib/db/schema";
import { cn, relativeTime } from "@/lib/utils";

type Draft = { title: string; content: string; category: string; isPinned: boolean };

function toDraft(note: Note): Draft {
  return {
    title: note.title,
    content: note.content,
    category: note.category,
    isPinned: note.isPinned,
  };
}

export function NotesView({
  initialNotes,
  initialNew,
  initialNoteId,
}: {
  initialNotes: Note[];
  initialNew: boolean;
  initialNoteId?: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialNotes);
  const initialActiveId = initialNew
    ? null
    : initialNotes.find((note) => note.id === initialNoteId)?.id ?? initialNotes[0]?.id ?? null;
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const active = items.find((note) => note.id === activeId) ?? null;
  const [draft, setDraft] = useState<Draft | null>(() => {
    const initialNote = initialNotes.find((note) => note.id === initialActiveId);
    return initialNote ? toDraft(initialNote) : null;
  });
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);

  const draftRef = useRef<Draft | null>(draft);
  const activeIdRef = useRef<string | null>(activeId);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const initializedNewRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (initialNew && !initializedNewRef.current) {
      initializedNewRef.current = true;
      void createNote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNew]);

  const saveDraft = useCallback(async () => {
    const id = activeIdRef.current;
    const current = draftRef.current;
    if (!id || !current || !dirtyRef.current) return;

    const revision = revisionRef.current;
    setSaving(true);
    try {
      const result = await updateNoteAction(id, current);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the note.");
        return;
      }
      setItems((currentItems) =>
        currentItems.map((note) =>
          note.id === id
            ? {
                ...note,
                ...current,
                updatedAt: new Date(result.note?.updatedAt ?? Date.now()),
              }
            : note,
        ),
      );
      if (revisionRef.current === revision) {
        setDirty(false);
        dirtyRef.current = false;
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, []);

  saveRef.current = saveDraft;

  useEffect(() => {
    if (!dirty || !activeId) return;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, activeId, saveDraft]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function visibility() {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        void saveRef.current();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", visibility);
      if (dirtyRef.current) void saveRef.current();
    };
  }, []);

  function updateDraft(patch: Partial<Draft>) {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      draftRef.current = next;
      return next;
    });
    revisionRef.current += 1;
    setDirty(true);
    dirtyRef.current = true;
  }

  function selectNote(note: Note) {
    if (note.id === activeId) return;
    if (dirtyRef.current) void saveRef.current();
    setActiveId(note.id);
    activeIdRef.current = note.id;
    const nextDraft = toDraft(note);
    setDraft(nextDraft);
    draftRef.current = nextDraft;
    setDirty(false);
    dirtyRef.current = false;
    setSavedAt(null);
    setPreview(false);
    setQuery("");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/notes?note=${note.id}`);
    }
  }

  async function createNote() {
    if (dirtyRef.current) await saveRef.current();
    setCreating(true);
    try {
      const result = await createNoteAction();
      if (!result.ok || !result.note) {
        toast.error(result.error ?? "Could not create a note.");
        return;
      }
      const now = new Date();
      const note: Note = {
        id: result.note.id,
        userId: active?.userId ?? "",
        title: "Untitled note",
        content: "",
        category: "General",
        isPinned: false,
        createdAt: now,
        updatedAt: now,
      };
      setItems((current) => [note, ...current]);
      setActiveId(note.id);
      activeIdRef.current = note.id;
      setDraft(toDraft(note));
      draftRef.current = toDraft(note);
      setDirty(false);
      dirtyRef.current = false;
      setSavedAt(now);
      setPreview(false);
      setQuery("");
      router.replace(`/notes?note=${note.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function deleteNote() {
    if (!deleting) return;
    const result = await deleteNoteAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete the note.");
      return;
    }
    const remaining = items.filter((note) => note.id !== deleting.id);
    setItems(remaining);
    setDeleting(null);
    if (deleting.id === activeId) {
      const next = remaining[0] ?? null;
      setActiveId(next?.id ?? null);
      activeIdRef.current = next?.id ?? null;
      setDraft(next ? toDraft(next) : null);
      draftRef.current = next ? toDraft(next) : null;
      setDirty(false);
      dirtyRef.current = false;
      router.replace(next ? `/notes?note=${next.id}` : "/notes");
    }
    toast.success("Note deleted.");
    router.refresh();
  }

  async function togglePin() {
    if (!draft) return;
    updateDraft({ isPinned: !draft.isPinned });
    toast.success(draft.isPinned ? "Note unpinned." : "Note pinned.");
  }

  const filtered = items
    .filter((note) => {
      const search = query.trim().toLowerCase();
      if (!search) return true;
      return [note.title, note.content, note.category].join(" ").toLowerCase().includes(search);
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

  return (
    <>
      <PageHeader
        eyebrow="Knowledge"
        icon={FileText}
        title="Notes"
        description="Capture ideas, snippets and decisions in Markdown. Changes save automatically."
        actions={
          <button type="button" className="btn btn-primary" onClick={createNote} disabled={creating}>
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            New Note
          </button>
        }
      />

      <div className="notes-layout">
        <aside className="notes-sidebar">
          <div className="notes-sidebar-head">
            <div className="search-box">
              <Search size={14} />
              <input
                className="input"
                placeholder="Search notes…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search notes"
              />
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={createNote}
              aria-label="Create note"
              disabled={creating}
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="notes-list">
            {filtered.length === 0 ? (
              <div style={{ padding: "24px 12px", textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
                {items.length === 0
                  ? "No notes yet. Create your first note."
                  : "No notes match your search."}
              </div>
            ) : (
              filtered.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className={cn("note-list-item", note.id === activeId && "active")}
                  onClick={() => selectNote(note)}
                >
                  <div className="note-list-top">
                    {note.isPinned ? (
                      <Pin size={10} style={{ color: "var(--accent)", transform: "rotate(35deg)" }} />
                    ) : null}
                    <span className="note-list-title">{note.title || "Untitled note"}</span>
                  </div>
                  <div className="note-list-snippet">
                    {note.content.replace(/[#>*_`\-[\]()]/g, " ").trim() || "Empty note"}
                  </div>
                  <div className="note-list-meta">
                    <span className="badge badge-slate">{note.category}</span>
                    <span>{relativeTime(note.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="note-editor">
          {!active || !draft ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <span className="empty-icon">
                {creating ? <Loader2 size={21} className="animate-spin" /> : <FileText size={21} />}
              </span>
              <h3>{creating ? "Preparing a new note…" : "Select a note or start a new one"}</h3>
              <p>
                {creating
                  ? "Your private Markdown editor is almost ready."
                  : "Markdown notes are saved automatically to your private workspace."}
              </p>
              {!creating ? (
                <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 13 }} onClick={createNote}>
                  <Plus size={14} /> New Note
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="note-editor-bar">
                <div className="segmented" aria-label="Editor mode">
                  <button
                    type="button"
                    className={!preview ? "active" : ""}
                    onClick={() => setPreview(false)}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    className={preview ? "active" : ""}
                    onClick={() => setPreview(true)}
                  >
                    <Eye size={12} /> Preview
                  </button>
                </div>

                <div className={cn("note-save-state", !dirty && savedAt && "saved")}>
                  {saving ? (
                    <>
                      <Loader2 size={11} className="animate-spin" /> Saving…
                    </>
                  ) : dirty ? (
                    "Unsaved changes"
                  ) : savedAt ? (
                    <>
                      <Check size={11} /> Saved {relativeTime(savedAt)}
                    </>
                  ) : (
                    "All changes saved"
                  )}
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 3 }}>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={togglePin}
                    aria-label={draft.isPinned ? "Unpin note" : "Pin note"}
                    title={draft.isPinned ? "Unpin note" : "Pin note"}
                  >
                    {draft.isPinned ? (
                      <PinOff size={15} style={{ color: "var(--accent)" }} />
                    ) : (
                      <Pin size={15} />
                    )}
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => void saveDraft()}
                    aria-label="Save note now"
                    title="Save now"
                    disabled={saving}
                  >
                    <Save size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setDeleting(active)}
                    aria-label="Delete note"
                    style={{ color: "var(--danger)" }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <input
                ref={titleRef}
                className="note-title-input"
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                onBlur={() => void saveDraft()}
                placeholder="Untitled note"
                aria-label="Note title"
              />

              <div className="note-toolbar">
                <input
                  className="note-category-input"
                  value={draft.category}
                  onChange={(event) => updateDraft({ category: event.target.value })}
                  onBlur={() => void saveDraft()}
                  placeholder="Category"
                  aria-label="Note category"
                />
                <span style={{ color: "var(--muted)", fontSize: 10 }}>
                  {active.content.length.toLocaleString()} characters
                </span>
                <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 10 }}>
                  Markdown supported
                </span>
              </div>

              <div className="note-body">
                {preview ? (
                  <div className="note-preview markdown">
                    {draft.content.trim() ? (
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
                        {draft.content}
                      </ReactMarkdown>
                    ) : (
                      <p style={{ color: "var(--muted)" }}>Nothing to preview yet.</p>
                    )}
                  </div>
                ) : (
                  <textarea
                    className="note-textarea"
                    value={draft.content}
                    onChange={(event) => updateDraft({ content: event.target.value })}
                    placeholder={"# Start writing\n\nUse Markdown to structure your note…"}
                    aria-label="Note content"
                    spellCheck
                  />
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={deleteNote}
        title={`Delete “${deleting?.title ?? "note"}”?`}
        description="The note and its Markdown content will be permanently removed."
      />
    </>
  );
}
