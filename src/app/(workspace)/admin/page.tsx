import type { Metadata } from "next";

import { AdminView } from "@/features/admin/admin-view";
import {
  getAdminOverview,
  getAdminTicketsPage,
  getAdminUserDetail,
  getAdminUsersPage,
  getAuditLog,
  getRolesWithCounts,
  normalizeActivity,
  normalizeTicketFilter,
  normalizeUserSort,
  PAGE_SIZE,
  type AdminUserDetail,
  type AdminUserRow,
} from "@/features/admin/queries";
import { requireAdminArea, getViewerRole } from "@/lib/auth/rbac";
import { rolePermissions, type PermissionKey } from "@/lib/rbac";

export const metadata: Metadata = { title: "Admin console" };

const validTabs = ["overview", "users", "roles", "tickets"] as const;

const emptyUsers = {
  rows: [] as AdminUserRow[],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  pageCount: 1,
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    role?: string;
    status?: string;
    activity?: string;
    sort?: string;
    page?: string;
    filter?: string;
    user?: string;
  }>;
}) {
  const viewer = await requireAdminArea();
  const viewerRole = await getViewerRole(viewer);
  const permissions = rolePermissions(viewerRole) as PermissionKey[];
  const can = (permission: PermissionKey) => permissions.includes(permission);

  const params = await searchParams;
  let tab = validTabs.includes(params.tab as (typeof validTabs)[number])
    ? (params.tab as (typeof validTabs)[number])
    : "overview";
  if (tab === "users" && !can("users.manage")) tab = "overview";
  if (tab === "roles" && !can("roles.manage")) tab = "overview";
  if (tab === "tickets" && !can("support.manage")) tab = "overview";

  const overview = await getAdminOverview();
  const roles = (tab === "users" || can("roles.manage")) ? await getRolesWithCounts() : [];

  const filters = {
    q: (params.q ?? "").trim().slice(0, 80),
    role: params.role ?? "all",
    status: params.status ?? "all",
    activity: normalizeActivity(params.activity),
    sort: normalizeUserSort(params.sort),
  };

  const pageNumber = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const users =
    tab === "users" && can("users.manage")
      ? await getAdminUsersPage({
          search: filters.q,
          role: filters.role,
          status: filters.status,
          activity: filters.activity,
          sort: filters.sort,
          page: pageNumber,
          pageSize: PAGE_SIZE,
        })
      : emptyUsers;

  let detail: AdminUserDetail | null = null;
  if (tab === "users" && can("users.manage") && params.user) {
    detail = await getAdminUserDetail(params.user);
  }

  const ticketFilter = normalizeTicketFilter(params.filter);
  const ticketsData =
    tab === "tickets" && can("support.manage")
      ? await getAdminTicketsPage(ticketFilter === "all" ? undefined : ticketFilter)
      : { tickets: [], queue: { open: 0, in_progress: 0, resolved: 0, closed: 0, awaiting: 0, total: 0 } };

  const audit = tab === "roles" && can("roles.manage") ? await getAuditLog(30) : [];

  return (
    <AdminView
      actorId={viewer.id}
      actorName={viewer.displayName}
      actorRoleName={viewerRole?.name ?? viewer.role}
      actorRoleKey={viewer.role}
      permissions={permissions}
      tab={tab}
      overview={overview}
      users={users}
      filters={filters}
      roles={roles}
      tickets={ticketsData.tickets}
      queue={ticketsData.queue}
      ticketFilter={ticketFilter}
      detail={detail}
      audit={audit}
    />
  );
}

