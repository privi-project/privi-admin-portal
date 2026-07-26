"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { archiveOfferAction, unarchiveOfferAction } from "../../actions";

export function OfferArchiveControl({
  businessId,
  offerId,
  title,
  isArchived,
}: {
  businessId: string;
  offerId: string;
  title: string;
  isArchived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (isArchived) {
    return (
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            await unarchiveOfferAction(businessId, offerId, title);
            router.refresh();
          })
        }
        disabled={isPending}
        className="text-sm text-gold disabled:opacity-60"
      >
        {isPending ? "Working…" : "Unarchive"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-status-danger"
      >
        Archive
      </button>
      <ConfirmDialog
        open={open}
        title={`Archive ${title}?`}
        description="Archived offers are hidden from members but never deleted — you can unarchive later."
        confirmLabel="Archive"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await archiveOfferAction(businessId, offerId, title);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
