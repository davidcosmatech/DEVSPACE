# Security

## Threat model

DEVSPACE stores private developer notes, project metadata, browser links and uploaded Markdown files for multiple users. The primary risks are:

- Cross-account data access.
- Credential theft or session fixation.
- Malicious file uploads or path traversal.
- Unsafe links or stored XSS through Markdown.
- Malicious backup imports.
- Secret leakage into client bundles or Git.

## Authentication

### Production

Supabase Auth handles credentials. DEVSPACE never stores passwords when Supabase is enabled.

- `@supabase/ssr` stores sessions in HttpOnly cookies.
- `getViewer()` verifies the user with `supabase.auth.getUser()` on the server for every protected request.
- The callback exchanges the PKCE code before creating a session.
- Password reset uses Supabase's single-use recovery link.
- Account deletion requires reauthentication with the current password, then removes the Supabase Auth user and profile.

### Local development

- Passwords are hashed with scrypt using a unique 16-byte salt and 64-byte derived key.
- Verification uses `timingSafeEqual`.
- Sessions are signed HS256 JWTs (HttpOnly, SameSite=Lax, Secure in production, 7-day expiry).
- The signing secret comes from `SESSION_SECRET` or a generated 48-byte `.data/.session-secret`.
- Password resets increment `session_version`, invalidating all existing sessions.
- Reset tokens are random 32-byte values; only their SHA-256 hashes are stored. They expire after one hour and are single-use.

The local provider cannot be activated accidentally when Supabase is configured: `isSupabaseAuthEnabled()` branches first.

## Authorization

- Every protected page, Server Action and route handler calls `requireViewer()` / `getViewer()`.
- Every user-owned query includes an ownership predicate derived from the verified session.
- A browser-supplied `user_id` is never accepted or trusted.
- Child records verify their parent's owner before mutation.
- Downloads recheck both the file id and the owner before touching storage.
- Supabase RLS mirrors these rules for any direct client access.

## Input validation

- All mutations parse input with Zod before touching the database.
- Forms additionally use React Hook Form + Zod on the client for inline feedback.
- URLs accept only `http` and `https`; `javascript:`, `data:` and other schemes are rejected.
- GitHub usernames are validated against GitHub's allowed pattern.
- Uploads allow only `.md`, `.markdown`, `.mdx` and `.txt`, maximum 4 MB.
- Filenames are sanitized and storage paths are resolved inside the storage root.
- Backup imports validate the full document, schema version and record limits before building a plan.

## XSS and link safety

- Markdown is rendered by `react-markdown` with `remark-gfm`; raw HTML is not enabled by default.
- External links open with `rel="noreferrer noopener"`.
- Repository and workspace URLs are validated and rechecked at render time with `safeExternalUrl`.
- No user content is injected with `dangerouslySetInnerHTML`; the only inline script is the static theme bootstrap.

## CSRF and sessions

- Server Actions use Next.js's built-in same-origin checks.
- Session cookies are SameSite=Lax and HttpOnly.
- API route handlers only accept POST for mutations and rely on the session cookie; no token is accepted from query strings.
- File downloads are authenticated and use `Cache-Control: private, no-store`.

## File storage

- Local: `.data/storage/<user-id>/<uuid>-<filename>`, path traversal blocked by resolving under the storage root.
- Supabase: private `markdown-files` bucket, 4 MB limit, owner-scoped policies.
- Service-role credentials are imported only in server-only modules.
- Uploaded bytes are written before a tracker row is marked `uploaded`.
- Deleting a tracker row deletes the stored object.

## Secrets

- `.env`, `.env.local`, `.data/` and key files are gitignored.
- Only `.env.example` is tracked.
- `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix and is used only in `src/lib/storage.ts` and `src/features/settings/actions.ts`.
- The client receives only the Supabase URL and publishable key.
- No credential is printed in logs, documentation or chat.

## GitHub data

- Only public GitHub REST API data is requested; no token is required or stored.
- Successful responses are snapshotted per user in `profiles.github_cache`.
- When GitHub rate-limits or is unreachable, the last verified snapshot is displayed and labelled as cached. Statistics are never invented.
- Cache writes occur server-side and are scoped to the authenticated user.

## Backup import safety

- The imported owner is always the current authenticated user.
- IDs are generated server-side.
- Existing records are never updated or overwritten.
- Duplicate records are skipped.
- Tracker metadata imports as pending without a storage path.
- The entire insert runs in a transaction and rolls back on any failure.
- Malicious URLs are dropped; invalid documents are rejected.

## Account deletion

Deletion requires:

1. Typing `DELETE`.
2. The current password.
3. A server-side reauthentication check.

The server removes stored files first, then deletes the profile, which cascades projects, notes, workspaces, links, settings, tracker records, local credentials and reset tokens. In Supabase mode it also deletes the Auth user with the service-role key.

## Headers and transport

- Secure cookies are enabled in production.
- Vercel serves HTTPS by default.
- Next.js applies its standard security defaults.
- Supabase enforces TLS on database and API connections.

Additional hardening recommended for production:

- Add a Content-Security-Policy at the Vercel/CDN layer.
- Enable Supabase Auth rate limits and CAPTCHA for registration.
- Enable leaked-password protection in Supabase Auth.
- Configure a custom SMTP provider for reliable password reset delivery.
- Add monitoring/alerts for repeated auth failures.

## Known limitations

- The local auth provider is for single-instance development only. It is not a replacement for Supabase Auth and is not used when Supabase is configured.
- RLS policies are applied to the live Supabase project and verified: every product table has four owner-scoped policies, and the private storage bucket has four owner policies. Continue to validate with two real test accounts whenever policies change.
- The production demo account is intentionally seeded and uses a separate password supplied privately. Change or remove it before using the deployment for private data.
- Supabase Auth site/redirect URL configuration remains a dashboard step: new-user confirmation and password-reset email links need the Vercel callback URL allow-listed.
- File uploads are capped at 4 MB because of the Vercel request-body limit. Larger files would need direct-to-storage signed uploads.
- There is no user-facing activity audit log.
- The app does not implement email verification itself; it relies on Supabase's configuration.
