"use client";

import { useState } from "react";
import { NavLink } from "@/components/nav-link";
import { AddApplicationForm } from "./add-application-form";
import type { ApplicationStatusRow } from "@/lib/business-applications/queries";

const buttonClass =
  "shrink-0 rounded-lg border border-gold px-3 py-1.5 text-sm font-medium text-gold";

export function AddApplicationToggle({
  categories,
  statuses,
}: {
  categories: { id: string; label: string }[];
  statuses: ApplicationStatusRow[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className={buttonClass}>
          {open ? "Cancel" : "Add manually"}
        </button>
        <NavLink href="/business-applications/statuses" className={buttonClass}>
          Manage columns
        </NavLink>
      </div>
      {open && (
        <div className="mt-3">
          <AddApplicationForm categories={categories} statuses={statuses} onAdded={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
