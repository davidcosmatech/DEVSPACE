import type { Metadata } from "next";

import { FileWorkspaceView } from "@/features/files/file-workspace";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "File Workspace" };

export default async function FileWorkspacePage() {
  await requireViewer();
  return <FileWorkspaceView />;
}
