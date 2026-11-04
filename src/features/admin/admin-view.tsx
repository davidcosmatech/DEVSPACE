"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Check,
  Inbox,
  LifeBuoy,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import {
  deleteTicketAction,
  deleteUserAction,
  replyTicketAction,
  setUserRoleAction,
  setUserStatusAction,
} from "@/features/admin/actions";
import type {
  AdminOverview,
  AdminTicketRow,
  AdminUserRow,
  TicketFilter,
  UserFilter,
} from "@/features/admin/queries";
import {
  ticketPriorityLabels,
  ticketStatusLabels,
  ticketStatuses,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/admin";
import { cn, formatDate, formatDateTime, relativeTime } from "@/lib/utils";

type AdminTab = "overview" | "users" | "tickets";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "People" },
  { id: "tickets", label: "Tickets" },
];

const userFilters: Array<{ id: UserFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "admins", label: "Admins" },
];

const ticketFilters: Array<{ id: TicketFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
  { id: "closed", label: "Closed" },
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
  adminName,
  tab,
  overview,
  users,
  tickets,
  queue,
  userFilter,
  ticketFilter,
}: {
  adminName: string;
  tab: AdminTab;
  overview: AdminOverview;
  users: AdminUserRow[];
  tickets: AdminTicketRow[];
  queue: { open: number; in_progress: number; resolved: number; closed: number; awaiting: number; total: number };
  userFilter: UserFilter;
  ticketFilter: TicketFilter;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [activeTicket, setActiveTicket] = useState<AdminTicketRow | null>(null);
  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState<TicketStatus>("in_progress");
  const [saving, setSaving] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function openTicket(ticket: AdminTicketRow) {
    setActiveTicket(ticket);
    setReply(ticket.adminReply ?? "");
    setReplyStatus((ticket.status as TicketStatus) ?? "open");
  }

  async function changeRole(user: AdminUserRow) {
    const nextRole = user.role === "admin" ? "user" : "admin";
    setSaving(true);
    const result = await setUserRoleAction({ userId: user.id, role: nextRole });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not change the role.");
    toast.success(result.message ?? "Role updated.");
    refresh();
  }

  async function changeStatus(user: AdminUserRow) {
    const nextStatus = user.status === "suspended" ? "active" : "suspended";
    setSaving(true);
    const result = await setUserStatusAction({ userId: user.id, status: nextStatus });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not change the status.");
    toast.success(result.message ?? "Account updated.");
    refresh();
  }

  async function removeUser() {
    if (!deleteTarget) return;
    setSaving(true);
    const result = await deleteUserAction({ userId: deleteTarget.id, confirmation: deleteConfirm });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not delete the user.");
    toast.success(result.message ?? "User deleted.");
    setDeleteTarget(null);
    setDeleteConfirm("");
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

  async function removeTicket(ticket: AdminTicketRow) {
    setSaving(true);
    const result = await deleteTicketAction({ ticketId: ticket.id });
    setSaving(false);
    if (!result.ok) return toast.error(result.error ?? "Could not delete the ticket.");
    toast.success(result.message ?? "Ticket deleted.");
    setActiveTicket(null);
    refresh();
  }

  const activeUsers = overview.usage.total - overview.usage.suspended;

  return (
    <>
      <PageHeader
        eyebrow="Restricted area"
        icon={ShieldCheck}
        title="Admin console"
        description={`Signed in as ${adminName}. Real usage, people and support tickets from the workspace database.`}
        actions={
          <Link href="/support" className="btn btn-secondary">
            <LifeBuoy size={15} /> Open support
          </Link>
        }
      />

      <nav className="admin-tabs" aria-label="Admin sections">
        {tabs.map((item) => (
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
            <Metric label="People" value={overview.usage.total} hint="Registered accounts" icon={Users} />
            <Metric label="Active today" value={overview.usage.activeToday} hint="Seen in the last 24h" icon={Activity} />
            <Metric label="Active this week" value={overview.usage.activeWeek} hint="Seen in the last 7 days" icon={Activity} />
            <Metric label="New this week" value={overview.usage.newThisWeek} hint="Recent signups" icon={UserCheck} />
            <Metric label="Awaiting reply" value={queue.awaiting} hint="Open + in progress" icon={LifeBuoy} />
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
                <UsageRow label="Administrators" value={overview.usage.admins} />
                <UsageRow label="Suspended accounts" value={overview.usage.suspended} />
              </div>
            </section>

            <section className="panel admin-panel">
              <div className="admin-panel-head">
                <h2>Recent signups</h2>
                <Link href="/admin?tab=users" className="panel-link">
                  Manage <ArrowUpRight size={12} />
                </Link>
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
                    <span className={statusBadgeClass(ticket.status)}>{ticketStatusLabels[ticket.status as TicketStatus]}</span>
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
        </>
      ) : null}

      {tab === "users" ? (
        <>
          <div className="admin-toolbar">
            <form action="/admin" method="get" className="admin-search">
              <input type="hidden" name="tab" value="users" />
              <Search size={14} />
              <input
                name="q"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, username or email"
                aria-label="Search users"
              />
              <button type="submit" className="btn btn-secondary btn-sm">
                Search
              </button>
            </form>
            <div className="admin-chips">
              {userFilters.map((filter) => (
                <Link
                  key={filter.id}
                  href={`/admin?tab=users&filter=${filter.id}`}
                  className={cn("admin-chip", userFilter === filter.id && "active")}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          </div>

          <section className="panel admin-panel">
            <div className="admin-panel-head">
              <h2>{users.length} people</h2>
              <span className="admin-muted">Suspending blocks sign-in; deleting removes all owned records.</span>
            </div>
            <div className="admin-user-list">
              {users.length === 0 ? (
                <p className="admin-empty">
                  {search ? `No accounts match “${search}”.` : "No accounts match this filter."}
                </p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="admin-user-row">
                    <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                    <div className="admin-user-identity">
                      <div className="admin-user-name">
                        {user.displayName}
                        {user.role === "admin" ? (
                          <span className="badge badge-green">
                            <ShieldCheck size={10} /> Admin
                          </span>
                        ) : null}
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
                      <span>
                        {user.lastSeenAt ? `Seen ${relativeTime(user.lastSeenAt)}` : "Never signed in"}
                      </span>
                    </div>
                    <div className="admin-user-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => changeRole(user)}
                        disabled={saving}
                      >
                        <ShieldCheck size={13} /> {user.role === "admin" ? "Demote" : "Promote"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => changeStatus(user)}
                        disabled={saving}
                      >
                        {user.status === "suspended" ? <UserCheck size={13} /> : <UserX size={13} />}
                        {user.status === "suspended" ? "Reactivate" : "Suspend"}
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Delete ${user.displayName}`}
                        onClick={() => {
                          setDeleteTarget(user);
                          setDeleteConfirm("");
                        }}
                        style={{ color: "var(--danger)" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      {tab === "tickets" ? (
        <>
          <div className="admin-toolbar">
            <div className="admin-chips">
              {ticketFilters.map((filter) => (
                <Link
                  key={filter.id}
                  href={`/admin?tab=tickets&filter=${filter.id}`}
                  className={cn("admin-chip", ticketFilter === filter.id && "active")}
                >
                  {filter.label}
                  {filter.id !== "all" ? (
                    <span className="admin-chip-count">{queue[filter.id as TicketStatus]}</span>
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
                onClick={() => removeTicket(activeTicket)}
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

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.displayName ?? "user"}?`}
        description="This permanently deletes the account, profile, projects, notes, workspaces, tracked files and support tickets."
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
              disabled={saving || deleteConfirm !== "DELETE"}
              onClick={removeUser}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              user
            </button>
          </>
        }
      >
        <div className="field">
          <label className="label" htmlFor="delete-user-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="delete-user-confirm"
            className="input"
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
          <span className="label-hint">
            {deleteTarget?.email ?? `@${deleteTarget?.username}`} · {deleteTarget?.projectCount ?? 0} projects ·{" "}
            {deleteTarget?.noteCount ?? 0} notes
          </span>
        </div>
      </Modal>

    </>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
}) {
  return (
    <div className="admin-metric">
      <span className="admin-metric-icon">
        <Icon size={16} />
      </span>
      <strong>{value}</strong>
      <span className="admin-metric-label">{label}</span>
      <span className="admin-metric-hint">{hint}</span>
    </div>
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


