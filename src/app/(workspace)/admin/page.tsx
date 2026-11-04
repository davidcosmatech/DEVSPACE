import type { Metadata } from "next";

import { AdminView } from "@/features/admin/admin-view";
import {
  filterUsers,
  getAdminDashboard,
  getAdminTicketsPage,
  normalizeTicketFilter,
  normalizeUserFilter,
} from "@/features/admin/queries";
import { requireAdminViewer } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Admin console" };

const validTabs = ["overview", "users", "tickets"] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string; q?: string }>;
}) {
  const admin = await requireAdminViewer();
  const params = await searchParams;
  const tab = validTabs.includes(params.tab as (typeof validTabs)[number])
    ? (params.tab as (typeof validTabs)[number])
    : "overview";
  const userFilter = normalizeUserFilter(params.filter);
  const ticketFilter = normalizeTicketFilter(params.filter);
  const search = (params.q ?? "").trim().slice(0, 80);

  const { overview, users } = await getAdminDashboard(search);
  const ticketsData = await getAdminTicketsPage(
    ticketFilter === "all" ? undefined : ticketFilter,
  );

  return (
    <AdminView
      adminName={admin.displayName}
      tab={tab}
      overview={overview}
      users={filterUsers(users, userFilter)}
      tickets={ticketsData.tickets}
      queue={ticketsData.queue}
      userFilter={userFilter}
      ticketFilter={ticketFilter}
    />
  );
}
