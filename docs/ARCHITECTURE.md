# Architecture

## Overview

DEVSPACE 3.0 is a modular Next.js App Router application with four explicit layers.

```text
Browser
  │
  ├── React Server Components (presentation + server-side data reads)
  ├── Client components (editor, modals, command palette, upload progress)
  │
  ▼
Server Actions / Route Handlers (application logic)
  │   validation → ownership → business rules
  ▼
Data access (Drizzle ORM)
  │   typed queries, transactions, per-user predicates
  ▼
PostgreSQL (Supabase in production; PGlite locally)
  + Supabase Storage (production) / local private files (development)
```

### 1. Presentation

- `src/app/(auth)` contains the split-screen authentication experience.
- `src/app/(workspace)` contains the application shell and the seven product pages.
- `src/components` contains reusable layout and UI primitives.
- `src/features/*` co-locates each feature's actions, forms and interactive view.
- `src/app/globals.css` is the design system: tokens, components, Markdown styles and responsive breakpoints.

### 2. Application logic

Server Actions in `src/features/*/actions.ts` and route handlers in `src/app/api` implement:

- Authentication and session lifecycle.
- Project, note, workspace, link and tracker CRUD.
- Public/private project sections, workspace assignment and bulk project updates.
- Header workspace assistant, powered by read-only queries over the current user's data.
- Inline Markdown preview for tracked files.
- GitHub username configuration.
- Theme/locale preferences.
- Backup export and import.
- Account deletion.

Server Actions are the default mutation path. Route handlers are used only where a streaming/file response or multipart upload with progress is required.

### 3. Data access

`src/lib/db/schema.ts` defines the complete Drizzle schema. `src/lib/db/index.ts` lazily creates one database client per process and switches implementation based on `DATABASE_URL`.

Every user-owned mutation includes a `userId` predicate. That means even if application code has a logic bug, a caller cannot edit another user's row by supplying its UUID. Supabase RLS adds a second boundary for browser clients.

### 4. Infrastructure

- Supabase PostgreSQL for hosted data.
- Supabase Auth for hosted identity.
- Supabase Storage for uploaded Markdown files.
- PGlite and the local filesystem for zero-configuration development.
- Vercel is the intended host.

## Authentication flows

### Production: Supabase Auth

```text
Browser → /login
  → loginAction()
  → supabase.auth.signInWithPassword()
  → @supabase/ssr writes auth cookies
  → workspace layout calls getViewer()
  → supabase.auth.getUser() (verified server-side)
  → ensureSupabaseProfile() creates the profile on first visit
  → requireViewer() or redirect('/login')
```

Registration uses `supabase.auth.signUp`. When email confirmation is enabled the user receives a link to `/callback`; the callback exchanges the code for a session and redirects to the requested route. Password reset uses `resetPasswordForEmail`, then `/callback` and `/reset-password`.

When `SUPABASE_SKIP_EMAIL_CONFIRMATION=true` (used on the live deployment because custom SMTP is not configured), registration instead creates an already-confirmed user through `supabase.auth.admin.createUser`, then signs in with the new credentials. This avoids Supabase's default email rate limit. It should be disabled once SMTP and confirmation redirects are configured.

### Development: local provider

```text
registerAction → scrypt(password, random salt) → local_accounts
loginAction    → verify scrypt hash → signed HS256 JWT (HttpOnly, SameSite=Lax)
getViewer      → verify JWT → compare session version → load profile
```

A random session secret is generated once at `.data/.session-secret` when `SESSION_SECRET` is absent. Password resets increment `session_version`, invalidating existing sessions. Reset links are hashed (SHA-256), single-use and expire after one hour; because local mode has no mail provider, the reset URL is returned to the requesting browser for testing.

The local provider is deliberately isolated behind `isSupabaseAuthEnabled()`. It is never used when Supabase credentials are present.

## Ownership and authorization

- `requireViewer()` is called at the top of every protected page and mutation.
- Every read/write includes `eq(table.userId, viewer.id)`.
- A client-provided `user_id` is never trusted.
- Parent/child operations verify the parent's ownership before touching children (for example, a link's workspace).
- Downloads query the tracker row by both file id and owner before reading storage.
- Supabase RLS policies mirror the server predicates.

## Rendering and caching

- Server Components are the default. Client components exist only for interaction, browser APIs or local editor state.
- Workspace layout is `force-dynamic` because the shell is per-user.
- GitHub calls use `cache: "no-store"` so Refresh reflects live data and never caches one user's view for another.
- Successful GitHub responses are stored as a per-user snapshot in `profiles.github_cache`. If GitHub is rate limited or unreachable, the UI shows the last verified snapshot with a cached timestamp instead of inventing statistics.
- The **Private** section adds `privateRepos`/`privateOwner` to the same snapshot. A server-only read-only token (`GITHUB_PRIVATE_TOKEN`) is used, and the list is released only when the connected username equals the token owner. The browser never receives the token and the cached private list is re-gated on every render.
- Private data is never placed in shared caches.
- Streaming/Suspense is used for the dashboard GitHub panel so a slow GitHub request does not block the whole dashboard.

## File uploads

```text
Browser (XHR upload progress)
  → POST /api/tracker/upload
  → requireViewer()
  → extension + MIME + 4 MB validation
  → saveFile() → local .data/storage OR Supabase private bucket
  → tracker_files row with storage_path, size and uploaded status
```

Files are private. Download goes through `/api/tracker/[id]/download`, which rechecks ownership. Imported tracker rows intentionally import as `pending` with no storage path, because a metadata record is not an uploaded file.

Clicking a filename in the tracker calls `/api/tracker/[id]/content`, which rechecks ownership, reads the stored Markdown and renders it in an inline preview panel on the same page.

## Workspace assistant

