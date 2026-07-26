"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteNotificationAction } from "../../actions";

// Only ever rendered for draft notifications (server-side action also
// re-checks this). Anything that's ever been scheduled or sent must be
// cancelled instead, never deleted.
export function NotificationDeleteControl({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-status-danger"
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete ${title}?`}
        description="This notification was never scheduled or sent, so it can be deleted outright. This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => deleteNotificationAction(id, title))}
      />
    </>
  );
}
