"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  FolderKanban,
  HardDrive,
  LayoutDashboard,
  NotebookPen,
} from "lucide-react";

import { Github } from "@/components/icons/github";

const destinations = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/notes", label: "Notes", icon: NotebookPen },
  { href: "/github", label: "GitHub", icon: Github },
  { href: "/files", label: "File Workspace", icon: HardDrive },
  { href: "/tracker", label: "Markdown Tracker", icon: FileText },
];

export default function NotFound() {
  const pathname = usePathname();

  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-code">404 / LOST IN SPACE</div>
        <h1>This page drifted away.</h1>
        <p>The workspace route you requested does not exist or has moved.</p>
        {pathname ? <p className="error-path">Attempted route: {pathname}</p> : null}
        <div className="error-links">
          {destinations.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="error-link">
              <Icon size={13} /> {label}
            </Link>
          ))}
        </div>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
