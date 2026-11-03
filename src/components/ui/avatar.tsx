import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <span className={cn("avatar", `avatar-${size}`, className)} aria-label={name}>
      {src ? (
        // Remote avatars are user-controlled URLs; a plain img keeps them out of
        // the Next.js image optimizer and avoids allow-list failures.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
