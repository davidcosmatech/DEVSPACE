"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close dialog",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  closeLabel?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * Callers usually pass a fresh arrow function as `onClose`, so the
   * close handler is kept in a ref. The effect below therefore depends only on
   * `open` and never re-runs while the user types (which used to steal focus
   * from the field and move it to the close button).
   */
  const onCloseRef = useRef(onClose);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);

    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const active = document.activeElement;
      // Never pull focus away from a field the user is already editing.
      if (active instanceof HTMLElement && panel.contains(active)) return;

      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(
          ".modal-body input:not([type=hidden]):not([disabled]), .modal-body textarea:not([disabled]), .modal-body select:not([disabled])",
        );

      // Never focus a footer action by default: Space/Enter would trigger it
      // accidentally. Read-only dialogs focus the dialog container instead.
      if (target) target.focus();
      else panel.focus();
    }, 40);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(timer);
      const opener = openerRef.current;
      if (opener && document.contains(opener)) {
        window.setTimeout(() => opener.focus(), 0);
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        ref={panelRef}
        className={cn("modal", size === "lg" && "modal-lg")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-head-copy">
            <h2 className="modal-title" id="modal-title">
              {title}
            </h2>
            {description ? <p className="modal-description">{description}</p> : null}
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={closeLabel}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
