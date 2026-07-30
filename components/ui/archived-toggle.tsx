"use client";

import { useProfile } from "@/components/sections/use-ravia-data";

interface ArchivedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// Admin-only — staff cannot view archived records at all (enforced server-side
// by the ?archived=true 403 gate and by RLS), so there's nothing for them to
// toggle. Renders nothing for staff.
export function ArchivedToggle({ checked, onChange }: ArchivedToggleProps) {
  const { isAdmin } = useProfile();
  if (!isAdmin) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      Show archived
    </label>
  );
}
