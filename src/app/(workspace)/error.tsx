"use client";

import { AlertTriangle } from "lucide-react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-page" style={{ minHeight: "calc(100vh - 80px)" }}>
      <div className="error-card">
        <span className="error-code">WORKSPACE ERROR</span>
        <h1>Something interrupted that view.</h1>
        <p>
          The workspace could not finish loading. Your data is safe — try the request again.
          {error.digest ? ` Reference: ${error.digest}` : ""}
        </p>
        <button type="button" className="btn btn-primary" onClick={reset}>
          <AlertTriangle size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
