"use client";

import { useState, ReactNode, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { SectionId } from "@/lib/constants";
import { DashboardSection } from "@/components/sections/dashboard-section";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SectionId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapse sidebar under 900px (matches prototype mobile breakpoint)
  useEffect(() => {
    function onResize() {
      setCollapsed(window.innerWidth < 900);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar (hidden on small screens; drawer used instead) */}
      <div className="hidden md:block">
        <Sidebar
          active={active}
          onSelect={(id) => setActive(id)}
          collapsed={collapsed}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[1500] md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              active={active}
              onSelect={(id) => {
                setActive(id);
                setMobileOpen(false);
              }}
              collapsed={false}
            />
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

        <DashboardSection active={active} />
      </main>
    </div>
  );
}
