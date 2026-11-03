# DEVSPACE 3.0
## Master Project Architecture & Autonomous Development Specification

**Project:** DEVSPACE  
**Version:** 3.0.0  
**Project type:** Multi-user Web Application  
**Status:** Ready for autonomous development  
**Primary agent:** DeepSeek Harness

---

# 1. PROJECT OVERVIEW

DEVSPACE is a modern, professional, multi-user developer workspace.

Its purpose is to provide developers with one central place to organise their coding projects, notes, GitHub information, browser workspaces and Markdown files.

The application must be a fully functional web application, not a static dashboard or UI prototype.

The design must reproduce the supplied DEVSPACE 3.0 visual reference as closely as reasonably possible.

## Product identity

Name: DEVSPACE  
Version: 3.0  
Tagline: Your Personal Developer Workspace.

## Main objectives

- Build a complete multi-user application.
- Implement real authentication.
- Store application data in PostgreSQL.
- Give every user private, isolated data.
- Provide a polished developer dashboard.
- Support desktop, tablet and mobile.
- Deploy the application to Vercel.
- Maintain the source code in GitHub.
- Automate development, testing and deployment wherever possible.

---

# 2. AUTONOMOUS DEVELOPMENT INSTRUCTIONS

You are the lead software engineer, frontend developer, backend developer, database engineer and deployment engineer responsible for delivering DEVSPACE 3.0.

You are expected to work autonomously.

Do not merely provide instructions or code examples. Actually implement the application, configure the available services, run commands, test the implementation and deploy the finished product.

## Autonomous responsibilities

You are authorised to:

1. Inspect the available development environment.
2. Create the application structure.
3. Install necessary dependencies.
4. Implement frontend and backend functionality.
5. Configure Supabase when authorised account access is available.
6. Configure PostgreSQL.
7. Configure Drizzle ORM.
8. Create database schemas and migrations.
9. Configure authentication.
10. Implement database security policies.
11. Configure Vercel when authorised account access is available.
12. Connect the GitHub repository.
13. Run tests and fix errors.
14. Create Git commits.
15. Push changes to the configured GitHub repository.
16. Deploy the application.
17. Verify the production deployment.
18. Update project documentation.

## Autonomous working rules

- Do not stop after generating a plan.
- Continue implementation until the project is complete.
- Do not ask for approval for ordinary coding decisions.
- Choose sensible defaults when technical decisions are necessary.
- Do not leave placeholder functionality.
- Do not claim something works without testing it.
- Do not unnecessarily rewrite working code.
- Do not duplicate components or functionality.
- Keep the code clean, maintainable and organised.
- Explain major implementation decisions in concise progress reports.

## Actions requiring user approval

Stop and request approval before:

- Purchasing paid services or upgrading subscriptions.
- Performing destructive database operations.
- Deleting existing repositories or important project data.
- Changing repository visibility.
- Publishing secrets or credentials.
- Performing irreversible operations.
- Overwriting an existing production deployment in a way that risks losing data.

Never invent credentials, API keys, passwords or account access.

If account authentication is required, ask the user to complete the secure authentication step.

Never commit `.env` files or secrets to GitHub.

---

# 3. TECHNOLOGY STACK

Use the following technology stack.

| Component | Technology |
|---|---|
| Framework | Next.js 16 |
| Frontend | React 19 |
| Programming language | TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Database | PostgreSQL |
| Database hosting | Supabase |
| Authentication | Supabase Auth |
| ORM | Drizzle ORM |
| Database migrations | Drizzle Kit |
| Validation | Zod |
| Forms | React Hook Form |
| Hosting | Vercel |
| Version control | Git |
| Repository | GitHub |

Use stable, mutually compatible package versions. Check the installed Node.js version and package compatibility before installation.

Do not introduce unnecessary frameworks or dependencies.

---

# 4. APPLICATION ARCHITECTURE

Use a modular application architecture.

The application should have four primary layers:

## Layer 1 – Presentation

Responsible for:

- Dashboard.
- Sidebar.
- Navigation.
- Forms.
- Modals.
- Cards.
- Tables.
- Responsive layouts.
- Theme management.

