import "server-only";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";
import { dataRoot } from "./paths";
import { seedLocalWorkspace } from "./seed";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

type DbGlobal = {
  promise?: Promise<AppDatabase>;
};

const globalForDb = globalThis as unknown as { __devspaceDb?: DbGlobal };

export function isLocalMode() {
  return !process.env.DATABASE_URL;
}

async function initLocalDatabase(): Promise<AppDatabase> {
  const root = dataRoot();
  const pgliteDir = path.join(root, "pglite");
  await mkdir(pgliteDir, { recursive: true });

  const client = new PGlite(pgliteDir);
  const database = drizzlePglite(client, { schema });

  await migratePglite(database, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });

  const appDb = database as unknown as AppDatabase;
  await seedLocalWorkspace(appDb);
  return appDb;
}

async function initHostedDatabase(): Promise<AppDatabase> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for hosted mode.");
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 2,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return drizzlePostgres(client, { schema });
}

/**
 * Lazily creates the database. Local development uses PGlite (a real
 * PostgreSQL engine compiled to WASM) persisted under .data/pglite.
 * Configuring DATABASE_URL switches the same Drizzle schema to Supabase.
 */
export function getDb(): Promise<AppDatabase> {
  const state = (globalForDb.__devspaceDb ??= {});
  state.promise ??= isLocalMode() ? initLocalDatabase() : initHostedDatabase();
  return state.promise;
}

export { schema };
