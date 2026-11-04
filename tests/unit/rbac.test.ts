import { describe, expect, it } from "vitest";

import {
  canAssignRole,
  canDeleteRole,
  canModifyUser,
  hasAdminAreaAccess,
  hasPermission,
  isValidRoleKey,
  normalizePermissions,
  rolePermissions,
  slugifyRoleKey,
  systemRoleTemplates,
} from "@/lib/rbac";

const owner = { key: "owner", permissions: [] };
const admin = { key: "admin", permissions: ["roles.manage", "users.manage", "analytics.view"] };
const moderator = { key: "moderator", permissions: ["users.manage", "support.manage"] };
const member = { key: "member", permissions: ["dashboard.view", "content.manage"] };
const viewer = { key: "viewer", permissions: ["dashboard.view"] };

const ownerId = "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f";
const adminId = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("permission model", () => {
  it("gives the Owner every permission", () => {
    expect(hasPermission(owner, "roles.manage")).toBe(true);
    expect(hasPermission(owner, "settings.manage")).toBe(true);
    expect(rolePermissions(owner)).toHaveLength(7);
  });

  it("honours the stored permissions for every other role", () => {
    expect(hasPermission(admin, "users.manage")).toBe(true);
    expect(hasPermission(admin, "settings.manage")).toBe(false);
    expect(hasPermission(member, "content.manage")).toBe(true);
    expect(hasPermission(viewer, "content.manage")).toBe(false);
    expect(hasPermission(null, "dashboard.view")).toBe(false);
  });

  it("grants admin-area access only to staff permissions", () => {
    expect(hasAdminAreaAccess(owner)).toBe(true);
    expect(hasAdminAreaAccess(admin)).toBe(true);
    expect(hasAdminAreaAccess(moderator)).toBe(true);
    expect(hasAdminAreaAccess(member)).toBe(false);
    expect(hasAdminAreaAccess(viewer)).toBe(false);
  });

  it("normalises unknown and duplicate permissions", () => {
    expect(normalizePermissions(["users.manage", "unknown", "users.manage", "analytics.view"])).toEqual([
      "analytics.view",
      "users.manage",
    ]);
  });

  it("ships the six system roles", () => {
    expect(systemRoleTemplates.map((role) => role.key)).toEqual([
      "owner",
      "admin",
      "moderator",
      "editor",
      "member",
      "viewer",
    ]);
  });
});

describe("role assignment", () => {
  it("only lets an Owner grant the Owner role", () => {
    expect(canAssignRole(owner, "owner")).toBe(true);
    expect(canAssignRole(admin, "owner")).toBe(false);
    expect(canAssignRole(moderator, "owner")).toBe(false);
  });

  it("requires roles.manage for any other role", () => {
    expect(canAssignRole(admin, "moderator")).toBe(true);
    expect(canAssignRole(moderator, "member")).toBe(false);
    expect(canAssignRole(member, "member")).toBe(false);
  });

  it("validates custom role keys", () => {
    expect(isValidRoleKey("support-lead")).toBe(true);
    expect(isValidRoleKey("Support Lead")).toBe(false);
    expect(isValidRoleKey("ab")).toBe(false);
    expect(slugifyRoleKey("Support Lead")).toBe("support-lead");
  });
});

describe("user protection rules", () => {
  it("blocks changing your own role, status or account", () => {
    for (const action of ["role", "status", "delete"] as const) {
      const result = canModifyUser({
        action,
        actorId: ownerId,
        actorRole: owner,
        targetId: ownerId,
        targetRole: owner,
        targetIsLastOwner: false,
        nextRoleKey: action === "role" ? "member" : undefined,
      });
      expect(result.allowed).toBe(false);
    }
  });

  it("protects the last Owner from demotion, suspension and deletion", () => {
    for (const action of ["role", "status", "delete"] as const) {
      const result = canModifyUser({
        action,
        actorId: ownerId,
        actorRole: owner,
        targetId: adminId,
        targetRole: owner,
        targetIsLastOwner: true,
        nextRoleKey: action === "role" ? "admin" : undefined,
      });
      expect(result.allowed).toBe(false);
    }
  });

  it("only allows an Owner to manage another Owner", () => {
    const result = canModifyUser({
      action: "status",
      actorId: adminId,
      actorRole: admin,
      targetId: ownerId,
      targetRole: owner,
      targetIsLastOwner: false,
    });
    expect(result.allowed).toBe(false);
  });

  it("allows a valid role change by an authorised admin", () => {
    const result = canModifyUser({
      action: "role",
      actorId: ownerId,
      actorRole: owner,
      targetId: adminId,
      targetRole: member,
      targetIsLastOwner: false,
      nextRoleKey: "moderator",
    });
    expect(result.allowed).toBe(true);
  });

  it("refuses to grant the Owner role through a regular admin", () => {
    const result = canModifyUser({
      action: "role",
      actorId: adminId,
      actorRole: admin,
      targetId: ownerId,
      targetRole: member,
      targetIsLastOwner: false,
      nextRoleKey: "owner",
    });
    expect(result.allowed).toBe(false);
  });
});

describe("custom role deletion", () => {
  it("never deletes system roles", () => {
    expect(canDeleteRole({ key: "member", isSystem: true }, 0).allowed).toBe(false);
  });

  it("refuses roles that still have users", () => {
    expect(canDeleteRole({ key: "support-lead", isSystem: false }, 1).allowed).toBe(false);
  });

  it("allows deleting an unused custom role", () => {
    expect(canDeleteRole({ key: "support-lead", isSystem: false }, 0).allowed).toBe(true);
  });
});
