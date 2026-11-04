import "server-only";

import { count, desc, eq, ilike, or } from "drizzle-orm";

import {
  isAdminUser,
  summarizeTicketQueue,
  summarizeUsers,
  type TicketPriority,
  type TicketStatus,
  type UsageSummary,
} from "@/lib/admin";
import { getDb } from "@/lib/db";
import { notes, profiles, projects, tickets } from "@/lib/db/schema";

export type AdminUserRow = {
  id: string;
  displayName: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: Date;
  lastSeenAt: Date | null;
  projectCount: number;
  noteCount: number;
  ticketCount: number;
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
  totals: { projects: number; notes: number; tickets: number };
  queue: ReturnType<typeof summarizeTicketQueue>;
  recentUsers: AdminUserRow[];
  recentTickets: AdminTicketRow[];
};

async function groupedCounts(table: typeof projects | typeof notes | typeof tickets) {
  const db = await getDb();
  const rows = await db
    .select({ userId: table.userId, value: count() })
    .from(table)
    .groupBy(table.userId);
  return new Map(rows.map((row) => [row.userId, Number(row.value)]));
}

async function loadUsers(search?: string): Promise<AdminUserRow[]> {
  const db = await getDb();
  const term = (search ?? "").trim();
  const filter =
    term === ""
      ? undefined
      : or(
          ilike(profiles.displayName, `%${term}%`),
          ilike(profiles.username, `%${term}%`),
          ilike(profiles.email, `%${term}%`),
        );

  const rows = await db
    .select()
    .from(profiles)
    .where(filter)
    .orderBy(desc(profiles.createdAt))
    .limit(200);

  const projectCounts = await groupedCounts(projects);
  const noteCounts = await groupedCounts(notes);
  const ticketCounts = await groupedCounts(tickets);

  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatarUrl,
    role: isAdminUser(row) ? "admin" : row.role,
    status: row.status,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
    projectCount: projectCounts.get(row.id) ?? 0,
    noteCount: noteCounts.get(row.id) ?? 0,
    ticketCount: ticketCounts.get(row.id) ?? 0,
  }));
}

export async function getAdminUsers(search?: string) {
  return loadUsers(search);
}

async function loadTickets(options: { status?: string; limit?: number } = {}) {
  const db = await getDb();
  const filter = options.status ? eq(tickets.status, options.status) : undefined;
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
  return loadTickets({ status });
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = await getDb();
  const allTickets = await loadTickets({ limit: 500 });
  const allUsers = await loadUsers();
  const projectRows = await db.select({ value: count() }).from(projects);
  const noteRows = await db.select({ value: count() }).from(notes);

  return {
    usage: summarizeUsers(allUsers.map((user) => ({
      role: user.role,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
    }))),
    totals: {
      projects: Number(projectRows[0]?.value ?? 0),
      notes: Number(noteRows[0]?.value ?? 0),
      tickets: allTickets.length,
    },
    queue: summarizeTicketQueue(allTickets),
    recentUsers: allUsers.slice(0, 5),
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

export const ticketFilters = ["all", "open", "in_progress", "resolved", "closed"] as const;

export type TicketFilter = (typeof ticketFilters)[number];

export function normalizeTicketFilter(value: string | undefined): TicketFilter {
  return ticketFilters.includes(value as TicketFilter) ? (value as TicketFilter) : "all";
}

export const userFilters = ["all", "active", "suspended", "admins"] as const;

export type UserFilter = (typeof userFilters)[number];

export function normalizeUserFilter(value: string | undefined): UserFilter {
  return userFilters.includes(value as UserFilter) ? (value as UserFilter) : "all";
}

export function filterUsers(users: AdminUserRow[], filter: UserFilter) {
  if (filter === "admins") return users.filter((user) => user.role === "admin");
  if (filter === "active") return users.filter((user) => user.status !== "suspended");
  if (filter === "suspended") return users.filter((user) => user.status === "suspended");
  return users;
}

export async function getAdminDashboard(search?: string) {
  const overview = await getAdminOverview();
  const users = await getAdminUsers(search);
  return { overview, users };
}

export async function getAdminTicketsPage(status?: string) {
  const filter = normalizeTicketFilter(status);
  const ticketsRows = await loadTickets(filter === "all" ? {} : { status: filter });
  const all = await loadTickets({ limit: 500 });
  return { tickets: ticketsRows, queue: summarizeTicketQueue(all) };
}

