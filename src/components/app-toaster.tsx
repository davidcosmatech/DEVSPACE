"use client";

import { Toaster } from "sonner";

import { useTheme } from "./theme-provider";

export function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "var(--card)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        },
      }}
    />
  );
}
