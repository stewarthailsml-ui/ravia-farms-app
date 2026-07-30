"use client";

import { Card, StatCard, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import {
  EGGS_PER_TRAY,
  STEMS_PER_UNIT,
  formatDateLong,
  formatKES,
  SILVERLANDS_VAC,
  RABBIT_KINDLING_ALERT,
  CANINE_HEAT_ALERT,
  dayDiff,
} from "@/lib/constants";
import { exportFarmBackup } from "@/lib/backup";
import { useToast } from "@/components/ui/toast";
import { SectionId } from "@/lib/constants";
import {
  useFinance,
  usePoultryBatches,
  useVegetableUnits,
  useEggRecords,
  useRabbitPairings,
  useDogHeats,
  useProfile,
} from "./use-ravia-data";

interface Alert {
  title: string;
  message: string;
  tone: "success" | "warning" | "danger";
}

export function DashboardView({ onNavigate }: { onNavigate?: (id: SectionId) => void }) {
  const { data: fin } = useFinance();
  const { data: poultry } = usePoultryBatches();
  const { data: veg } = useVegetableUnits();
  const { data: eggs } = useEggRecords();
  const { data: pairings } = useRabbitPairings();
  const { data: heats } = useDogHeats();
  const { isAdmin } = useProfile();
  const { showToast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const eggsToday = (eggs ?? []).filter((e) => e.date === today).reduce((a, b) => a + Number(b.count), 0);
  const trays = (eggsToday / EGGS_PER_TRAY).toFixed(1);

  const vegUnits = (veg ?? []).reduce((a, b) => a + b.units, 0);
  const revenue = fin?.summary.revenue ?? 0;
  const expenses = fin?.summary.expenses ?? 0;
  const netProfit = fin?.summary.net ?? 0;

  const profitStatus = netProfit >= 0 ? "Profitable" : "Deficit";
  const profitColor = netProfit >= 0 ? "text-primary" : "text-danger";

  // Real alert engine — vaccine schedule (±1 day), kindling window (28–31 days),
  // canine heat recurrence window (170–180 days). Previously a single hardcoded entry.
  const alerts: Alert[] = [];

  (poultry ?? []).forEach((b) => {
    const age = dayDiff(b.deploy_date);
    SILVERLANDS_VAC.forEach((v) => {
      if (age >= v.day - 1 && age <= v.day + 1) {
        alerts.push({ title: `Poultry: ${b.name}`, message: `Day ${v.day} Vac: ${v.task}`, tone: "warning" });
      }
    });
  });

  (pairings ?? []).forEach((p) => {
    const days = dayDiff(p.date);
    if (days >= RABBIT_KINDLING_ALERT.min && days <= RABBIT_KINDLING_ALERT.max) {
      alerts.push({ title: `Rabbit: ${p.doe_tag}`, message: `Kindling expected (Day ${days})`, tone: "success" });
    }
  });

  (heats ?? []).forEach((h) => {
    const days = dayDiff(h.date);
    if (days >= CANINE_HEAT_ALERT.min && days <= CANINE_HEAT_ALERT.max) {
      alerts.push({ title: `Dog: ${h.dog_name}`, message: "Repeat Heat Cycle Due", tone: "danger" });
    }
  });

  async function onBackup() {
    try {
      await exportFarmBackup();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Backup failed.");
    }
  }

  return (
    <div>
      <SectionHeader
        action={
          isAdmin ? (
            <Button variant="outline" size="sm" onClick={onBackup}>
              <i className="fas fa-download" /> Backup
            </Button>
          ) : undefined
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
          value={vegUnits * STEMS_PER_UNIT}
          sub={`${vegUnits} Units`}
        />
        <StatCard
          icon={<i className="fas fa-money-bill-wave" />}
          label="Net Profit (KES)"
          value={formatKES(netProfit)}
          sub={profitStatus}
          valueClassName={profitColor}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        <Card title="Recent Tasks & Alerts">
          {alerts.length ? (
            alerts.map((a, i) => (
              <div key={i} className="p-3 border-l-[3px] border-accent bg-[#1a1a1a] rounded mb-2">
                <Tag tone={a.tone}>{a.title}</Tag>
                <p className="mt-1 text-sm">{a.message}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-muted py-6">No urgent alerts.</p>
          )}
        </Card>

        <Card title="P&L Overview">
          <div className="grid grid-cols-3 gap-4 mb-4">
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
              <div className={`text-xl font-bold ${profitColor}`}>{formatKES(netProfit)}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate?.("finance")}>
            View Details
          </Button>
        </Card>
      </div>
    </div>
  );
}
