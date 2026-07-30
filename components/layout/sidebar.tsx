"use client";

import { SectionId } from "@/lib/constants";

interface NavItem {
  id: SectionId;
  label: string;
  icon: string; // Font Awesome class
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "fa-chart-line" },
  { id: "poultry", label: "Poultry", icon: "fa-kiwi-bird" },
  { id: "vegetables", label: "Vegetables", icon: "fa-leaf" },
  { id: "rabbits", label: "Rabbitry", icon: "fa-rabbit" },
  { id: "dogs", label: "Canine", icon: "fa-dog" },
  { id: "finance", label: "Finance", icon: "fa-wallet" },
];

// Admin-only — staff management. Not a "page you can't reach" so much as a
// tool that shouldn't be offered to a role that can't use it.
const ADMIN_NAV: NavItem = { id: "staff", label: "Staff", icon: "fa-users-cog" };

interface SidebarProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  collapsed: boolean;
  isAdmin?: boolean;
  onSignOut?: () => void;
}

export function Sidebar({ active, onSelect, collapsed, isAdmin, onSignOut }: SidebarProps) {
  const items = isAdmin ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <aside
      className={`bg-sidebar border-r border-hairline flex flex-col flex-shrink-0 transition-all duration-300 ${
        collapsed ? "w-[70px] p-6 px-2" : "w-[260px] p-6 px-4"
      }`}
    >
      <div className="text-center mb-8">
        <div className={`font-logo text-primary text-2xl flex items-center justify-center gap-2 ${collapsed ? "flex-col" : ""}`}>
          <i className="fas fa-seedling" />
          {!collapsed && <span>Ravia Farms</span>}
        </div>
        {!collapsed && (
          <div className="text-accent text-[0.65rem] tracking-[0.15em] font-bold uppercase mt-1">
            Rooted and Nourished
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-ravia transition-colors font-medium text-[0.95rem] ${
              collapsed ? "justify-center" : ""
            } ${
              active === item.id
                ? "bg-primary text-white"
                : "text-muted hover:bg-primary/10 hover:text-primary"
            }`}
            title={item.label}
          >
            <i className={`fas ${item.icon}`} />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {onSignOut ? (
        <button
          onClick={onSignOut}
          className={`flex items-center gap-3 px-4 py-3 rounded-ravia font-medium text-[0.95rem] text-muted hover:bg-danger/10 hover:text-danger transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title="Sign out"
        >
          <i className="fas fa-right-from-bracket" />
          {!collapsed && <span>Sign out</span>}
        </button>
      ) : null}
    </aside>
  );
}
