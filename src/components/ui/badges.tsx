import {
  Bot,
  CheckCircle2,
  CodeXml,
  FolderGit2,
  Globe2,
  GraduationCap,
  Layers3,
} from "lucide-react";

import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  Active: "badge-green",
  Planning: "badge-blue",
  Development: "badge-purple",
  "On Hold": "badge-amber",
  Completed: "badge-green",
  uploaded: "badge-green",
  pending: "badge-slate",
  error: "badge-red",
};

const statusLabels: Record<string, string> = {
  uploaded: "Uploaded",
  pending: "Pending",
  error: "Error",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("badge", statusClasses[status] ?? "badge-slate")}>
      <span className="status-dot" />
      {statusLabels[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={cn("priority", priority)}>{priority}</span>;
}

export function ProjectGlyph({
  name,
  technology,
  className,
}: {
  name: string;
  technology?: string;
  className?: string;
}) {
  const key = `${name} ${technology ?? ""}`.toLowerCase();
  let Icon = FolderGit2;
  let tone = "glyph-green";

  if (key.includes("python")) {
    Icon = Bot;
    tone = "glyph-amber";
  } else if (key.includes("todo") || key.includes("completed")) {
    Icon = CheckCircle2;
    tone = "glyph-teal";
  } else if (key.includes("study") || key.includes("learn")) {
    Icon = GraduationCap;
    tone = "glyph-blue";
  } else if (key.includes("portfolio") || key.includes("web")) {
    Icon = Globe2;
    tone = "glyph-blue";
  } else if (key.includes("devspace") || key.includes("next")) {
    Icon = CodeXml;
    tone = "glyph-green";
  } else if (key.includes("api") || key.includes("database")) {
    Icon = Layers3;
    tone = "glyph-purple";
  }

  return (
    <span className={cn("project-glyph", tone, className)}>
      <Icon size={19} strokeWidth={2.2} />
    </span>
  );
}

const noteTones = ["", "green", "amber", "purple"];

export function NoteGlyph({ index = 0 }: { index?: number }) {
  const tone = noteTones[index % noteTones.length];
  return (
    <span className={cn("note-icon", tone)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 3.5h8.5L20 7v13.5H8z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M4 7v13.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M11 8h5M11 12h5M11 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
