"use client";

import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { StatCard } from "@/components/ui/card";
import { useVegetableUnits } from "./use-ravia-data";

const { data } = useVegetableUnits();
const batches = (data ?? []).map((b) => ({
  type: b.cropType,
  units: b.units,
  source: b.source,
  date: new Date(b.deployDate).toISOString().split("T")[0],
}));

export function VegetablesView() {
  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {batches.length === 0 ? (
                  <p className="text-muted col-span-full py-6">
                    No units deployed yet.
                  </p>
                ) : (
                  batches.map((b) => (
                    <StatCard
                      key={b.type}
                      label={b.type}
                      value={b.units}
                      sub={`Units (${b.units * 84} stems)`}
                    />
                  ))
                )}
              </div>
            ),
          },
          {
            id: "health",
            label: "Health Log",
            content: (
              <Card title="Crop Protection & Loss">
                <p className="text-muted text-center py-6">No issues logged.</p>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
