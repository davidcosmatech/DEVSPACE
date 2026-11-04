/**
 * Role-based access control definitions and pure decision helpers.
 *
 * This module is intentionally free of database and server-only imports so the
 * exact same rules power the UI labels, the server guards and the unit tests.
 */

export const permissionDefinitions = [
  {
    key: "dashboard.view",
    label: "View dashboard",
    description: "Open the workspace dashboard and basic pages.",
  },
  {
    key: "analytics.view",
    label: "View analytics",
    description: "See usage statistics and the admin overview.",
  },
  {
    key: "users.manage",
    label: "Manage users",
    description: "Activate, deactivate, edit and delete user accounts.",
  },
  {
    key: "roles.manage",
    label: "Manage roles",
    description: "Create roles, edit permissions and assign roles to users.",
  },
  {
    key: "content.manage",
    label: "Manage content",
    description: "Create, edit and delete projects, notes and workspaces.",
  },
  {
    key: "support.manage",
    label: "Manage support requests",
    description: "Open the support queue, reply and change ticket status.",
  },
  {
    key: "settings.manage",
    label: "Manage application settings",
    description: "Change workspace-wide administrative settings.",
  },
] as const;

export type PermissionKey = (typeof permissionDefinitions)[number]["key"];

export const permissionKeys = permissionDefinitions.map((permission) => permission.key);

/** Permissions that grant access to the admin area and its navigation entries. */
export const adminAreaPermissions: PermissionKey[] = [
  "analytics.view",
  "users.manage",
  "roles.manage",
  "support.manage",
  "settings.manage",
];

export type RoleTemplate = {
  key: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isSystem: boolean;
};

const allPermissions = [...permissionKeys] as PermissionKey[];

export const systemRoleTemplates: RoleTemplate[] = [
  {
    key: "owner",
    name: "Owner",
    description: "Full control of the workspace, including role management and ownership transfer.",
    permissions: allPermissions,
    isSystem: true,
  },
  {
    key: "admin",
    name: "Admin",
    description: "Administers people, roles, content and support requests.",
    permissions: allPermissions,
    isSystem: true,
  },
  {
    key: "moderator",
    name: "Moderator",
    description: "Manages people, support requests and content; cannot change roles.",
    permissions: ["dashboard.view", "analytics.view", "users.manage", "content.manage", "support.manage"],
    isSystem: true,
  },
  {
    key: "editor",
    name: "Editor",
    description: "Creates and edits workspace content.",
    permissions: ["dashboard.view", "content.manage"],
    isSystem: true,
  },
  {
    key: "member",
    name: "Member",
    description: "Standard workspace member with content access.",
    permissions: ["dashboard.view", "content.manage"],
    isSystem: true,
  },
  {
    key: "viewer",
    name: "Viewer",
    description: "Read-only workspace access.",
    permissions: ["dashboard.view"],
    isSystem: true,
  },
];

export type RoleLike = {
  key: string;
  name?: string;
  permissions?: string[] | null;
};

export function isValidPermission(value: string): value is PermissionKey {
  return (permissionKeys as string[]).includes(value);
}

/** Drops unknown or duplicated permission keys and keeps the canonical order. */
export function normalizePermissions(values: readonly string[] | null | undefined): PermissionKey[] {
  const set = new Set((values ?? []).filter(isValidPermission));
  return permissionKeys.filter((key) => set.has(key as PermissionKey)) as PermissionKey[];
}

export function rolePermissions(role: RoleLike | null | undefined): PermissionKey[] {
  if (!role) return [];
  if (role.key === "owner") return allPermissions;
  return normalizePermissions(role.permissions);
}

export function hasPermission(
  role: RoleLike | null | undefined,
  permission: PermissionKey,
): boolean {
  return rolePermissions(role).includes(permission);
}

export function hasAdminAreaAccess(role: RoleLike | null | undefined): boolean {
  return adminAreaPermissions.some((permission) => hasPermission(role, permission));
}

export function isOwnerRole(role: RoleLike | string | null | undefined): boolean {
  const key = typeof role === "string" ? role : role?.key;
  return key === "owner";
}

/** Only an Owner may grant or revoke the Owner role. */
export function canAssignRole(
  actorRole: RoleLike | null | undefined,
  targetRoleKey: string,
): boolean {
  if (targetRoleKey === "owner") return isOwnerRole(actorRole);
  return hasPermission(actorRole, "roles.manage");
}

export type UserModificationInput = {
  action: "role" | "status" | "delete";
  actorId: string;
  actorRole: RoleLike | null | undefined;
  targetId: string;
  targetRole: RoleLike | string | null | undefined;
  targetIsLastOwner: boolean;
  nextRoleKey?: string;
  nextStatus?: string;
};

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Central protection rules for destructive user actions:
 * - nobody can change their own role/status or delete their own account here;
 * - the last Owner can never be demoted, suspended or deleted;
 * - only Owners may modify another Owner;
 * - role changes must be granted through `canAssignRole`.
 */
export function canModifyUser(input: UserModificationInput): GuardResult {
  if (input.actorId === input.targetId) {
    return {
      allowed: false,
      reason:
        input.action === "role"
          ? "You cannot change your own role."
          : input.action === "status"
            ? "You cannot change your own account status."
            : "Use Settings → Account to delete your own account.",
    };
  }

  const targetIsOwner = isOwnerRole(input.targetRole);
  const actorIsOwner = isOwnerRole(input.actorRole);

  if (targetIsOwner && !actorIsOwner) {
    return { allowed: false, reason: "Only an Owner can manage another Owner account." };
  }

  if (targetIsOwner && input.targetIsLastOwner) {
    return {
      allowed: false,
      reason:
        input.action === "role"
          ? "The last Owner cannot be demoted."
          : input.action === "status"
            ? "The last Owner cannot be suspended."
            : "The last Owner cannot be deleted.",
    };
  }

  if (input.action === "role") {
    if (!input.nextRoleKey) return { allowed: false, reason: "Choose a role." };
    if (!canAssignRole(input.actorRole, input.nextRoleKey)) {
      return { allowed: false, reason: "Only an Owner can grant the Owner role." };
    }
    if (targetIsOwner && !isOwnerRole(input.nextRoleKey) && !actorIsOwner) {
      return { allowed: false, reason: "Only an Owner can demote an Owner." };
    }
  }

  return { allowed: true };
}

export function canDeleteRole(
  role: { key: string; isSystem?: boolean | null },
  assignedUsers: number,
): GuardResult {
  if (role.isSystem) return { allowed: false, reason: "System roles cannot be deleted." };
  if (assignedUsers > 0) {
    return { allowed: false, reason: "Move the assigned users to another role first." };
  }
  return { allowed: true };
}

export function isValidRoleKey(key: string): boolean {
  return /^[a-z][a-z0-9_-]{2,39}$/.test(key);
}

export function slugifyRoleKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
