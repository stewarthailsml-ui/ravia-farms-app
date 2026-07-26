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

interface SidebarProps {
  active: SectionId;
  onSelect: (id: SectionId) => void;
  collapsed: boolean;
}

export function Sidebar({ active, onSelect, collapsed }: SidebarProps) {
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

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
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
    </aside>
  );
}