Technology: Next.js, React and Tailwind CSS.

## Layer 2 – Application logic

Responsible for:

- Project management.
- Notes management.
- GitHub integration.
- Workspace management.
- Markdown tracking.
- User settings.
- Validation.
- Business logic.

## Layer 3 – Data access

Responsible for:

- Database queries.
- Drizzle ORM.
- Data validation.
- Database transactions.
- Authentication checks.
- User ownership checks.

## Layer 4 – Infrastructure

Responsible for:

- Supabase.
- PostgreSQL.
- Vercel.
- GitHub.
- Environment configuration.
- Production deployment.

Never expose database credentials or service-role keys to client-side code.

---

# 5. PROJECT STRUCTURE

Create the following project structure.

```text
DEVSPACE/
│
├── public/
│   ├── images/
│   ├── icons/
│   └── logo.svg
│
├── src/
│   │
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   ├── forgot-password/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts
│   │   │
│   │   └── (workspace)/
│   │       ├── layout.tsx
│   │       ├── dashboard/
│   │       │   └── page.tsx
│   │       ├── projects/
│   │       │   └── page.tsx
│   │       ├── notes/
│   │       │   └── page.tsx
│   │       ├── github/
│   │       │   └── page.tsx
│   │       ├── workspaces/
│   │       │   └── page.tsx
│   │       ├── tracker/
│   │       │   └── page.tsx
│   │       └── settings/
│   │           └── page.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── WelcomeBanner.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── ProjectsOverview.tsx
│   │   │   ├── RecentNotes.tsx
│   │   │   ├── GitHubProfile.tsx
│   │   │   ├── UploadTracker.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── projects/
│   │   ├── notes/
│   │   ├── github/
│   │   ├── workspaces/
│   │   ├── tracker/
│   │   └── ui/
│   │
│   ├── features/
│   │   ├── projects/
│   │   ├── notes/
│   │   ├── github/
│   │   ├── workspaces/
│   │   ├── tracker/
│   │   └── settings/
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   ├── schema.ts
│   │   │   └── relations.ts
│   │   ├── auth/
│   │   ├── supabase/
│   │   ├── validation/
│   │   └── utils.ts
│   │
│   ├── hooks/
│   ├── types/
│   └── config/
│
├── drizzle/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

Adjust the structure when necessary, but preserve clear separation of concerns.

---

# 6. DATABASE ARCHITECTURE – POSTGRESQL

Use Supabase-managed PostgreSQL as the primary database.

Use Drizzle ORM for schema definitions, queries and migrations.

All user-owned application records must be associated with an authenticated user.

## Required database tables

### 6.1 profiles

Purpose: Store additional user profile information.

Fields:

- id: UUID, primary key, references auth.users.
- username: unique username.
- display_name.
- avatar_url.
- bio.
- created_at.
- updated_at.

### 6.2 projects

Purpose: Store developer projects.

Fields:

- id: UUID, primary key.
- user_id: UUID, references profiles.
- name.
- description.
- status.
- technology.
- repository_url.
- priority.
- created_at.
- updated_at.

Supported statuses:

- Planning.
- Active.
- Development.
- On Hold.
- Completed.

### 6.3 notes

Purpose: Store user notes.

Fields:

- id: UUID, primary key.
- user_id.
- title.
- content.
- category.
- is_pinned.
- created_at.
- updated_at.

Support Markdown content.

### 6.4 workspaces

Purpose: Store browser workspaces.

Fields:

- id: UUID.
- user_id.
- name.
- description.
- category.
- created_at.
- updated_at.

### 6.5 workspace_links

Purpose: Store links belonging to a workspace.

Fields:

- id: UUID.
- workspace_id.
- user_id.
- title.
- url.
- created_at.

### 6.6 tracker_files

Purpose: Track Markdown documents.

Fields:

- id: UUID.
- user_id.
- filename.
- description.
- file_size.
- upload_status.
- storage_path.
- created_at.
- updated_at.

### 6.7 user_settings

Purpose: Store individual application settings.

Fields:

- id: UUID.
- user_id.
- theme.
- language.
- preferences: JSONB.
- created_at.
- updated_at.

### Database requirements

- Use UUID primary keys.
- Use foreign keys.
- Create appropriate indexes.
- Use timestamps.
- Add unique constraints where necessary.
- Use cascading deletes only where ownership and data lifecycle justify them.
- Validate all incoming data.
- Use database transactions where multiple related operations must succeed together.

Do not create redundant user tables that duplicate Supabase Auth identities.

---

# 7. SUPABASE CONFIGURATION

Configure Supabase as the backend infrastructure.

## Required configuration

1. Create or connect to the user's Supabase project.
2. Configure the PostgreSQL database.
3. Obtain the project URL.
4. Configure the publishable key.
5. Configure the database connection string for Drizzle migrations.
6. Configure Supabase Auth.
7. Configure authentication redirect URLs.
8. Create the database schema.
9. Apply Drizzle migrations.
10. Configure Row Level Security.

Use secure Supabase SSR authentication patterns compatible with the installed Next.js version.

## Authentication requirements

Implement:

- User registration.
- Login.
- Logout.
- Forgot password.
- Password reset.
- Session management.
- Protected application routes.

Support email and password authentication initially.

Do not create a custom authentication system using manually stored passwords.

## Row Level Security

Enable RLS on all user-owned tables.

Policies must ensure:

- Users can read only their own records.
- Users can create records only for their own account.
- Users can update only their own records.
- Users can delete only their own records.

Validate ownership on the server as well as through database policies.

Never rely exclusively on client-side access restrictions.

Keep Supabase service-role credentials server-only.

---

# 8. DRIZZLE ORM

Use Drizzle ORM for PostgreSQL operations.

Required configuration:

- Database connection.
- Schema definitions.
- Relations.
- Migration generation.
- Migration execution.
- Type-safe queries.

Create scripts in package.json for:

- db:generate
- db:migrate
- db:studio
- db:check

Use a pooled connection for the deployed application where appropriate and a suitable direct or migration connection for schema migrations.

Never run destructive migrations against production without explicit approval and a verified backup.

---

# 9. APPLICATION PAGES AND FEATURES

## 9.1 DASHBOARD

The dashboard is the main application screen.

It must include:

### Welcome banner

- Personalized welcome message.
- User display name.
- Developer workspace description.
- DEVSPACE branding.

### Statistics cards

- Total Projects.
- Total Notes.
- GitHub Profile.
- Browser Workspaces.
- Markdown Uploads.

All statistics must come from actual database records or verified API responses.

### Your Projects

Display:

- Project name.
- Description.
- Status.
- Technology.
- Project link.

Include a View All action.

### Recent Notes

Display recently updated notes.

Include a View All action.

### GitHub Profile

Display:

- Avatar.
- Username.
- Public repositories count.
- Profile link.

Only display information actually returned by GitHub.

### Markdown Upload Tracker

Display upload progress and tracked documents.

### Quick Actions

Include:

- New Project.
- New Note.
- Backup Data.
- Settings.

All actions must work.

---

## 9.2 PROJECT MANAGEMENT

Implement complete CRUD functionality.

Features:

- Create project.
- Edit project.
- Delete project.
- View project details.
- Search projects.
- Filter by status.
- Filter by technology.
- Change project status.
- Set priority.
- Add repository URL.

Add form validation and confirmation before deletion.

Every project must belong to the authenticated user.

---

## 9.3 NOTES MANAGEMENT

Implement:

- Create notes.
- Edit notes.
- Delete notes.
- Search notes.
- Categorise notes.
- Pin notes.
- Markdown editing.
- Markdown preview.
- Automatic saving or explicit save functionality.

Protect against accidental data loss.

Every note must belong to the authenticated user.

---

## 9.4 GITHUB INTEGRATION

Use the public GitHub REST API.

Allow users to configure a GitHub username.

Display:

- Avatar.
- Username.
- Public repositories.
- Repository descriptions.
- Primary programming languages.
- Stars.
- Forks.
- Repository links.

Implement:

- Loading states.
- Empty states.
- API error handling.
- Rate-limit handling.
- Refresh functionality.

Do not invent repository statistics.

Do not require a GitHub personal access token for basic public profile information.

---

## 9.5 BROWSER WORKSPACES

Users must be able to:

- Create workspaces.
- Edit workspaces.
- Delete workspaces.
- Add links.
- Edit links.
- Delete links.
- Organise links by category.
- Open saved links.

Validate URLs before saving.

All workspaces and links must be isolated by user ownership.

---

## 9.6 MARKDOWN TRACKER

Create a system to track Markdown files.

Features:

- Add Markdown file.
- Store filename.
- Store description.
- Display upload status.
- Display file size.
- Display upload progress.
- Delete tracked file.

Use Supabase Storage for actual file uploads.

Create a private storage bucket.

Apply file ownership and access restrictions.

Do not pretend that a file has been uploaded if it only exists as a database record.

---

## 9.7 SETTINGS

Include:

- User profile.
- Display name.
- Avatar.
- Theme selection.
- Language preference.
- Account settings.
- Export data.
- Import data.
- Logout.

Provide a safe account deletion flow that explains its consequences and requires explicit confirmation.

---

# 10. DESIGN SYSTEM

The design must reproduce the supplied DEVSPACE 3.0 reference image.

## Design identity

- Professional developer dashboard.
- Dark-first design.
- Emerald green accent.
- Modern cards.
- Minimal visual clutter.
- Consistent spacing.
- Smooth but subtle animations.

## Colour palette

| Element | Colour |
|---|---|
| Main background | #0B0F12 |
| Sidebar | #101519 |
| Card background | #191F25 |
| Card border | #293139 |
| Primary green | #00D995 |
| Primary text | #F1F5F9 |
| Secondary text | #94A3B8 |

Create a consistent set of CSS variables.

Support dark and light themes.

## Sidebar navigation

- Dashboard.
- Projects.
- Notes.
- GitHub.
- Browser Workspaces.
- Markdown Tracker.
- Settings.

## Header

Include:

- Global search.
- Notifications area.
- User avatar.
- User menu.

Do not add non-functional notification icons or buttons.

## Responsive design

Desktop:
- Fixed or collapsible sidebar.
- Full dashboard grid.
- Multi-column cards.

Tablet:
- Compact navigation.
- Responsive card grid.

Mobile:
- Collapsible navigation.
- Single-column content.
- Touch-friendly controls.
- Responsive tables and forms.

---

# 11. DATA SECURITY

Security is a core requirement.

Implement:

- Supabase Auth.
- PostgreSQL RLS.
- Server-side ownership validation.
- Input validation with Zod.
- Secure session handling.
- Secure cookies.
- Protection against unauthorised access.
- Safe error handling.
- No sensitive information in client bundles.
- No database passwords in GitHub.

Never trust a user_id supplied by the browser.

Derive the authenticated user's identity from the verified server-side session.

Use parameterised, type-safe database queries.

Never expose the Supabase service-role key to the frontend.

---

# 12. ENVIRONMENT VARIABLES

Create a `.env.example` file.

Expected variables may include:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

DATABASE_URL=
DIRECT_URL=

SUPABASE_SERVICE_ROLE_KEY=
```

