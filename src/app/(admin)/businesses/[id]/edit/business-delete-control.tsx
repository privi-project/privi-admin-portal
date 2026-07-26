"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteBusinessAction } from "../../actions";

// Only ever rendered for draft businesses (server-side action also
// re-checks this — see deleteBusinessAction). Anything that's ever been
// active must be archived instead, never deleted.
export function BusinessDeleteControl({ id, name }: { id: string; name: string }) {
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
        title={`Delete ${name}?`}
        description="This business was never published, so it can be deleted outright rather than archived. This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => deleteBusinessAction(id, name))}
      />
    </>
  );
}
