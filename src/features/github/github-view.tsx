"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  GitFork,
  Loader2,
  RefreshCw,
  Star,
  Unplug,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { Github } from "@/components/icons/github";
import { Avatar } from "@/components/ui/avatar";
import { refreshGitHubAction, saveGitHubUsernameAction } from "@/features/github/actions";
import type { GitHubResult } from "@/lib/github";
import { formatDate, relativeTime } from "@/lib/utils";

export function GitHubView({
  username,
  result,
}: {
  username: string | null;
  result: GitHubResult | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(!username);
  const [value, setValue] = useState(username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

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
        description="Live public profile and repository data from the GitHub REST API — no token required."
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
                <a
                  key={repo.id}
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="repo-card"
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
              ))}
            </div>
          )}

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
    </>
  );
}
