"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteSeasonBannerAction } from "../../actions";

// Only ever rendered while inactive (server-side action also re-checks
// this) — can't delete a banner currently showing to members.
export function SeasonBannerDeleteControl({ id, title }: { id: string; title: string }) {
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
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteSeasonBannerAction(id, title);
            setOpen(false);
            router.push("/app-data/season-banners");
          })
        }
      />
    </>
  );
}
