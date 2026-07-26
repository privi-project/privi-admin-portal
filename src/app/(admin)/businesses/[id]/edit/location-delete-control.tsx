"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteLocationAction } from "../locations/actions";

// Only ever rendered for draft locations (server-side action also
// re-checks this — see deleteLocationAction). Anything that's ever been
// active must be archived instead, never deleted.
export function LocationDeleteControl({
  businessId,
  locationId,
  label,
}: {
  businessId: string;
  locationId: string;
  label: string;
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
        title={`Delete ${label}?`}
        description="This location was never published, so it can be deleted outright rather than archived. This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteLocationAction(businessId, locationId, label);
            setOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}
