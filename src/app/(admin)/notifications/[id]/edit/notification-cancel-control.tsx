"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelNotificationAction } from "../../actions";

export function NotificationCancelControl({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-status-danger"
      >
        Cancel
      </button>
      <ConfirmDialog
        open={open}
        title={`Cancel ${title}?`}
        description="This notification won't be sent. It stays in the list as Cancelled — this can't be undone."
        confirmLabel="Cancel notification"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await cancelNotificationAction(id, title);
            setOpen(false);
            router.push("/notifications");
          })
        }
      />
    </>
  );
}
