"use client";

import { Card, StatCard, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  EGGS_PER_TRAY,
  formatDateLong,
  formatKES,
  SILVERLANDS_VAC,
  dayDiff,
  todayISO,
} from "@/lib/constants";
import { useFinance, usePoultryBatches, useVegetableUnits } from "./use-ravia-data";

// Placeholder data — will be replaced by TanStack Query in Phase 2/3.
const { data: fin } = useFinance();
const { data: poultry } = usePoultryBatches();
const { data: veg } = useVegetableUnits();

const vegUnits = (veg ?? []).reduce((a, b) => a + b.units, 0);
const revenue = fin?.summary.revenue ?? 0;
const expenses = fin?.summary.expenses ?? 0;
const netProfit = fin?.summary.net ?? 0;

export function DashboardView() {
  const eggsToday = 0;
  const trays = (eggsToday / EGGS_PER_TRAY).toFixed(1);

  // Sample alert derived from the domain constants (demonstrates the pattern).
  const alerts: { title: string; message: string; tone: string }[] = [
    {
      title: "Poultry: Batch 001",
      message: `Day ${SILVERLANDS_VAC[2].day} Vac: ${SILVERLANDS_VAC[2].task}`,
      tone: "tag-warning",
    },
  ];

  const profitStatus = netProfit >= 0 ? "Profitable" : "Deficit";
  const profitColor = netProfit >= 0 ? "text-primary" : "text-danger";

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="outline" size="sm">
            <i className="fas fa-download" /> Backup
          </Button>
        }
      >
        Ravia Farms
      </SectionHeader>

      <p className="text-muted text-sm mb-6">{formatDateLong()}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <StatCard
          icon={<i className="fas fa-egg" />}
          label="Eggs Today"
          value={eggsToday}
          sub={`${trays} Trays`}
        />
        <StatCard
          icon={<i className="fas fa-carrot" />}
          label="Active Stems"
          value={vegUnits * 84}
          sub={`${vegUnits} Units`}
        />
        <StatCard
          icon={<i className="fas fa-money-bill-wave" />}
          label={`Net Profit (${"KES"})`}
          value={formatKES(netProfit)}
          sub={profitStatus}
          valueClassName={profitColor}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1.5fr-1fr gap-6">
        <Card title="Recent Tasks & Alerts">
          {alerts.length ? (
            alerts.map((a, i) => (
              <div
                key={i}
                className="p-3 border-l-[3px] border-accent bg-[#1a1a1a] rounded mb-2"
              >
                <span className={`tag ${a.tone}`}>{a.title}</span>
                <p className="mt-1 text-sm">{a.message}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted py-6">No urgent alerts.</p>
          )}
        </Card>

        <Card title="P&L Overview">
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <h4 className="text-[0.7rem] text-muted uppercase">Revenue</h4>
              <div className="text-xl font-bold">{formatKES(revenue)}</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <h4 className="text-[0.7rem] text-muted uppercase">Expenses</h4>
              <div className="text-xl font-bold">{formatKES(expenses)}</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-4 text-center">
              <h4 className="text-[0.7rem] text-muted uppercase">Net</h4>
              <div className={`text-xl font-bold ${profitColor}`}>
                {formatKES(netProfit)}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Card>
      </div>

      <input type="hidden" value={todayISO()} />
    </div>
  );
}
