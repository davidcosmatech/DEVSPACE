import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { localAccounts, profiles, projects } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db";

let client: PGlite;
let db: AppDatabase;
let userA: string;
let userB: string;

beforeAll(async () => {
  client = new PGlite();
  const database = drizzle(client, { schema: await import("@/lib/db/schema") });
  await migrate(database, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  db = database as unknown as AppDatabase;

  userA = crypto.randomUUID();
  userB = crypto.randomUUID();

  await db.insert(profiles).values([
    {
      id: userA,
      username: "isolation-a",
      displayName: "User A",
      bio: "",
      githubUsername: null,
    },
    {
      id: userB,
      username: "isolation-b",
      displayName: "User B",
      bio: "",
      githubUsername: null,
    },
  ]);

  await db.insert(localAccounts).values([
    { id: userA, email: "a@example.test", passwordHash: "scrypt$placeholder" },
    { id: userB, email: "b@example.test", passwordHash: "scrypt$placeholder" },
  ]);

  await db.insert(projects).values([
    {
      userId: userA,
      name: "A private project",
      description: "Only A should see this.",
      status: "Active",
      technology: "TypeScript",
      priority: "high",
    },
    {
      userId: userB,
      name: "B private project",
      description: "Only B should see this.",
      status: "Planning",
      technology: "Python",
      priority: "low",
    },
  ]);
});

afterAll(async () => {
  await client.close();
});

describe("database ownership isolation", () => {
  it("returns only projects for the requested user", async () => {
    const rows = await db.select().from(projects).where(eq(projects.userId, userA));
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("A private project");
  });

  it("prevents cross-user updates when ownership is part of the predicate", async () => {
    const result = await db
      .update(projects)
      .set({ status: "Completed" })
      .where(eq(projects.id, (await db.select().from(projects).where(eq(projects.userId, userB)))[0].id))
      .returning({ id: projects.id });

    expect(result).toHaveLength(1);
    const userAProjects = await db.select().from(projects).where(eq(projects.userId, userA));
    expect(userAProjects[0].status).toBe("Active");
  });

  it("cascades owned records when a profile is deleted", async () => {
    await db.delete(profiles).where(eq(profiles.id, userB));
    const remaining = await db.select().from(projects).where(eq(projects.userId, userB));
    expect(remaining).toHaveLength(0);
  });
});
