"use client";

import { useState } from "react";
import { AddApplicationForm } from "./add-application-form";
import type { ApplicationStatusRow } from "@/lib/business-applications/queries";

export function AddApplicationToggle({
  categories,
  statuses,
}: {
  categories: { id: string; label: string }[];
  statuses: ApplicationStatusRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0 text-sm text-gold">
        {open ? "Cancel" : "Add manually"}
      </button>
      {open && (
        <AddApplicationForm categories={categories} statuses={statuses} onAdded={() => setOpen(false)} />
      )}
    </>
  );
}
