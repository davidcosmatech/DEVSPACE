import Link from "next/link";

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-code">404 / LOST IN SPACE</div>
        <h1>This page drifted away.</h1>
        <p>The workspace route you requested does not exist or has moved.</p>
        <Link href="/dashboard" className="btn btn-primary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