The header chat button opens a read-only assistant. `POST /api/assistant` validates the session and answers questions about project counts, public/private projects, workspaces, notes, tracked files and GitHub status. It uses only the signed-in user's records; no external AI service or credentials are involved.

## Project workspaces and visibility

`projects.visibility` is `public` or `private`. `projects.workspace_id` optionally links a project to one of the user's Browser Workspaces. The projects page renders a Public section followed by a Private section, supports filtering by workspace, and allows multi-select bulk updates of visibility or workspace assignment.

## Local file workspaces

`/files` is a browser-only module using the File System Access API. The user chooses a parent directory through the browser's native picker; DEVSPACE creates a real workspace folder and stores the directory handle in IndexedDB. All subsequent folder/file operations happen directly in the browser against the local handle. No file contents pass through Vercel or Supabase.

The browser sandbox intentionally prevents launching Windows Explorer, Word, PDF Reader or VS Code. Folders navigate inside DEVSPACE and supported documents preview in a modal; unsupported formats can be opened in a browser tab. Chrome/Edge over HTTPS (or localhost) is required.

## Admin console and support

`/admin` is a restricted area with three views:

- **Overview** — people, active today, active this week, new signups this week and the support queue size, plus product totals (projects, notes, tickets, admins, suspensions) and recent activity.
- **People** — searchable account list with per-user project/note/ticket counts, last-seen time, promote/demote, suspend/reactivate and a typed-`DELETE` account deletion.
- **Tickets** — the support queue with status filters, the full message, an administrator reply and status changes.

Activity is measured without third-party analytics: `requireViewer()` refreshes `profiles.last_seen_at` at most once every five minutes per user. Daily/weekly totals are derived from that column; no tracking scripts or cookies are involved.

Every page calls `requireAdminViewer()` and every action calls `assertAdmin()`. Authorisation is the database `profiles.role = 'admin'` � there is no email allow-list, so only explicitly promoted accounts can open the console. Non-admins are redirected to the dashboard and actions throw.

Suspension is enforced server-side: suspended viewers are redirected to `/suspended`, local sign-in is rejected, and Supabase accounts are additionally banned through the Admin API. Deleting a user removes the Supabase Auth identity, the cascaded profile data and the user's stored files.

Users reach `/support` from the sidebar or the account menu. They create a ticket (subject, priority, message) and see the administrator's reply and current status; they can never read another user's tickets.

## Backup and restore

Export produces a stable, versioned JSON document (`app`, `schemaVersion: 1`, `exportedAt`). IDs and storage paths are excluded.

Import:

1. Parses and validates the entire document with Zod before touching the database.
2. Builds a plan against the current owner's records.
3. Skips duplicates by normalized project name, note title, workspace name, link URL and filename.
4. Inserts with new UUIDs and the authenticated user's id inside one transaction.
5. Imports tracker metadata as pending only.
6. Preserves the current profile and preferences.

## Design decisions

### Why PGlite?

The environment had no PostgreSQL server or Supabase credentials. PGlite runs the actual PostgreSQL engine and Drizzle's PostgreSQL dialect locally, so the schema, SQL, transactions and query semantics are realistic without Docker or a hosted account. The hosted code path uses the same schema and the standard `postgres` driver.

### Why a local auth provider?

The brief requires a fully functional application now, while production auth must be Supabase. A local provider lets every flow be exercised and tested without inventing credentials. It is selected only when Supabase is not configured.

### Why Server Actions plus a few route handlers?

Server Actions give a compact, type-safe mutation path with built-in same-origin protections. Uploads need `XMLHttpRequest` progress, downloads need a binary response, and search needs debounced GET requests, so those use route handlers.

### Error strategy

- Server Actions return typed `{ ok, error }` results; client UI surfaces them as toasts or inline errors.
- Mutations never throw raw database errors to the browser.
- GitHub failures are classified as not found, rate limited, invalid or network.
- Import failures roll back the entire transaction.

### Routes and 404 handling

`next.config.ts` redirects common single-word paths to their real section (`/private` and `/repositories` → `/github`, `/workspace` → `/workspaces`, `/file` → `/files`, `/note` → `/notes`, `/project` → `/projects`, `/markdown` → `/tracker`, `/home` → `/dashboard`) so shared or hand-typed links still land on a working page.

Any genuinely unknown path renders the global `not-found.tsx` card: it shows the attempted route, offers one-click links to every workspace section and keeps the “Back to dashboard” action.

## Module map

| Module | Responsibility |
|---|---|
| `lib/auth` | Viewer resolution, Supabase adapter, local sessions, password hashing |
| `lib/db` | Schema, connection switching, seed, data directory |
| `lib/validation` | Shared client/server schemas |
| `lib/storage` | Private local/Supabase file operations |
| `lib/github` | GitHub REST client, public + token-gated private repositories, error classification |
| `lib/github-private` | Pure private-repository access rules and summaries (unit tested) |
| `lib/admin` | Pure admin/usage/ticket helpers and labels (unit tested) |
| `lib/auth/admin` | Server-side admin gate (`requireAdminViewer`, `assertAdmin`) |
| `features/admin` | Admin queries, actions and console UI |
| `features/support` | Ticket creation action and user support UI |
| `app/api/assistant` | Read-only workspace chat answers |
| `features/*/actions.ts` | Authorized mutations |
| `features/*/*-view.tsx` | Interactive UI |
| `app/api` | Search, backup, import, upload, download |

## Responsive strategy

- ≥1220 px: five statistics, three-column dashboard, three workspace cards.
- 860–1220 px: two-column dashboard, two-column workspaces.
- <860 px: slide-over sidebar, single-column content, horizontally compact tables.
- <560 px: two-column statistics, stacked page actions, condensed rows with status retained.

