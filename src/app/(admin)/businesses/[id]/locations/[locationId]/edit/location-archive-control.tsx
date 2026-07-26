"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { archiveLocationAction, unarchiveLocationAction } from "../../actions";

export function LocationArchiveControl({
  businessId,
  locationId,
  label,
  isArchived,
}: {
  businessId: string;
  locationId: string;
  label: string;
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
            await unarchiveLocationAction(businessId, locationId, label);
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
        title={`Archive ${label}?`}
        description="Archived locations are hidden from members but never deleted — you can unarchive later."
        confirmLabel="Archive"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await archiveLocationAction(businessId, locationId, label);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
