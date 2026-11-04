"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Inbox,
  KeyRound,
  LifeBuoy,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import {
  createRoleAction,
  deleteRoleAction,
  deleteTicketAction,
  deleteUserAction,
  replyTicketAction,
  setUserRoleAction,
  setUserStatusAction,
  updateRoleAction,
  updateUserEmailAction,
  updateUserProfileAction,
} from "@/features/admin/actions";
import type {
  AdminOverview,
  AdminTicketRow,
  AdminUserDetail,
  AdminUserRow,
  AuditLogRow,
  RoleRow,
  TicketFilter,
  UserSort,
  ActivityFilter,
} from "@/features/admin/queries";
import {
  hasPermission,
  permissionDefinitions,
  type PermissionKey,
} from "@/lib/rbac";
import {
  ticketPriorityLabels,
  ticketStatusLabels,
  ticketStatuses,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/admin";
import { cn, formatDate, formatDateTime, relativeTime } from "@/lib/utils";

type AdminTab = "overview" | "users" | "roles" | "tickets";

const tabs: Array<{ id: AdminTab; label: string; permission?: PermissionKey }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "People", permission: "users.manage" },
  { id: "roles", label: "Roles", permission: "roles.manage" },
  { id: "tickets", label: "Tickets", permission: "support.manage" },
];

function statusBadgeClass(status: string) {
  if (status === "open") return "badge badge-amber";
  if (status === "in_progress") return "badge badge-blue";
  if (status === "resolved") return "badge badge-green";
  return "badge badge-slate";
}

function priorityBadgeClass(priority: string) {
  if (priority === "urgent") return "badge badge-red";
  if (priority === "high") return "badge badge-amber";
  if (priority === "low") return "badge badge-slate";
  return "badge badge-slate";
}