Use the current Supabase key conventions supported by the project.

Keep secrets in local environment files and secure Vercel environment variables.

The actual `.env.local` must be excluded from Git.

Never print secrets in logs, documentation, commits or chat messages.

Do not invent credentials.

If an integration requires account access, guide the user through secure authentication.

---

# 13. BACKUP AND RESTORE

Implement a complete user data export and import system.

Export:

- Profile information where appropriate.
- Projects.
- Notes.
- Workspaces.
- Workspace links.
- Tracker metadata.
- User settings.

Use a documented JSON format with a schema version.

Import requirements:

- Validate the JSON structure.
- Validate record ownership.
- Prevent accidental overwrites.
- Detect duplicate records.
- Display a confirmation summary.
- Use transactions where appropriate.
- Never allow imported data to overwrite another user's records.

Do not export passwords, authentication tokens or private secrets.

For uploaded files, support a documented export strategy for metadata and files where appropriate.

---

# 14. DEVELOPMENT PHASES

Work through the following phases autonomously.

## PHASE 1 – Environment inspection

- Inspect operating system.
- Inspect Node.js.
- Inspect npm/pnpm.
- Inspect Git.
- Inspect available repository.
- Identify existing files.
- Check available credentials and integrations without exposing secrets.

Prepare the development environment.

