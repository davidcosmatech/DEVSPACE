"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page">
      <div className="error-card">
        <span className="error-code">DEVSPACE / ERROR</span>
        <h1>The workspace hit a snag.</h1>
        <p>
          An unexpected error stopped this page. Try again, or return to your dashboard.
          {error.digest ? ` Reference: ${error.digest}` : ""}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            <AlertTriangle size={15} /> Try again
          </button>
          <Link href="/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
