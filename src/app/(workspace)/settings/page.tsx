import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/settings-view";
import { getViewerSettings, isSupabaseAuthEnabled } from "@/lib/auth";
import { isLocalMode } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };

const validTabs = ["profile", "appearance", "data", "account"] as const;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { viewer, settings } = await getViewerSettings();
  const params = await searchParams;
  const initialTab = validTabs.includes(params.tab as (typeof validTabs)[number])
    ? (params.tab as (typeof validTabs)[number])
    : "profile";

  return (
    <SettingsView
      key={initialTab}
      viewer={viewer}
      settings={settings}
      localMode={isLocalMode() && !isSupabaseAuthEnabled()}
      initialTab={initialTab}
    />
  );
}
