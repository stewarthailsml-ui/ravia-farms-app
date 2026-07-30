"use client";

import { Button } from "./button";
import { useArchive, useProfile } from "@/components/sections/use-ravia-data";
import { useToast } from "./toast";

interface ArchiveButtonProps {
  id: string;
  queryKey: string;
  url: string;
  label?: string;
  confirmMessage?: string;
}

// Renders nothing for staff — archiving is admin-only, and the boundary that
// actually matters is enforced server-side (RLS + the Edge Function's 403), but
// there's no reason to show a control that would just fail.
export function ArchiveButton({
  id,
  queryKey,
  url,
  label = "Archive",
  confirmMessage = "Archive this record? It will be hidden from the active view but never deleted.",
}: ArchiveButtonProps) {
  const { isAdmin } = useProfile();
  const archive = useArchive(queryKey, url);
  const { showToast } = useToast();

  if (!isAdmin) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={archive.isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        archive.mutate(id, {
          onSuccess: () => showToast("Archived."),
          onError: (e) => showToast(e instanceof Error ? e.message : "Archive failed."),
        });
      }}
    >
      {label}
    </Button>
  );
}
