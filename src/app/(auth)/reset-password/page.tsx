import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { isSupabaseAuthEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const supabase = isSupabaseAuthEnabled();
  const resolvedToken = token ?? (supabase ? "supabase-recovery-token" : "");

  if (!resolvedToken) {
    return (
      <div className="auth-card">
        <h2>Reset link required</h2>
        <p>This page needs a valid reset link.</p>
        <div className="form-error" style={{ marginTop: 20 }}>
          The link is missing its token. Request a new password reset email.
        </div>
        <Link href="/forgot-password" className="btn btn-primary btn-block" style={{ marginTop: 18 }}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <ResetPasswordForm token={resolvedToken} />
    </div>
  );
}
