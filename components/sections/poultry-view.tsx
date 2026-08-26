"use client";

import { useState, useMemo } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Table, Column } from "@/components/ui/table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ArchiveButton } from "@/components/ui/archive-button";
import { ArchivedToggle } from "@/components/ui/archived-toggle";
import {
  SILVERLANDS_VAC,
  POULTRY_MATURATION_DAYS,
  INCUBATION_DAYS,
  dayDiff,
  vaccineStatus,
} from "@/lib/constants";
import {
  usePoultryBatches,
  useEggRecords,
  useIncubations,
  usePoultryHealth,
  useEggStock,
  useBatchVaccinations,
} from "./use-ravia-data";
import {
  DeployPoultryBatchModal,
  EggCollectionModal,
  NewIncubationModal,
  PoultryHealthModal,
} from "./modals/poultry-modals";
import { PoultryLotDetailModal } from "./modals/lot-detail-modals";
import { PoultrySpeciesMap } from "./poultry-species-map";
import type { PoultryBatchRow } from "@/lib/api-client";

interface HealthRow {
  id: string;
  date: string;
  batch: string;
  issue: string;
  affected: number;
  mortality: number;
  rx: string | null;
}

export function PoultryView() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: batches } = usePoultryBatches(showArchived);
  const { data: eggs } = useEggRecords();
  const { data: incubations } = useIncubations();
  const { data: health } = usePoultryHealth();
  const { data: eggStock } = useEggStock();
  const { data: vaccinations } = useBatchVaccinations();

  // Per-batch lookup for the schedule chips on each card.
  const vacByBatch = useMemo(() => {
    const m = new Map<string, Map<number, { given_at: string }>>();
    for (const v of vaccinations ?? []) {
      if (!v.batch_id) continue;
      if (!m.has(v.batch_id)) m.set(v.batch_id, new Map());
      m.get(v.batch_id)!.set(v.sched_day, { given_at: v.given_at });
    }
    return m;
  }, [vaccinations]);

  const [deployOpen, setDeployOpen] = useState(false);
  const [eggOpen, setEggOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  // Lot detail: clicking a batch card opens its incidents + vaccination record.
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);
  // The health modal prefilled from "log incident for this lot".
  const [prefillBatchId, setPrefillBatchId] = useState<string | undefined>();

  const detailBatch: PoultryBatchRow | null =
    (batches ?? []).find((b) => b.id === detailBatchId) ?? null;

  const today = new Date().toISOString().split("T")[0];
  const eggsToday = (eggs ?? [])
    .filter((e) => e.date === today)
    .reduce((a, b) => a + Number(b.count), 0);

  const healthRows: HealthRow[] = (health ?? []).map((h) => ({
    id: h.id,
    date: new Date(h.date).toISOString().split("T")[0],
    batch: h.batch_name,
    issue: h.issue,
    affected: h.affected,
    mortality: h.mortality,
    rx: h.rx,
  }));

  const healthColumns: Column<HealthRow>[] = [
    { key: "date", header: "Date" },
    { key: "batch", header: "Batch" },
    { key: "issue", header: "Issue", render: (h) => <Tag tone="danger">{h.issue}</Tag> },
    { key: "affected", header: "Affected" },
    { key: "mortality", header: "Deaths", render: (h) => <strong>{h.mortality}</strong> },
    { key: "rx", header: "Action" },
    {
      key: "archive",
      header: "",
      render: (h) => (
        <ArchiveButton
          id={h.id}
          queryKey="poultry-health"
          url="poultry-health"
          label="X"
          alsoInvalidate={["poultry"]}
        />
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy" onClick={() => setDeployOpen(true)}>
            <i className="fas fa-plus" /> Deploy Batch
          </Button>
        }
      >
        Poultry Hub
      </SectionHeader>

      <PoultrySpeciesMap />

      <Tabs
        tabs={[
          {
            id: "sasso",
            label: "Poultry Batches",
            content: (
              <div>
                <div className="flex justify-end mb-3">
                  <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
                </div>
                {(batches ?? []).length === 0 ? (
                  <Card>
                    <p className="text-muted text-center py-6">
                      No batches yet. Deploy your first batch to begin.
                    </p>
                  </Card>
                ) : (
                  (batches ?? []).map((b) => {
                    const age = dayDiff(b.deploy_date);
                    const progress = Math.min((age / POULTRY_MATURATION_DAYS) * 100, 100);
                    const vacByDay = vacByBatch.get(b.id) ?? new Map();
                    return (
                      <Card
                        key={b.id}
                        className="cursor-pointer hover:border-primary/60 transition-colors"
                        onClick={() => setDetailBatchId(b.id)}
                      >
                        <div className="flex justify-between">
                          <div>
                            <h2 className="text-xl font-semibold">
                              {b.name} <small className="text-accent text-[0.7rem]">({b.breed})</small>
                            </h2>
                            <small className="text-muted">From: {b.source}</small>
                          </div>
                          <div className="text-right">
                            <Tag tone={b.on_hand <= 0 ? "danger" : "success"}>
                              {b.on_hand} of {b.deployed} Birds
                            </Tag>
                            <br />
                            <small>{new Date(b.deploy_date).toISOString().split("T")[0]}</small>
                          </div>
                        </div>
                        {b.mortality > 0 || b.sold > 0 ? (
                          <div className="text-[0.75rem] text-muted mb-2">
                            {b.mortality > 0 ? <span>{b.mortality} lost</span> : null}
                            {b.mortality > 0 && b.sold > 0 ? " · " : null}
                            {b.sold > 0 ? <span>{b.sold} sold</span> : null}
                          </div>
                        ) : null}
                        <div className="my-3">
                          <ProgressBar value={progress} />
                          <div className="flex justify-between text-[0.75rem] mt-1">
                            <span>Maturation</span>
                            <span>
                              Day {age}/{POULTRY_MATURATION_DAYS}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                          {SILVERLANDS_VAC.map((v) => {
                            // Real state from batch_vaccinations, not "old enough".
                            const status = vaccineStatus(
                              v.day,
                              age,
                              vacByDay.get(v.day)?.given_at ?? null,
                            );
                            const tone =
                              status.state === "done"
                                ? "success"
                                : status.state === "overdue"
                                  ? "danger"
                                  : status.state === "due"
                                    ? "warning"
                                    : "neutral";
                            return (
                              <div
                                key={v.day}
                                className={`rounded-md border p-2 text-center ${
                                  status.state === "done"
                                    ? "border-primary bg-primary/5"
                                    : status.state === "overdue"
                                      ? "border-danger bg-danger/10"
                                      : status.state === "due"
                                        ? "border-accent bg-accent/10"
                                        : "border-hairline bg-[#1a1a1a]"
                                }`}
                              >
                                <i
                                  className={`fas ${
                                    status.state === "done"
                                      ? "fa-check-circle text-primary"
                                      : status.state === "overdue"
                                        ? "fa-exclamation-circle text-danger"
                                        : status.state === "due"
                                          ? "fa-bell text-accent"
                                          : "fa-clock text-muted"
                                  }`}
                                />
                                <h4 className="text-[0.7rem] mt-1">Day {v.day}</h4>
                                <p className="text-[0.6rem] text-muted">{v.task}</p>
                                {status.state !== "pending" ? (
                                  <span
                                    className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[0.55rem] font-semibold ${
                                      status.state === "done"
                                        ? "bg-primary/15 text-primary"
                                        : status.state === "overdue"
                                          ? "bg-danger/15 text-danger"
                                          : "bg-accent/15 text-accent"
                                    }`}
                                  >
                                    {status.state === "done"
                                      ? "Done"
                                      : status.state === "overdue"
                                        ? `Late ${status.daysLate}d`
                                        : "Due"}
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        {!showArchived ? (
                          <div className="mt-4">
                            <ArchiveButton id={b.id} queryKey="poultry" url="poultry" label="Archive" />
                          </div>
                        ) : null}
                      </Card>
                    );
                  })
                )}
              </div>
            ),
          },
          {
            id: "layers",
            label: "Layers & Eggs",
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <Card title="Egg Collection">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{eggsToday}</span>
                    <Button variant="primary" size="sm" onClick={() => setEggOpen(true)}>
                      Record
                    </Button>
                  </div>
                  <small className="text-muted">Collected today</small>
                </Card>
                <Card title="Eggs In Stock">
                  <span className="text-2xl font-bold">{eggStock?.on_hand ?? 0}</span>
                  <div className="text-[0.75rem] text-muted mt-1">
                    {eggStock?.laid ?? 0} laid − {eggStock?.incubated ?? 0} incubating − {eggStock?.sold ?? 0} sold
                  </div>
                </Card>
                <Card title="Incubation">
                  {(incubations ?? []).length === 0 ? (
                    <p className="text-muted">No active cycles.</p>
                  ) : (
                    (incubations ?? []).map((n) => (
                      <div
                        key={n.id}
                        className="text-sm py-2 border-b border-hairline flex justify-between items-center"
                      >
                        <span>
                          {n.count} Eggs (Day {dayDiff(n.date)}/{INCUBATION_DAYS})
                        </span>
                        <ArchiveButton
                          id={n.id}
                          queryKey="incubations"
                          url="incubations"
                          label="X"
                          alsoInvalidate={["egg-stock"]}
                        />
                      </div>
                    ))
                  )}
                  <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setIncOpen(true)}>
                    New Cycle
                  </Button>
                </Card>
              </div>
            ),
          },
          {
            id: "health",
            label: "Health Log",
            content: (
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">
                    Health &amp; Mortality Records
                  </h3>
                  <Button variant="danger" size="sm" onClick={() => setHealthOpen(true)}>
                    Log Incident
                  </Button>
                </div>
                <Table columns={healthColumns} rows={healthRows} emptyMessage="No incidents logged." />
              </Card>
            ),
          },
        ]}
      />

      <DeployPoultryBatchModal open={deployOpen} onClose={() => setDeployOpen(false)} />
      <EggCollectionModal open={eggOpen} onClose={() => setEggOpen(false)} />
      <NewIncubationModal open={incOpen} onClose={() => setIncOpen(false)} />
      {/* Prefilled from a lot card's "log incident for this lot" button. */}
      <PoultryHealthModal
        open={healthOpen}
        onClose={() => {
          setHealthOpen(false);
          setPrefillBatchId(undefined);
        }}
        prefillBatchId={prefillBatchId}
      />
      <PoultryLotDetailModal
        open={detailBatch !== null}
        onClose={() => setDetailBatchId(null)}
        batch={detailBatch}
        onLogIncident={(batchId) => {
          setPrefillBatchId(batchId);
          setHealthOpen(true);
        }}
      />
    </div>
  );
}
