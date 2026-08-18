"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NavLink } from "@/components/nav-link";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NOTIFICATION_TYPES, AUDIENCE_TYPES } from "@/lib/notification-config";
import { bulkDeleteNotificationsAction } from "./actions";
import type { Notification } from "@/lib/notifications/queries";

function labelFor(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const draftIds = notifications.filter((n) => n.status === "draft").map((n) => n.id);

  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      await bulkDeleteNotificationsAction(Array.from(selectedIds));
      setConfirming(false);
      setSelectMode(false);
      setSelectedIds(new Set());
      router.refresh();
    });
  };

  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-dark">
          {selectMode
            ? `${selectedIds.size} selected · only drafts can be deleted`
            : `${draftIds.length} draft${draftIds.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-3">
          {selectMode && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-lg border border-status-danger px-3 py-1.5 text-sm font-medium text-status-danger"
            >
              Delete selected ({selectedIds.size})
            </button>
          )}
          {draftIds.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectMode}
              className="text-sm text-gold"
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 divide-y divide-border-hairline rounded-2xl border border-border-hairline bg-white">
        {notifications.length === 0 && (
          <p className="p-6 text-sm text-muted-dark">No notifications found.</p>
        )}

        {notifications.map((n) => {
          const isDraft = n.status === "draft";
          return (
            <div key={n.id} className="flex items-center gap-4 px-4 py-3">
              {selectMode && (
                <input
                  type="checkbox"
                  disabled={!isDraft}
                  checked={selectedIds.has(n.id)}
                  onChange={() => toggleId(n.id)}
                  className="shrink-0 disabled:opacity-30"
                  aria-label={isDraft ? `Select ${n.title}` : `${n.title} can't be bulk-deleted (not a draft)`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{n.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-dark">
                  <span>{labelFor(NOTIFICATION_TYPES, n.notification_type)}</span>
                  <span>·</span>
                  <span>{labelFor(AUDIENCE_TYPES, n.audience_type)}</span>
                  {n.status === "scheduled" && n.scheduled_at && (
                    <>
                      <span>·</span>
                      <span>Scheduled for {new Date(n.scheduled_at).toLocaleString()}</span>
                    </>
                  )}
                  {n.status === "sent" && n.sent_at && (
                    <>
                      <span>·</span>
                      <span>
                        Sent {new Date(n.sent_at).toLocaleString()} — {n.targeted_count ?? 0} targeted
                      </span>
                    </>
                  )}
                </div>
              </div>

              <StatusBadge status={n.status} />

              {!selectMode &&
                (n.status === "draft" || n.status === "scheduled" ? (
                  <>
                    <NavLink href={`/notifications/${n.id}/edit`} className="text-sm text-gold">
                      Edit
                    </NavLink>
                    <NavLink href={`/notifications/${n.id}/preview`} className="text-sm text-gold">
                      Preview &amp; send
                    </NavLink>
                  </>
                ) : (
                  <NavLink href={`/notifications/${n.id}/preview`} className="text-sm text-gold">
                    View
                  </NavLink>
                ))}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${selectedIds.size} draft notification${selectedIds.size === 1 ? "" : "s"}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        isPending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