export function AdminView({
  actorId,
  actorName,
  actorRoleName,
  actorRoleKey,
  permissions,
  tab,
  overview,
  users,
  filters,
  roles,
  tickets,
  queue,
  ticketFilter,
  detail,
  audit,
}: {
  actorId: string;
  actorName: string;
  actorRoleName: string;
  actorRoleKey: string;
  permissions: PermissionKey[];
  tab: AdminTab;
  overview: AdminOverview;
  users: { rows: AdminUserRow[]; total: number; page: number; pageSize: number; pageCount: number };
  filters: { q: string; role: string; status: string; activity: ActivityFilter; sort: UserSort };
  roles: RoleRow[];
  tickets: AdminTicketRow[];
  queue: { open: number; in_progress: number; resolved: number; closed: number; awaiting: number; total: number };
  ticketFilter: TicketFilter;
  detail: AdminUserDetail | null;
  audit: AuditLogRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<AdminTicketRow | null>(null);
  const [activeTicket, setActiveTicket] = useState<AdminTicketRow | null>(null);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<TicketStatus>("in_progress");
  const [roleEditor, setRoleEditor] = useState<{
    mode: "create" | "edit";
    key?: string;
    name: string;
    description: string;
    permissions: PermissionKey[];
  } | null>(null);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleRow | null>(null);
  const [newRoleKey, setNewRoleKey] = useState("");

  const canManageUsers = hasPermission({ key: "", permissions }, "users.manage");
  const canManageRoles = hasPermission({ key: "", permissions }, "roles.manage");
  const canManageSupport = hasPermission({ key: "", permissions }, "support.manage");

  const activeUsers = overview.usage.total - overview.usage.suspended;

  function refresh() {
    startTransition(() => router.refresh());
  }

  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.role !== "all") params.set("role", filters.role);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.activity !== "all") params.set("activity", filters.activity);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    return params;
  }, [filters]);

  function usersHref(overrides: Record<string, string | undefined> = {}) {
    const params = new URLSearchParams(filterParams);
    params.set("tab", "users");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    return `/admin?${params.toString()}`;
  }

  function openTicket(ticket: AdminTicketRow) {
    setActiveTicket(ticket);
    setReply(ticket.adminReply ?? "");
    setReplyStatus((ticket.status as TicketStatus) ?? "open");
  }

  function openRoleEditor(mode: "create" | "edit", role?: RoleRow) {
    setNewRoleKey(role?.key ?? "");
    setRoleEditor({
      mode,
      key: role?.key,
      name: role?.name ?? "",
      description: role?.description ?? "",
      permissions: role?.permissions ?? ["dashboard.view"],
    });
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    const result = await updateUserProfileAction({
      userId,
      displayName: String(form.get("displayName") ?? ""),
      username: String(form.get("username") ?? ""),
      bio: String(form.get("bio") ?? ""),
      githubUsername: String(form.get("githubUsername") ?? ""),
    });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not update the profile.");
    toast.success(result.message ?? "Profile updated.");
    refresh();
  }

  async function changeUserRole(userId: string, roleKey: string) {
    setSaving(true);
    const result = await setUserRoleAction({ userId, roleKey });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not change the role.");
    toast.success(result.message ?? "Role updated.");
    refresh();
  }

  async function changeUserStatus(user: AdminUserRow) {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    setSaving(true);
    const result = await setUserStatusAction({ userId: user.id, status: nextStatus });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not change the status.");
    toast.success(result.message ?? "Account updated.");
    refresh();
  }

  async function changeUserEmail(userId: string, email: string) {
    setSaving(true);
    const result = await updateUserEmailAction({ userId, email });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not update the login email.");
    toast.success(result.message ?? "Login email updated.");
    refresh();
  }

  async function removeUser(userId: string, confirmation: string) {
    setSaving(true);
    const result = await deleteUserAction({ userId, confirmation });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete the user.");
      return;
    }
    toast.success(result.message ?? "User deleted.");
    router.push("/admin?tab=users");
    refresh();
  }

  async function saveRole() {
    if (!roleEditor) return;
    setSaving(true);
    const payload = {
      name: roleEditor.name,
      description: roleEditor.description,
      permissions: roleEditor.permissions,
    };
    const result =
      roleEditor.mode === "create"
        ? await createRoleAction({ ...payload, key: newRoleKey || undefined })
        : await updateRoleAction({ ...payload, key: roleEditor.key });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not save the role.");
    toast.success(result.message ?? "Role saved.");
    setRoleEditor(null);
    refresh();
  }

  async function removeRole() {
    if (!deleteRoleTarget) return;
    setSaving(true);
    const result = await deleteRoleAction({ key: deleteRoleTarget.key });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete the role.");
      return;
    }
    toast.success(result.message ?? "Role deleted.");
    setDeleteRoleTarget(null);
    refresh();
  }

  async function saveTicket() {
    if (!activeTicket) return;
    setSaving(true);
    const result = await replyTicketAction({
      ticketId: activeTicket.id,
      status: replyStatus,
      reply,
    });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not update the ticket.");
    toast.success(result.message ?? "Ticket updated.");
    setActiveTicket(null);
    refresh();
  }

  async function removeTicket() {
    if (!deleteTicketTarget) return;
    setSaving(true);
    const result = await deleteTicketAction({ ticketId: deleteTicketTarget.id });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete the ticket.");
      return;
    }
    toast.success(result.message ?? "Ticket deleted.");
    setDeleteTicketTarget(null);
    refresh();
  }

  return (
    <>
      <PageHeader
        eyebrow="Restricted area"
        icon={ShieldCheck}
        title="Admin console"
        description={`Signed in as ${actorName} (${actorRoleName}). Real usage, people, roles and support tickets.`}
        actions={
          canManageSupport ? (
            <Link href="/admin?tab=tickets" className="btn btn-secondary">
              <LifeBuoy size={15} /> Support queue
            </Link>
          ) : undefined
        }
      />

      <nav className="admin-tabs" aria-label="Admin sections">
        {tabs
          .filter((item) => !item.permission || permissions.includes(item.permission))
          .map((item) => (
            <Link
              key={item.id}
              href={`/admin?tab=${item.id}`}
              className={cn("admin-tab", tab === item.id && "active")}
              aria-current={tab === item.id ? "page" : undefined}
            >
              {item.label}
              {item.id === "tickets" && queue.awaiting > 0 ? (
                <span className="admin-tab-count">{queue.awaiting}</span>
              ) : null}
            </Link>
          ))}
        <span className="admin-tabs-meta">
          {pending ? <Loader2 size={13} className="animate-spin" /> : null}
          {overview.usage.total} accounts · {activeUsers} active
        </span>
      </nav>

      {tab === "overview" ? (
        <>
          <section className="admin-metrics" aria-label="Usage metrics">
            <MetricLink
              href="/admin?tab=users"
              label="People"
              value={overview.usage.total}
              hint="All registered accounts"
              icon={Users}
            />
            <MetricLink
              href="/admin?tab=users&activity=today"
              label="Active today"
              value={overview.usage.activeToday}
              hint="Seen in the last 24h"
              icon={Activity}
            />
            <MetricLink
              href="/admin?tab=users&activity=week"
              label="Active this week"
              value={overview.usage.activeWeek}
              hint="Seen in the last 7 days"
              icon={Activity}
            />
            <MetricLink
              href="/admin?tab=users&sort=newest"
              label="New this week"
              value={overview.usage.newThisWeek}
              hint="Recent signups"
              icon={UserCheck}
            />
            <MetricLink
              href="/admin?tab=tickets&filter=awaiting"
              label="Awaiting reply"
              value={queue.awaiting}
              hint="Open + in progress"
              icon={LifeBuoy}
            />
          </section>

          <div className="admin-columns">
            <section className="panel admin-panel">
              <div className="admin-panel-head">
                <h2>Product usage</h2>
                <span className="badge badge-slate">Live</span>
              </div>
              <div className="admin-usage">
                <UsageRow label="Projects created" value={overview.totals.projects} />
                <UsageRow label="Notes written" value={overview.totals.notes} />
                <UsageRow label="Support tickets" value={overview.totals.tickets} />
                <UsageRow label="Roles configured" value={overview.totals.roles} />
                <UsageRow label="Suspended accounts" value={overview.usage.suspended} />
              </div>
            </section>

            <section className="panel admin-panel">
              <div className="admin-panel-head">
                <h2>Recent signups</h2>
                {canManageUsers ? (
                  <Link href="/admin?tab=users" className="panel-link">
                    Manage <ArrowUpRight size={12} />
                  </Link>
                ) : null}
              </div>
              <div className="admin-list">
                {overview.recentUsers.length === 0 ? (
                  <p className="admin-empty">No accounts yet.</p>
                ) : (
                  overview.recentUsers.map((user) => (
                    <div key={user.id} className="admin-list-row">
                      <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                      <span className="admin-list-copy">
                        <strong>{user.displayName}</strong>
                        <span>@{user.username}</span>
                      </span>
                      <span className="admin-list-meta">Joined {relativeTime(user.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {canManageSupport ? (
            <section className="panel admin-panel" style={{ marginTop: 16 }}>
              <div className="admin-panel-head">
                <h2>Latest tickets</h2>
                <Link href="/admin?tab=tickets" className="panel-link">
                  Open queue <ArrowUpRight size={12} />
                </Link>
              </div>
              <div className="admin-list">
                {overview.recentTickets.length === 0 ? (
                  <p className="admin-empty">No tickets yet. Users can open one from Support.</p>
                ) : (
                  overview.recentTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      className="admin-list-row admin-list-button"
                      onClick={() => openTicket(ticket)}
                    >
                      <span className={statusBadgeClass(ticket.status)}>
                        {ticketStatusLabels[ticket.status as TicketStatus]}
                      </span>
                      <span className="admin-list-copy">
                        <strong>{ticket.subject}</strong>
                        <span>
                          {ticket.user.displayName} · {relativeTime(ticket.createdAt)}
                        </span>
                      </span>
                      <span className={priorityBadgeClass(ticket.priority)}>
                        {ticketPriorityLabels[ticket.priority as TicketPriority]}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {tab === "users" && canManageUsers ? (
        <>
          <form action="/admin" method="get" className="admin-filter-bar">
            <input type="hidden" name="tab" value="users" />
            <label className="admin-search">
              <Search size={14} />
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Search username, name or email"
                aria-label="Search users"
              />
            </label>
            <select name="role" defaultValue={filters.role} className="select admin-select" aria-label="Filter by role">
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={filters.status} className="select admin-select" aria-label="Filter by status">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select name="activity" defaultValue={filters.activity} className="select admin-select" aria-label="Filter by activity">
              <option value="all">Any activity</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="never">Never signed in</option>
            </select>
            <select name="sort" defaultValue={filters.sort} className="select admin-select" aria-label="Sort users">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="lastSeen">Last active</option>
            </select>
            <button type="submit" className="btn btn-secondary btn-sm">
              Apply
            </button>
            <Link href="/admin?tab=users" className="btn btn-ghost btn-sm">
              Reset
            </Link>
          </form>

          <section className="panel admin-panel">
            <div className="admin-panel-head">
              <h2>{users.total} people</h2>
              <span className="admin-muted">
                Showing {users.rows.length} of {users.total} · page {users.page} / {users.pageCount}
              </span>
            </div>
            <div className="admin-user-list">
              {users.rows.length === 0 ? (
                <p className="admin-empty">No accounts match these filters.</p>
              ) : (
                users.rows.map((user) => (
                  <div key={user.id} className="admin-user-row">
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                    <div className="admin-user-identity">
                      <div className="admin-user-name">
                        {user.displayName}
                        <span className="badge badge-slate">{user.roleName}</span>
                        {user.status === "suspended" ? (
                          <span className="badge badge-red">Suspended</span>
                        ) : null}
                      </div>
                      <div className="admin-user-handle">
                        @{user.username} · {user.email ?? "no email on file"}
                      </div>
                    </div>
                    <div className="admin-user-counts">
                      <span>
                        <strong>{user.projectCount}</strong> projects
                      </span>
                      <span>
                        <strong>{user.noteCount}</strong> notes
                      </span>
                      <span>
                        <strong>{user.ticketCount}</strong> tickets
                      </span>
                    </div>
                    <div className="admin-user-times">
                      <span>Joined {formatDate(user.createdAt)}</span>
                      <span>{user.lastSeenAt ? `Seen ${relativeTime(user.lastSeenAt)}` : "Never signed in"}</span>
                    </div>
                    <div className="admin-user-actions">
                      <Link
                        href={usersHref({ user: user.id, page: String(users.page) })}
                        className="btn btn-secondary btn-sm"
                      >
                        <ArrowUpRight size={13} /> Profile
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
            {users.pageCount > 1 ? (
              <div className="admin-pagination">
                <Link
                  href={usersHref({ page: String(Math.max(1, users.page - 1)) })}
                  className={cn("btn btn-ghost btn-sm", users.page <= 1 && "disabled")}
                  aria-disabled={users.page <= 1}
                >
                  <ArrowLeft size={14} /> Previous
                </Link>
                <span>
                  Page {users.page} of {users.pageCount}
                </span>
                <Link
                  href={usersHref({ page: String(Math.min(users.pageCount, users.page + 1)) })}
                  className={cn("btn btn-ghost btn-sm", users.page >= users.pageCount && "disabled")}
                  aria-disabled={users.page >= users.pageCount}
                >
                  Next <ArrowRight size={14} />
                </Link>
              </div>
            ) : null}
          </section>

          {detail ? (
            <UserDetailModal
              key={detail.id}
              detail={detail}
              roles={roles}
              permissions={permissions}
              actorId={actorId}
              actorRoleKey={actorRoleKey}
              saving={saving}
              onClose={() => router.push(usersHref({ user: undefined }))}
              onSaveProfile={saveProfile}
              onChangeRole={changeUserRole}
              onChangeEmail={changeUserEmail}
              onToggleStatus={changeUserStatus}
              onDelete={removeUser}
            />
          ) : null}
        </>
      ) : null}

      {tab === "roles" && canManageRoles ? (
        <>
          <div className="admin-toolbar">
            <div>
              <h2 className="admin-section-title">Roles & permissions</h2>
              <p className="admin-muted">
                {roles.length} roles · {roles.filter((role) => !role.isSystem).length} custom
              </p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => openRoleEditor("create")}>
              <Plus size={15} /> New role
            </button>
          </div>

          <div className="admin-role-grid">
            {roles.map((role) => (
              <article key={role.key} className="admin-role-card">
                <header>
                  <span className="admin-role-icon">
                    <KeyRound size={15} />
                  </span>
                  <div>
                    <h3>
                      {role.name}
                      {role.isSystem ? (
                        <span className="badge badge-slate">System</span>
                      ) : (
                        <span className="badge badge-purple">Custom</span>
                      )}
                    </h3>
                    <p className="admin-role-key">
                      {role.key} · {role.userCount} user{role.userCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </header>
                <p className="admin-role-description">{role.description || "No description."}</p>
                <div className="admin-permission-chips">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="admin-permission-chip">
                      {permissionDefinitions.find((item) => item.key === permission)?.label ?? permission}
                    </span>
                  ))}
                </div>
                <footer>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => openRoleEditor("edit", role)}
                    disabled={role.key === "owner"}
                    title={role.key === "owner" ? "The Owner role is locked" : undefined}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  {!role.isSystem ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: "var(--danger)" }}
                      onClick={() => setDeleteRoleTarget(role)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  ) : null}
                </footer>
              </article>
            ))}
          </div>

          <section className="panel admin-panel" style={{ marginTop: 16 }}>
            <div className="admin-panel-head">
              <h2>Audit log</h2>
              <span className="admin-muted">Latest administrative changes</span>
            </div>
            <div className="admin-audit">
              {audit.length === 0 ? (
                <p className="admin-empty">No administrative changes recorded yet.</p>
              ) : (
                audit.map((entry) => (
                  <div key={entry.id} className="admin-audit-row">
                    <span className="admin-audit-action">{entry.action.replace(/[._]/g, " ")}</span>
                    <span className="admin-audit-detail">
                      {entry.actorName ?? entry.actorEmail ?? "Unknown admin"} · {entry.targetType}
                      {entry.targetId ? ` ${entry.targetId.slice(0, 8)}` : ""}
                    </span>
                    <span className="admin-audit-time">{formatDateTime(entry.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      {tab === "tickets" && canManageSupport ? (
        <>
          <div className="admin-toolbar">
            <div className="admin-chips">
              {(["all", "awaiting", "open", "in_progress", "resolved", "closed"] as TicketFilter[]).map((filter) => (
                <Link
                  key={filter}
                  href={`/admin?tab=tickets&filter=${filter}`}
                  className={cn("admin-chip", ticketFilter === filter && "active")}
                >
                  {filter === "all"
                    ? "All"
                    : filter === "awaiting"
                      ? "Awaiting"
                      : filter === "in_progress"
                        ? "In progress"
                        : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  {filter === "awaiting" ? (
                    <span className="admin-chip-count">{queue.awaiting}</span>
                  ) : filter !== "all" ? (
                    <span className="admin-chip-count">{queue[filter as TicketStatus]}</span>
                  ) : null}
                </Link>
              ))}
            </div>
            <span className="admin-muted">
              {queue.awaiting} awaiting · {queue.total} total
            </span>
          </div>

          <section className="panel admin-panel">
            <div className="admin-panel-head">
              <h2>Support queue</h2>
              <span className="admin-muted">Reply from here; the user sees it on their Support page.</span>
            </div>
            <div className="admin-ticket-list">
              {tickets.length === 0 ? (
                <div className="admin-empty-state">
                  <span className="empty-icon">
                    <Inbox size={20} />
                  </span>
                  <h3>Nothing in this queue</h3>
                  <p>Tickets appear here as soon as users submit them from Support.</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className="admin-ticket-row"
                    onClick={() => openTicket(ticket)}
                  >
                    <span className={statusBadgeClass(ticket.status)}>
                      {ticketStatusLabels[ticket.status as TicketStatus]}
                    </span>
                    <span className="admin-ticket-main">
                      <span className="admin-ticket-subject">{ticket.subject}</span>
                      <span className="admin-ticket-meta">
                        {ticket.user.displayName} ({ticket.user.email ?? `@${ticket.user.username}`}) ·{" "}
                        {relativeTime(ticket.createdAt)}
                      </span>
                    </span>
                    <span className={priorityBadgeClass(ticket.priority)}>
                      {ticketPriorityLabels[ticket.priority as TicketPriority]}
                    </span>
                    <span className="admin-ticket-reply">
                      {ticket.adminReply ? "Replied" : "Awaiting reply"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      <Modal
        open={Boolean(activeTicket)}
        onClose={() => setActiveTicket(null)}
        title={activeTicket?.subject ?? "Ticket"}
        description={
          activeTicket
            ? `${activeTicket.user.displayName} · ${formatDateTime(activeTicket.createdAt)}`
            : undefined
        }
        size="lg"
        footer={
          activeTicket ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setDeleteTicketTarget(activeTicket)}
                disabled={saving}
                style={{ color: "var(--danger)", marginRight: "auto" }}
              >
                <Trash2 size={14} /> Delete ticket
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveTicket(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveTicket} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save reply
              </button>
            </>
          ) : null
        }
      >
        {activeTicket ? (
          <div className="admin-ticket-detail">
            <div className="admin-ticket-flags">
              <span className={priorityBadgeClass(activeTicket.priority)}>
                {ticketPriorityLabels[activeTicket.priority as TicketPriority]} priority
              </span>
              <span className={statusBadgeClass(activeTicket.status)}>
                {ticketStatusLabels[activeTicket.status as TicketStatus]}
              </span>
            </div>
            <p className="admin-ticket-message">{activeTicket.message}</p>
            {activeTicket.adminReply ? (
              <div className="admin-ticket-previous">
                <strong>Previous reply</strong>
                <p>{activeTicket.adminReply}</p>
                {activeTicket.repliedAt ? <span>{formatDateTime(activeTicket.repliedAt)}</span> : null}
              </div>
            ) : null}
            <div className="form-stack" style={{ marginTop: 16 }}>
              <div className="field">
                <label className="label" htmlFor="admin-reply">
                  Reply to the user
                </label>
                <textarea
                  id="admin-reply"
                  className="textarea"
                  rows={5}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Explain what changed, or ask for more detail."
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="admin-status">
                  Status
                </label>
                <select
                  id="admin-status"
                  className="select"
                  value={replyStatus}
                  onChange={(event) => setReplyStatus(event.target.value as TicketStatus)}
                >
                  {ticketStatuses.map((status) => (
                    <option key={status} value={status}>
                      {ticketStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTicketTarget)}
        onClose={() => setDeleteTicketTarget(null)}
        onConfirm={removeTicket}
        title={`Delete ticket “${deleteTicketTarget?.subject ?? ""}”?`}
        description="The ticket and its reply are permanently removed."
        confirmLabel="Delete ticket"
      />

      <Modal
        open={Boolean(roleEditor)}
        onClose={() => setRoleEditor(null)}
        title={roleEditor?.mode === "create" ? "Create a custom role" : `Edit ${roleEditor?.name ?? "role"}`}
        description="Permissions are enforced on the server for every action."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setRoleEditor(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={saveRole}
              disabled={saving || !roleEditor?.name.trim() || (roleEditor?.permissions.length ?? 0) === 0}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save role
            </button>
          </>
        }
      >
        {roleEditor ? (
          <div className="form-stack">
            <div className="field">
              <label className="label" htmlFor="role-name">
                Role name
              </label>
              <input
                id="role-name"
                className="input"
                value={roleEditor.name}
                onChange={(event) => setRoleEditor({ ...roleEditor, name: event.target.value })}
              />
            </div>
            {roleEditor.mode === "create" ? (
              <div className="field">
                <label className="label" htmlFor="role-key">
                  Role key <span className="label-hint">Optional — generated from the name</span>
                </label>
                <input
                  id="role-key"
                  className="input"
                  value={newRoleKey}
                  onChange={(event) => setNewRoleKey(event.target.value.toLowerCase())}
                  placeholder="e.g. support-lead"
                  autoComplete="off"
                />
              </div>
            ) : (
              <div className="field">
                <label className="label">Role key</label>
                <input className="input" value={roleEditor.key ?? ""} disabled />
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="role-description">
                Description
              </label>
              <textarea
                id="role-description"
                className="textarea"
                rows={2}
                value={roleEditor.description}
                onChange={(event) => setRoleEditor({ ...roleEditor, description: event.target.value })}
              />
            </div>
            <div className="field">
              <span className="label">Permissions</span>
              <div className="admin-permission-grid">
                {permissionDefinitions.map((permission) => {
                  const checked = roleEditor.permissions.includes(permission.key);
                  return (
                    <label key={permission.key} className="admin-permission-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setRoleEditor({
                            ...roleEditor,
                            permissions: event.target.checked
                              ? [...roleEditor.permissions, permission.key]
                              : roleEditor.permissions.filter((key) => key !== permission.key),
                          })
                        }
                      />
                      <span>
                        <strong>{permission.label}</strong>
                        <small>{permission.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRoleTarget)}
        onClose={() => setDeleteRoleTarget(null)}
        onConfirm={removeRole}
        title={`Delete the ${deleteRoleTarget?.name ?? "custom"} role?`}
        description="Custom roles can only be deleted when no user is assigned to them."
        confirmLabel="Delete role"
      />
    </>
  );
}

function MetricLink({
  href,
  label,
  value,
  hint,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <Link href={href} className="admin-metric admin-metric-link" aria-label={`${label}: ${value}. View details.`}>
      <span className="admin-metric-icon">
        <Icon size={16} />
      </span>
      <strong>{value}</strong>
      <span className="admin-metric-label">{label}</span>
      <span className="admin-metric-hint">{hint}</span>
      <ArrowUpRight size={13} className="admin-metric-arrow" />
    </Link>
  );
}

function UsageRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="admin-usage-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UserDetailModal({
  detail,
  roles,
  permissions,
  actorId,
  actorRoleKey,
  saving,
  onClose,
  onSaveProfile,
  onChangeRole,
  onChangeEmail,
  onToggleStatus,
  onDelete,
}: {
  detail: AdminUserDetail;
  roles: RoleRow[];
  permissions: PermissionKey[];
  actorId: string;
  actorRoleKey: string;
  saving: boolean;
  onClose: () => void;
  onSaveProfile: (event: React.FormEvent<HTMLFormElement>, userId: string) => void;
  onChangeRole: (userId: string, roleKey: string) => void;
  onChangeEmail: (userId: string, email: string) => void;
  onToggleStatus: (user: AdminUserRow) => void;
  onDelete: (userId: string, confirmation: string) => void;
}) {
  const [roleKey, setRoleKey] = useState(detail.role);
  const [email, setEmail] = useState(detail.email ?? "");
  const [confirmation, setConfirmation] = useState("");
  const canManageRoles = permissions.includes("roles.manage");
  const isSelf = detail.id === actorId;
  const assignableRoles = actorRoleKey === "owner" ? roles : roles.filter((role) => role.key !== "owner");

  return (
    <Modal
      open
      onClose={onClose}
      title={detail.displayName}
      description={`@${detail.username} · ${detail.email ?? "no email on file"}`}
      size="lg"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="admin-detail">
        <div className="admin-detail-head">
          <Avatar name={detail.displayName} src={detail.avatarUrl} size="lg" />
          <div>
            <h3>{detail.displayName}</h3>
            <p>
              @{detail.username} · {detail.roleName} ·{" "}
              {detail.status === "suspended" ? "Suspended" : "Active"}
            </p>
          </div>
        </div>

        <dl className="admin-detail-grid">
          <div>
            <dt>User ID</dt>
            <dd className="admin-mono">{detail.id}</dd>
          </div>
          <div>
            <dt>Username</dt>
            <dd>@{detail.username}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{detail.email ?? "—"}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{detail.roleName}</dd>
          </div>
          <div>
            <dt>Account status</dt>
            <dd>{detail.status === "suspended" ? "Suspended" : "Active"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{formatDateTime(detail.createdAt)}</dd>
          </div>
          <div>
            <dt>Last active</dt>
            <dd>{detail.lastSeenAt ? formatDateTime(detail.lastSeenAt) : "Never"}</dd>
          </div>
          <div>
            <dt>GitHub</dt>
            <dd>{detail.githubUsername ? `@${detail.githubUsername}` : "—"}</dd>
          </div>
          <div>
            <dt>Bio</dt>
            <dd>{detail.bio || "—"}</dd>
          </div>
          <div>
            <dt>Content</dt>
            <dd>
              {detail.projectCount} projects · {detail.noteCount} notes · {detail.ticketCount} tickets
            </dd>
          </div>
        </dl>

        {canManageRoles ? (
          <section className="admin-detail-section">
            <h4>Role assignment</h4>
            <div className="admin-detail-inline">
              <select
                className="select"
                value={roleKey}
                onChange={(event) => setRoleKey(event.target.value)}
                aria-label="Assign role"
              >
                {assignableRoles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={saving || isSelf || roleKey === detail.role}
                onClick={() => onChangeRole(detail.id, roleKey)}
              >
                <ShieldCheck size={14} /> Save role
              </button>
            </div>
            <p className="admin-muted">
              Permissions: {detail.rolePermissions.join(", ") || "none"}
            </p>
          </section>
        ) : null}

        <section className="admin-detail-section">
          <h4>Account</h4>
          <div className="admin-detail-inline">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onToggleStatus(detail)}
              disabled={saving || isSelf}
            >
              {detail.status === "suspended" ? <UserCheck size={14} /> : <UserX size={14} />}
              {detail.status === "suspended" ? "Reactivate account" : "Suspend account"}
            </button>
            <span className="admin-muted">
              {detail.status === "suspended"
                ? "Suspended accounts cannot sign in."
                : "Suspension blocks sign-in immediately."}
            </span>
          </div>
        </section>

        <section className="admin-detail-section">
          <h4>Login email</h4>
          <p className="admin-muted">
            Used to sign in through Supabase Auth. The Auth UUID and every owned record stay
            attached.
          </p>
          <div className="admin-detail-inline">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Login email"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving || email.trim().toLowerCase() === (detail.email ?? "").toLowerCase()}
              onClick={() => onChangeEmail(detail.id, email.trim().toLowerCase())}
            >
              <ShieldCheck size={14} /> Update email
            </button>
          </div>
          <p className="admin-muted">
            The new address is confirmed immediately because custom SMTP is not configured. If you
            change your own address, the session is refreshed automatically.
          </p>
        </section>

        <section className="admin-detail-section">
          <h4>Edit permitted information</h4>
          <form className="admin-edit-form" onSubmit={(event) => onSaveProfile(event, detail.id)}>
            <div className="field">
              <label className="label" htmlFor="detail-display-name">
                Display name
              </label>
              <input id="detail-display-name" name="displayName" className="input" defaultValue={detail.displayName} />
            </div>
            <div className="field">
              <label className="label" htmlFor="detail-username">
                Username
              </label>
              <input id="detail-username" name="username" className="input" defaultValue={detail.username} />
            </div>
            <div className="field">
              <label className="label" htmlFor="detail-github">
                GitHub username
              </label>
              <input
                id="detail-github"
                name="githubUsername"
                className="input"
                defaultValue={detail.githubUsername ?? ""}
              />
            </div>
            <div className="field admin-edit-bio">
              <label className="label" htmlFor="detail-bio">
                Bio
              </label>
              <textarea id="detail-bio" name="bio" className="textarea" rows={2} defaultValue={detail.bio} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              Save profile
            </button>
          </form>
        </section>

        <section className="admin-detail-section">
          <h4>Account activity</h4>
          <div className="admin-audit">
            {detail.recentActivity.length === 0 ? (
              <p className="admin-muted">No administrative activity recorded for this account.</p>
            ) : (
              detail.recentActivity.map((entry) => (
                <div key={entry.id} className="admin-audit-row">
                  <span className="admin-audit-action">{entry.action.replace(/[._]/g, " ")}</span>
                  <span className="admin-audit-detail">
                    by {entry.actorName ?? entry.actorEmail ?? "system"}
                  </span>
                  <span className="admin-audit-time">{formatDateTime(entry.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="admin-detail-section admin-danger-zone">
          <h4>Delete account</h4>
          <p className="admin-muted">This permanently removes the account and all owned records.</p>
          <div className="admin-detail-inline">
            <input
              className="input"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Type DELETE"
              aria-label="Type DELETE to confirm"
            />
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={saving || isSelf || confirmation !== "DELETE"}
              onClick={() => onDelete(detail.id, confirmation)}
            >
              <Trash2 size={14} /> Delete user
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}



