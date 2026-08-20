"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type BusinessComboboxOption = { id: string; name: string };

/**
 * Type-to-filter business picker for plain <form action={...}> submissions
 * — no state library, just a text input + a hidden input carrying the
 * actual id, same trick a native <select> plays but searchable. Built
 * 2026-08-18 for the Featured Payments "link to existing business" field,
 * since a plain <select> gets painful once there are dozens of
 * businesses to scroll through; reusable anywhere else a business picker
 * needs to scale the same way (e.g. notification-form.tsx's business
 * selects, if that ever gets revisited).
 */
export function BusinessCombobox({
  businesses,
  name = "business_id",
  defaultValue,
  label = "Link to existing business",
  helpText = "Start typing to filter — leave blank if this business isn't in Privi yet.",
  placeholder = "Start typing a business name…",
  required,
  onSelect,
}: {
  businesses: BusinessComboboxOption[];
  name?: string;
  defaultValue?: string;
  label?: string;
  helpText?: string;
  placeholder?: string;
  /** Native `required` on the hidden input carrying the actual value —
   * off by default since this component started life as an optional
   * link, but callers with a genuinely required business picker (e.g.
   * notification-form.tsx) need real browser-level validation, not just
   * a silent empty submit. */
  required?: boolean;
  /** Called with the selected business's id (or '' on clear) — needed by
   * any caller that has to react to the pick itself, not just read the
   * final value at submit time (e.g. notification-form.tsx filtering an
   * offer/location list by whichever business is currently selected). */
  onSelect?: (businessId: string) => void;
}) {
  const defaultBusiness = businesses.find((b) => b.id === defaultValue);
  const [query, setQuery] = useState(defaultBusiness?.name ?? "");
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const pool = trimmed ? businesses.filter((b) => b.name.toLowerCase().includes(trimmed)) : businesses;
    return pool.slice(0, 8);
  }, [businesses, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (business: BusinessComboboxOption) => {
    setQuery(business.name);
    setSelectedId(business.id);
    setOpen(false);
    onSelect?.(business.id);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedId("");
    setOpen(false);
    onSelect?.("");
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm">
      {label}
      <input type="hidden" name={name} value={selectedId} required={required} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // Typing invalidates whatever was previously picked, until a
          // real option is clicked again — prevents silently submitting
          // a stale id that no longer matches the visible text.
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="rounded-lg border border-border-hairline px-3 py-2"
      />

      {open && matches.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 max-h-56 w-full min-w-[14rem] overflow-auto rounded-lg border border-border-hairline bg-white shadow-lg">
          {matches.map((business) => (
            <li key={business.id}>
              <button
                type="button"
                onClick={() => handleSelect(business)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-border-hairline-2"
              >
                {business.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId ? (
        <button type="button" onClick={handleClear} className="self-start text-xs text-gold">
          Clear link
        </button>
      ) : (
        <span className="text-xs text-muted-dark">{helpText}</span>
      )}
    </div>
  );
}
