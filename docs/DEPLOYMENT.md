# Deployment

DEVSPACE 3.0 is designed for Vercel + Supabase. The repository currently runs locally with the PGlite fallback. A production deployment requires accounts and credentials that were not available in this environment.

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

**Not deployed.** This environment did not contain:

- Supabase project URL/key or database connection strings.
- A Vercel account token or logged-in CLI.
- A GitHub remote or authentication token.
- Permission to create paid or external resources.

The application was fully built, tested locally, and verified in Chrome. To complete deployment, provide the prerequisites above or run the steps in this document with your accounts. No credentials were fabricated and no deployment URL is claimed.

Local verification performed:

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 19/19 tests passed.
- `npm run test:e2e` — 9/9 Playwright flows passed in a single run.
- `npm run build` — passed (Next.js 16.4.5 production build, all routes compiled).
- Browser smoke test — all seven workspace pages, CRUD flows, theme persistence, search, import/export, registration, password reset and account deletion verified in Chrome.