## PHASE 2 – Project initialisation

- Initialise Next.js.
- Configure TypeScript.
- Configure Tailwind CSS.
- Install dependencies.
- Configure Lucide React.
- Configure linting.
- Configure testing tools.

## PHASE 3 – Supabase infrastructure

- Connect or create the Supabase project.
- Configure PostgreSQL.
- Configure authentication.
- Configure database connection.
- Configure secure environment variables.
- Verify database connectivity.

## PHASE 4 – Database and Drizzle

- Configure Drizzle.
- Create schema.
- Create relations.
- Generate migrations.
- Apply migrations.
- Enable RLS.
- Test user ownership policies.

## PHASE 5 – Authentication

- Registration.
- Login.
- Logout.
- Password reset.
- Session handling.
- Protected routes.

Test with separate test accounts.

## PHASE 6 – Design system

- Create global styles.
- Create sidebar.
- Create header.
- Create reusable components.
- Implement responsive layouts.
- Reproduce DEVSPACE visual reference.

## PHASE 7 – Dashboard

Implement all dashboard sections and connect them to real data.

## PHASE 8 – Core features

Implement:

1. Projects.
2. Notes.
3. GitHub.
4. Browser Workspaces.
5. Markdown Tracker.
6. Settings.

Test each module before moving on.

