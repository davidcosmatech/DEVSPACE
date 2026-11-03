import Link from "next/link";
import { ArrowUpRight, Globe2, UploadCloud } from "lucide-react";
import { Suspense } from "react";

import { BannerArt } from "@/components/dashboard/banner-art";
import { Github } from "@/components/icons/github";
import { NoteGlyph, ProjectGlyph, StatusBadge } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { PanelHeader } from "@/components/ui/page-header";
import { getGitHubDisplay } from "@/lib/github";
import { cn, relativeTime } from "@/lib/utils";
import type { Viewer } from "@/lib/auth";
import { getDashboardData } from "@/features/dashboard/queries";

export default async function DashboardPage() {
  const { requireViewer } = await import("@/lib/auth");
  const viewer: Viewer = await requireViewer();
  const data = await getDashboardData(viewer.id);
  const firstName = viewer.displayName.split(/\s+/)[0] || viewer.displayName;
  const { counts, recent } = data;

  return (
    <div className="dashboard fade-up">
      <WelcomeBanner firstName={firstName} />

      <section className="stats-grid" aria-label="Workspace statistics">
        <StatCard
          icon={<ProjectIcon />}
          label="Total Projects"
          value={counts.projects}
          trend={recent.projects}
          trendLabel="updated this week"
        />
        <StatCard
          icon={<NoteIcon />}
          label="Total Notes"
          value={counts.notes}
          trend={recent.notes}
          trendLabel="updated this week"
        />
        <Link href="/github" className="stat-card" style={{ color: "inherit" }}>
          <span className="stat-icon github-stat-icon">
            <Github size={23} />
          </span>
          <div className="stat-copy">
            <div className="stat-label">GitHub Profile</div>
            <div className="github-connected">
              {viewer.githubUsername ? (
                <>
                  Connected
                  <CheckBadge />
                </>
              ) : (
                <span style={{ fontSize: 14 }}>Not connected</span>
              )}
            </div>
            <div className={cn("stat-foot", !viewer.githubUsername && "muted")}>
              {viewer.githubUsername ? `@${viewer.githubUsername}` : "Connect your account"}
            </div>
          </div>
        </Link>
        <StatCard
          icon={<WorkspaceIcon />}
          label="Browser Workspaces"
          value={counts.workspaces}
          trend={recent.workspaces}
          trendLabel="updated this week"
          tone="info"
        />
        <StatCard
          icon={<UploadIcon />}
          label="Uploads Tracked"
          value={counts.uploads}
          trendLabel={
            counts.tracked === 0
              ? "nothing tracked yet"
              : `${counts.tracked - counts.uploads} pending upload${counts.tracked - counts.uploads === 1 ? "" : "s"}`
          }
        />
      </section>

      <section className="dashboard-grid">
        <ProjectsOverview projects={data.recentProjects} />

        <RecentNotes notes={data.recentNotes} />

        <Suspense fallback={<GitHubPanelSkeleton />}>
          <GitHubPanel viewer={viewer} />
        </Suspense>

        <UploadTracker uploaded={counts.uploads} total={counts.tracked} />

        <section className="panel quick-panel">
          <PanelHeader icon={() => <SparkIcon />} title="Quick Actions" />
          <div className="quick-items">
            <Link href="/projects?new=1" className="quick-action">
              <FolderPlusIcon /> New Project
            </Link>
            <Link href="/notes?new=1" className="quick-action">
              <NotePlusIcon /> New Note
            </Link>
            <a href="/api/export" className="quick-action">
              <DownloadIcon /> Backup Data
            </a>
            <Link href="/settings" className="quick-action">
              <SettingsIcon /> Settings
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}

function WelcomeBanner({ firstName }: { firstName: string }) {
  return (
    <section className="welcome-banner">
      <div className="welcome-copy">
        <span className="welcome-mark" aria-hidden="true">
          <svg width="66" height="66" viewBox="0 0 64 64" fill="none">
            <path
              d="M23 19 10 32l13 13"
              stroke="currentColor"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M41 19 54 32 41 45"
              stroke="currentColor"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M37 13 27 51" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h1 className="welcome-title">Welcome back, {firstName}!</h1>
          <p className="welcome-sub">Your developer workspace is ready.</p>
        </div>
      </div>
      <BannerArt />
      <div className="welcome-slogan">Code. Organise. Build.</div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  trend?: number;
  trendLabel?: string;
  tone?: "info";
}) {
  return (
    <div className="stat-card">
      <span className={cn("stat-icon", tone === "info" && "info")}>{icon}</span>
      <div className="stat-copy">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        <div className={cn("stat-foot", !trend && "muted")}>
          {trend ? <ArrowUpRight size={10} /> : null}
          {trend ? `+${trend} ${trendLabel ?? ""}` : trendLabel ?? "All time"}
        </div>
      </div>
    </div>
  );
}

function ProjectsOverview({ projects }: { projects: Awaited<ReturnType<typeof getDashboardData>>["recentProjects"] }) {
  return (
    <section className="panel projects-panel">
      <PanelHeader icon={ProjectsIcon} title="Your Projects" href="/projects" linkLabel="View All" />
      {projects.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <ProjectsIcon size={20} />
          </span>
          <h3>No projects yet</h3>
          <p>Create your first project to start tracking your developer work.</p>
          <Link href="/projects?new=1" className="btn btn-primary btn-sm" style={{ marginTop: 13 }}>
            New Project
          </Link>
        </div>
      ) : (
        <div className="project-list">
          {projects.map((project) => (
            <div key={project.id} className="project-row">
              <ProjectGlyph name={project.name} technology={project.technology} />
              <div className="project-main">
                <Link href={`/projects?project=${project.id}`} className="project-name">
                  {project.name}
                </Link>
                <div className="project-desc">{project.description || project.technology || "No description"}</div>
              </div>
              <StatusBadge status={project.status} />
              <Link
                href={`/projects?project=${project.id}`}
                className="row-menu"
                aria-label={`Manage ${project.name}`}
              >
                <MoreIcon />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentNotes({ notes }: { notes: Awaited<ReturnType<typeof getDashboardData>>["recentNotes"] }) {
  return (
    <section className="panel notes-panel">
      <PanelHeader icon={NotesIcon} title="Recent Notes" href="/notes" linkLabel="View All" />
      {notes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <NotesIcon size={20} />
          </span>
          <h3>No notes yet</h3>
          <p>Capture an idea, a snippet or a decision while it is fresh.</p>
          <Link href="/notes?new=1" className="btn btn-primary btn-sm" style={{ marginTop: 13 }}>
            New Note
          </Link>
        </div>
      ) : (
        <div className="note-list">
          {notes.map((note, index) => (
            <div key={note.id} className="note-row">
              <NoteGlyph index={index} />
              <div className="note-main">
                <Link href={`/notes?note=${note.id}`} className="note-title">
                  {note.title}
                </Link>
                <div className="note-meta">Updated {relativeTime(note.updatedAt)}</div>
              </div>
              <Link href={`/notes?note=${note.id}`} className="row-menu" aria-label={`Open ${note.title}`}>
                <MoreIcon />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function GitHubPanel({ viewer }: { viewer: Viewer }) {
  const result = await getGitHubDisplay({
    userId: viewer.id,
    username: viewer.githubUsername,
    cache: viewer.githubCache,
    cacheUpdatedAt: viewer.githubCacheUpdatedAt,
  });

  return (
    <section className="panel github-panel">
      <PanelHeader
        icon={Github}
        title="GitHub Profile"
        href="/github"
        linkLabel={result?.ok ? "View Profile" : "Open GitHub"}
      />
      {!viewer.githubUsername ? (
        <div className="empty-state" style={{ minHeight: 260 }}>
          <span className="empty-icon">
            <Github size={20} />
          </span>
          <h3>Connect GitHub</h3>
          <p>Add your public username to show verified profile statistics here.</p>
          <Link href="/github" className="btn btn-primary btn-sm" style={{ marginTop: 13 }}>
            Connect account
          </Link>
        </div>
      ) : !result ? null : !result.ok ? (
        <div className="empty-state" style={{ minHeight: 260 }}>
          <span className="empty-icon">
            <Github size={20} />
          </span>
          <h3>GitHub unavailable</h3>
          <p>{result.error}</p>
          <Link href="/github" className="btn btn-secondary btn-sm" style={{ marginTop: 13 }}>
            Retry on GitHub page
          </Link>
        </div>
      ) : (
        <div className="github-card-body">
          <div className="github-identity">
            <Avatar
              name={result.profile.name ?? result.profile.login}
              src={viewer.avatarUrl}
              size="xl"
            />
            <div style={{ minWidth: 0 }}>
              <div className="github-name">{result.profile.name ?? result.profile.login}</div>
              <div className="github-handle">@{result.profile.login}</div>
            </div>
          </div>
          <p className="github-bio">
            {result.profile.bio || `${viewer.displayName} is building in public on GitHub.`}
          </p>
          <div className="github-stats">
            <div className="github-stat">
              <strong>{result.profile.publicRepos}</strong>
              <span>Repos</span>
            </div>
            <div className="github-stat">
              <strong>{result.profile.followers}</strong>
              <span>Followers</span>
            </div>
            <div className="github-stat">
              <strong>{result.profile.following}</strong>
              <span>Following</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function GitHubPanelSkeleton() {
  return (
    <section className="panel github-panel">
      <PanelHeader icon={Github} title="GitHub Profile" />
      <div style={{ padding: "0 22px 22px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="skeleton" style={{ width: 92, height: 92, borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton" style={{ width: "60%", height: 14 }} />
            <div className="skeleton" style={{ width: "40%", height: 10, marginTop: 8 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 10, marginTop: 24 }} />
        <div className="skeleton" style={{ height: 10, width: "85%", marginTop: 8 }} />
        <div className="skeleton" style={{ height: 54, marginTop: 22 }} />
      </div>
    </section>
  );
}

function UploadTracker({ uploaded, total }: { uploaded: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((uploaded / total) * 100);
  return (
    <section className="panel tracker-panel">
      <PanelHeader icon={UploadCloud} title="Markdown Upload Tracker" href="/tracker" linkLabel="View All" />
      <div className="tracker-body">
        <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="tracker-foot">
          <span>
            {uploaded} / {total} files uploaded
          </span>
          <span className="tracker-percent">{percent}%</span>
        </div>
      </div>
    </section>
  );
}

function CheckBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#00D995" />
      <path d="m6 10 2.5 2.5L14 7" stroke="#05251b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3l2 2.5h8A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" fill="currentColor" opacity=".25" />
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3l2 2.5h8A2.5 2.5 0 0 1 21 10v7.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 12.5h8M8 15.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function NoteIcon({ size = 24 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h8.5L19 8v12.5H6z" fill="currentColor" opacity=".2" />
      <path d="M6 3.5h8.5L19 8v12.5H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M14 4v4h4M9 12h7M9 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WorkspaceIcon() {
  return <Globe2 size={23} />;
}

function UploadIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4m0 0L7 9m5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m13 2-1.2 5.8L6 9.5l5.8 1.7L13 17l1.2-5.8L20 9.5l-5.8-1.7z" fill="currentColor" />
      <path d="m5 15-.7 3.3L1 19l3.3.7L5 23l.7-3.3L9 19l-3.3-.7z" fill="currentColor" opacity=".6" />
    </svg>
  );
}

function ProjectsIcon({ size = 16 }: { size?: number | string }) {
  return <FolderIcon size={size} />;
}
function NotesIcon({ size = 16 }: { size?: number | string }) {
  return <NoteIcon size={size} />;
}
function FolderIcon({ size = 16 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}
function FolderPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10v5M9.5 12.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function NotePlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h8.5L19 8v12.5H6z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 9v5M9.5 11.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3h5l.3-3a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
