import Link from "next/link";
import { Database, KeyRound, LayoutDashboard, ShieldCheck } from "lucide-react";

import { BrandLockup } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-visual">
        <Link href="/" aria-label="DEVSPACE home" className="auth-brand">
          <BrandLockup size={23} markSize={46} />
        </Link>

        <div className="auth-visual-copy">
          <span className="auth-kicker">
            <span className="status-dot" />
            Your developer workspace
          </span>
          <h1>
            Code. Organise.
            <br />
            <em>Build.</em>
          </h1>
          <p>
            Projects, notes, GitHub, browser workspaces and Markdown files — brought together in one
            calm, private workspace.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <LayoutDashboard size={15} />
              A dashboard that reflects your real work.
            </div>
            <div className="auth-feature">
              <ShieldCheck size={15} />
              Private by design with per-user isolation.
            </div>
            <div className="auth-feature">
              <Database size={15} />
              PostgreSQL-backed and ready to sync.
            </div>
            <div className="auth-feature">
              <KeyRound size={15} />
              Secure sessions, never client-side ownership checks.
            </div>
          </div>
        </div>

        <div className="auth-footer-note">
          <ShieldCheck size={13} />
          DEVSPACE 3.0 · Secure multi-user workspace
        </div>
      </aside>

      <main className="auth-form-side">{children}</main>
    </div>
  );
}
