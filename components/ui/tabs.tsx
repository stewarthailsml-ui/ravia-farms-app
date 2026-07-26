"use client";

import { ReactNode, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ tabs, initial }: { tabs: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);

  return (
    <div>
      <div className="flex gap-5 border-b border-hairline mb-5 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`py-2.5 cursor-pointer font-semibold uppercase text-[0.8rem] tracking-wider whitespace-nowrap border-b-[3px] transition-colors ${
              active === t.id
                ? "text-primary border-primary"
                : "text-muted border-transparent hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} className={active === t.id ? "block" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
