import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/features/auth/register-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/dashboard");

  return (
    <div className="auth-card">
      <RegisterForm />
    </div>
  );
}
