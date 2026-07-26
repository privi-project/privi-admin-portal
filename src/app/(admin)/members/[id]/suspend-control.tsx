"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { suspendMemberAction, restoreMemberAction } from "./actions";

export function SuspendControl({
  memberId,
  firstName,
  lastName,
  isSuspended,
}: {
  memberId: string;
  firstName: string;
  lastName: string;
  isSuspended: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (isSuspended) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await restoreMemberAction(memberId, firstName, lastName);
            router.refresh();
          })
        }
        className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Working…" : "Restore account"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-status-danger px-4 py-2 text-sm font-medium text-status-danger"
      >
        Suspend account
      </button>
      <ConfirmDialog
        open={open}
        title={`Suspend ${firstName} ${lastName}?`}
        description="Blocks sign-in immediately. Their subscription keeps running unless you also cancel it separately. Reversible via Restore."
        confirmLabel="Suspend"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await suspendMemberAction(memberId, firstName, lastName);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
