"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resyncSubscriptionAction } from "./actions";

export function ResyncControl({
  memberId,
  stripeCustomerId,
}: {
  memberId: string;
  stripeCustomerId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [synced, setSynced] = useState(false);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await resyncSubscriptionAction(memberId, stripeCustomerId);
            setSynced(true);
            router.refresh();
          })
        }
        className="rounded-lg border border-border-hairline px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Syncing…" : "Resync from Stripe"}
      </button>
      {synced && !isPending && (
        <p className="text-sm text-status-success">Synced with Stripe.</p>
      )}
    </div>
  );
}
