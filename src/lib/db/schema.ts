import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * User profile. `id` matches `auth.users.id` in Supabase. In the local
 * development provider it matches the id in `local_accounts`.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    username: varchar("username", { length: 40 }).notNull(),
    displayName: varchar("display_name", { length: 80 }).notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio").notNull().default(""),
    githubUsername: varchar("github_username", { length: 39 }),
    githubCache: jsonb("github_cache").$type<Record<string, unknown>>(),
    githubCacheUpdatedAt: timestamp("github_cache_updated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_username_unique").on(table.username)],
);

/**
 * Development-only credential store. Production uses Supabase Auth, so no
 * password material is ever stored in PostgreSQL there.
 */
export const localAccounts = pgTable(
  "local_accounts",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    sessionVersion: integer("session_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("local_accounts_email_unique").on(table.email)],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("password_resets_token_unique").on(table.tokenHash)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    status: varchar("status", { length: 20 }).notNull().default("Planning"),
    technology: varchar("technology", { length: 120 }).notNull().default(""),
    repositoryUrl: text("repository_url"),
    priority: varchar("priority", { length: 10 }).notNull().default("medium"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("projects_user_idx").on(table.userId),
    index("projects_user_status_idx").on(table.userId, table.status),
    index("projects_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    content: text("content").notNull().default(""),
    category: varchar("category", { length: 60 }).notNull().default("General"),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notes_user_idx").on(table.userId),
    index("notes_user_updated_idx").on(table.userId, table.updatedAt),
    index("notes_user_pinned_idx").on(table.userId, table.isPinned),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").notNull().default(""),
    category: varchar("category", { length: 60 }).notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workspaces_user_idx").on(table.userId)],
);

export const workspaceLinks = pgTable(
  "workspace_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    url: text("url").notNull(),
    category: varchar("category", { length: 60 }).notNull().default("General"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workspace_links_workspace_idx").on(table.workspaceId),
    index("workspace_links_user_idx").on(table.userId),
  ],
);

export const trackerFiles = pgTable(
  "tracker_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 255 }).notNull(),
    description: text("description").notNull().default(""),
    fileSize: integer("file_size").notNull().default(0),
    uploadStatus: varchar("upload_status", { length: 20 }).notNull().default("pending"),
    storagePath: text("storage_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tracker_files_user_idx").on(table.userId),
    index("tracker_files_user_status_idx").on(table.userId, table.uploadStatus),
  ],
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    theme: varchar("theme", { length: 12 }).notNull().default("dark"),
    language: varchar("language", { length: 8 }).notNull().default("en"),
    preferences: jsonb("preferences")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_settings_user_unique").on(table.userId)],
);

export type Profile = typeof profiles.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type WorkspaceLink = typeof workspaceLinks.$inferSelect;
export type TrackerFile = typeof trackerFiles.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
