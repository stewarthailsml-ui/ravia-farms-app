"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Table, Column } from "@/components/ui/table";
import { ArchiveButton } from "@/components/ui/archive-button";
import { ArchivedToggle } from "@/components/ui/archived-toggle";
import { CANINE_HEAT_DAYS, dayDiff } from "@/lib/constants";
import { useDogs, useDogHeats } from "./use-ravia-data";
import { RegisterDogModal, LogHeatEventModal } from "./modals/canine-modals";

interface Dog {
  id: string;
  name: string;
  breed: string;
  sex: string;
  source: string;
  price: number;
  soldAt: string | null;
}

export function CanineView() {
  const [showArchived, setShowArchived] = useState(false);
  const { data } = useDogs(showArchived);
  const { data: heats } = useDogHeats();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [heatOpen, setHeatOpen] = useState(false);

  const dogs: Dog[] = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    breed: d.breed,
    sex: d.sex,
    source: d.source,
    price: Number(d.price),
    soldAt: d.sold_at,
  }));

  const columns: Column<Dog>[] = [
    { key: "name", header: "Name", render: (d) => <strong>{d.name}</strong> },
    { key: "breed", header: "Breed" },
    { key: "sex", header: "Sex" },
    { key: "source", header: "Source" },
    { key: "price", header: "Price", render: (d) => (d.price || 0).toLocaleString("en-KE") },
    {
      key: "status",
      header: "Status",
      render: (d) =>
        d.soldAt ? (
          <Tag tone="danger">Sold {new Date(d.soldAt).toISOString().split("T")[0]}</Tag>
        ) : (
          <Tag tone="success">In Stock</Tag>
        ),
    },
    {
      key: "action",
      header: "Action",
      render: (d) => (showArchived ? null : <ArchiveButton id={d.id} queryKey="dogs" url="dogs" label="X" />),
    },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy" onClick={() => setRegisterOpen(true)}>
            <i className="fas fa-paw" /> Register Dog
          </Button>
        }
      >
        Canine Breeding
      </SectionHeader>

      <Tabs
        tabs={[
          {
            id: "reg",
            label: "Pack",
            content: (
              <Card>
                <div className="flex justify-end mb-3">
                  <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
                </div>
                <Table columns={columns} rows={dogs} emptyMessage="No dogs registered." />
              </Card>
            ),
          },
          {
            id: "heat",
            label: "Heat Cycles",
            content: (
              <Card title="Cycle Monitoring">
                {(heats ?? []).length === 0 ? (
                  <p className="text-muted">No heat events logged.</p>
                ) : (
                  (heats ?? []).map((h) => {
                    const days = dayDiff(h.date);
                    const next = CANINE_HEAT_DAYS - days;
                    return (
                      <div
                        key={h.id}
                        className="bg-[#1a1a1a] rounded p-3 mb-2 flex justify-between items-center"
                      >
                        <div>
                          <strong>{h.dog_name}</strong>
                          <br />
                          <small className="text-muted">
                            Last: {new Date(h.date).toISOString().split("T")[0]}
                          </small>
                        </div>
                        <div className="text-right">
                          <Tag tone="success">Next in {next} days</Tag>
                          <br />
                          <div className="mt-1">
                            <ArchiveButton id={h.id} queryKey="dog-heats" url="dog-heats" label="X" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setHeatOpen(true)}>
                  Log Heat Event
                </Button>
              </Card>
            ),
          },
        ]}
      />

      <RegisterDogModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <LogHeatEventModal open={heatOpen} onClose={() => setHeatOpen(false)} />
    </div>
  );
}
