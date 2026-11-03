"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpRight,
  FolderKanban,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { Github } from "@/components/icons/github";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { PriorityBadge, ProjectGlyph, StatusBadge } from "@/components/ui/badges";
import {
  createProjectAction,
  deleteProjectAction,
  updateProjectAction,
} from "@/features/projects/actions";
import type { Project } from "@/lib/db/schema";
import { projectPriorities, projectSchema, projectStatuses, type ProjectInput } from "@/lib/validation/project";
import { safeExternalUrl } from "@/lib/utils";

export function ProjectsView({
  projects,
  initialNew,
  initialProjectId,
}: {
  projects: Project[];
  initialNew: boolean;
  initialProjectId?: string;
}) {
  const router = useRouter();
  const initialProject = initialProjectId
    ? projects.find((project) => project.id === initialProjectId) ?? null
    : null;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [technology, setTechnology] = useState("All");
  const [view, setView] = useState<"list" | "grid">("list");
  const [modalOpen, setModalOpen] = useState(initialNew || Boolean(initialProject));
  const [editing, setEditing] = useState<Project | null>(initialProject);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const technologies = useMemo(
    () =>
      Array.from(
        new Set(
          projects
            .flatMap((project) => project.technology.split(","))
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      ).sort(),
    [projects],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (status !== "All" && project.status !== status) return false;
      if (
        technology !== "All" &&
        !project.technology
          .split(",")
          .map((item) => item.trim())
          .includes(technology)
      ) {
        return false;
      }
      if (!search) return true;
      return [project.name, project.description, project.technology, project.status]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [projects, query, status, technology]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setModalOpen(true);
  }

  async function onDelete() {
    if (!deleting) return;
    const result = await deleteProjectAction(deleting.id);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete project.");
      return;
    }
    toast.success(`Deleted ${deleting.name}.`);
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        icon={FolderKanban}
        title="Projects"
        description="Everything you are planning, building and shipping — in one place."
        actions={
          <>
            <div className="segmented" aria-label="Project view">
              <button
                type="button"
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List size={14} /> List
              </button>
              <button
                type="button"
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} /> Grid
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> New Project
            </button>
          </>
        }
      />

      <div className="toolbar">
        <div className="search-box">
          <Search size={15} />
          <input
            className="input"
            placeholder="Search projects…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search projects"
          />
        </div>
        <select
          className="select filter-select"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by status"
        >
          <option value="All">All statuses</option>
          {projectStatuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className="select filter-select"
          value={technology}
          onChange={(event) => setTechnology(event.target.value)}
          aria-label="Filter by technology"
        >
          <option value="All">All technologies</option>
          {technologies.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <span className="toolbar-meta">
          {filtered.length} of {projects.length} projects
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="data-panel">
          <div className="empty-state">
            <span className="empty-icon">
              <FolderKanban size={20} />
            </span>
            <h3>{projects.length === 0 ? "Your project board is empty" : "No projects match those filters"}</h3>
            <p>
              {projects.length === 0
                ? "Create a project to track its status, stack and repository."
                : "Try a different search or clear the filters."}
            </p>
            {projects.length === 0 ? (
              <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 13 }} onClick={openCreate}>
                <Plus size={14} /> New Project
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 13 }}
                onClick={() => {
                  setQuery("");
                  setStatus("All");
                  setTechnology("All");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      ) : view === "list" ? (
        <div className="data-panel">
          <div className="data-head project-grid-cols">
            <span>Project</span>
            <span className="tech-col">Technology</span>
            <span>Status</span>
            <span>Priority</span>
            <span />
          </div>
          {filtered.map((project) => (
            <div key={project.id} className="data-row project-grid-cols">
              <div className="project-title-cell">
                <ProjectGlyph name={project.name} technology={project.technology} />
                <div style={{ minWidth: 0 }}>
                  <div className="project-name">
                    {project.name}
                    {safeExternalUrl(project.repositoryUrl) ? (
                      <a
                        href={safeExternalUrl(project.repositoryUrl)!}
                        target="_blank"
                        rel="noreferrer noopener"
                        aria-label={`Open ${project.name} repository`}
                        style={{ color: "var(--muted)", display: "inline-flex" }}
                      >
                        <Github size={12} />
                      </a>
                    ) : null}
                  </div>
                  <div className="project-desc">{project.description || "No description"}</div>
                </div>
              </div>
              <span className="tech-text tech-col">{project.technology || "—"}</span>
              <span className="status-col">
                <StatusBadge status={project.status} />
              </span>
              <span className="priority-col">
                <PriorityBadge priority={project.priority} />
              </span>
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => openEdit(project)}
                  aria-label={`Edit ${project.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setDeleting(project)}
                  aria-label={`Delete ${project.name}`}
                  style={{ color: "var(--danger)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="workspace-grid">
          {filtered.map((project) => (
            <article key={project.id} className="workspace-card" style={{ minHeight: 210 }}>
              <div className="workspace-top">
                <div className="workspace-head">
                  <ProjectGlyph name={project.name} technology={project.technology} />
                  <div className="workspace-title">
                    <h3>{project.name}</h3>
                    <p>{project.technology || "No technology set"}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <p className="workspace-desc">{project.description || "No description yet."}</p>
                <div className="meta-row" style={{ marginTop: 14 }}>
                  <span className="meta-item">
                    <PriorityBadge priority={project.priority} />
                  </span>
                  {safeExternalUrl(project.repositoryUrl) ? (
                    <a
                      href={safeExternalUrl(project.repositoryUrl)!}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="meta-item"
                      style={{ color: "var(--accent)" }}
                    >
                      Repository <ArrowUpRight size={11} />
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="workspace-foot">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(project)}>
                  <Pencil size={13} /> Edit
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleting(project)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        project={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          if (initialNew || initialProjectId) router.replace("/projects");
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        title={`Delete ${deleting?.name ?? "project"}?`}
        description="This removes the project and its metadata from your workspace."
      />
    </>
  );
}

function ProjectModal({
  open,
  project,
  onClose,
}: {
  open: boolean;
  project: Project | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Planning",
      technology: "",
      repositoryUrl: "",
      priority: "medium",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: project?.name ?? "",
      description: project?.description ?? "",
      status: (project?.status as ProjectInput["status"]) ?? "Planning",
      technology: project?.technology ?? "",
      repositoryUrl: project?.repositoryUrl ?? "",
      priority: (project?.priority as ProjectInput["priority"]) ?? "medium",
    });
  }, [open, project, reset]);

  async function submit(values: ProjectInput) {
    setSaving(true);
    try {
      const result = project
        ? await updateProjectAction(project.id, values)
        : await createProjectAction(values);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save the project.");
        return;
      }
      toast.success(project ? "Project updated." : "Project created.");
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
      title={project ? "Edit project" : "Create a new project"}
      description={
        project ? "Update the details and status of this project." : "Track what you are building next."
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="project-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </>
      }
    >
      <form id="project-form" className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
        <div className="field">
          <label className="label" htmlFor="project-name">
            Project name
          </label>
          <input
            id="project-name"
            className="input"
            placeholder="e.g. DEVSPACE"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? <span className="field-error">{errors.name.message}</span> : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="project-description">
            Description <span className="label-hint">Optional</span>
          </label>
          <textarea
            id="project-description"
            className="textarea"
            style={{ minHeight: 82 }}
            placeholder="A short summary of the project"
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          {errors.description ? (
            <span className="field-error">{errors.description.message}</span>
          ) : null}
        </div>

        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="project-status">
              Status
            </label>
            <select id="project-status" className="select" {...register("status")}>
              {projectStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="project-priority">
              Priority
            </label>
            <select id="project-priority" className="select" {...register("priority")}>
              {projectPriorities.map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="project-technology">
            Technology <span className="label-hint">Comma separated</span>
          </label>
          <input
            id="project-technology"
            className="input"
            placeholder="Next.js, TypeScript, PostgreSQL"
            {...register("technology")}
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="project-repository">
            Repository URL <span className="label-hint">Optional</span>
          </label>
          <input
            id="project-repository"
            className="input"
            placeholder="https://github.com/you/project"
            aria-invalid={Boolean(errors.repositoryUrl)}
            {...register("repositoryUrl")}
          />
          {errors.repositoryUrl ? (
            <span className="field-error">{errors.repositoryUrl.message}</span>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
