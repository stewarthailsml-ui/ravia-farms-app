"use client";

import { Card, StatCard, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { CompositionCard } from "@/components/ui/composition-card";
import {
  EGGS_PER_TRAY,
  INCUBATION_DAYS,
  formatDateLong,
  SILVERLANDS_VAC,
  RABBIT_KINDLING_ALERT,
  CANINE_HEAT_ALERT,
  dayDiff,
  vaccineStatus,
} from "@/lib/constants";
import { exportFarmBackup } from "@/lib/backup";
import { useToast } from "@/components/ui/toast";
import { SectionId } from "@/lib/constants";
import {
  usePoultryBatches,
  useVegetableUnits,
  useEggRecords,
  useEggStock,
  useIncubations,
  useInputs,
  useRabbits,
  useRabbitPairings,
  useDogs,
  useDogHeats,
  useProfile,
  useBatchVaccinations,
} from "./use-ravia-data";
import { animalsByBreed, liveAnimals, poultryByBreed, vegetablesByCrop } from "./farm-composition";
import { RabbitCards, DogCards } from "./dashboard-livestock-cards";

interface Alert {
  title: string;
  message: string;
  tone: "success" | "warning" | "danger";
}

export function DashboardView({ onNavigate }: { onNavigate?: (id: SectionId) => void }) {
  const { data: poultry } = usePoultryBatches();
  const { data: veg } = useVegetableUnits();
  const { data: eggs } = useEggRecords();
  const { data: eggStock } = useEggStock();
  const { data: incubations } = useIncubations();
  const { data: inputs } = useInputs();
  const { data: rabbitRows } = useRabbits();
  const { data: pairings } = useRabbitPairings();
  const { data: dogRows } = useDogs();
  const { data: heats } = useDogHeats();
  const { data: vaccinations } = useBatchVaccinations();
  const { isAdmin } = useProfile();
  const { showToast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const eggsToday = (eggs ?? []).filter((e) => e.date === today).reduce((a, b) => a + Number(b.count), 0);

  // ---------- Composition ----------
  const flock = poultryByBreed(poultry);
  const garden = vegetablesByCrop(veg);

  const rabbits = liveAnimals(rabbitRows);
  const dogs = liveAnimals(dogRows);
  const rabbitSplit = animalsByBreed(rabbits, "does", "bucks");
  const dogSplit = animalsByBreed(dogs, "bitches", "dogs");

  // ---------- Stock ----------
  const eggsOnHand = Number(eggStock?.on_hand ?? 0);
  const eggTrays = (eggsOnHand / EGGS_PER_TRAY).toFixed(1);

  // Only sets still inside the 21-day window are actually incubating; the
  // egg_stock view's `incubated` is cumulative and would keep counting hatched ones.
  const activeIncubations = (incubations ?? []).filter((i) => dayDiff(i.date) <= INCUBATION_DAYS);
  const eggsIncubating = activeIncubations.reduce((a, i) => a + Number(i.count), 0);
  const nextHatchDays = activeIncubations.length
    ? Math.max(0, Math.min(...activeIncubations.map((i) => INCUBATION_DAYS - dayDiff(i.date))))
    : null;

  // Units are heterogeneous (bags, litres, doses), so there is no meaningful
  // total to sum — the headline counts items, and the body lists them.
  const stockItems = (inputs?.stock ?? []).slice().sort((a, b) => {
    const cat = a.category.localeCompare(b.category);
    return cat !== 0 ? cat : a.name.localeCompare(b.name);
  });
  const itemsInStock = stockItems.filter((s) => Number(s.on_hand) > 0).length;

  // Real alert engine — vaccine due/overdue from recorded doses (not the
  // calendar), kindling window (28–31 days), canine heat recurrence (170–180).
  const alerts: Alert[] = [];

  // Per-batch administered-dose lookup, so a schedule point that was actually
  // given never raises an alert no matter how old the batch is.
  const givenByBatch = new Map<string, Set<number>>();
  for (const v of vaccinations ?? []) {
    if (!v.batch_id) continue;
    if (!givenByBatch.has(v.batch_id)) givenByBatch.set(v.batch_id, new Set());
    givenByBatch.get(v.batch_id)!.add(v.sched_day);
  }

  (poultry ?? []).forEach((b) => {
    const age = dayDiff(b.deploy_date);
    const given = givenByBatch.get(b.id);
    SILVERLANDS_VAC.forEach((v) => {
      // Already recorded — never an alert.
      if (given?.has(v.day)) return;
      const status = vaccineStatus(v.day, age, null);
      if (status.state === "due") {
        alerts.push({
          title: `Poultry: ${b.name}`,
          message: `Day ${v.day} vaccine DUE NOW: ${v.task}`,
          tone: "warning",
        });
      } else if (status.state === "overdue") {
        alerts.push({
          title: `Poultry: ${b.name}`,
          message: `Day ${v.day} vaccine OVERDUE by ${status.daysLate} days: ${v.task}`,
          tone: "danger",
        });
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

      {/* Composition — what the farm holds, split by breed and crop. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CompositionCard
          title="Poultry"
          icon="fa-kiwi-bird"
          total={flock.totalOnHand}
          unitLabel="birds on hand"
          subLine={`${flock.totalBatches} ${flock.totalBatches === 1 ? "batch" : "batches"} · ${eggsToday} eggs today`}
          rows={flock.rows}
          emptyMessage="No batches deployed yet."
          onTitleClick={() => onNavigate?.("poultry")}
        />
        <CompositionCard
          title="Vegetables"
          icon="fa-carrot"
          total={garden.totalStems}
          unitLabel="stems on hand"
          subLine={`${garden.totalUnits} ${garden.totalUnits === 1 ? "unit" : "units"}`}
          rows={garden.rows}
          emptyMessage="No units deployed yet."
          onTitleClick={() => onNavigate?.("vegetables")}
        />
        <CompositionCard
          title="Rabbits"
          icon="fa-rabbit"
          total={rabbitSplit.total}
          unitLabel="rabbits"
          subLine={`${rabbitSplit.females} does · ${rabbitSplit.males} bucks`}
          rows={rabbitSplit.rows}
          emptyMessage="No rabbits registered yet."
          onTitleClick={() => onNavigate?.("rabbits")}
        />
        <CompositionCard
          title="Dogs"
          icon="fa-dog"
          total={dogSplit.total}
          unitLabel="dogs"
          subLine={`${dogSplit.females} bitches · ${dogSplit.males} dogs`}
          rows={dogSplit.rows}
          emptyMessage="No dogs registered yet."
          onTitleClick={() => onNavigate?.("dogs")}
        />
      </div>

      {/* Stock on hand — produce and supplies. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-2">
        <StatCard
          icon={<i className="fas fa-egg" />}
          label="Eggs on Hand"
          value={eggsOnHand.toLocaleString()}
          sub={`${eggTrays} trays · ${eggsToday} collected today`}
        />
        <StatCard
          icon={<i className="fas fa-temperature-half" />}
          label="Eggs in Incubation"
          value={eggsIncubating.toLocaleString()}
          sub={
            nextHatchDays === null
              ? "No active sets"
              : `${activeIncubations.length} ${activeIncubations.length === 1 ? "set" : "sets"} · next hatch in ${nextHatchDays} d`
          }
        />
        <Card>
          <div className="text-accent text-xl mb-3">
            <i className="fas fa-boxes-stacked" />
          </div>
          <div className="text-muted text-sm font-medium">Feed &amp; Inputs</div>
          <div className="text-2xl font-bold mt-0.5">{itemsInStock}</div>
          <div className="text-muted text-sm mt-1">
            {stockItems.length === 0
              ? "Nothing tracked yet"
              : `of ${stockItems.length} ${stockItems.length === 1 ? "item" : "items"} in stock`}
          </div>
          {stockItems.length > 0 ? (
            <div className="mt-3 pt-3 border-t border-hairline flex flex-col gap-1 max-h-40 overflow-y-auto">
              {stockItems.map((s) => {
                const onHand = Number(s.on_hand);
                return (
                  <div key={s.item_id} className="flex justify-between gap-3 text-[0.75rem]">
                    <span className="text-muted truncate" title={s.name}>
                      {s.name}
                    </span>
                    <span className={onHand <= 0 ? "text-danger font-semibold shrink-0" : "shrink-0"}>
                      {onHand.toLocaleString()} {s.unit_label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      </div>

      {/* Every individual animal the farm holds. */}
      <RabbitCards rabbits={rabbits} />
      <DogCards dogs={dogs} />

      <div className="mt-8">
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
    </div>
  );
}
