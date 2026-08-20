"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MemberComboboxOption = { id: string; email: string; first_name: string; last_name: string };

/**
 * Type-to-filter member picker — same pattern as BusinessCombobox (see
 * that file's comment), applied to members instead. Built 2026-08-20 for
 * notification-form.tsx's "Individual" audience picker: a plain <select>
 * with thousands of members in it isn't something anyone's going to
 * scroll through to find one person. Filters on name OR email, since
 * email is what's actually unique when two members share a name.
 */
export function MemberCombobox({
  members,
  name = "audience_member_id",
  defaultValue,
  label = "Member",
  helpText = "Start typing a name or email…",
  placeholder = "Start typing a name or email…",
}: {
  members: MemberComboboxOption[];
  name?: string;
  defaultValue?: string;
  label?: string;
  helpText?: string;
  placeholder?: string;
}) {
  const labelFor = (m: MemberComboboxOption) => `${m.first_name} ${m.last_name}`.trim() + ` (${m.email})`;

  const defaultMember = members.find((m) => m.id === defaultValue);
  const [query, setQuery] = useState(defaultMember ? labelFor(defaultMember) : "");
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const pool = trimmed
      ? members.filter(
          (m) =>
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(trimmed) ||
            m.email.toLowerCase().includes(trimmed),
        )
      : members;
    return pool.slice(0, 8);
  }, [members, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (member: MemberComboboxOption) => {
    setQuery(labelFor(member));
    setSelectedId(member.id);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setSelectedId("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1 text-sm">
      {label}
      <input type="hidden" name={name} value={selectedId} required />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // Typing invalidates whatever was previously picked, until a
          // real option is clicked again — prevents silently submitting a
          // stale id that no longer matches the visible text.
          setSelectedId("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="rounded-lg border border-border-hairline px-3 py-2"
      />

      {open && matches.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 max-h-56 w-full min-w-[16rem] overflow-auto rounded-lg border border-border-hairline bg-white shadow-lg">
          {matches.map((member) => (
            <li key={member.id}>
              <button
                type="button"
                onClick={() => handleSelect(member)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-border-hairline-2"
              >
                {labelFor(member)}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedId ? (
        <button type="button" onClick={handleClear} className="self-start text-xs text-gold">
          Clear
        </button>
      ) : (
        <span className="text-xs text-muted-dark">{helpText}</span>
      )}
    </div>
  );
}
