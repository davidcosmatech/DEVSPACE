import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import {
  summarizeTicketQueue,
  summarizeUsers,
  type TicketPriority,
  type TicketStatus,
  type UsageSummary,
} from "@/lib/admin";
import { getDb } from "@/lib/db";
import { auditLogs, notes, profiles, projects, roles, tickets } from "@/lib/db/schema";
import { rolePermissions, type PermissionKey } from "@/lib/rbac";

export type AdminUserRow = {
  id: string;
  displayName: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string;
  githubUsername: string | null;
  role: string;
  roleName: string;
  status: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  projectCount: number;
  noteCount: number;
  ticketCount: number;
};

export type AuditLogRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: Date;
  actorEmail: string | null;
  actorName: string | null;
};

export type AdminUserDetail = AdminUserRow & {
  roleDescription: string;
  rolePermissions: PermissionKey[];
  roleIsSystem: boolean;
  recentActivity: AuditLogRow[];
};

export type RoleRow = {
  key: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isSystem: boolean;
  userCount: number;
};

export type AdminTicketRow = {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  adminReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    displayName: string;
    username: string;
    email: string | null;
    avatarUrl: string | null;
  };
};

export type AdminOverview = {
  usage: UsageSummary;
  totals: { projects: number; notes: number; tickets: number; roles: number };
  queue: ReturnType<typeof summarizeTicketQueue>;
  recentUsers: AdminUserRow[];
  recentTickets: AdminTicketRow[];
};

export type AdminUserFilters = {
  search?: string;
  role?: string;
  status?: string;
  activity?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export const PAGE_SIZE = 8;

async function roleMap() {
  const db = await getDb();
  const rows = await db
    .select({
      key: roles.key,
      name: roles.name,
      description: roles.description,
      permissions: roles.permissions,
      isSystem: roles.isSystem,
    })
    .from(roles)
    .orderBy(asc(roles.name));
  return rows;
}

export async function getRolesWithCounts(): Promise<RoleRow[]> {
  const db = await getDb();
  const rows = await roleMap();
  const counts = await db
    .select({ role: profiles.role, value: count() })
    .from(profiles)
    .groupBy(profiles.role);
  const countMap = new Map(counts.map((row) => [row.role, Number(row.value)]));
  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    description: row.description,
    permissions: rolePermissions({ key: row.key, permissions: row.permissions }),
    isSystem: row.isSystem,
    userCount: countMap.get(row.key) ?? 0,
  }));
}

async function groupedCounts(table: typeof projects | typeof notes | typeof tickets) {
  const db = await getDb();
  const rows = await db
    .select({ userId: table.userId, value: count() })
    .from(table)
    .groupBy(table.userId);
  return new Map(rows.map((row) => [row.userId, Number(row.value)]));
}

function buildUserWhere(filters: AdminUserFilters) {
  const conditions = [];
  const term = (filters.search ?? "").trim();
  if (term) {
    conditions.push(
      or(
        ilike(profiles.displayName, `%${term}%`),
        ilike(profiles.username, `%${term}%`),
        ilike(profiles.email, `%${term}%`),
      ),
    );
  }
  if (filters.role && filters.role !== "all") conditions.push(eq(profiles.role, filters.role));
  if (filters.status && filters.status !== "all") conditions.push(eq(profiles.status, filters.status));

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (filters.activity === "today") {
    conditions.push(gte(profiles.lastSeenAt, new Date(now - day)));
  } else if (filters.activity === "week") {
    conditions.push(gte(profiles.lastSeenAt, new Date(now - 7 * day)));
  } else if (filters.activity === "never") {
    conditions.push(isNull(profiles.lastSeenAt));
  }

  return conditions.length ? and(...conditions) : undefined;
}

function orderForSort(sort: string | undefined) {
  switch (sort) {
    case "oldest":
      return [asc(profiles.createdAt)];
    case "name":
      return [asc(profiles.displayName)];
    case "lastSeen":
      return [sql`${profiles.lastSeenAt} desc nulls last`];
    case "newest":
    default:
      return [desc(profiles.createdAt)];
  }
}

async function mapUsers(
  rows: Array<{
    id: string;
    displayName: string;
    username: string;
    email: string | null;
    avatarUrl: string | null;
    bio: string;
    githubUsername: string | null;
    role: string;
    status: string;
    createdAt: Date;
    lastSeenAt: Date | null;
  }>,
): Promise<AdminUserRow[]> {
  const projectCounts = await groupedCounts(projects);
  const noteCounts = await groupedCounts(notes);
  const ticketCounts = await groupedCounts(tickets);
  const roleRows = await roleMap();
  const roleNames = new Map(roleRows.map((row) => [row.key, row.name]));
  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatarUrl,
    bio: row.bio,
    githubUsername: row.githubUsername,
    role: row.role,
    roleName: roleNames.get(row.role) ?? row.role,
    status: row.status,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    projectCount: projectCounts.get(row.id) ?? 0,
    noteCount: noteCounts.get(row.id) ?? 0,
    ticketCount: ticketCounts.get(row.id) ?? 0,
  }));
}

