"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  anonymizeMemberAction,
  deleteMemberAction,
  flagDeletionRequestedAction,
  clearDeletionRequestAction,
} from "./actions";

export function DangerZone({
  memberId,
  label,
  hasActiveSubscription,
  deletionRequestedAt,
}: {
  memberId: string;
  label: string;
  hasActiveSubscription: boolean;
  deletionRequestedAt: string | null;
}) {
  const [openAction, setOpenAction] = useState<"anonymize" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isFlagPending, startFlagTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-status-danger/40 bg-status-danger/5 p-6">
      <h2 className="text-sm font-medium text-status-danger">
        Account deletion request
      </h2>

      {deletionRequestedAt ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-status-danger/30 bg-white px-3 py-2">
          <p className="text-xs text-muted-dark">
            Requested {new Date(deletionRequestedAt).toLocaleString()} — showing on the
            Dashboard until anonymized/deleted below.
          </p>
          <button
            type="button"
            disabled={isFlagPending}
            onClick={() =>
              startFlagTransition(() => clearDeletionRequestAction(memberId, label))
            }
            className="shrink-0 text-xs text-gold disabled:opacity-60"
          >
            Clear flag
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isFlagPending}
          onClick={() =>
            startFlagTransition(() => flagDeletionRequestedAction(memberId, label))
          }
          className="self-start rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          Flag as requested (received by email)
        </button>
      )}

      <p className="text-xs text-muted-dark">
        Both actions below are irreversible. Anonymize keeps the record (and
        Stripe billing history) but scrubs personal details — the safer
        default when there&apos;s real subscription/payment history to
        preserve. Delete permanently removes the account entirely.
      </p>

      {hasActiveSubscription && (
        <p className="text-xs text-status-warning">
          This member has an active subscription. Cancelling billing isn&apos;t
          handled here — do that in Stripe first if appropriate.
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpenAction("anonymize")}
          className="rounded-lg border border-status-danger px-4 py-2 text-sm font-medium text-status-danger"
        >
          Anonymize
        </button>
        <button
          type="button"
          onClick={() => setOpenAction("delete")}
          className="rounded-lg border border-status-danger bg-status-danger px-4 py-2 text-sm font-medium text-ivory"
        >
          Delete account
        </button>
      </div>

      <ConfirmDialog
        open={openAction === "anonymize"}
        title={`Anonymize ${label}?`}
        description="Replaces their name and preferred area with redacted placeholders. Their subscription/payment records are kept. This can't be undone."
        confirmLabel="Anonymize"
        destructive
        isPending={isPending}
        onCancel={() => setOpenAction(null)}
        onConfirm={() => startTransition(() => anonymizeMemberAction(memberId, label))}
      />

      <ConfirmDialog
        open={openAction === "delete"}
        title={`Permanently delete ${label}?`}
        description="Completely removes their account and all associated profile data. This can't be undone and can't be recovered."
        confirmLabel="Delete permanently"
        destructive
        isPending={isPending}
        onCancel={() => setOpenAction(null)}
        onConfirm={() => startTransition(() => deleteMemberAction(memberId, label))}
      />
    </div>
  );
}
