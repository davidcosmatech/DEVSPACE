import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span className={cn("brand-mark", className)} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path
          d="M14.5 11.5 6 20l8.5 8.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M25.5 11.5 34 20l-8.5 8.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M22.6 7.5 17.4 32.5"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function BrandLockup({
  size = 22,
  markSize = 42,
  className,
}: {
  size?: number;
  markSize?: number;
  className?: string;
}) {
  return (
    <span className={cn("brand-lockup", className)}>
      <LogoMark size={markSize} />
      <span className="brand-copy">
        <span className="brand-name" style={{ fontSize: size }}>
          DEVSPACE
        </span>
        <span className="brand-version">3.0</span>
      </span>
    </span>
  );
}
