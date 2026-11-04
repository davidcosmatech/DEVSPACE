import { describe, expect, it } from "vitest";

import {
  isAdminUser,
  parseAdminEmails,
  summarizeTicketQueue,
  summarizeUsers,
  ticketPriorityLabels,
  ticketStatusLabels,
} from "@/lib/admin";
import {
  deleteUserSchema,
  ticketReplySchema,
  ticketSchema,
  userRoleSchema,
  userStatusSchema,
} from "@/lib/validation/admin";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-04T12:00:00Z").getTime();

describe("parseAdminEmails", () => {
  it("splits, trims and lowercases comma or space separated values", () => {
    expect(parseAdminEmails(" Demo@Devspace.app, owner@example.com ")).toEqual([
      "demo@devspace.app",
      "owner@example.com",
    ]);
    expect(parseAdminEmails("a@b.co;c@d.co\ne@f.co")).toEqual(["a@b.co", "c@d.co", "e@f.co"]);
  });

  it("drops empty and non-email fragments", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("not-an-email, ,")).toEqual([]);
  });
});

describe("isAdminUser", () => {
  it("accepts a database admin role", () => {
    expect(isAdminUser({ role: "admin", email: "someone@example.com" })).toBe(true);
  });

  it("accepts a bootstrapped env admin email", () => {
    expect(isAdminUser({ role: "user", email: "Demo@Devspace.app" }, ["demo@devspace.app"])).toBe(
      true,
    );
  });

  it("rejects regular users", () => {
    expect(isAdminUser({ role: "user", email: "user@example.com" }, ["demo@devspace.app"])).toBe(
      false,
    );
    expect(isAdminUser({ role: null, email: null })).toBe(false);
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
  it("accepts only known roles and statuses", () => {
    const id = "3f2c9a1e-1d6b-4f4a-9c3e-8a7b6d5c4e2f";
    expect(userRoleSchema.safeParse({ userId: id, role: "admin" }).success).toBe(true);
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

describe("ticket labels", () => {
  it("keeps every status and priority labelled", () => {
    expect(ticketStatusLabels.open).toBe("Open");
    expect(ticketStatusLabels.in_progress).toBe("In progress");
    expect(ticketPriorityLabels.urgent).toBe("Urgent");
  });
});
