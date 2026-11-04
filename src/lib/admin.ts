/**
 * Pure admin-platform helpers shared by server code, the client UI and tests.
 * No server-only import here so the same labels and rules are used everywhere.
 */

export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const userStatuses = ["active", "suspended"] as const;
export type UserStatus = (typeof userStatuses)[number];

export const ticketStatuses = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export const ticketPriorities = ["low", "normal", "high", "urgent"] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/**
 * The database role is the single source of truth. There is deliberately no
 * email or environment allow-list: only `profiles.role = 'admin'` grants access
 * to the admin console.
 */
const staffRoles = new Set(["owner", "admin", "moderator"]);

export function isAdminUser(user: { role?: string | null }) {
  return staffRoles.has((user.role ?? "").trim().toLowerCase());
}

export function userStatusLabel(status: string | null | undefined) {
  return (status ?? "active") === "suspended" ? "Suspended" : "Active";
}

export type UsageSummary = {
  total: number;
  admins: number;
  suspended: number;
  activeToday: number;
  activeWeek: number;
  newThisWeek: number;
};

export function summarizeUsers(
  users: Array<{ role?: string | null; status?: string | null; lastSeenAt?: Date | string | null; createdAt?: Date | string | null }>,
  now = Date.now(),
): UsageSummary {
  const day = 24 * 60 * 60 * 1000;
  const week = 7 * day;
  let admins = 0;
  let suspended = 0;
  let activeToday = 0;
  let activeWeek = 0;
  let newThisWeek = 0;

  for (const user of users) {
    if (isAdminUser(user)) admins += 1;
    if ((user.status ?? "active") === "suspended") suspended += 1;

    const seen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
    if (seen && now - seen <= day) activeToday += 1;
    if (seen && now - seen <= week) activeWeek += 1;

    const created = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    if (created && now - created <= week) newThisWeek += 1;
  }

  return {
    total: users.length,
    admins,
    suspended,
    activeToday,
    activeWeek,
    newThisWeek,
  };
}

export function summarizeTicketQueue(tickets: Array<{ status: string | null | undefined }>) {
  const counts: Record<TicketStatus, number> = {
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
  for (const ticket of tickets) {
    const status = ticket.status as TicketStatus;
    if (status in counts) counts[status] += 1;
  }
  const awaiting = counts.open + counts.in_progress;
  return { ...counts, awaiting, total: tickets.length };
}

