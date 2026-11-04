# Deployment

DEVSPACE 3.0 is live on Vercel with Supabase PostgreSQL, Supabase Auth and private Supabase Storage. The repository also runs locally with the PGlite fallback.

---

## Prerequisites

- Node.js 20.9+
- A Supabase project
- A Vercel account
- A GitHub repository containing this project
- A generated `SESSION_SECRET`

Generate a secret without exposing it in logs:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (or legacy anon key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`)
3. From **Project Settings → Database**, copy:
   - Pooled connection string (port 6543) → `DATABASE_URL`
   - Direct connection string (port 5432) → `DIRECT_URL`

Use the direct URL for migrations and RLS. The application uses `prepare: false` for compatibility with the Supabase transaction pooler.

> Supabase's direct hostname (`db.<ref>.supabase.co`) is IPv6-only for some projects and may fail with `ENOTFOUND` on IPv4-only networks. In that case, use the session pooler on port `5432` for `DIRECT_URL` with the same project credentials. The live deployment uses the session pooler.

---

## 2. Environment variables

Copy `.env.example` to `.env.local` for local production testing, or enter these in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_SITE_URL=https://<your-domain>

DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres

SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SESSION_SECRET=<48-byte-random-secret>
```

Never commit `.env.local`, connection strings or keys. `.gitignore` excludes all local environment files.

---

## 3. Database, RLS and storage

```bash
# 1. Apply the Drizzle schema
npm run db:migrate

# 2. Enable RLS and ownership policies
npm run db:rls

# 3. Create the private storage bucket and policies
npm run db:storage

# or all three:
npm run db:setup
```

The scripts use `DIRECT_URL` first, then `DATABASE_URL`.

Verify in Supabase:

- All nine tables exist in `public`.
- RLS is enabled on all seven product tables (plus the two local-development tables).
- Policies use `auth.uid()` and are scoped `to authenticated`.
- The `markdown-files` bucket is **private** with a 4 MB limit.
- A foreign key exists from `profiles.id` to `auth.users.id`.

### Optional RLS smoke test

Run this in the Supabase SQL editor with two test users. Do not use production user data.

```sql
-- Authenticate as User A using the Supabase client, then:
select * from projects;                  -- only A's projects
select * from projects where user_id = '<user-b-id>'; -- zero rows
```

The app itself also inserts with a server-derived owner and filters every query by that owner.

---

## 4. Supabase Auth URLs

In **Authentication → URL Configuration**:

- Site URL: `https://<your-domain>`
- Redirect URLs:
  - `http://localhost:3000/callback`
  - `https://<your-domain>/callback`

If email confirmation is enabled, registration returns a confirmation email. If it is disabled, the user is signed in immediately. Both flows are handled.

Password reset emails redirect through `/callback` and finish at `/reset-password`.

---

## 5. Vercel deployment

```bash
npm i -g vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# repeat for every variable in .env.example
vercel --prod
```

Recommended project settings:

- Framework preset: Next.js
- Build command: `npm run build`
- Install command: `npm install`
- Node.js: 20.x or newer
- Region: closest to the Supabase database

`next.config.ts` externalizes `@electric-sql/pglite` and `postgres`. Hosted deployments do not use PGlite because `DATABASE_URL` is set.

> Vercel serverless functions cannot persist local files. Supabase Storage is required in production. The 4 MB upload limit keeps request bodies under Vercel's platform cap.

---

## 6. GitHub

```bash
git init
git add .
git commit -m "release: DEVSPACE 3.0"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

Before pushing:

```bash
git status
git ls-files | Select-String -Pattern '\.env'
```

Only `.env.example` should be tracked. The project intentionally contains no remote URL or personal access token.

If the user already has a repository, use it. Do not force-push or rewrite remote history without explicit approval.

---

## 7. Production verification

After deployment:

1. Open `/login`; confirm the page loads without console errors.
2. Register a fresh account; confirm the profile row is created.
3. Sign out and sign back in.
4. Request a password reset; confirm the email arrives and the reset link works.
5. Create, edit and delete a project.
6. Create a note, wait for autosave, reload and confirm persistence.
7. Connect a GitHub username and refresh live data.
8. Create a workspace, add a link, open it, delete it.
9. Upload a Markdown file; confirm status becomes Uploaded and download works.
10. Download a backup; import it into a second account; confirm counts and duplicate skipping.
11. Change theme, reload, confirm persistence.
12. Delete the test account; confirm all records and files are gone.
13. Check desktop, tablet and mobile layouts.
14. Confirm no secrets appear in the client bundle or GitHub.

---

## 8. Current deployment status

**Deployed and verified.**

| Item | Value |
|---|---|
| Production URL | https://devspace-ruby.vercel.app |
| Vercel project | `devspace` / `davidcosmatechs-projects` |
| GitHub branch | `devspace-3.0` in `davidcosmatech/DEVSPACE` |
| Supabase migrations | `0000_init`, `0001_github_cache`, `0002_project_workspaces_visibility` applied |
| RLS | Enabled on all nine public tables; 4 policies per product table |
| Storage | Private `markdown-files` bucket, 4 MB limit, 4 owner policies |
| Auth | Supabase Auth; demo account provisioned and confirmed |
| Registration | `SUPABASE_SKIP_EMAIL_CONFIRMATION=true`; admin-confirmed signup avoids Supabase's default email rate limit |
| Demo workspace | 5 projects, 12 notes, 3 workspaces, 10 tracker records, 8 real uploaded files |
| Production verification | Login, project CRUD, public/private sections, bulk project updates, workspace assignment, header chat assistant, inline tracker preview, local File Workspace (create/rename/delete/import/preview), Storage upload/download/delete, all pages, theme and export — passed with zero console errors |

### Remaining dashboard step

Registration now creates confirmed users through the Admin API, so the previous “email rate limit exceeded” error no longer blocks signup. Password-reset emails still require Supabase URL configuration and a working mail provider. In **Supabase → Authentication → URL Configuration**:

- Site URL: `https://devspace-ruby.vercel.app`
- Redirect URLs:
  - `https://devspace-ruby.vercel.app/callback`
  - `http://localhost:3000/callback`

This cannot be changed with the service-role key; the Supabase Management API requires a personal access token. For reliable production email delivery and verified signups, configure custom SMTP, then set `SUPABASE_SKIP_EMAIL_CONFIRMATION=false`.

### Future deployments

The Vercel project is not currently connected to Git, so production deploys are explicit:

```bash
npx vercel@latest deploy --prod --yes
```

Environment variables are already stored in the Vercel project. A future Git connection should use the `devspace-3.0` branch as the production branch unless the existing `main` branch is intentionally replaced.

GitHub `main` still contains the previous static prototype. The full application is isolated on `devspace-3.0`; nothing was force-pushed or overwritten.

### Verification evidence

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 26/26 tests passed.
- `npm run test:e2e` — 9/9 Playwright flows passed locally.
- `npm run build` — passed (Next.js 16.4.5).
- Supabase-mode browser test — login, project CRUD, note autosave/reload, workspace/link CRUD, private Storage upload/download/delete, theme persistence and export passed.
- Production browser test — login, project/workspace CRUD, public/private sections, multi-select bulk updates, chat assistant, inline Markdown preview, local File Workspace page, Storage upload/download/delete, theme persistence and export passed against `https://devspace-ruby.vercel.app` with zero console errors.
- Database verification — 9 tables, RLS enabled, 28 product-table policies, 4 storage policies, 1 auth user, 1 profile and 10 tracker records.

### Local File Workspace caveat

`/files` uses the File System Access API, which only exists in Chromium browsers (Chrome/Edge) on a secure origin (`https://` or `localhost`). Firefox and Safari render an explicit “Chrome or Edge is required” state instead of failing silently.

Browsers deliberately forbid a web page from launching Windows Explorer or a desktop application, so “open folder in Explorer” and “open with default app” cannot be implemented for a hosted site. DEVSPACE instead:

- browses the selected folder tree inside the app (breadcrumbs + in-app explorer);
- previews Markdown, text, images and PDFs in a modal;
- offers “Open in new tab” / download for formats the browser cannot render.

Workspace folder handles are stored in IndexedDB, so the folder list survives reloads; Chrome re-asks for permission when the handle was not recently used. Everything happens on the user's machine — no file content is uploaded to Supabase.
