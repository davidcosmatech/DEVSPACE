"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ExternalLink,
  FolderKanban,
  FolderOpen,
  Globe2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import {
  createWorkspaceAction,
  createWorkspaceLinkAction,
  deleteWorkspaceAction,
  deleteWorkspaceLinkAction,
  updateWorkspaceAction,
  updateWorkspaceLinkAction,
} from "@/features/workspaces/actions";
import type { Workspace, WorkspaceLink } from "@/lib/db/schema";
import {
  workspaceLinkSchema,
  workspaceSchema,
  type WorkspaceInput,
  type WorkspaceLinkInput,
} from "@/lib/validation/workspace";
import { cn, normalizeUrl } from "@/lib/utils";

export type WorkspaceWithLinks = Workspace & {
  links: WorkspaceLink[];
  projects: { id: string; name: string; status: string }[];
};

export function WorkspacesView({ workspaces }: { workspaces: WorkspaceWithLinks[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [workspaceModal, setWorkspaceModal] = useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null,
  });
  const [linkModal, setLinkModal] = useState<{
    open: boolean;
    workspaceId: string | null;
    link: WorkspaceLink | null;
  }>({ open: false, workspaceId: null, link: null });
  const [deleteWorkspace, setDeleteWorkspace] = useState<Workspace | null>(null);
  const [deleteLink, setDeleteLink] = useState<WorkspaceLink | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(workspaces.map((workspace) => workspace.category))).sort(),
    [workspaces],
  );

  const filtered = workspaces.filter((workspace) => {
    if (category !== "All" && workspace.category !== category) return false;
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return [workspace.name, workspace.description, workspace.category, ...workspace.links.map((link) => `${link.title} ${link.url}`)]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  function openWorkspace(workspace: Workspace | null) {
    setWorkspaceModal({ open: true, workspace });
  }

  function openLink(workspaceId: string, link: WorkspaceLink | null) {
    setLinkModal({ open: true, workspaceId, link });
  }

  async function confirmDeleteWorkspace() {
    if (!deleteWorkspace) return;
    const result = await deleteWorkspaceAction(deleteWorkspace.id);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete workspace.");
      return;
    }
    toast.success(`Deleted ${deleteWorkspace.name}.`);
    setDeleteWorkspace(null);
    router.refresh();
  }

  async function confirmDeleteLink() {
    if (!deleteLink) return;
    const result = await deleteWorkspaceLinkAction(deleteLink.id);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete link.");
      return;
    }
    toast.success("Link removed.");
    setDeleteLink(null);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Collections"
        icon={Globe2}
        title="Browser Workspaces"
        description="Group the tabs, docs and tools you return to — one workspace for every mode of work."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => openWorkspace(null)}>
            <Plus size={16} /> New Workspace
          </button>
        }
      />

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input
            className="input"
            placeholder="Search workspaces and links…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search workspaces"
          />
        </div>
        <select
          className="select filter-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>
          {categories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <span className="toolbar-meta">
          {filtered.length} workspace{filtered.length === 1 ? "" : "s"} ·{" "}
          {filtered.reduce((total, workspace) => total + workspace.links.length, 0)} links
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="data-panel">
          <div className="empty-state">
            <span className="empty-icon">
              <Globe2 size={20} />
            </span>
            <h3>{workspaces.length === 0 ? "No browser workspaces yet" : "No workspaces match"}</h3>
            <p>
              {workspaces.length === 0
                ? "Create a workspace and collect the links you use for a project or routine."
                : "Try another search or category."}
            </p>
            {workspaces.length === 0 ? (
              <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 13 }} onClick={() => openWorkspace(null)}>
                <Plus size={14} /> New Workspace
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="workspace-grid">
          {filtered.map((workspace) => (
            <article key={workspace.id} className="workspace-card">
              <div className="workspace-top">
                <div className="workspace-head">
                  <span className="workspace-icon">
                    <FolderOpen size={19} />
                  </span>
                  <div className="workspace-title">
                    <h3>{workspace.name}</h3>
                    <p>
                      {workspace.category} · {workspace.projects.length}{" "}
                      {workspace.projects.length === 1 ? "project" : "projects"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => openWorkspace(workspace)}
                    aria-label={`Edit ${workspace.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setDeleteWorkspace(workspace)}
                    aria-label={`Delete ${workspace.name}`}
                    style={{ color: "var(--danger)" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="workspace-desc">
                  {workspace.description || "No description. Add a short note about this workspace."}
                </p>
                <div className="meta-row" style={{ marginTop: 12 }}>
                  <Link
                    href={`/projects?workspace=${workspace.id}`}
                    className="badge badge-slate"
                    style={{ textDecoration: "none" }}
                  >
                    <FolderKanban size={11} />
                    {workspace.projects.length}{" "}
                    {workspace.projects.length === 1 ? "project" : "projects"}
                  </Link>
                </div>
              </div>

              <div className="link-list">
                {workspace.links.length === 0 ? (
                  <div style={{ padding: "20px 8px", color: "var(--muted)", fontSize: 11, textAlign: "center" }}>
                    No links yet.
                  </div>
                ) : (
                  workspace.links.map((link) => (
                    <div key={link.id} className="link-row">
                      <span className="link-favicon">{domainLetter(link.url)}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="link-copy"
                        title={link.url}
                      >
                        <strong>{link.title}</strong>
                        <span>
                          {link.category} · {domainName(link.url)}
                        </span>
                      </a>
                      <button
                        type="button"
                        className="icon-button"
                        style={{ width: 27, height: 27 }}
                        onClick={() => openLink(workspace.id, link)}
                        aria-label={`Edit ${link.title}`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        style={{ width: 27, height: 27, color: "var(--danger)" }}
                        onClick={() => setDeleteLink(link)}
                        aria-label={`Delete ${link.title}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="workspace-foot">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => openLink(workspace.id, null)}
                >
                  <Plus size={13} /> Add link
                </button>
                <a
                  href={workspace.links[0]?.url ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={cn("btn btn-ghost btn-sm", workspace.links.length === 0 && "disabled")}
                  aria-disabled={workspace.links.length === 0}
                  onClick={(event) => {
                    if (workspace.links.length === 0) event.preventDefault();
                  }}
                >
                  <ExternalLink size={13} /> Open
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <WorkspaceModal
        open={workspaceModal.open}
        workspace={workspaceModal.workspace}
        onClose={() => setWorkspaceModal({ open: false, workspace: null })}
      />

      <LinkModal
        open={linkModal.open}
        workspaceId={linkModal.workspaceId}
        link={linkModal.link}
        workspaces={workspaces}
        onClose={() => setLinkModal({ open: false, workspaceId: null, link: null })}
      />

      <ConfirmDialog
        open={Boolean(deleteWorkspace)}
        onClose={() => setDeleteWorkspace(null)}
        onConfirm={confirmDeleteWorkspace}
        title={`Delete ${deleteWorkspace?.name ?? "workspace"}?`}
        description="The workspace and every saved link inside it will be removed."
      />

      <ConfirmDialog
        open={Boolean(deleteLink)}
        onClose={() => setDeleteLink(null)}
        onConfirm={confirmDeleteLink}
        title={`Remove “${deleteLink?.title ?? "link"}”?`}
        description="The link will be removed from this workspace. The website is not affected."
        confirmLabel="Remove link"
      />
    </>
  );
}

function WorkspaceModal({
  open,
  workspace,
  onClose,
}: {
  open: boolean;
  workspace: Workspace | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: "", description: "", category: "General" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: workspace?.name ?? "",
      description: workspace?.description ?? "",
      category: workspace?.category ?? "General",
    });
  }, [open, workspace, reset]);

  async function submit(values: WorkspaceInput) {
    setSaving(true);
    try {
      const result = workspace
        ? await updateWorkspaceAction(workspace.id, values)
        : await createWorkspaceAction(values);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save workspace.");
        return;
      }
      toast.success(workspace ? "Workspace updated." : "Workspace created.");
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={workspace ? "Edit workspace" : "New browser workspace"}
      description="Group related links by project, routine or topic."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="workspace-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : workspace ? "Save changes" : "Create workspace"}
          </button>
        </>
      }
    >
      <form id="workspace-form" className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
        <div className="field">
          <label className="label" htmlFor="workspace-name">
            Workspace name
          </label>
          <input
            id="workspace-name"
            className="input"
            placeholder="e.g. Frontend Development"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? <span className="field-error">{errors.name.message}</span> : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="workspace-description">
            Description <span className="label-hint">Optional</span>
          </label>
          <textarea
            id="workspace-description"
            className="textarea"
            style={{ minHeight: 82 }}
            placeholder="What do you use this workspace for?"
            {...register("description")}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="workspace-category">
            Category
          </label>
          <input
            id="workspace-category"
            className="input"
            placeholder="Development"
            {...register("category")}
          />
          {errors.category ? <span className="field-error">{errors.category.message}</span> : null}
        </div>
      </form>
    </Modal>
  );
}

