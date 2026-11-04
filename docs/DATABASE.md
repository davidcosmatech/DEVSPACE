# Database

## Engines

| Context | Engine | Connection |
|---|---|---|
| Local development | PGlite (PostgreSQL WASM) persisted at `.data/pglite` | Managed internally by `src/lib/db/index.ts` |
| Production | Supabase PostgreSQL | `DATABASE_URL` (pooled) and `DIRECT_URL` (migrations) |

The same Drizzle schema and SQL dialect are used in both modes. PGlite is not intended for serverless production.

The live Supabase project uses the transaction pooler (`6543`) for `DATABASE_URL` and the session pooler (`5432`) for `DIRECT_URL`, because the direct `db.<ref>.supabase.co` hostname is IPv6-only and was not resolvable from the deployment environment.

## Tables

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Matches `auth.users.id` in Supabase |
| `username` | varchar(40) | Unique, lowercase |
| `display_name` | varchar(80) | |
| `avatar_url` | text | Optional external URL |
| `bio` | text | |
| `email` | varchar(254) | Backfilled from Auth/local accounts; shown in the admin console |
| `role` | varchar(40) | FK → `roles.key`; `owner`, `admin`, `moderator`, `editor`, `member`, `viewer` or a custom key |
| `status` | varchar(12) | `active` or `suspended`; suspended accounts cannot sign in |
| `last_seen_at` | timestamptz | Throttled presence marker used for daily/weekly usage counts |
| `github_username` | varchar(39) | Optional |
| `github_cache` | jsonb | Last verified public GitHub snapshot |
| `github_cache_updated_at` | timestamptz | Cache write time |
| `created_at`, `updated_at` | timestamptz | |

### `local_accounts` (development only)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK/FK → profiles | Cascades |
| `email` | varchar(254) | Unique |
| `password_hash` | text | scrypt salt + derived key |
| `session_version` | integer | Incremented on password reset |
| `created_at` | timestamptz | |

No password material is stored when Supabase Auth is active.

### `password_resets` (development only)

Token hashes, expiry and single-use marker. Cascades with the profile.

### `projects`

Owner, optional workspace, name, description, status, technology, repository URL, priority, visibility (`public` / `private`) and timestamps. Statuses: `Planning`, `Active`, `Development`, `On Hold`, `Completed`. Priorities: `low`, `medium`, `high`.

Indexes: `(user_id)`, `(user_id, status)`, `(user_id, updated_at)`, `(user_id, workspace_id)`, `(user_id, visibility)`.

### `notes`

Owner, title, Markdown content, category, pinned flag and timestamps.

Indexes: `(user_id)`, `(user_id, updated_at)`, `(user_id, is_pinned)`.

### `workspaces`

Owner, name, description, category and timestamps.

### `workspace_links`

`workspace_id` (cascade), `user_id` (cascade), title, validated URL, category. Parent ownership is checked on every mutation, and the RLS insert/update policy verifies the workspace belongs to the caller.

Indexes: `(workspace_id)`, `(user_id)`.

### `tracker_files`

Owner, filename, description, size in bytes, upload status (`uploaded` / `pending` / `error`), opaque storage path and timestamps. A record is only marked `uploaded` after the bytes are successfully written to storage.

### `user_settings`

Owner, theme (`dark`/`light`), language (`en`/`es`/`fr`), JSONB preferences, timestamps. Unique per user.

### `tickets`

Support tickets, written by users and answered by administrators.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles | Cascades |
| `subject` | varchar(140) | |
| `message` | text | Max 4000 characters (validated) |
| `status` | varchar(16) | `open`, `in_progress`, `resolved` or `closed` |
| `priority` | varchar(10) | `low`, `normal`, `high` or `urgent` |
| `admin_reply` | text | Latest administrator reply |
| `replied_at` | timestamptz | |
| `created_at`, `updated_at` | timestamptz | |

Indexes: `(user_id)`, `(status)`, `(created_at)`.

### `roles`

RBAC definitions. System roles are seeded by migration `0004`; custom roles are created in the admin console.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `key` | varchar(40) | Unique, lowercase slug referenced by `profiles.role` |
| `name` | varchar(60) | Display name |
| `description` | text | |
| `permissions` | jsonb | Array of permission keys validated against `lib/rbac` |
| `is_system` | boolean | System roles cannot be deleted |
| `created_at`, `updated_at` | timestamptz | |

