import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/password";
import { saveFile } from "@/lib/storage";
import type { AppDatabase } from "./index";
import {
  localAccounts,
  notes,
  profiles,
  projects,
  trackerFiles,
  userSettings,
  workspaceLinks,
  workspaces,
} from "./schema";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const ago = (days = 0, hours = 0) => new Date(Date.now() - days * DAY - hours * HOUR);

const DEMO_EMAIL = "demo@devspace.app";
const DEMO_PASSWORD = "Devspace123!";

// A verified snapshot of the public GitHub profile, used as a graceful fallback
// when GitHub's unauthenticated API rate limit is exhausted.
const demoGitHubCache = {
  profile: {
    login: "davidcosmatech",
    name: "David Cosma",
    bio: "🌐 Web Developer in Progress | Turning ideas into websites. Always learning, always building. 🚀",
    avatarUrl: "https://avatars.githubusercontent.com/u/199480626?v=4",
    htmlUrl: "https://github.com/davidcosmatech",
    publicRepos: 2,
    followers: 0,
    following: 0,
    createdAt: "2025-02-16T00:00:00.000Z",
  },
  repos: [
    {
      id: 1,
      name: "DEVSPACE",
      description: "A personal developer dashboard for managing projects, notes and GitHub activity.",
      htmlUrl: "https://github.com/davidcosmatech/DEVSPACE",
      language: "JavaScript",
      stars: 0,
      forks: 0,
      updatedAt: new Date(Date.now() - 2 * DAY).toISOString(),
      fork: false,
    },
    {
      id: 2,
      name: "CosmaTech-Solutions",
      description: null,
      htmlUrl: "https://github.com/davidcosmatech/CosmaTech-Solutions",
      language: "HTML",
      stars: 0,
      forks: 0,
      updatedAt: new Date(Date.now() - 28 * DAY).toISOString(),
      fork: false,
    },
  ],
  savedAt: new Date(Date.now() - 4 * HOUR).toISOString(),
};

const projectSeed = [
  {
    name: "DEVSPACE",
    description: "Personal development workspace",
    status: "Active",
    technology: "Next.js",
    repositoryUrl: "https://github.com/davidcosmatech",
    priority: "high",
    visibility: "public",
    createdAt: ago(35),
    updatedAt: ago(0, 3),
  },
  {
    name: "StudyFlow",
    description: "Study planner and tracker",
    status: "Planning",
    technology: "React",
    repositoryUrl: null,
    priority: "medium",
    visibility: "private",
    createdAt: ago(18),
    updatedAt: ago(1, 2),
  },
  {
    name: "Todo App",
    description: "Simple task manager",
    status: "Development",
    technology: "TypeScript",
    repositoryUrl: null,
    priority: "medium",
    visibility: "public",
    createdAt: ago(12),
    updatedAt: ago(2, 1),
  },
  {
    name: "Portfolio Website",
    description: "Personal portfolio site",
    status: "On Hold",
    technology: "Next.js",
    repositoryUrl: null,
    priority: "low",
    visibility: "public",
    createdAt: ago(60),
    updatedAt: ago(3),
  },
  {
    name: "Python Tools",
    description: "Useful Python utilities",
    status: "Completed",
    technology: "Python",
    repositoryUrl: null,
    priority: "low",
    visibility: "private",
    createdAt: ago(90),
    updatedAt: ago(4),
  },
];

const projectWorkspace: Record<string, string> = {
  DEVSPACE: "Frontend Development",
  StudyFlow: "Learning",
  "Todo App": "Frontend Development",
  "Portfolio Website": "Design & Inspiration",
  "Python Tools": "Learning",
};