function LinkModal({
  open,
  workspaceId,
  link,
  workspaces,
  onClose,
}: {
  open: boolean;
  workspaceId: string | null;
  link: WorkspaceLink | null;
  workspaces: WorkspaceWithLinks[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkspaceLinkInput>({
    resolver: zodResolver(workspaceLinkSchema),
    defaultValues: {
      workspaceId: workspaceId ?? "",
      title: "",
      url: "",
      category: "General",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      workspaceId: link?.workspaceId ?? workspaceId ?? workspaces[0]?.id ?? "",
      title: link?.title ?? "",
      url: link?.url ?? "",
      category: link?.category ?? "General",
    });
  }, [open, link, workspaceId, workspaces, reset]);

  async function submit(values: WorkspaceLinkInput) {
    setSaving(true);
    try {
      const payload = { ...values, url: normalizeUrl(values.url) ?? values.url };
      const result = link
        ? await updateWorkspaceLinkAction(link.id, payload)
        : await createWorkspaceLinkAction(payload);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save link.");
        return;
      }
      toast.success(link ? "Link updated." : "Link added.");
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={link ? "Edit link" : "Add a link"}
      description="URLs are validated before they are saved."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="link-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : link ? "Save changes" : "Add link"}
          </button>
        </>
      }
    >
      <form id="link-form" className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
        <div className="field">
          <label className="label" htmlFor="link-workspace">
            Workspace
          </label>
          <select id="link-workspace" className="select" {...register("workspaceId")}>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          {errors.workspaceId ? (
            <span className="field-error">{errors.workspaceId.message}</span>
          ) : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="link-title">
            Title
          </label>
          <input
            id="link-title"
            className="input"
            placeholder="e.g. Next.js Docs"
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          {errors.title ? <span className="field-error">{errors.title.message}</span> : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="link-url">
            URL
          </label>
          <input
            id="link-url"
            className="input"
            placeholder="https://nextjs.org/docs"
            aria-invalid={Boolean(errors.url)}
            {...register("url")}
          />
          {errors.url ? <span className="field-error">{errors.url.message}</span> : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="link-category">
            Category
          </label>
          <input
            id="link-category"
            className="input"
            placeholder="Documentation"
            {...register("category")}
          />
          {errors.category ? <span className="field-error">{errors.category.message}</span> : null}
        </div>
      </form>
    </Modal>
  );
}

function domainName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function domainLetter(url: string) {
  return domainName(url).charAt(0).toUpperCase() || "?";
}
