"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cancelSubscriptionAction, resumeSubscriptionAction } from "./actions";

export function CancelSubscriptionControl({
  memberId,
  subscriptionId,
  label,
  isCancelScheduled,
}: {
  memberId: string;
  subscriptionId: string;
  label: string;
  isCancelScheduled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resumed, setResumed] = useState(false);
  const router = useRouter();

  if (isCancelScheduled) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await resumeSubscriptionAction(memberId, subscriptionId, label);
              setResumed(true);
              router.refresh();
            })
          }
          className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending ? "Working…" : "Undo cancellation"}
        </button>
        {resumed && !isPending && (
          <p className="text-sm text-status-success">Cancellation undone.</p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-status-danger px-4 py-2 text-sm font-medium text-status-danger"
      >
        Cancel subscription
      </button>
      <ConfirmDialog
        open={open}
        title={`Cancel ${label}'s subscription?`}
        description="Schedules cancellation for the end of the current paid period — access continues until then, matching Privi's stated cancellation policy. This does not refund anything already paid."
        confirmLabel="Schedule cancellation"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await cancelSubscriptionAction(memberId, subscriptionId, label);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
