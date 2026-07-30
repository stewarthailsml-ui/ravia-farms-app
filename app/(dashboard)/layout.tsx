import { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Everything under this route group is the authenticated dashboard app.
// `/auth/signin` and `/auth/set-password` live outside this group specifically
// so they render full-page, without the shell wrapped around them — previously
// DashboardShell unconditionally wrapped every route including sign-in, and
// always rendered its own internal DashboardSection regardless of the routed
// page, so the sign-in form's output was rendered but immediately discarded.
export default function DashboardRouteGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
