"use client";

import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Table, Column } from "@/components/ui/table";
import { useRabbits } from "./use-ravia-data";

interface Rabbit {
  id: number;
  name: string;
  breed: string;
  sex: string;
  source: string;
  price: number;
}

const { data } = useRabbits();
const rabbits: Rabbit[] = (data ?? []).map((r, i) => ({
  id: i + 1,
  name: r.tagId,
  breed: r.breed,
  sex: r.sex,
  source: r.source,
  price: Number(r.price),
}));

export function RabbitryView() {
  const columns: Column<Rabbit>[] = [
    { key: "name", header: "Tag ID", render: (r) => <strong>{r.name}</strong> },
    { key: "breed", header: "Breed" },
    { key: "sex", header: "Sex" },
    { key: "source", header: "Source" },
    {
      key: "price",
      header: "Price",
      render: (r) => (r.price || 0).toLocaleString("en-KE"),
    },
    { key: "action", header: "Action", render: () => <Button variant="outline" size="sm">X</Button> },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy">
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
                  <p className="text-muted">No active pairings.</p>
                </Card>
                <Card title="Kindling Forecast">
                  <p className="text-muted">No forecasts yet.</p>
                </Card>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
