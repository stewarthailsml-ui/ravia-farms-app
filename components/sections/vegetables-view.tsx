"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Table, Column } from "@/components/ui/table";
import { ArchiveButton } from "@/components/ui/archive-button";
import { ArchivedToggle } from "@/components/ui/archived-toggle";
import { useVegetableUnits, useVegetableHealth } from "./use-ravia-data";
import { DeployVegetableUnitsModal, VegetableHealthModal } from "./modals/vegetables-modals";

interface HealthRow {
  id: string;
  date: string;
  batch: string;
  issue: string;
  affected: number;
  loss: number;
  rx: string | null;
}

export function VegetablesView() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: units } = useVegetableUnits(showArchived);
  const { data: health } = useVegetableHealth();

  const [deployOpen, setDeployOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);

  const healthRows: HealthRow[] = (health ?? []).map((h) => ({
    id: h.id,
    date: new Date(h.date).toISOString().split("T")[0],
    batch: h.batch_name,
    issue: h.issue,
    affected: h.affected,
    loss: h.loss,
    rx: h.rx,
  }));

  const healthColumns: Column<HealthRow>[] = [
    { key: "date", header: "Date" },
    { key: "batch", header: "Unit/Batch" },
    { key: "issue", header: "Issue", render: (h) => <Tag tone="warning">{h.issue}</Tag> },
    { key: "affected", header: "Affected" },
    { key: "loss", header: "Loss", render: (h) => <strong>{h.loss}</strong> },
    { key: "rx", header: "Action" },
    {
      key: "archive",
      header: "",
      render: (h) => (
        <ArchiveButton
          id={h.id}
          queryKey="vegetable-health"
          url="vegetable-health"
          label="X"
          alsoInvalidate={["vegetables"]}
        />
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy" onClick={() => setDeployOpen(true)}>
            <i className="fas fa-seedling" /> Deploy Units
          </Button>
        }
      >
        Vertical Garden
      </SectionHeader>

      <Tabs
        tabs={[
          {
            id: "inv",
            label: "Inventory",
            content: (
              <div>
                <div className="flex justify-end mb-3">
                  <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(units ?? []).length === 0 ? (
                    <p className="text-muted col-span-full py-6">No units deployed yet.</p>
                  ) : (
                    (units ?? []).map((u) => (
                      <div key={u.id} className="bg-card border border-hairline rounded-ravia shadow-card p-5">
                        <div className="flex justify-between items-start">
                          <h3 className="text-lg font-semibold">{u.crop_type}</h3>
                          {!showArchived ? (
                            <ArchiveButton id={u.id} queryKey="vegetables" url="vegetables" label="X" />
                          ) : null}
                        </div>
                        <div className="text-2xl font-bold mt-1">{u.units}</div>
                        <div className="text-muted text-sm mt-1">
                          Units ·{" "}
                          <span className={u.on_hand <= 0 ? "text-danger font-semibold" : undefined}>
                            {u.on_hand} of {u.deployed} stems on hand
                          </span>
                        </div>
                        {u.loss > 0 || u.sold > 0 ? (
                          <div className="text-[0.7rem] text-muted mt-1">
                            {u.loss > 0 ? <span>{u.loss} lost</span> : null}
                            {u.loss > 0 && u.sold > 0 ? " · " : null}
                            {u.sold > 0 ? <span>{u.sold} sold</span> : null}
                          </div>
                        ) : null}
                        <div className="text-[0.7rem] text-muted mt-2">
                          Source: {u.source} | {new Date(u.deploy_date).toISOString().split("T")[0]}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                    Crop Protection &amp; Loss
                  </h3>
                  <Button variant="danger" size="sm" onClick={() => setHealthOpen(true)}>
                    Log Issue
                  </Button>
                </div>
                <Table columns={healthColumns} rows={healthRows} emptyMessage="No issues logged." />
              </Card>
            ),
          },
        ]}
      />

      <DeployVegetableUnitsModal open={deployOpen} onClose={() => setDeployOpen(false)} />
      <VegetableHealthModal open={healthOpen} onClose={() => setHealthOpen(false)} />
    </div>
  );
}