`profiles.role` references `roles.key` (`ON UPDATE CASCADE`, `ON DELETE RESTRICT`).

### `audit_logs`

Append-only administrative audit trail.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | uuid FK → profiles | `ON DELETE SET NULL` |
| `actor_email` | varchar(254) | Snapshot so the log survives deletion |
| `action` | varchar(60) | e.g. `user.role_changed`, `role.updated` |
| `target_type` | varchar(30) | `user`, `role` or `ticket` |
| `target_id` | varchar(64) | |
| `details` | jsonb | Before/after values |
| `created_at` | timestamptz | |

Indexes: `(actor_id)`, `(target_type, target_id)`, `(created_at)`.

## Relationships

```text
profiles 1 ──< projects
profiles 1 ──< notes
profiles 1 ──< workspaces 1 ──< workspace_links
profiles 1 ──< tracker_files
profiles 1 ──< user_settings
profiles 1 ──< tickets
roles    1 ──< profiles             (profiles.role → roles.key)
profiles 1 ──< audit_logs           (actor, set null on delete)
profiles 1 ──1 local_accounts        (development)
profiles 1 ──< password_resets       (development)
```

All user-owned relationships cascade on profile deletion. Workspace links cascade when their workspace is deleted.

## Migrations

Migrations are generated by Drizzle Kit into `drizzle/` and are versioned in Git. The current history includes the initial schema, the GitHub snapshot cache, project workspace/visibility support, the admin console/tickets tables with profile role, status, email and presence columns, and migration `0004` adding roles, RBAC and audit logs (existing `user`/`admin` roles are migrated to `member`/`owner` without touching user data).

```bash
npm run db:generate   # create SQL after a schema change
npm run db:check      # validate migration consistency
npm run db:migrate    # apply to DIRECT_URL / DATABASE_URL
```

The local provider applies the same migrations automatically on first use. Hosted environments apply them explicitly during deployment.

## Row Level Security

`supabase/rls.sql` enables RLS on every table and creates select/insert/update/delete policies scoped to `auth.uid()`. `local_accounts` and `password_resets` have RLS enabled and no policies, so they are denied to API clients by default. `tickets` uses the same owner-only policies.

The `role` and `status` columns on `profiles` are revoked from `authenticated` and `anon`, so a browser client can never promote itself or reactivate a suspended account. `roles` and `audit_logs` have RLS enabled with no policies, so browser clients cannot read or write them; only the server connection manages RBAC.

Apply with:

```bash
npm run db:rls
```

The application's Drizzle connection uses the database owner/service connection, which bypasses RLS. Server-side ownership predicates therefore remain mandatory. RLS protects any future direct Supabase client access.

## Storage

Private bucket: `markdown-files`.

Objects are stored at `<user-id>/<uuid>-<sanitized-filename>`. `supabase/storage.sql` creates the bucket with a 4 MB limit and owner-scoped policies based on the first path segment. The 4 MB request cap keeps uploads within Vercel's serverless request-body limit.

Uploads and downloads are proxied through authenticated server routes. The service-role key never reaches the browser.

## Backup format

```json
{
  "app": "DEVSPACE",
  "schemaVersion": 1,
  "exportedAt": "2026-11-03T18:00:00.000Z",
  "profile": {
    "username": "davidcosmatech",
    "displayName": "David Cosma",
    "bio": "Developer, problem solver, lifelong learner.",
    "avatarUrl": "https://…",
    "githubUsername": "davidcosmatech"
  },
  "settings": {
    "theme": "dark",
    "language": "en",
    "preferences": {}
  },
  "projects": [],
  "notes": [],
  "workspaces": [{ "name": "Docs", "links": [] }],
  "trackerFiles": []
}
```

Excluded: passwords, auth tokens, UUIDs, storage paths and file bytes. Files can be downloaded individually from the tracker.

Import rules:

- Zod validates the whole document and schema version.
- Every inserted row uses the authenticated owner's id.
- Duplicate names/URLs are skipped, never overwritten.
- Tracker metadata is inserted as pending, size 0.
- The transaction rolls back on any failure.
- Profile and preferences are preserved.

## Local data layout

```text
.data/
├── pglite/              PostgreSQL data directory
├── storage/<user-id>/   private uploaded files
├── .session-secret      generated local session key
└── …
```

`.data/` is excluded from Git.

