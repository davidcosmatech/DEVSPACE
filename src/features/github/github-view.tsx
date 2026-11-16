"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  GitBranch,
  GitFork,
  Loader2,
  Lock,
  RefreshCw,
  Star,
  Trash2,
  Unplug,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { Github } from "@/components/icons/github";
import { Avatar } from "@/components/ui/avatar";
import {
  deleteGitHubRepositoryAction,
  refreshGitHubAction,
  saveGitHubUsernameAction,
} from "@/features/github/actions";
import type { GitHubDisplayResult } from "@/lib/github";
import { summarizePrivateRepos } from "@/lib/github-private";
import { formatBytes, formatDate, relativeTime } from "@/lib/utils";

export function GitHubView({
  username,
  result,
  githubDeleteEnabled,
}: {
  username: string | null;
  result: GitHubDisplayResult | null;
  githubDeleteEnabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!username);
  const [value, setValue] = useState(username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);
  const [repoDeleteTarget, setRepoDeleteTarget] = useState<{
    owner: string;
    repo: string;
    isPrivate: boolean;
  } | null>(null);
  const [repoConfirmation, setRepoConfirmation] = useState("");
  const [repoDeleting, setRepoDeleting] = useState(false);
  const privateSummary = result?.ok ? summarizePrivateRepos(result.privateRepos) : null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const entered = String(formData.get("username") ?? value);
    const result = await saveGitHubUsernameAction({ username: entered });
    if (!result.ok) {
      setError(result.error ?? "Could not save that username.");
      return;
    }
    toast.success(result.username ? "GitHub profile connected." : "GitHub profile disconnected.");
    setValue(result.username ?? "");
    setEditing(false);
    startTransition(() => router.refresh());
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await refreshGitHubAction();
      router.refresh();
      toast.success("GitHub data refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  function askDeleteRepo(owner: string, repo: string, isPrivate: boolean) {
    setRepoDeleteTarget({ owner, repo, isPrivate });
    setRepoConfirmation("");
  }

  function closeDeleteRepo() {
    if (repoDeleting) return;
    setRepoDeleteTarget(null);
    setRepoConfirmation("");
  }

  async function deleteRepository() {
    if (!repoDeleteTarget || repoDeleting) return;
    setRepoDeleting(true);
    try {
      const result = await deleteGitHubRepositoryAction({
        owner: repoDeleteTarget.owner,
        repo: repoDeleteTarget.repo,
        confirmation: repoConfirmation,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete the GitHub repository.");
        return;
      }
      toast.success(
        result.message ?? `GitHub repository ${repoDeleteTarget.owner}/${repoDeleteTarget.repo} deleted.`,
      );
      setRepoDeleteTarget(null);
      setRepoConfirmation("");
      router.refresh();
    } finally {
      setRepoDeleting(false);
    }
  }
  async function disconnect() {
    const result = await saveGitHubUsernameAction({ username: "" });
    if (!result.ok) {
      toast.error(result.error ?? "Could not disconnect GitHub.");
      return;
    }
    setValue("");
    setEditing(true);
    toast.success("GitHub profile disconnected.");
    router.refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Integration"
        icon={Github}
        title="GitHub"
        description="Live profile and repositories from the GitHub REST API, plus the private repositories your read-only token can see."
        actions={
          <button type="button" className="btn btn-secondary" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        }
      />

      {editing || !username ? (
        <section className="github-hero" style={{ alignItems: "flex-start" }}>
          <span className="workspace-icon" style={{ width: 46, height: 46 }}>
            <Github size={23} />
          </span>
          <div className="github-hero-copy">
            <h2>{username ? "Change GitHub username" : "Connect your GitHub profile"}</h2>
            <p>
              DEVSPACE reads your public profile and repositories directly from GitHub. We never ask
              for a personal access token.
            </p>
            <form onSubmit={save} style={{ display: "flex", gap: 9, marginTop: 15, flexWrap: "wrap" }}>
              <input
                name="username"
                className="input"
                style={{ maxWidth: 310, flex: 1 }}
                value={value}
                onChange={(event) => setValue(event.target.value.replace(/^@/, ""))}
                placeholder="octocat"
                aria-label="GitHub username"
                autoComplete="off"
              />
              <button type="submit" className="btn btn-primary" disabled={pending || !value.trim()}>
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Github size={15} />}
                {username ? "Update" : "Connect profile"}
              </button>
              {username ? (
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              ) : null}
            </form>
            {error ? <div className="form-error" style={{ marginTop: 12 }}>{error}</div> : null}
          </div>
        </section>
      ) : (
        <section className="github-hero">
          <Avatar
            name={result?.ok ? (result.profile.name ?? result.profile.login) : username}
            src={result?.ok ? result.profile.avatarUrl : null}
            size="xl"
          />
          <div className="github-hero-copy">
            <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
              <h2>{result?.ok ? (result.profile.name ?? result.profile.login) : `@${username}`}</h2>
              <span className="badge badge-green">
                <span className="status-dot" /> Connected
              </span>
              {result?.ok && result.cached ? (
                <span className="badge badge-amber" title={result.warning}>
                  Cached snapshot
                </span>
              ) : null}
            </div>
            <p>@{result?.ok ? result.profile.login : username}</p>
            <p style={{ marginTop: 8 }}>
              {result?.ok
                ? result.profile.bio || "No public bio on GitHub."
                : "We could not load your GitHub profile right now."}
            </p>
            {result?.ok ? (
              <div className="meta-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
                <span className="meta-item">
                  <UserRound size={12} /> {result.profile.publicRepos} public repos
                </span>
                <span className="meta-item">{result.profile.followers} followers</span>
                <span className="meta-item">{result.profile.following} following</span>
                {result.privateOwner ? (
                  <span
                    className="meta-item meta-item-private"
                    title="Private repositories visible only to your account"
                  >
                    <Lock size={12} /> {privateSummary?.count ?? 0} private{" "}
                    {(privateSummary?.count ?? 0) === 1 ? "repo" : "repos"}
                  </span>
                ) : null}
                <span className="meta-item">
                  <CalendarDays size={12} /> Joined {formatDate(result.profile.createdAt)}
                </span>
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <a
              href={result?.ok ? result.profile.htmlUrl : `https://github.com/${username}`}
              target="_blank"
              rel="noreferrer noopener"
              className="btn btn-secondary btn-sm"
            >
              Open GitHub <ArrowUpRight size={13} />
            </a>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
              Change username
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={disconnect}>
              <Unplug size={13} /> Disconnect
            </button>
          </div>
        </section>
      )}

      {username && result && !result.ok ? (
        <section className="surface" style={{ marginTop: 16, padding: 22 }}>
          <div className="empty-state" style={{ minHeight: 180 }}>
            <span className="empty-icon">
              <Github size={20} />
            </span>
            <h3>GitHub data unavailable</h3>
            <p>{result.error}</p>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 13 }} onClick={refresh}>
              <RefreshCw size={13} /> Try again
            </button>
          </div>
        </section>
      ) : null}

      {username && result?.ok ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              margin: "22px 0 0",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 640, letterSpacing: "-0.02em" }}>
                Public repositories
              </h2>
              <p style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                {result.repos.length} source repositories · sorted by recent activity
              </p>
            </div>
            <a
              href={`https://github.com/${result.profile.login}?tab=repositories`}
              target="_blank"
              rel="noreferrer noopener"
              className="panel-link"
            >
              View all <ArrowUpRight size={12} />
            </a>
          </div>

          {result.repos.length === 0 ? (
            <div className="data-panel" style={{ marginTop: 12 }}>
              <div className="empty-state">
                <span className="empty-icon">
                  <Github size={20} />
                </span>
                <h3>No public source repositories</h3>
                <p>This profile has no public, non-fork repositories to display.</p>
              </div>
            </div>
          ) : (
            <div className="repo-grid">
              {result.repos.map((repo) => (
                <article key={repo.id} className="repo-card">
                  <a
                    href={repo.htmlUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="repo-card-body"
                  >
                    <div className="repo-name">
                      <Github size={14} /> {repo.name}
                    </div>
                    <p className="repo-desc">{repo.description || "No description provided."}</p>
                    <div className="repo-meta">
                      {repo.language ? (
                        <span>
                          <span className="language-dot" /> {repo.language}
                        </span>
                      ) : null}
                      <span>
                        <Star size={11} /> {repo.stars}
                      </span>
                      <span>
                        <GitFork size={11} /> {repo.forks}
                      </span>
                      <span style={{ marginLeft: "auto" }}>Updated {relativeTime(repo.updatedAt)}</span>
                    </div>
                  </a>
                  <div className="repo-card-actions">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="panel-link"
                    >
                      Open <ArrowUpRight size={12} />
                    </a>
                    {githubDeleteEnabled && result.profile.login ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm repo-delete-button"
                        onClick={() => askDeleteRepo(result.profile.login, repo.name, false)}
                        title="Delete GitHub repository"
                      >
                        <Trash2 size={13} /> Delete repo
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          {result.privateOwner ? (
            <section
              id="github-private"
              className="github-private"
              aria-labelledby="github-private-title"
            >
              <div className="github-private-head">
                <div className="github-private-title">
                  <span className="github-private-lock">
                    <Lock size={15} />
                  </span>
                  <div>
                    <h2 id="github-private-title">Private</h2>
                    <p>
                      {privateSummary?.count ?? 0} private{" "}
                      {(privateSummary?.count ?? 0) === 1 ? "repository" : "repositories"} from @
                      {result.privateOwner} · visible only in your account
                    </p>
                  </div>
                </div>
                <div className="github-private-flags">
                  <span className="badge badge-amber">
                    <Lock size={10} /> Only you
                  </span>
                  <a
                    href="https://github.com/settings/repositories"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="panel-link"
                  >
                    Manage access <ArrowUpRight size={12} />
                  </a>
                </div>
              </div>

              <div className="github-private-stats">
                <div className="github-private-stat">
                  <span>Repositories</span>
                  <strong>{privateSummary?.count ?? 0}</strong>
                </div>
                <div className="github-private-stat">
                  <span>Languages</span>
                  <strong>{privateSummary?.languages.join(" · ") || "—"}</strong>
                </div>
                <div className="github-private-stat">
                  <span>Last activity</span>
                  <strong>
                    {privateSummary?.lastUpdatedAt
                      ? relativeTime(privateSummary.lastUpdatedAt)
                      : "—"}
                  </strong>
                </div>
                <div className="github-private-stat">
                  <span>Access</span>
                  <strong>Read-only token</strong>
                </div>
              </div>

              {result.privateWarning ? (
                <p className="github-private-warning">{result.privateWarning}</p>
              ) : null}

              {result.privateRepos.length === 0 ? (
                <div className="github-private-empty">
                  <span className="empty-icon">
                    <Lock size={19} />
                  </span>
                  <div>
                    <h3>No private repositories are shared with DEVSPACE</h3>
                    <p>
                      The read-only GitHub token can only read repositories explicitly granted to
                      it. Open <strong>Manage access</strong> to add the private repositories you
                      want listed here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="private-repo-list">
                  {result.privateRepos.map((repo) => (
                    <div key={repo.id} className="private-repo-row">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="private-repo-main"
                      >
                        <div className="private-repo-name">
                          <Lock size={13} />
                          {repo.name}
                          <span className="badge badge-amber">Private</span>
                          {repo.fork ? <span className="badge badge-slate">Fork</span> : null}
                        </div>
                        <p className="private-repo-desc">
                          {repo.description || "No description provided."}
                        </p>
                        <div className="private-repo-tags">
                          {repo.language ? (
                            <span>
                              <span className="language-dot" /> {repo.language}
                            </span>
                          ) : null}
                          <span>
                            <GitBranch size={11} /> {repo.defaultBranch ?? "main"}
                          </span>
                          <span>
                            <Star size={11} /> {repo.stars}
                          </span>
                          <span>
                            <GitFork size={11} /> {repo.forks}
                          </span>
                          <span>
                            <CircleDot size={11} /> {repo.openIssues ?? 0} open issues
                          </span>
                          <span>{formatBytes((repo.sizeKb ?? 0) * 1024)}</span>
                        </div>
                      </a>
                      <div className="private-repo-side">
                        <span className="private-repo-updated">
                          Updated {relativeTime(repo.updatedAt)}
                        </span>
                        <div className="private-repo-actions">
                          <a
                            href={repo.htmlUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="btn btn-secondary btn-sm"
                          >
                            Open <ArrowUpRight size={13} />
                          </a>
                          {githubDeleteEnabled && result.privateOwner ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm repo-delete-button"
                              onClick={() =>
                                askDeleteRepo(result.privateOwner as string, repo.name, true)
                              }
                              title="Delete GitHub repository"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="github-private-note">
                Private repository metadata is read on the server with a read-only GitHub token,
                filtered to {result.privateOwner}&apos;s account and never cached in the browser or
                shown to other DEVSPACE users. Repository code is not copied into DEVSPACE.
              </p>
            </section>
          ) : null}

          <p style={{ marginTop: 18, color: "var(--muted)", fontSize: 10 }}>
            Public GitHub API data. Rate limits and outages are shown without inventing statistics.
          </p>
        </>
      ) : null}

      {!username ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <span className="empty-icon">
            <Github size={20} />
          </span>
          <h3>No GitHub profile connected</h3>
          <p>Connect a username to show live repository counts, languages and activity.</p>
        </div>
      ) : null}
      <Modal
        open={Boolean(repoDeleteTarget)}
        onClose={closeDeleteRepo}
        title="Delete GitHub repository?"
        description="This permanently deletes the repository on GitHub."
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={closeDeleteRepo}
              disabled={repoDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={deleteRepository}
              disabled={
                repoDeleting ||
                !repoDeleteTarget ||
                repoConfirmation.trim().toLowerCase() !==
                  `${repoDeleteTarget.owner}/${repoDeleteTarget.repo}`.toLowerCase()
              }
            >
              <Trash2 size={14} />
              {repoDeleting ? "Deleting…" : "Delete repository"}
            </button>
          </>
        }
      >
        {repoDeleteTarget ? (
          <div className="delete-project-body">
            <div className="delete-project-target">
              <span className="delete-project-icon">
                <Trash2 size={17} />
              </span>
              <div>
                <strong>
                  {repoDeleteTarget.owner}/{repoDeleteTarget.repo}
                </strong>
                <p>{repoDeleteTarget.isPrivate ? "Private repository" : "Public repository"}</p>
              </div>
            </div>
            <p className="delete-project-warning">
              <AlertTriangle size={15} />
              This deletes the GitHub repository, including its code, issues, pull requests and
              releases. Your DEVSPACE projects are kept and matching repository links are cleared.
            </p>
            <div className="field">
              <label className="label" htmlFor="github-page-repo-confirmation">
                Type the repository name to confirm
              </label>
              <p className="label-hint">
                <code>
                  {repoDeleteTarget.owner}/{repoDeleteTarget.repo}
                </code>
              </p>
              <input
                id="github-page-repo-confirmation"
                className="input"
                value={repoConfirmation}
                onChange={(event) => setRepoConfirmation(event.target.value)}
                placeholder={`${repoDeleteTarget.owner}/${repoDeleteTarget.repo}`}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}



