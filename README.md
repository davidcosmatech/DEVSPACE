# DEVSPACE 3.0

**Your personal developer workspace.** A multi-user workspace for projects, notes, GitHub profiles, browser workspaces, Markdown files and data backup.

**Live production:** [https://devspace-ruby.vercel.app](https://devspace-ruby.vercel.app)

DEVSPACE is a working Next.js application — not a static dashboard mock-up. Every card, counter, list and progress bar on the dashboard is backed by real database records, and every action is implemented end to end.

![DEVSPACE dashboard](docs/screenshots/dashboard.png)

## What is included

- **Authentication** — registration, email/password sign-in, sign-out, password reset, protected routes and session handling. Supabase Auth in production; a secure local provider for development.
- **Projects** — full CRUD, public/private sections, workspace grouping, multi-select bulk editing, search, status/technology/workspace filters, priorities, repository links, list and grid views.
- **Notes** — Markdown editor and preview, autosave with unsaved-change protection, pinning, categories, search and deletion.
- **GitHub** — live public profile and repository data from the GitHub REST API, with a per-user verified snapshot fallback, plus loading, empty, not-found, rate-limit and network-failure states.
- **Private repositories** — the count appears next to *Repos* on the dashboard GitHub card and next to *following* on the GitHub page, with a full-width Private section listing the private repositories the connected account owns. Data is read with a server-only read-only token and shown only to that account.
- **Browser Workspaces** — workspace CRUD and nested link CRUD with URL validation, categories, safe external links and linked project counts.
- **File Workspace** — real local folders and files through the File System Access API: create workspaces/subfolders/files, import documents, rename, delete and preview supported formats in the browser. Requires Chrome or Edge; browsers cannot launch Windows Explorer or desktop apps.
- **Markdown Tracker** — real file uploads with byte-level progress, private per-user storage, inline Markdown preview, download, pending records and deletion.
- **Workspace chat** — a header chat assistant that answers questions from the signed-in user's real projects, notes, workspaces, files and GitHub status.
- **Support tickets** — a **My Tickets** section in the sidebar (with an open-ticket counter) plus `/support`, where every user can open a ticket and follow the administrator reply and status. Replies also appear in the notification bell.
- **Admin console** — restricted to accounts with the `admin` role, with a shield shortcut next to the header bell. Includes real usage (people, active today/week, new signups), full user management (promote/demote, suspend/reactivate, typed-`DELETE` deletion) and the support queue with replies and status changes.
- **Header tools** — global search/command palette, notifications, admin shortcut (admins only), account menu, workspace chat and a live local clock.
- **Settings** — profile and avatar management, persistent dark/light themes, locale preference, JSON export, safe import preview and account deletion.
- **Backup & restore** — versioned JSON format, duplicate detection, no cross-account overwrite, transactional import.
- **Responsive design** — fixed desktop sidebar, drawer navigation on mobile, single-column cards, responsive tables and touch-friendly controls.
- **Security** — server-derived ownership on every query, Zod validation, secure HttpOnly sessions, RLS policies for Supabase and private file storage.
- **Quality gates** — TypeScript, ESLint, 47 unit/integration tests, 11 Playwright end-to-end tests and a production build.

## Demo

The local development database is seeded with a fully populated workspace:

```text
Email:    demo@devspace.app
Password: Devspace123!
```

The hosted preview has its own seeded demo account with a separate password that is not stored in this repository. The local demo account is created only by the PGlite provider. The demo account is the workspace administrator, so it can open `/admin` and `/support`; any other account can only open `/support`.

## Technology

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| UI | React 19, Tailwind CSS 4, custom CSS design system, Lucide icons |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| Production database | Supabase |
| Local development database | PGlite (PostgreSQL compiled to WASM, persisted under `.data/`) |
| ORM | Drizzle ORM + Drizzle Kit |
| Validation | Zod |
| Forms | React Hook Form + `@hookform/resolvers` |
| Auth | Supabase Auth (production) / scrypt + signed JWT cookie (local) |
| Files | Supabase Storage (production) / private local filesystem (development) |
| Tests | Vitest, Playwright |

## Quick start

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local   # optional for local mode
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and use the demo credentials above, or create an account.

No Supabase account is required for local evaluation. With no `DATABASE_URL`, DEVSPACE runs a real PostgreSQL engine locally via PGlite and stores uploads in `.data/storage`.

To reset the demo workspace:

```bash
# stop the dev server first
rm -rf .data
npm run dev
```

### Environment modes

| Mode | Trigger | Auth | Database | Files |
|---|---|---|---|---|
| Local | No `DATABASE_URL` / Supabase keys | Local scrypt + signed HttpOnly session | PGlite in `.data/pglite` | `.data/storage` |
| Production | Supabase + `DATABASE_URL` configured | Supabase Auth (`@supabase/ssr`) | Supabase PostgreSQL | Private Supabase Storage bucket |

> PGlite is a development convenience only. Serverless Vercel deployments need Supabase (or another hosted PostgreSQL) and Supabase Storage. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Production configuration

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL` (pooled connection)
   - `DIRECT_URL` (migration/session connection)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; storage and account administration)
   - `SESSION_SECRET` (at least 32 random characters)
   - `NEXT_PUBLIC_SITE_URL`
   - `SUPABASE_SKIP_EMAIL_CONFIRMATION=true` (registration without SMTP; creates confirmed users through the Admin API)

> With `SUPABASE_SKIP_EMAIL_CONFIRMATION=true`, new accounts are created confirmed, so registration is not blocked by Supabase's default email rate limit. Set it to `false` after configuring custom SMTP and the Auth URL configuration.

> Supabase's direct database hostname is IPv6-only on some networks. If it is not resolvable, use the session pooler on port `5432` for `DIRECT_URL` (same credentials as the transaction pooler on `6543`). The live deployment uses this configuration.
3. Apply the schema, RLS and storage policies:

```bash
npm run db:migrate
npm run db:rls
npm run db:storage
```

4. In Supabase Auth, add redirect URLs:
   - `http://localhost:3000/callback`
   - `https://your-production-domain/callback`
5. Deploy to Vercel with the same environment variables.

Full instructions: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript without emitting |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + integration tests |
| `npm run test:e2e` | Playwright browser tests |
| `npm run db:generate` | Generate a Drizzle migration |
| `npm run db:migrate` | Apply migrations |
| `npm run db:check` | Validate migration consistency |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:rls` | Apply `supabase/rls.sql` to the configured database |
| `npm run db:storage` | Create the private bucket and storage policies |
| `npm run db:setup` | Migrations + RLS + storage in one command |

## Project structure

```text
src/
├── app/
│   ├── (auth)/                 login, register, reset, callback
│   ├── (workspace)/            dashboard, projects, notes, github, workspaces, tracker, settings
│   ├── api/                    search, assistant, export, import, tracker content/upload/download
│   ├── globals.css             design system and responsive layouts
│   └── layout.tsx
├── components/
│   ├── dashboard/              banner art
│   ├── icons/                  GitHub brand mark
│   ├── layout/                 app shell, sidebar, header, command palette, chat
│   └── ui/                     modal, badges, avatar, page header, confirmation
├── features/
│   ├── auth/                   actions and forms
│   ├── projects/               actions + list/grid UI
│   ├── notes/                  actions + Markdown workspace
│   ├── github/                 username action + live profile UI
│   ├── workspaces/             workspace/link actions + cards
│   ├── tracker/                upload/delete actions + progress UI
│   ├── settings/               profile, appearance, data, account
│   └── dashboard/              dashboard queries
├── lib/
│   ├── auth/                   session, password, Supabase adapter
│   ├── db/                     Drizzle schema, connection, seed
│   ├── queries/                shell counts and notifications
│   ├── validation/             shared Zod schemas
│   ├── github.ts               GitHub REST client (public + private)
│   ├── github-private.ts       private-repository access rules
│   ├── storage.ts              local/Supabase file adapter
│   └── utils.ts
drizzle/                        versioned SQL migrations
supabase/                       RLS and storage policy SQL
tests/                          unit, integration and e2e tests
docs/                           architecture, database, deployment, security
```

## Design

The interface follows the supplied DEVSPACE 3.0 reference: graphite surfaces, a single emerald accent, dense but calm information hierarchy, a fixed navigation rail, a personalised welcome banner, five live statistics, project and note overview panels, a GitHub profile card and bottom tracker/quick-action panels.

The dashboard geometry is tuned to the supplied **1672 × 941** reference (280 px rail, 80 px header, 1360 px content canvas, 20 px stat gaps, 345 px overview row and 118 px bottom row). Live database values replace the illustrative numbers in the reference.

Dark and light themes share the same token system in `src/app/globals.css`. Motion is restrained and respects `prefers-reduced-motion`.

### Screens

| Projects — public & private | Chat assistant |
|---|---|
| ![Project sections](docs/screenshots/projects-sections.png) | ![Chat assistant](docs/screenshots/chat-assistant.png) |

| Local File Workspace | Inline document preview |
|---|---|
| ![File Workspace](docs/screenshots/file-workspace.png) | ![File preview](docs/screenshots/file-workspace-preview.png) |

| Admin console — usage | Admin console — people |
|---|---|
| ![Admin overview](docs/screenshots/admin-overview.png) | ![Admin people](docs/screenshots/admin-users.png) |

| Admin console — tickets | User support |
|---|---|
| ![Admin ticket](docs/screenshots/admin-ticket.png) | ![Support](docs/screenshots/support-tickets.png) |

| My Tickets in the sidebar |
|---|
| ![My Tickets](docs/screenshots/sidebar-my-tickets.png) |

| Markdown preview | Workspaces with projects |
|---|---|
| ![Markdown preview](docs/screenshots/tracker-preview.png) | ![Workspaces](docs/screenshots/workspaces-projects.png) |

| Projects | Notes |
|---|---|
| ![Projects](docs/screenshots/projects.png) | ![Notes](docs/screenshots/notes.png) |

| Markdown Tracker | Settings |
|---|---|
| ![Markdown Tracker](docs/screenshots/tracker.png) | ![Settings](docs/screenshots/settings.png) |

| Browser Workspaces | GitHub |
|---|---|
| ![Browser Workspaces](docs/screenshots/workspaces.png) | ![GitHub](docs/screenshots/github.png) |

| GitHub — private repositories |
|---|
| ![Private repositories](docs/screenshots/github-private.png) |

| Light theme | Mobile |
|---|---|
| ![Light dashboard](docs/screenshots/dashboard-light.png) | <img src="docs/screenshots/dashboard-mobile.png" alt="Mobile dashboard" width="390" /> |

The original supplied reference is preserved at [docs/reference/reference-dashboard.png](docs/reference/reference-dashboard.png).

## Testing

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

The Playwright suite uses the locally installed Chrome channel by default. To use a downloaded Playwright browser, remove `channel` from `playwright.config.ts`.

## Deployment status

**Deployed and verified** on Vercel:

- Production URL: [https://devspace-ruby.vercel.app](https://devspace-ruby.vercel.app)
- Supabase migrations, RLS policies and the private `markdown-files` bucket are applied.
- Authentication, project/note/workspace CRUD, tracker upload/download, theme persistence and JSON export were verified against the production deployment.
- The admin console (`/admin`) and support tickets (`/support`) were verified in production: admin gate, usage metrics, people management and a real ticket reply/status change.
- GitHub branch: `devspace-3.0` in `davidcosmatech/DEVSPACE`. The existing `main` branch is untouched.

One dashboard-only step remains for new user registration and password reset emails: in **Supabase → Authentication → URL Configuration**, set the Site URL to `https://devspace-ruby.vercel.app` and allow `https://devspace-ruby.vercel.app/callback` and `http://localhost:3000/callback`. The seeded demo account works without it. Details are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)

## License

Private project. All rights reserved.




