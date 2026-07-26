"use client";

import { Card, SectionHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";

// Placeholder — replaced by API in Phase 3.
const batches: { name: string; breed: string; source: string; count: number; date: string }[] = [];

export function PoultryView() {
  return (
    <div>
      <SectionHeader
        action={
          <Button variant="deploy">
            <i className="fas fa-plus" /> Deploy Batch
          </Button>
        }
      >
        Poultry Hub
      </SectionHeader>

      <Tabs
        tabs={[
          {
            id: "sasso",
            label: "Poultry Batches",
            content: (
              <div>
                {batches.length === 0 ? (
                  <Card>
                    <p className="text-muted text-center py-6">
                      No batches yet. Deploy your first batch to begin.
                    </p>
                  </Card>
                ) : (
                  batches.map((b) => (
                    <Card key={b.name}>
                      <div className="flex justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">
                            {b.name}{" "}
                            <small className="text-accent text-[0.7rem]">
                              ({b.breed})
                            </small>
                          </h2>
                          <small className="text-muted">From: {b.source}</small>
                        </div>
                        <div className="text-right">
                          <Tag tone="success">{b.count} Birds</Tag>
                          <br />
                          <small>{b.date}</small>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ),
          },
          {
            id: "layers",
            label: "Layers & Eggs",
            content: (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card title="Egg Collection">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">0</span>
                    <Button variant="primary" size="sm">
                      Record
                    </Button>
                  </div>
                </Card>
                <Card title="Incubation">
                  <p className="text-muted">No active cycles.</p>
                </Card>
              </div>
            ),
          },
          {
            id: "health",
            label: "Health Log",
            content: (
              <Card title="Health & Mortality Records">
                <p className="text-muted text-center py-6">No incidents logged.</p>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
