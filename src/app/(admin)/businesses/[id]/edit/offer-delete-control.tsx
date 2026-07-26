"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteOfferAction } from "../offers/actions";

// Only ever rendered for draft offers (server-side action also re-checks
// this). Anything that's ever been active must be archived instead.
export function OfferDeleteControl({
  businessId,
  offerId,
  title,
}: {
  businessId: string;
  offerId: string;
  title: string;
}) {
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
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete ${title}?`}
        description="This offer was never published, so it can be deleted outright rather than archived. This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteOfferAction(businessId, offerId, title);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
