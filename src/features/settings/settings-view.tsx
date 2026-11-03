"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  FileJson,
  Loader2,
  LogOut,
  Moon,
  Palette,
  Save,
  ShieldAlert,
  Sun,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { Github } from "@/components/icons/github";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { logoutAction } from "@/features/auth/actions";
import {
  deleteAccountAction,
  updateAppearanceAction,
  updateProfileAction,
} from "@/features/settings/actions";
import type { Viewer } from "@/lib/auth";
import type { UserSettings } from "@/lib/db/schema";
import {
  appearanceSchema,
  type AppearanceInput,
  deleteAccountSchema,
  type DeleteAccountInput,
  languages,
  profileSchema,
  type ProfileInput,
} from "@/lib/validation/settings";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "data", label: "Backup & data", icon: Database },
  { id: "account", label: "Account", icon: ShieldAlert },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function SettingsView({
  viewer,
  settings,
  localMode,
  initialTab,
}: {
  viewer: Viewer;
  settings: UserSettings;
  localMode: boolean;
  initialTab: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);

  function selectTab(next: TabId) {
    setTab(next);
    window.history.replaceState(null, "", `/settings?tab=${next}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        icon={UserRound}
        title="Settings"
        description="Manage your developer profile, appearance, data and account security."
      />

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "active" : ""}
              onClick={() => selectTab(item.id)}
            >
              <item.icon size={15} /> {item.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {tab === "profile" ? <ProfileSection viewer={viewer} /> : null}
          {tab === "appearance" ? (
            <AppearanceSection settings={settings} />
          ) : null}
          {tab === "data" ? <DataSection /> : null}
          {tab === "account" ? (
            <AccountSection viewer={viewer} localMode={localMode} />
          ) : null}
        </div>
      </div>
    </>
  );
}

function ProfileSection({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: viewer.displayName,
      username: viewer.username,
      bio: viewer.bio,
      avatarUrl: viewer.avatarUrl ?? "",
      githubUsername: viewer.githubUsername ?? "",
    },
  });

  const avatar = useWatch({ control, name: "avatarUrl" });

  async function submit(values: ProfileInput) {
    setSaving(true);
    try {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save your profile.");
        return;
      }
      toast.success("Profile saved.");
      reset(values);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <h2>Developer profile</h2>
        <p>This identity appears across the dashboard and your GitHub card.</p>
      </div>
      <div className="settings-section-body">
        <form className="form-stack" onSubmit={handleSubmit(submit)} noValidate>
          <div className="avatar-row">
            <Avatar name={viewer.displayName} src={avatar || viewer.avatarUrl} size="xl" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{viewer.displayName}</div>
              <p>@{viewer.username} · {viewer.email}</p>
              <p>Paste a public image URL below, or leave blank to use your initials.</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="settings-name">
                Display name
              </label>
              <input
                id="settings-name"
                className="input"
                aria-invalid={Boolean(errors.displayName)}
                {...register("displayName")}
              />
              {errors.displayName ? (
                <span className="field-error">{errors.displayName.message}</span>
              ) : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="settings-username">
                Username
              </label>
              <input
                id="settings-username"
                className="input"
                aria-invalid={Boolean(errors.username)}
                {...register("username")}
              />
              {errors.username ? <span className="field-error">{errors.username.message}</span> : null}
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="settings-avatar">
              Avatar URL <span className="label-hint">Optional</span>
            </label>
            <input
              id="settings-avatar"
              className="input"
              placeholder="https://avatars.githubusercontent.com/…"
              aria-invalid={Boolean(errors.avatarUrl)}
              {...register("avatarUrl")}
            />
            {errors.avatarUrl ? <span className="field-error">{errors.avatarUrl.message}</span> : null}
          </div>

          <div className="field">
            <label className="label" htmlFor="settings-bio">
              Bio <span className="label-hint">Optional</span>
            </label>
            <textarea
              id="settings-bio"
              className="textarea"
              style={{ minHeight: 86 }}
              placeholder="Developer, problem solver, lifelong learner."
              {...register("bio")}
            />
            {errors.bio ? <span className="field-error">{errors.bio.message}</span> : null}
          </div>

          <div className="field">
            <label className="label" htmlFor="settings-github">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Github size={13} /> GitHub username
              </span>
              <span className="label-hint">Optional</span>
            </label>
            <input
              id="settings-github"
              className="input"
              placeholder="octocat"
              {...register("githubUsername")}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function AppearanceSection({ settings }: { settings: UserSettings }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [appearance, setAppearance] = useState<AppearanceInput>({
    theme: settings.theme === "light" ? "light" : "dark",
    language:
      settings.language === "es" || settings.language === "fr" ? settings.language : "en",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.documentElement.lang = appearance.language;
  }, [appearance.language]);

  async function save(next: AppearanceInput) {
    const parsed = appearanceSchema.safeParse(next);
    if (!parsed.success) return;
    setAppearance(parsed.data);
    if (parsed.data.theme !== appearance.theme) setTheme(parsed.data.theme);
    setSaving(true);
    try {
      const result = await updateAppearanceAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error ?? "Could not save appearance.");
        return;
      }
      toast.success("Appearance saved.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Theme</h2>
          <p>Dark is the default for long development sessions. Light is available anywhere.</p>
        </div>
        <div className="settings-section-body">
          <div className="theme-cards">
            <button
              type="button"
              className={cn("theme-card", appearance.theme === "dark" && "active")}
              onClick={() => save({ ...appearance, theme: "dark" })}
              disabled={saving}
            >
              <span className="theme-preview dark" />
              <span className="theme-card-label">
                <Moon size={13} /> Graphite dark
                {appearance.theme === "dark" ? <Check size={13} style={{ marginLeft: "auto" }} /> : null}
              </span>
            </button>
            <button
              type="button"
              className={cn("theme-card", appearance.theme === "light" && "active")}
              onClick={() => save({ ...appearance, theme: "light" })}
              disabled={saving}
            >
              <span className="theme-preview light" />
              <span className="theme-card-label">
                <Sun size={13} /> Daylight
                {appearance.theme === "light" ? <Check size={13} style={{ marginLeft: "auto" }} /> : null}
              </span>
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Language & locale</h2>
          <p>Dates and numbers follow this locale. Interface translation is rolling out.</p>
        </div>
        <div className="settings-section-body">
          <div className="field" style={{ maxWidth: 300 }}>
            <label className="label" htmlFor="settings-language">
              Preferred language
            </label>
            <select
              id="settings-language"
              className="select"
              value={appearance.language}
              onChange={(event) =>
                save({ ...appearance, language: event.target.value as AppearanceInput["language"] })
              }
              disabled={saving}
            >
              {languages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </>
  );
}

type ImportPreview = {
  summary: {
    projects: { new: number; skipped: number };
    notes: { new: number; skipped: number };
    workspaces: { new: number; skipped: number };
    links: { new: number; skipped: number };
    trackerFiles: { new: number; skipped: number };
  };
  conflicts: string[];
  trackerNote: string;
  settingsPreserved: boolean;
  exportedAt?: string;
};

function DataSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  async function callImport(selected: File, mode: "preview" | "apply") {
    const formData = new FormData();
    formData.set("file", selected);
    const response = await fetch(`/api/import?mode=${mode}`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as ImportPreview & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Import failed.");
    return payload;
  }

  async function chooseBackup(selected: File | undefined) {
    if (!selected) return;
    setError(null);
    setPreview(null);
    setLoading(true);
    setFile(selected);
    try {
      const result = await callImport(selected, "preview");
      setPreview(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read that backup.");
    } finally {
      setLoading(false);
    }
  }

  async function applyImport() {
    if (!file) return;
    setImporting(true);
    try {
      const result = await callImport(file, "apply");
      const inserted =
        result.summary.projects.new +
        result.summary.notes.new +
        result.summary.workspaces.new +
        result.summary.links.new +
        result.summary.trackerFiles.new;
      toast.success(`Imported ${inserted} record${inserted === 1 ? "" : "s"}.`);
      setPreview(null);
      setFile(null);
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Export your data</h2>
          <p>Download a versioned JSON backup of your workspace records.</p>
        </div>
        <div className="settings-section-body">
          <div className="data-action">
            <span className="file-icon">
              <Download size={17} />
            </span>
            <div className="data-action-copy">
              <strong>DEVSPACE JSON backup</strong>
              <p>
                Projects, notes, workspaces, links, tracker metadata and preferences. Passwords,
                tokens and private storage paths are never exported.
              </p>
            </div>
            <a href="/api/export" className="btn btn-secondary btn-sm">
              Download backup
            </a>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Import a backup</h2>
          <p>Restore records without overwriting existing projects, notes or workspaces.</p>
        </div>
        <div className="settings-section-body">
          <div className="data-action">
            <span className="file-icon">
              <UploadCloud size={17} />
            </span>
            <div className="data-action-copy">
              <strong>Choose a DEVSPACE backup</strong>
              <p>
                Duplicate names are skipped, ownership always comes from your session, and imported
                tracker rows stay pending until their files are uploaded.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <FileJson size={13} />}
              {loading ? "Reading…" : "Choose JSON"}
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(event) => {
              void chooseBackup(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          {error ? (
            <div className="form-error" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        open={Boolean(preview)}
        onClose={() => !importing && setPreview(null)}
        title="Import preview"
        description={`Review what will be added from ${file?.name ?? "this backup"}.`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)} disabled={importing}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={applyImport} disabled={importing}>
              {importing ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
              {importing ? "Importing…" : "Import records"}
            </button>
          </>
        }
      >
        {preview ? (
          <div className="form-stack">
            <div className="tracker-stats" style={{ margin: 0 }}>
              <ImportStat label="Projects" data={preview.summary.projects} />
              <ImportStat label="Notes" data={preview.summary.notes} />
              <ImportStat label="Workspaces" data={preview.summary.workspaces} />
              <ImportStat label="Links" data={preview.summary.links} />
            </div>
            <div className="surface-soft" style={{ padding: 12, fontSize: 11, color: "var(--muted-strong)" }}>
              Tracker files: {preview.summary.trackerFiles.new} new,{" "}
              {preview.summary.trackerFiles.skipped} skipped. {preview.trackerNote}
            </div>
            {preview.conflicts.length ? (
              <div>
                <div className="label">Skipped duplicates</div>
                <ul style={{ margin: "7px 0 0", paddingLeft: 18, color: "var(--muted)", fontSize: 11.5 }}>
                  {preview.conflicts.map((conflict) => (
                    <li key={conflict}>{conflict}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 10.5 }}>
              <Check size={12} style={{ color: "var(--accent)" }} />
              Your profile and settings are preserved, never overwritten.
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function ImportStat({
  label,
  data,
}: {
  label: string;
  data: { new: number; skipped: number };
}) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{data.new}</strong>
      <span>{data.skipped} skipped</span>
    </div>
  );
}

function AccountSection({ viewer, localMode }: { viewer: Viewer; localMode: boolean }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmation: "", password: "" },
  });
  const [deleting, setDeleting] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await logoutAction();
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  async function destroy(values: DeleteAccountInput) {
    setDeleting(true);
    try {
      const result = await deleteAccountAction(values);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete the account.");
        return;
      }
      toast.success("Your account has been deleted.");
      router.push("/login");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="settings-section">
        <div className="settings-section-head">
          <h2>Account</h2>
          <p>Your sign-in identity and session controls.</p>
        </div>
        <div className="settings-section-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="data-action" style={{ alignItems: "center" }}>
            <Avatar name={viewer.displayName} src={viewer.avatarUrl} size="lg" />
            <div className="data-action-copy">
              <strong>{viewer.displayName}</strong>
              <p>{viewer.email}</p>
              <p>{localMode ? "Local development account" : "Supabase Auth account"}</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={logout} disabled={loggingOut}>
              <LogOut size={13} /> {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
          <div className="meta-row">
            <span className="meta-item">
              <Link href="/settings?tab=profile" style={{ color: "var(--accent)" }}>
                Edit profile
              </Link>
            </span>
            <span className="meta-item">Sessions expire after 7 days</span>
          </div>
        </div>
      </section>

      <section className="settings-section danger-zone">
        <div className="settings-section-head">
          <h2>Danger zone</h2>
          <p>Delete your account and every record owned by it.</p>
        </div>
        <div className="settings-section-body">
          <div className="data-action" style={{ alignItems: "center", borderColor: "rgba(251,113,133,.2)" }}>
            <span className="file-icon" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
              <AlertTriangle size={17} />
            </span>
            <div className="data-action-copy">
              <strong>Delete account permanently</strong>
              <p>
                Removes your profile, projects, notes, workspaces, tracker records and uploaded
                files. This cannot be undone.
              </p>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
              Delete account
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
            reset();
          }
        }}
        title="Delete your DEVSPACE account?"
        description="This immediately and permanently removes all of your data."
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="delete-account-form"
              className="btn btn-danger"
              disabled={deleting}
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
              {deleting ? "Deleting…" : "Permanently delete"}
            </button>
          </>
        }
      >
        <form
          id="delete-account-form"
          className="form-stack"
          onSubmit={handleSubmit(destroy)}
          noValidate
        >
          <div className="form-error">
            <AlertTriangle size={15} />
            All user-owned records and stored files are deleted. This action cannot be reversed.
          </div>
          <div className="field">
            <label className="label" htmlFor="delete-confirmation">
              Type <span style={{ color: "var(--danger)" }}>DELETE</span> to confirm
            </label>
            <input
              id="delete-confirmation"
              className="input"
              autoComplete="off"
              aria-invalid={Boolean(errors.confirmation)}
              {...register("confirmation")}
            />
            {errors.confirmation ? (
              <span className="field-error">{errors.confirmation.message}</span>
            ) : null}
          </div>
          <div className="field">
            <label className="label" htmlFor="delete-password">
              Current password
            </label>
            <input
              id="delete-password"
              type="password"
              className="input"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password ? <span className="field-error">{errors.password.message}</span> : null}
          </div>
        </form>
      </Modal>
    </>
  );
}
