import { describe, expect, it } from "vitest";

import {
  isAdminUser,
  summarizeTicketQueue,
  summarizeUsers,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/admin";
import {
  adminEmailSchema,
  deleteUserSchema,
  ticketReplySchema,
  ticketSchema,
  userRoleSchema,
  userStatusSchema,
} from "@/lib/validation/admin";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-04T12:00:00Z").getTime();

describe("isAdminUser", () => {
  it("accepts staff roles in any letter case", () => {
    expect(isAdminUser({ role: "admin" })).toBe(true);
    expect(isAdminUser({ role: "ADMIN" })).toBe(true);
    expect(isAdminUser({ role: "owner" })).toBe(true);
    expect(isAdminUser({ role: "moderator" })).toBe(true);
  });

  it("rejects every other role, including missing roles", () => {
    expect(isAdminUser({ role: "member" })).toBe(false);
    expect(isAdminUser({ role: "viewer" })).toBe(false);
    expect(isAdminUser({ role: null })).toBe(false);
    expect(isAdminUser({})).toBe(false);
  });
});
describe("summarizeUsers", () => {
  it("counts people, admins, suspensions and active windows", () => {
    const summary = summarizeUsers(
      [
        { role: "admin", status: "active", lastSeenAt: new Date(now - 2 * 60 * 60 * 1000), createdAt: new Date(now - 30 * day) },
        { role: "user", status: "active", lastSeenAt: new Date(now - 3 * day), createdAt: new Date(now - 2 * day) },
        { role: "user", status: "suspended", lastSeenAt: null, createdAt: new Date(now - 10 * day) },
        { role: "user", status: "active", lastSeenAt: new Date(now - 20 * day), createdAt: new Date(now - 60 * day) },
      ],
      now,
    );

    expect(summary).toEqual({
      total: 4,
      admins: 1,
      suspended: 1,
      activeToday: 1,
      activeWeek: 2,
      newThisWeek: 1,
    });
  });

  it("handles empty input", () => {
    expect(summarizeUsers([], now)).toEqual({
      total: 0,
      admins: 0,
      suspended: 0,
      activeToday: 0,
      activeWeek: 0,
      newThisWeek: 0,
    });
  });
});

describe("summarizeTicketQueue", () => {
  it("counts statuses and the awaiting total", () => {
    const queue = summarizeTicketQueue([
      { status: "open" },
      { status: "open" },
      { status: "in_progress" },
      { status: "resolved" },
      { status: "closed" },
      { status: "weird" },
    ]);

    expect(queue.open).toBe(2);
    expect(queue.in_progress).toBe(1);
    expect(queue.resolved).toBe(1);
    expect(queue.closed).toBe(1);
    expect(queue.awaiting).toBe(3);
    expect(queue.total).toBe(6);
  });
});

describe("ticket validation", () => {
  it("accepts a complete ticket and trims the text", () => {
    const parsed = ticketSchema.safeParse({
      subject: "  Private repos  ",
      message: "The private repositories section does not load.",
      priority: "high",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.subject).toBe("Private repos");
      expect(parsed.data.priority).toBe("high");
    }
  });

  it("rejects short subjects and unknown priorities", () => {
    expect(ticketSchema.safeParse({ subject: "Hi", message: "long enough message", priority: "normal" }).success).toBe(false);
    expect(
      ticketSchema.safeParse({ subject: "Valid subject", message: "long enough message", priority: "critical" })
        .success,
    ).toBe(false);
  });

  it("requires a UUID ticket and a known status for replies", () => {
    expect(ticketReplySchema.safeParse({ ticketId: "not-a-uuid", status: "open" }).success).toBe(false);
    expect(
      ticketReplySchema.safeParse({
        ticketId: "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f",
        status: "resolved",
        reply: "Done.",
      }).success,
    ).toBe(true);
  });
});

describe("admin user validation", () => {
  it("accepts valid role keys and statuses", () => {
    const id = "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f";
    expect(userRoleSchema.safeParse({ userId: id, roleKey: "admin" }).success).toBe(true);
    expect(userRoleSchema.safeParse({ userId: id, roleKey: "owner" }).success).toBe(true);
    expect(userRoleSchema.safeParse({ userId: id, roleKey: "support-lead" }).success).toBe(true);
    expect(userRoleSchema.safeParse({ userId: id, roleKey: "Bad Key!" }).success).toBe(false);
    expect(userRoleSchema.safeParse({ userId: id, role: "owner" }).success).toBe(false);
    expect(userStatusSchema.safeParse({ userId: id, status: "suspended" }).success).toBe(true);
    expect(userStatusSchema.safeParse({ userId: id, status: "deleted" }).success).toBe(false);
  });

  it("requires a confirmation phrase for deletion", () => {
    const id = "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f";
    expect(deleteUserSchema.safeParse({ userId: id, confirmation: "DELETE" }).success).toBe(true);
    expect(deleteUserSchema.safeParse({ userId: id, confirmation: "" }).success).toBe(false);
  });
});

describe("login email validation", () => {
  it("normalises and accepts a valid address", () => {
    const parsed = adminEmailSchema.safeParse({
      userId: "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f",
      email: "  Admin@Devspace.App ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("admin@devspace.app");
  });

  it("rejects malformed addresses and invalid ids", () => {
    expect(adminEmailSchema.safeParse({ userId: "not-a-uuid", email: "admin@devspace.app" }).success).toBe(false);
    expect(
      adminEmailSchema.safeParse({
        userId: "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

describe("ticket labels", () => {
  it("keeps every status and priority labelled", () => {
    expect(ticketStatusLabels.open).toBe("Open");
    expect(ticketStatusLabels.in_progress).toBe("In progress");
    expect(ticketPriorityLabels.urgent).toBe("Urgent");
  });
});


