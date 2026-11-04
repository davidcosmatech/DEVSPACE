"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/features/auth/actions";

export function SuspendedSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await logoutAction();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut size={14} /> {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
