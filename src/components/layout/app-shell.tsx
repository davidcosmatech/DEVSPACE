"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  FileText,
  Folder,
  FolderKanban,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Rocket,
  Search,
  Settings,
  Sun,
  UploadCloud,
  User,
  X,
} from "lucide-react";

import { BrandLockup } from "@/components/brand";
import { Github } from "@/components/icons/github";
import { BrowserWorkspaceIcon, TrackerIcon } from "@/components/icons/nav-icons";
import { ChatPanel } from "@/components/layout/chat-panel";
import { Avatar } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { logoutAction } from "@/features/auth/actions";
import { persistThemeAction } from "@/features/settings/actions";
import type { Viewer } from "@/lib/auth";
import type { ShellNotification } from "@/lib/queries/shell";
import { cn, relativeTime } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/workspaces", label: "Browser Workspaces", icon: BrowserWorkspaceIcon },
  { href: "/tracker", label: "Markdown Tracker", icon: TrackerIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({
  viewer,
  notifications,
  theme,
  children,
}: {
  viewer: Viewer;
  notifications: ShellNotification[];
  theme: "dark" | "light";
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      if (!localStorage.getItem("devspace-theme")) {
        localStorage.setItem("devspace-theme", theme);
      }
    } catch {
      // Storage can be unavailable.
    }
    window.dispatchEvent(new Event("devspace-theme-change"));
  }, [theme]);

  return (
    <div className="app-shell">      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 45,
            border: 0,
            background: "rgba(0,0,0,.55)",
            backdropFilter: "blur(2px)",
          }}
        />
      ) : null}

      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="app-main">
        <Header
          viewer={viewer}
          notifications={notifications}
          onOpenSidebar={() => setMobileOpen(true)}
        />
        <main className="page">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  function switchTheme() {
    const next = theme === "dark" ? "light" : "dark";
    toggleTheme();
    void persistThemeAction(next);
  }

  return (
    <aside className={cn("sidebar", open && "open")}>
      <Link href="/dashboard" className="sidebar-brand" onClick={onClose} aria-label="DEVSPACE dashboard">
        <BrandLockup size={25} markSize={46} />
      </Link>

      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn("sidebar-link", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              <item.icon size={22} strokeWidth={1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="theme-switch">
          <div className="theme-switch-icons">
            <Sun size={13} aria-hidden="true" />
          </div>
          <button
            type="button"
            className="theme-track"
            onClick={switchTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          />
          <div className="theme-switch-icons">
            <Moon size={13} aria-hidden="true" />
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-promo">
          <span className="sidebar-promo-icon">
            <Rocket size={14} />
          </span>
          <p>
            <strong>Developer Productivity</strong>
            Made Simple
          </p>
        </div>
      </div>
    </aside>
  );
}

function Header({
  viewer,
  notifications,
  onOpenSidebar,
}: {
  viewer: Viewer;
  notifications: ShellNotification[];
  onOpenSidebar: () => void;
}) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const closeChat = useCallback(() => setChatOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (bellRef.current && !bellRef.current.contains(target)) setNotificationsOpen(false);
      if (userRef.current && !userRef.current.contains(target)) setUserOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await logoutAction();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="icon-button mobile-menu"
          aria-label="Open navigation"
          onClick={onOpenSidebar}
        >
          <Menu size={20} />
        </button>

        <button
          type="button"
          className="search-trigger"
          onClick={() => {
            setSearchOpen(true);
            setChatOpen(false);
          }}
        >
          <Search size={17} />
          <span>Search projects, notes, or anything…</span>
          <span className="search-kbd">Ctrl + K</span>
        </button>

        <button
          type="button"
          className={cn("chat-trigger", chatOpen && "active")}
          onClick={() => setChatOpen((current) => !current)}
          aria-expanded={chatOpen}
          aria-label="Open workspace chat"
        >
          <MessageCircle size={17} />
          <span>Chat</span>
        </button>

        <div className="topbar-right">
          <div ref={bellRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="icon-button"
              aria-label={`Notifications${notifications.length ? `, ${notifications.length} items` : ""}`}
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((current) => !current);
                setUserOpen(false);
              }}
            >
              <Bell size={19} />
            </button>

            {notificationsOpen ? (
              <div className="dropdown" style={{ right: 0, top: 48, width: 310 }}>
                <div className="dropdown-header">Notifications</div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "16px 10px", color: "var(--muted)", fontSize: 12 }}>
                    You&apos;re all caught up.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      className="dropdown-item"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <NotificationIcon tone={notification.tone} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 550 }}>
                          {notification.title}
                        </span>
                        <span
                          style={{
                            display: "block",
                            overflow: "hidden",
                            marginTop: 1,
                            color: "var(--muted)",
                            fontSize: 10,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {notification.detail}
                        </span>
                      </span>
                      <span style={{ color: "var(--muted)", fontSize: 9 }}>
                        {relativeTime(notification.time)}
                      </span>
                    </Link>
                  ))
                )}
                <div className="dropdown-sep" />
                <Link
                  href="/settings"
                  className="dropdown-item"
                  onClick={() => setNotificationsOpen(false)}
                  style={{ color: "var(--muted)" }}
                >
                  <Settings size={14} /> Workspace settings
                </Link>
              </div>
            ) : null}
          </div>

          <div ref={userRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="topbar-user"
              aria-expanded={userOpen}
              aria-label="User menu"
              onClick={() => {
                setUserOpen((current) => !current);
                setNotificationsOpen(false);
              }}
            >
              <Avatar name={viewer.displayName} src={viewer.avatarUrl} size="md" />
              <span className="topbar-user-copy">
                <strong>{viewer.displayName}</strong>
              </span>
              <ChevronDown size={15} style={{ color: "var(--muted)" }} />
            </button>

            {userOpen ? (
              <div className="dropdown" style={{ right: 0, top: 52, width: 230 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "9px 10px 11px",
                  }}
                >
                  <Avatar name={viewer.displayName} src={viewer.avatarUrl} size="md" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{viewer.displayName}</div>
                    <div
                      style={{
                        overflow: "hidden",
                        color: "var(--muted)",
                        fontSize: 10,
                        textOverflow: "ellipsis",
                      }}
                    >
                      {viewer.email}
                    </div>
                  </div>
                </div>
                <div className="dropdown-sep" />
                <Link href="/settings" className="dropdown-item" onClick={() => setUserOpen(false)}>
                  <User size={14} /> Profile & settings
                </Link>
                <Link
                  href="/settings?tab=appearance"
                  className="dropdown-item"
                  onClick={() => setUserOpen(false)}
                >
                  <Sun size={14} /> Appearance
                </Link>
                <div className="dropdown-sep" />
                <button
                  type="button"
                  className="dropdown-item danger"
                  onClick={logout}
                  disabled={loggingOut}
                >
                  <LogOut size={14} /> {loggingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {searchOpen ? <CommandPalette onClose={() => setSearchOpen(false)} /> : null}
      {chatOpen ? <ChatPanel viewerName={viewer.displayName} onClose={closeChat} /> : null}
    </>
  );
}

function NotificationIcon({ tone }: { tone: ShellNotification["tone"] }) {
  const Icon =
    tone === "project"
      ? FolderKanban
      : tone === "note"
        ? FileText
        : tone === "github"
          ? Github
          : UploadCloud;
  return (
    <span
      style={{
        display: "grid",
        width: 28,
        height: 28,
        flexShrink: 0,
        placeItems: "center",
        borderRadius: 7,
        background: "var(--accent-soft)",
        color: "var(--accent)",
      }}
    >
      <Icon size={14} />
    </span>
  );
}

type SearchResults = {
  projects: { id: string; name: string; status: string }[];
  notes: { id: string; title: string; category: string }[];
  workspaces: { id: string; name: string; category: string }[];
  files: { id: string; filename: string }[];
};

const emptyResults: SearchResults = { projects: [], notes: [], workspaces: [], files: [] };

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [resultsFor, setResultsFor] = useState("");
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        setResults((await response.json()) as SearchResults);
        setResultsFor(trimmed);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults(emptyResults);
          setResultsFor(trimmed);
        }
      }
    }, 180);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const flat = useMemo(
    () => [
      ...results.projects.map((item) => ({
        href: `/projects?project=${item.id}`,
        id: item.id,
        label: item.name,
        group: "Projects",
      })),
      ...results.notes.map((item) => ({
        href: `/notes?note=${item.id}`,
        id: item.id,
        label: item.title,
        group: "Notes",
      })),
      ...results.workspaces.map((item) => ({
        href: "/workspaces",
        id: item.id,
        label: item.name,
        group: "Workspaces",
      })),
      ...results.files.map((item) => ({
        href: "/tracker",
        id: item.id,
        label: item.filename,
        group: "Markdown files",
      })),
    ],
    [results],
  );

  const quickLinks = [
    { label: "Go to Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "New project", href: "/projects?new=1", icon: FolderKanban },
    { label: "New note", href: "/notes?new=1", icon: FileText },
    { label: "Upload Markdown", href: "/tracker", icon: UploadCloud },
    { label: "Workspace settings", href: "/settings", icon: Settings },
  ];

  function go(href: string) {
    onClose();
    router.push(href);
  }

  const hasResults = flat.length > 0;
  const searching = query.trim().length >= 2 && resultsFor !== query.trim();

  return (
    <div className="command-overlay" onMouseDown={onClose}>
      <div className="command-panel" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input-row">
          <Search size={19} style={{ color: "var(--muted)" }} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((current) => Math.min(current + 1, flat.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((current) => Math.max(current - 1, 0));
              }
              if (event.key === "Enter" && flat[selected]) {
                event.preventDefault();
                go(flat[selected].href);
              }
            }}
            placeholder="Search projects, notes, workspaces and files…"
            aria-label="Search workspace"
          />
          {searching ? (
            <span style={{ color: "var(--muted)", fontSize: 10 }}>Searching…</span>
          ) : (
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close search">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="command-body">
          {query.trim().length < 2 ? (
            <>
              <div className="command-group-label">Quick actions</div>
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  className="command-item"
                  style={{ width: "100%", border: 0, background: "transparent" }}
                  onClick={() => go(link.href)}
                >
                  <link.icon size={15} style={{ color: "var(--accent)" }} />
                  {link.label}
                  <small>Jump</small>
                </button>
              ))}
            </>
          ) : hasResults ? (
            <>
              {results.projects.length ? (
                <>
                  <div className="command-group-label">Projects</div>
                  {results.projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects?project=${project.id}`}
                      className="command-item"
                      onClick={onClose}
                    >
                      <FolderKanban size={14} style={{ color: "var(--accent)" }} />
                      {project.name}
                      <small>{project.status}</small>
                    </Link>
                  ))}
                </>
              ) : null}
              {results.notes.length ? (
                <>
                  <div className="command-group-label">Notes</div>
                  {results.notes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/notes?note=${note.id}`}
                      className="command-item"
                      onClick={onClose}
                    >
                      <FileText size={14} style={{ color: "var(--accent)" }} />
                      {note.title}
                      <small>{note.category}</small>
                    </Link>
                  ))}
                </>
              ) : null}
              {results.workspaces.length ? (
                <>
                  <div className="command-group-label">Workspaces</div>
                  {results.workspaces.map((workspace) => (
                    <Link key={workspace.id} href="/workspaces" className="command-item" onClick={onClose}>
                      <UploadCloud size={14} style={{ color: "var(--accent)" }} />
                      {workspace.name}
                      <small>{workspace.category}</small>
                    </Link>
                  ))}
                </>
              ) : null}
              {results.files.length ? (
                <>
                  <div className="command-group-label">Markdown files</div>
                  {results.files.map((file) => (
                    <Link key={file.id} href="/tracker" className="command-item" onClick={onClose}>
                      <FileText size={14} style={{ color: "var(--accent)" }} />
                      {file.filename}
                    </Link>
                  ))}
                </>
              ) : null}
            </>
          ) : (
            <div
              style={{
                padding: "36px 20px",
                color: "var(--muted)",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              No matches for “{query}”. Try a project name, note title or filename.
            </div>
          )}
        </div>

        <div className="command-footer">
          <span>
            <span className="kbd">↑</span> <span className="kbd">↓</span> navigate
          </span>
          <span>
            <span className="kbd">↵</span> open
          </span>
          <span>
            <span className="kbd">esc</span> close
          </span>
        </div>
      </div>
    </div>
  );
}
