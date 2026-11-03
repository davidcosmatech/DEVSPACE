export type NavIconProps = {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
};

export function BrowserWorkspaceIcon({
  size = 22,
  className,
  strokeWidth = 1.8,
}: NavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18" />
      <path d="M12 10.5v5.5" />
      <path d="m9.8 13.2 2.2 2.2 2.2-2.2" />
      <path d="M8.5 17c.7.8 1.9 1.2 3.5 1.2s2.8-.4 3.5-1.2" />
    </svg>
  );
}

export function TrackerIcon({ size = 22, className, strokeWidth = 1.8 }: NavIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 4.5h9l4 4V19.5H5z" />
      <path d="M14 4.5v4h4" />
      <path d="M9 10.5h4M9 13.5h5M9 16.5h3" />
      <path d="M17.5 11v5M15 13.5h5" />
    </svg>
  );
}
