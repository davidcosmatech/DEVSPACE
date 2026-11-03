import type { ComponentType } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}>;

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: IconComponent;
}) {
  return (
    <header className="page-head">
      <div className="page-head-copy">
        {eyebrow ? (
          <div className="eyebrow">
            {Icon ? <Icon size={12} /> : null}
            {eyebrow}
          </div>
        ) : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export function PanelHeader({
  icon: Icon,
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  icon?: IconComponent;
  title: string;
  href?: string;
  linkLabel?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel-head", className)}>
      <h2 className="panel-title">
        {Icon ? <Icon size={16} /> : null}
        {title}
      </h2>
      {children}
      {href && linkLabel ? (
        <Link className="panel-link" href={href}>
          {linkLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
