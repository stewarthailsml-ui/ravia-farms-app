"use client";

import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Table, Column } from "@/components/ui/table";
import { useDogs } from "./use-ravia-data";

interface Dog {
  id: number;
  name: string;
  breed: string;
  sex: string;
  source: string;
  price: number;
}

const { data } = useDogs();
const dogs: Dog[] = (data ?? []).map((d, i) => ({
  id: i + 1,
  name: d.name,
  breed: d.breed,
  sex: d.sex,
  source: d.source,
  price: Number(d.price),
}));

export function CanineView() {
  const columns: Column<Dog>[] = [
    { key: "name", header: "Name", render: (d) => <strong>{d.name}</strong> },
    { key: "breed", header: "Breed" },
    { key: "sex", header: "Sex" },
    { key: "source", header: "Source" },
    {
      key: "price",
      header: "Price",
      render: (d) => (d.price || 0).toLocaleString("en-KE"),
    },
    { key: "action", header: "Action", render: () => <Button variant="outline" size="sm">X</Button> },
  ];

  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy">
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
                <Table columns={columns} rows={dogs} emptyMessage="No dogs registered." />
              </Card>
            ),
          },
          {
            id: "heat",
            label: "Heat Cycles",
            content: (
              <Card title="Cycle Monitoring">
                <p className="text-muted">No heat events logged.</p>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