## PHASE 9 – Backup and restore

Implement JSON export and import.

Test ownership and data integrity.

## PHASE 10 – Testing

Run:

- TypeScript checks.
- ESLint.
- Unit tests.
- Integration tests.
- End-to-end tests.
- Production build.

Fix errors before deployment.

## PHASE 11 – Vercel deployment

- Connect GitHub repository.
- Configure build settings.
- Configure production environment variables.
- Configure Supabase authentication URLs.
- Deploy to Vercel.
- Verify production URL.
- Test registration and login.
- Test database access.
- Test all application features.

Do not mark deployment complete until the actual production URL has been verified.

## PHASE 12 – Git release

- Review changed files.
- Verify `.gitignore`.
- Verify no secrets are staged.
- Run tests.
- Create meaningful commits.
- Push changes to GitHub.
- Verify remote branch.
- Record deployment information.

---

# 15. GIT AND GITHUB WORKFLOW

Use Git throughout development.

Create meaningful commits after completed milestones.

Suggested commit history:

1. `chore: initialize DEVSPACE 3.0`
2. `chore: configure Next.js and TypeScript`
3. `feat: configure Supabase infrastructure`
4. `feat: implement PostgreSQL database schema`
5. `feat: implement authentication`
6. `feat: build DEVSPACE design system`
7. `feat: implement dashboard`
8. `feat: implement project management`
9. `feat: implement notes management`
10. `feat: integrate GitHub API`
11. `feat: implement browser workspaces`
12. `feat: implement markdown tracker`
13. `feat: implement user settings`
14. `feat: implement data backup and restore`
15. `test: add application test coverage`
16. `docs: complete project documentation`
17. `release: DEVSPACE 3.0`

Use the existing configured repository if one has been provided.

If no repository exists, prepare a new Git repository and ask the user to confirm the destination before publishing it.

Push completed changes to the configured remote.

Never force-push or overwrite unrelated remote history without explicit approval.

---

# 16. TESTING REQUIREMENTS

The application must pass the following checks.

## Authentication

- Registration works.
- Login works.
- Logout works.
- Password reset works.
- Protected routes work.
- Sessions remain valid appropriately.

## User isolation

- User A cannot read User B's projects.
- User A cannot edit User B's notes.
- User A cannot access User B's workspaces.
- User A cannot access User B's uploaded files.
- RLS policies prevent cross-account access.

## Projects

- Create.
- Read.
- Update.
- Delete.
- Search.
- Filter.

