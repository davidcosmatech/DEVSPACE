import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/login-form";
import { getViewer, isSupabaseAuthEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/dashboard");

  return (
    <div className="auth-card">
      <LoginForm
        showDemo={!isSupabaseAuthEnabled()}
        demoEmail="demo@devspace.app"
        demoPassword="Devspace123!"
      />
    </div>
  );
}
