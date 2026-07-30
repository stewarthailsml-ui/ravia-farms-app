"use client";

import { useState } from "react";
import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Table, Column } from "@/components/ui/table";
import { ArchiveButton } from "@/components/ui/archive-button";
import { ArchivedToggle } from "@/components/ui/archived-toggle";
import { RABBIT_KINDLING_DAYS, dayDiff } from "@/lib/constants";
import { useRabbits, useRabbitPairings } from "./use-ravia-data";
import { RegisterRabbitModal, NewPairingModal } from "./modals/rabbitry-modals";

interface Rabbit {
  id: string;
  name: string;
  breed: string;
  sex: string;
  source: string;
  price: number;
}

export function RabbitryView() {
  const [showArchived, setShowArchived] = useState(false);
  const { data } = useRabbits(showArchived);
  const { data: pairings } = useRabbitPairings();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);

  const rabbits: Rabbit[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.tag_id,
    breed: r.breed,
    sex: r.sex,
    source: r.source,
    price: Number(r.price),
  }));

  const columns: Column<Rabbit>[] = [
    { key: "name", header: "Tag ID", render: (r) => <strong>{r.name}</strong> },
    { key: "breed", header: "Breed" },
    { key: "sex", header: "Sex" },
    { key: "source", header: "Source" },
    { key: "price", header: "Price", render: (r) => (r.price || 0).toLocaleString("en-KE") },
    {
      key: "action",
      header: "Action",
      render: (r) => (showArchived ? null : <ArchiveButton id={r.id} queryKey="rabbits" url="rabbits" label="X" />),
    },
  ];

  const forecasts = (pairings ?? [])
    .map((p) => {
      const days = dayDiff(p.date);
      const remaining = RABBIT_KINDLING_DAYS - days;
      return { p, remaining };
    })
    .filter(({ remaining }) => remaining >= -5);

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy" onClick={() => setRegisterOpen(true)}>
            <i className="fas fa-plus" /> Register Rabbit
          </Button>
        }
      >
        Rabbitry
      </SectionHeader>

      <Tabs
        tabs={[
          {
            id: "reg",
            label: "Registry",
            content: (
              <Card>
                <div className="flex justify-end mb-3">
                  <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
                </div>
                <Table columns={columns} rows={rabbits} emptyMessage="No rabbits registered." />
              </Card>
            ),
          },
          {
            id: "breed",
            label: "Breeding",
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card title="Active Pairings">
                  {(pairings ?? []).length === 0 ? (
                    <p className="text-muted">No active pairings.</p>
                  ) : (
                    (pairings ?? []).map((p) => (
                      <div
                        key={p.id}
                        className="py-2 border-b border-hairline text-sm flex justify-between items-center"
                      >
                        <span>
                          {p.doe_tag} x {p.buck_tag} ({new Date(p.date).toISOString().split("T")[0]})
                        </span>
                        <ArchiveButton id={p.id} queryKey="rabbit-pairings" url="rabbit-pairings" label="X" />
                      </div>
                    ))
                  )}
                  <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => setPairOpen(true)}>
                    New Pairing
                  </Button>
                </Card>
                <Card title="Kindling Forecast">
                  {forecasts.length === 0 ? (
                    <p className="text-muted">No forecasts yet.</p>
                  ) : (
                    forecasts.map(({ p, remaining }) => (
                      <div key={p.id} className="bg-[#1a1a1a] rounded p-2 mb-2">
                        <div className="flex justify-between">
                          <strong>{p.doe_tag}</strong>
                          <Tag tone={remaining <= 0 ? "danger" : "warning"}>
                            {remaining <= 0 ? "DUE" : `${remaining} Days`}
                          </Tag>
                        </div>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />

      <RegisterRabbitModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <NewPairingModal open={pairOpen} onClose={() => setPairOpen(false)} />
    </div>
  );
}
