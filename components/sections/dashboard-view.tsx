"use client";

import { Card, StatCard, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import {
  EGGS_PER_TRAY,
  STEMS_PER_UNIT,
  formatDateLong,
  SILVERLANDS_VAC,
  RABBIT_KINDLING_ALERT,
  CANINE_HEAT_ALERT,
  dayDiff,
} from "@/lib/constants";
import { exportFarmBackup } from "@/lib/backup";
import { useToast } from "@/components/ui/toast";
import { SectionId } from "@/lib/constants";
import {
  usePoultryBatches,
  useVegetableUnits,
  useEggRecords,
  useRabbits,
  useRabbitPairings,
  useDogs,
  useDogHeats,
  useProfile,
} from "./use-ravia-data";

interface Alert {
  title: string;
  message: string;
  tone: "success" | "warning" | "danger";
}

export function DashboardView({ onNavigate }: { onNavigate?: (id: SectionId) => void }) {
  const { data: poultry } = usePoultryBatches();
  const { data: veg } = useVegetableUnits();
  const { data: eggs } = useEggRecords();
  const { data: rabbits } = useRabbits();
  const { data: pairings } = useRabbitPairings();
  const { data: dogs } = useDogs();
  const { data: heats } = useDogHeats();
  const { isAdmin } = useProfile();
  const { showToast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const eggsToday = (eggs ?? []).filter((e) => e.date === today).reduce((a, b) => a + Number(b.count), 0);
  const trays = (eggsToday / EGGS_PER_TRAY).toFixed(1);

  const vegUnits = (veg ?? []).reduce((a, b) => a + b.units, 0);

  // Head counts for the overview row. `on_hand` is the live figure the Edge
  // Function merges from poultry_stock — `count` is the deploy number and never
  // moves, so summing it would keep counting dead and sold birds.
  const birdsOnHand = (poultry ?? []).reduce((a, b) => a + Number(b.on_hand), 0);
  const batchCount = (poultry ?? []).length;

  // A sold rabbit or dog keeps its row — sold_at is a state change, not a
  // deletion — so presence on the farm is "not archived and not sold".
  const liveRabbits = (rabbits ?? []).filter((r) => r.sold_at === null);
  const does = liveRabbits.filter((r) => r.sex.includes("(Female)")).length;
  const liveDogs = (dogs ?? []).filter((d) => d.sold_at === null);
  const bitches = liveDogs.filter((d) => d.sex.includes("(Female)")).length;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <OverviewTile
          icon="fa-kiwi-bird"
          label="Poultry"
          value={birdsOnHand}
          sub={`${batchCount} ${batchCount === 1 ? "batch" : "batches"} · ${eggsToday} eggs today (${trays} trays)`}
          onClick={() => onNavigate?.("poultry")}
        />
        <OverviewTile
          icon="fa-rabbit"
          label="Rabbits"
          value={liveRabbits.length}
          sub={`${does} does · ${liveRabbits.length - does} bucks`}
          onClick={() => onNavigate?.("rabbits")}
        />
        <OverviewTile
          icon="fa-dog"
          label="Dogs"
          value={liveDogs.length}
          sub={`${bitches} bitches · ${liveDogs.length - bitches} dogs`}
          onClick={() => onNavigate?.("dogs")}
        />
        <OverviewTile
          icon="fa-carrot"
          label="Vegetables"
          value={vegUnits * STEMS_PER_UNIT}
          sub={`stems across ${vegUnits} ${vegUnits === 1 ? "unit" : "units"}`}
          onClick={() => onNavigate?.("vegetables")}
        />
      </div>

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
    </div>
  );
}

// StatCard is a presentational primitive with no click affordance, so the drill-down
// wraps it rather than widening its props for this one caller.
function OverviewTile({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: string;
  label: string;
  value: number;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. View section.`}
      className="text-left rounded-ravia transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <StatCard
        icon={<i className={`fas ${icon}`} />}
        label={label}
        value={value.toLocaleString()}
        sub={sub}
      />
    </button>
  );
}
