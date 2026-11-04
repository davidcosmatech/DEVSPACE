import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { SuspendedSignOut } from "./sign-out-button";

export const metadata: Metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-code">ACCESS / SUSPENDED</div>
        <h1>This account is suspended.</h1>
        <p>
          An administrator paused access to this DEVSPACE workspace. Your projects and notes are
          safe. Contact the workspace owner if you believe this is a mistake.
        </p>
        <div className="error-links" style={{ justifyContent: "center" }}>
          <span className="error-link" style={{ cursor: "default" }}>
            <ShieldAlert size={13} /> Administrator action required
          </span>
        </div>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "center" }}>
          <SuspendedSignOut />
        </div>
      </div>
    </div>
  );
}