## Notes

- Create.
- Read.
- Update.
- Delete.
- Markdown preview.
- Search.

## GitHub

- Valid username.
- Invalid username.
- Empty profile.
- API rate limits.
- Network failures.

## Workspaces

- Create.
- Edit.
- Delete.
- Add links.
- Open links.

## Tracker

- Upload.
- Track.
- Display progress.
- Delete.
- Verify file ownership.

## Backup

- Export.
- Import.
- Invalid JSON handling.
- Duplicate handling.
- Ownership validation.

## Production

- Build succeeds.
- No critical browser console errors.
- No broken navigation.
- Responsive layouts work.
- Database connection works.
- Authentication works.
- Production environment variables are configured.

---

# 17. PERFORMANCE REQUIREMENTS

- Use server components by default.
- Use client components only where interactivity requires them.
- Avoid unnecessary client-side JavaScript.
- Optimise images.
- Paginate larger data collections.
- Avoid unnecessary database queries.
- Use indexes for frequently queried fields.
- Handle loading states.
- Handle errors gracefully.
- Use caching only where it is safe for user-specific information.

Never cache private user data across accounts.

---

# 18. DOCUMENTATION

Create a comprehensive README.md containing:

- Project overview.
- Screenshots.
- Technology stack.
- Features.
- Project structure.
- Installation instructions.
- Environment variables.
- Supabase setup.
- PostgreSQL setup.
- Drizzle commands.
- Local development instructions.
- Testing instructions.
- Deployment instructions.
- Git workflow.

Also create:

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT.md`
- `docs/SECURITY.md`

---

# 19. DEFINITION OF DONE

DEVSPACE 3.0 is complete only when:

[ ] Next.js application is working.

[ ] Design matches the DEVSPACE 3.0 reference.

[ ] Supabase is connected.

[ ] PostgreSQL database is configured.

[ ] Drizzle ORM is working.

[ ] Database migrations are applied.

[ ] Authentication is functional.

[ ] RLS is enabled and tested.

[ ] User data is isolated.

[ ] Dashboard works.

[ ] Project management works.

[ ] Notes management works.

[ ] GitHub integration works.

[ ] Browser Workspaces work.

[ ] Markdown Tracker works.

[ ] Settings work.

[ ] Backup and restore work.

[ ] Responsive design works.

[ ] Tests pass.

[ ] Production build succeeds.

[ ] Git commits are created.

[ ] Changes are pushed to GitHub.

[ ] Vercel deployment is live.

[ ] Production application has been verified.

[ ] Documentation is complete.

---

# 20. FINAL AUTONOMOUS EXECUTION DIRECTIVE

Your task is to build DEVSPACE 3.0 from beginning to end.

Do not stop after planning.

Do not return only code snippets.

Do not create a static visual prototype and call it complete.

Build the real application.

Configure the available infrastructure.

Connect PostgreSQL through Supabase.

Configure Drizzle ORM.

Implement authentication and secure user data isolation.

Build all specified features.

Test the application.

Commit the implementation.

Push it to GitHub.

Deploy it to Vercel.

Verify the live application.

If you encounter an obstacle requiring user interaction, such as account login, missing credentials or payment approval:

1. Explain exactly what is needed.
2. Never fabricate credentials.
3. Complete all independent tasks that can safely proceed.
4. Resume automatically after the required access is provided.

Do not perform destructive or paid operations without explicit approval.

## FINAL REPORT

When everything is complete, provide:

1. Project overview.
2. Technologies used.
3. Implemented features.
4. Supabase project status.
5. PostgreSQL database status.
6. Drizzle migration status.
7. Authentication status.
8. Security and RLS status.
9. GitHub repository URL.
10. Commit history summary.
11. Vercel production URL.
12. Test results.
13. Any outstanding issues.

Be honest about anything that remains incomplete.

**FINAL GOAL:**

Deliver a fully functional, secure, professional, multi-user DEVSPACE 3.0 web application, deployed online and maintained in GitHub.

Start by inspecting the environment and available integrations. Then execute the project phases in order, autonomously, without waiting for approval for routine development tasks.
