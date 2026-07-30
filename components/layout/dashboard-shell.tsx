"use client";

import { useState, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { SectionId } from "@/lib/constants";
import { DashboardSection } from "@/components/sections/dashboard-section";
import { useProfile } from "@/components/sections/use-ravia-data";
import { createClientSupabase } from "@/lib/supabase/client";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useProfile();
  const router = useRouter();

  // Collapse sidebar under 900px (matches prototype mobile breakpoint)
  useEffect(() => {
    function onResize() {
      setCollapsed(window.innerWidth < 900);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Staff is admin-only; if a role change (or a staff account) lands here while
  // it's the active section, fall back to the dashboard rather than show a
  // section the sidebar itself would no longer offer.
  useEffect(() => {
    if (active === "staff" && !isAdmin) setActive("dashboard");
  }, [active, isAdmin]);

  async function onSignOut() {
    await createClientSupabase().auth.signOut();
    router.push("/auth/signin");
    router.refresh();
  }

  function select(id: SectionId) {
    setActive(id);
    setMobileOpen(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar (hidden on small screens; drawer used instead) */}
      <div className="hidden md:block">
        <Sidebar active={active} onSelect={select} collapsed={collapsed} isAdmin={isAdmin} onSignOut={onSignOut} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[1500] md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar active={active} onSelect={select} collapsed={false} isAdmin={isAdmin} onSignOut={onSignOut} />
          </div>
        </div>
      ) : null}

      <main className="flex-1 overflow-y-auto p-8">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-primary text-xl"
            aria-label="Open navigation"
          >
            <i className="fas fa-bars" />
          </button>
          <span className="font-logo text-primary text-lg">Ravia Farms</span>
        </div>

        <DashboardSection active={active} onNavigate={select} />
      </main>
    </div>
  );
}