const noteSeed = [
  {
    title: "Development Tips",
    category: "Development",
    isPinned: true,
    updatedAt: ago(0, 2),
    content: `# Development Tips

A running collection of small habits that make shipping software easier.

## Daily workflow

- Start with **one** clearly defined outcome.
- Keep commits small and descriptive.
- Run \`npm run typecheck\` before opening a pull request.
- Fix the root cause, not the symptom.

## Debugging

\`\`\`ts
// Reproduce before you fix.
const failingInput = { status: "Active", limit: 5 };
console.log(await listProjects(failingInput));
\`\`\`

> If a bug takes longer than 20 minutes to understand, write down what you know.

## Useful links

- [Next.js documentation](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Web.dev performance guides](https://web.dev/learn)
`,
  },
  {
    title: "Python Best Practices",
    category: "Python",
    isPinned: false,
    updatedAt: ago(1),
    content: `# Python Best Practices

## Project layout

\`\`\`text
project/
├── src/package/
├── tests/
├── pyproject.toml
└── README.md
\`\`\`

## Typing

Use type hints at public boundaries and let inference do the rest.

\`\`\`python
from collections.abc import Iterable


def chunked(items: Iterable[str], size: int = 100) -> list[list[str]]:
    bucket: list[list[str]] = []
    batch: list[str] = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            bucket.append(batch)
            batch = []
    if batch:
        bucket.append(batch)
    return bucket
\`\`\`

- Prefer virtual environments.
- Pin runtime dependencies.
- Use \`ruff\` and \`pytest\`.
`,
  },
  {
    title: "Project Ideas",
    category: "Planning",
    isPinned: true,
    updatedAt: ago(2),
    content: `# Project Ideas

## Short builds

1. **Focus timer** — pomodoro with project tagging and weekly statistics.
2. **Markdown inbox** — drop files, tag them, search full text.
3. **Release notes generator** — turn conventional commits into a changelog.

## Bigger bets

- A local-first code snippet library with sync.
- A visual PostgreSQL schema explorer.
- A webhook debugger with replay support.

## Next steps

- [ ] Pick one idea for the next two-week cycle.
- [ ] Write a one-page product brief.
- [ ] Define the smallest testable release.
`,
  },
  {
    title: "React Patterns",
    category: "Development",
    isPinned: false,
    updatedAt: ago(4),
    content: `# React Patterns

## Keep state close

Only lift state when two siblings genuinely need it.

## Server first

In the App Router, fetch on the server. Reach for \`"use client"\` when you need
browser APIs, event handlers, or local interactive state.

## Composition over conditionals

\`\`\`tsx
<Panel>
  <Panel.Header>Recent work</Panel.Header>
  <Panel.Body>{children}</Panel.Body>
</Panel>
\`\`\`

Readable component boundaries beat clever abstractions.
`,
  },
  {
    title: "API Design Notes",
    category: "Backend",
    isPinned: false,
    updatedAt: ago(7),
    content: `# API Design Notes

- Validate every boundary with Zod.
- Return stable error codes, not just prose.
- Paginate collections by default.
- Derive identity from the session, never from the request body.
- Make retries safe where possible.

\`\`\`ts
const payload = projectInput.parse(await request.json());
\`\`\`

An API is a product: document its happy path and its failure modes.
`,
  },
  {
    title: "PostgreSQL Cheatsheet",
    category: "Database",
    isPinned: false,
    updatedAt: ago(10),
    content: `# PostgreSQL Cheatsheet

\`\`\`sql
-- Find slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Indexes for a user-scoped list
CREATE INDEX projects_user_updated_idx
ON projects (user_id, updated_at DESC);
\`\`\`

Use \`EXPLAIN (ANALYZE, BUFFERS)\` before adding an index.
`,
  },
  {
    title: "Git Workflow",
    category: "Development",
    isPinned: false,
    updatedAt: ago(14),
    content: `# Git Workflow

1. Branch from \`main\`.
2. Keep each commit focused.
3. Rebase before review if the branch is noisy.
4. Never force-push shared branches.
5. Tag releases with semantic versions.

\`\`\`bash
git switch -c feat/project-filters
git add -p
git commit -m "feat: add project filters"
\`\`\`
`,
  },
  {
    title: "Deployment Checklist",
    category: "DevOps",
    isPinned: false,
    updatedAt: ago(20),
    content: `# Deployment Checklist

- [ ] Environment variables set in the host.
- [ ] Database migrations applied.
- [ ] Production build passes locally.
- [ ] Auth redirect URLs include the production domain.
- [ ] RLS enabled on every user-owned table.
- [ ] Error monitoring enabled.
- [ ] Rollback plan documented.
`,
  },
  {
    title: "UI Inspiration",
    category: "Design",
    isPinned: false,
    updatedAt: ago(25),
    content: `# UI Inspiration

## What makes a developer dashboard feel calm?

- Strong hierarchy, few competing accents.
- Dense but breathable lists.
- Clear status colours used sparingly.
- Motion that confirms an action instead of decorating it.
- Empty states that teach the next step.

The DEVSPACE palette: graphite surfaces, a single emerald accent, and cool grey
secondary text.
`,
  },
  {
    title: "TypeScript Notes",
    category: "Development",
    isPinned: false,
    updatedAt: ago(31),
    content: `# TypeScript Notes

\`\`\`ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
\`\`\`

Prefer discriminated unions over optional fields that depend on each other.
`,
  },
  {
    title: "Learning Log",
    category: "Personal",
    isPinned: false,
    updatedAt: ago(45),
    content: `# Learning Log

## This month

- App Router data fetching and streaming.
- Drizzle relations and migrations.
- Better keyboard accessibility in modals.
- Writing smaller, more useful tests.

## Next

- PostgreSQL query planning.
- End-to-end testing with Playwright.
`,
  },
  {
    title: "Reading List",
    category: "Personal",
    isPinned: false,
    updatedAt: ago(60),
    content: `# Reading List

- *A Philosophy of Software Design* — John Ousterhout
- *Designing Data-Intensive Applications* — Martin Kleppmann
- *Refactoring UI* — Adam Wathan & Steve Schoger
- *The Pragmatic Programmer* — Hunt & Thomas

> Keep a short list. Finish before adding more.
`,
  },
];

