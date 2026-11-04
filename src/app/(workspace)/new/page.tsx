import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileText, FolderKanban, FolderOpen, HardDrive, LifeBuoy, Plus } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Create new" };

const options = [
  {
    href: "/notes?new=1",
    icon: FileText,
    title: "New note",
    description: "Markdown editor with live preview, autosave and pinning.",
    hint: "Notes",
  },
  {
    href: "/projects?new=1",
    icon: FolderKanban,
    title: "New project",
    description: "Track status, priority, visibility and workspace assignment.",
    hint: "Projects",
  },
  {
    href: "/workspaces?new=1",
    icon: FolderOpen,
    title: "New browser workspace",
    description: "Group project links, resources and documentation in one place.",
    hint: "Workspaces",
  },
  {
    href: "/files",
    icon: HardDrive,
    title: "New local file",
    description: "Create a real folder, Markdown or text file on your computer.",
    hint: "File Workspace",
  },
  {
    href: "/support",
    icon: LifeBuoy,
    title: "Support ticket",
    description: "Ask the workspace administrator for help and follow the reply.",
    hint: "Support",
  },
];

export default async function NewPage() {
  await requireViewer();

  return (
    <>
      <PageHeader
        eyebrow="Quick create"
        icon={Plus}
        title="Create new"
        description="Pick what you want to create. Everything opens directly in the right workspace section."
      />

      <div className="create-grid">
        {options.map((option) => (
          <Link key={option.href} href={option.href} className="create-card">
            <span className="create-card-icon">
              <option.icon size={19} />
            </span>
            <span className="create-card-copy">
              <strong>{option.title}</strong>
              <span>{option.description}</span>
              <small>{option.hint}</small>
            </span>
            <ArrowUpRight size={15} className="create-card-arrow" />
          </Link>
        ))}
      </div>
    </>
  );
}
