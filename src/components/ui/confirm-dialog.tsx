"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Modal } from "./modal";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  busyLabel?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          gap: 13,
          alignItems: "flex-start",
          border: "1px solid rgba(251,113,133,.2)",
          background: "var(--danger-soft)",
          borderRadius: 10,
          padding: 14,
          color: "var(--muted-strong)",
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        <AlertTriangle size={18} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 1 }} />
        <span>This action cannot be undone. Your other records stay untouched.</span>
      </div>
    </Modal>
  );
}