const workspaceSeed = [
  {
    name: "Frontend Development",
    description: "Daily tools and documentation for building interfaces.",
    category: "Development",
    links: [
      { title: "Next.js Docs", url: "https://nextjs.org/docs", category: "Documentation" },
      { title: "Tailwind CSS", url: "https://tailwindcss.com/docs", category: "Documentation" },
      { title: "React", url: "https://react.dev", category: "Documentation" },
      { title: "MDN Web Docs", url: "https://developer.mozilla.org", category: "Reference" },
    ],
  },
  {
    name: "Learning",
    description: "Courses, articles and reference material for deliberate practice.",
    category: "Learning",
    links: [
      { title: "web.dev Learn", url: "https://web.dev/learn", category: "Course" },
      { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/", category: "Reference" },
      { title: "Drizzle ORM", url: "https://orm.drizzle.team", category: "Documentation" },
    ],
  },
  {
    name: "Design & Inspiration",
    description: "Interfaces, palettes and patterns worth revisiting.",
    category: "Design",
    links: [
      { title: "Dribbble", url: "https://dribbble.com", category: "Inspiration" },
      { title: "Refactoring UI", url: "https://www.refactoringui.com", category: "Book" },
    ],
  },
];

const trackerSeed = [
  {
    filename: "README.md",
    description: "Project overview, setup and contribution guide.",
    status: "uploaded",
    createdAt: ago(2),
    body: `# DEVSPACE\n\nYour personal developer workspace.\n\n## Run locally\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`,
  },
  {
    filename: "api-design.md",
    description: "Internal API conventions and error handling.",
    status: "uploaded",
    createdAt: ago(3),
    body: `# API design\n\n- Validate inputs with Zod.\n- Derive the user from the session.\n- Use stable error codes.\n`,
  },
  {
    filename: "react-patterns.md",
    description: "Server-first React patterns and composition notes.",
    status: "uploaded",
    createdAt: ago(4),
    body: `# React patterns\n\nKeep state close. Fetch on the server. Compose small components.\n`,
  },
  {
    filename: "python-snippets.md",
    description: "Reusable Python helpers collected over time.",
    status: "uploaded",
    createdAt: ago(6),
    body: `# Python snippets\n\n\`\`\`python\nprint("hello")\n\`\`\`\n`,
  },
  {
    filename: "database-notes.md",
    description: "PostgreSQL indexing and migration notes.",
    status: "uploaded",
    createdAt: ago(8),
    body: `# Database notes\n\nIndexes should support the queries you actually run.\n`,
  },
  {
    filename: "deployment-checklist.md",
    description: "Pre-flight checks for every release.",
    status: "uploaded",
    createdAt: ago(10),
    body: `# Deployment checklist\n\n- [ ] Migrations\n- [ ] Environment variables\n- [ ] Auth redirects\n- [ ] Smoke test\n`,
  },
  {
    filename: "project-roadmap.md",
    description: "Quarterly plan for DEVSPACE and side projects.",
    status: "uploaded",
    createdAt: ago(12),
    body: `# Roadmap\n\n1. Ship the workspace.\n2. Add collaboration.\n3. Improve search.\n`,
  },
  {
    filename: "learning-log.md",
    description: "What I learned this sprint.",
    status: "uploaded",
    createdAt: ago(14),
    body: `# Learning log\n\n- App Router streaming\n- Drizzle migrations\n- Accessible dialogs\n`,
  },
  {
    filename: "design-system.md",
    description: "Colour tokens, spacing and component rules.",
    status: "pending",
    createdAt: ago(1),
    body: "",
  },
  {
    filename: "ideas.md",
    description: "Raw product ideas waiting to be shaped.",
    status: "pending",
    createdAt: ago(0, 5),
    body: "",
  },
];

export async function seedLocalWorkspace(db: AppDatabase) {
  const existing = await db
    .select({ id: localAccounts.id })
    .from(localAccounts)
    .where(eq(localAccounts.email, DEMO_EMAIL))
    .limit(1);
  if (existing.length > 0) return;

  const userId = randomUUID();
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const trackerRows: (typeof trackerFiles.$inferInsert)[] = [];

  for (const item of trackerSeed) {
    if (item.status === "uploaded") {
      const buffer = Buffer.from(item.body, "utf8");
      const storagePath = await saveFile({
        userId,
        filename: item.filename,
        buffer,
        contentType: "text/markdown",
      });
      trackerRows.push({
        userId,
        filename: item.filename,
        description: item.description,
        fileSize: buffer.byteLength,
        uploadStatus: "uploaded",
        storagePath,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      });
    } else {
      trackerRows.push({
        userId,
        filename: item.filename,
        description: item.description,
        fileSize: 0,
        uploadStatus: "pending",
        storagePath: null,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(profiles).values({
      id: userId,
      username: "davidcosmatech",
      displayName: "David Cosma",
      avatarUrl: null,
      bio: "Developer, problem solver, lifelong learner.",
      email: DEMO_EMAIL,
      role: "admin",
      status: "active",
      githubUsername: "davidcosmatech",
      githubCache: demoGitHubCache,
      githubCacheUpdatedAt: ago(0, 4),
      createdAt: ago(120),
      updatedAt: ago(1),
    });

    await tx.insert(localAccounts).values({
      id: userId,
      email: DEMO_EMAIL,
      passwordHash,
      createdAt: ago(120),
    });

    await tx.insert(userSettings).values({
      userId,
      theme: "dark",
      language: "en",
      preferences: {
        emailDigest: true,
        compactSidebar: false,
        defaultProjectView: "list",
        showGitHubStats: true,
      },
      createdAt: ago(120),
      updatedAt: ago(3),
    });

    await tx.insert(notes).values(noteSeed.map((note) => ({ ...note, userId })));

    const workspaceIdsByName: Record<string, string> = {};

    for (const workspace of workspaceSeed) {
      const [created] = await tx
        .insert(workspaces)
        .values({
          userId,
          name: workspace.name,
          description: workspace.description,
          category: workspace.category,
          createdAt: ago(40),
          updatedAt: ago(2),
        })
        .returning({ id: workspaces.id });
      workspaceIdsByName[workspace.name] = created.id;

      await tx.insert(workspaceLinks).values(
        workspace.links.map((link) => ({
          workspaceId: created.id,
          userId,
          title: link.title,
          url: link.url,
          category: link.category,
          createdAt: ago(20),
        })),
      );
    }

    await tx.insert(projects).values(
      projectSeed.map((project) => ({
        ...project,
        userId,
        workspaceId: workspaceIdsByName[projectWorkspace[project.name]] ?? null,
      })),
    );

    await tx.insert(trackerFiles).values(trackerRows);
  });
}

export const demoCredentials = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