export async function getAdminUsersPage(filters: AdminUserFilters) {
  const db = await getDb();
  const where = buildUserWhere(filters);
  const pageSize = Math.min(Math.max(filters.pageSize ?? PAGE_SIZE, 1), 100);
  const totalRows = await db.select({ value: count() }).from(profiles).where(where);
  const total = Number(totalRows[0]?.value ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(filters.page ?? 1, 1), pageCount);

  const rows = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      username: profiles.username,
      email: profiles.email,
      avatarUrl: profiles.avatarUrl,
      bio: profiles.bio,
      githubUsername: profiles.githubUsername,
      role: profiles.role,
      status: profiles.status,
      createdAt: profiles.createdAt,
      lastSeenAt: profiles.lastSeenAt,
    })
    .from(profiles)
    .where(where)
    .orderBy(...orderForSort(filters.sort))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows: await mapUsers(rows),
    total,
    page,
    pageSize,
    pageCount,
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const db = await getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  const profile = rows[0];
  if (!profile) return null;

  const [user] = await mapUsers([profile]);
  const roleRows = await roleMap();
  const role = roleRows.find((row) => row.key === profile.role);

  const activity = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      actorEmail: auditLogs.actorEmail,
      actorName: profiles.displayName,
    })
    .from(auditLogs)
    .leftJoin(profiles, eq(auditLogs.actorId, profiles.id))
    .where(or(eq(auditLogs.targetId, userId), eq(auditLogs.actorId, userId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);

  return {
    ...user,
    roleDescription: role?.description ?? "",
    rolePermissions: role ? rolePermissions(role) : [],
    roleIsSystem: role?.isSystem ?? false,
    recentActivity: activity,
  };
}

async function loadTickets(options: { status?: string; statuses?: string[]; limit?: number } = {}) {
  const db = await getDb();
  const filter = options.status
    ? eq(tickets.status, options.status)
    : options.statuses?.length
      ? inArray(tickets.status, options.statuses)
      : undefined;
  const rows = await db
    .select({
      ticket: tickets,
      user: {
        id: profiles.id,
        displayName: profiles.displayName,
        username: profiles.username,
        email: profiles.email,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(tickets)
    .innerJoin(profiles, eq(tickets.userId, profiles.id))
    .where(filter)
    .orderBy(desc(tickets.createdAt))
    .limit(options.limit ?? 200);

  return rows.map(({ ticket, user }) => ({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    priority: ticket.priority,
    adminReply: ticket.adminReply,
    repliedAt: ticket.repliedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    user,
  })) satisfies AdminTicketRow[];
}

export async function getAdminTickets(status?: string) {
  if (status === "awaiting") return loadTickets({ statuses: ["open", "in_progress"] });
  return loadTickets({ status });
}

export async function getAuditLog(limit = 50) {
  const db = await getDb();
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      actorEmail: auditLogs.actorEmail,
      actorName: profiles.displayName,
    })
    .from(auditLogs)
    .leftJoin(profiles, eq(auditLogs.actorId, profiles.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = await getDb();
  const allTickets = await loadTickets({ limit: 500 });
  const allUsers = await getAdminUsersPage({ pageSize: 1000, sort: "newest" });
  const projectRows = await db.select({ value: count() }).from(projects);
  const noteRows = await db.select({ value: count() }).from(notes);
  const roleRows = await db.select({ value: count() }).from(roles);

  return {
    usage: summarizeUsers(
      allUsers.rows.map((user) => ({
        role: user.role,
        status: user.status,
        lastSeenAt: user.lastSeenAt,
        createdAt: user.createdAt,
      })),
    ),
    totals: {
      projects: Number(projectRows[0]?.value ?? 0),
      notes: Number(noteRows[0]?.value ?? 0),
      tickets: allTickets.length,
      roles: Number(roleRows[0]?.value ?? 0),
    },
    queue: summarizeTicketQueue(allTickets),
    recentUsers: allUsers.rows.slice(0, 5),
    recentTickets: allTickets.slice(0, 4),
  };
}

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  adminReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function getSupportTickets(userId: string): Promise<SupportTicket[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, userId))
    .orderBy(desc(tickets.createdAt))
    .limit(100);

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    message: row.message,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    adminReply: row.adminReply,
    repliedAt: row.repliedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export const ticketFilters = ["all", "open", "in_progress", "resolved", "closed", "awaiting"] as const;
export type TicketFilter = (typeof ticketFilters)[number];

export function normalizeTicketFilter(value: string | undefined): TicketFilter {
  return ticketFilters.includes(value as TicketFilter) ? (value as TicketFilter) : "all";
}

export const activityFilters = ["all", "today", "week", "never"] as const;
export type ActivityFilter = (typeof activityFilters)[number];

export function normalizeActivity(value: string | undefined): ActivityFilter {
  return activityFilters.includes(value as ActivityFilter) ? (value as ActivityFilter) : "all";
}

export const userSorts = ["newest", "oldest", "name", "lastSeen"] as const;
export type UserSort = (typeof userSorts)[number];

export function normalizeUserSort(value: string | undefined): UserSort {
  return userSorts.includes(value as UserSort) ? (value as UserSort) : "newest";
}

export async function getAdminDashboard() {
  const overview = await getAdminOverview();
  return overview;
}

export async function getAdminTicketsPage(status?: string) {
  const filter = normalizeTicketFilter(status);
  const ticketsRows = await loadTickets(
    filter === "all" ? {} : filter === "awaiting" ? { statuses: ["open", "in_progress"] } : { status: filter },
  );
  const all = await loadTickets({ limit: 500 });
  return { tickets: ticketsRows, queue: summarizeTicketQueue(all) };
}


