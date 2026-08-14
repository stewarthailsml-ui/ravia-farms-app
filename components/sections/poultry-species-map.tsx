"use client";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { POULTRY_BREEDS } from "@/lib/constants";
import { usePoultryBatches } from "./use-ravia-data";

interface SpeciesRow {
  breed: string;
  batches: number;
  deployed: number;
  mortality: number;
  sold: number;
  onHand: number;
}

export function PoultrySpeciesMap() {
  // Deliberately unparameterised: the archive filter is exclusive (archived=true
  // returns *only* archived rows), so passing the Poultry Hub's toggle through
  // here would swap this card over to retired batches. The species split is a
  // statement about the live flock, so it always reads the live query.
  const { data: batches } = usePoultryBatches();

  const byBreed = (batches ?? []).reduce<Record<string, SpeciesRow>>((acc, b) => {
    const row = (acc[b.breed] ??= {
      breed: b.breed,
      batches: 0,
      deployed: 0,
      mortality: 0,
      sold: 0,
      onHand: 0,
    });
    row.batches += 1;
    row.deployed += Number(b.deployed);
    row.mortality += Number(b.mortality);
    row.sold += Number(b.sold);
    row.onHand += Number(b.on_hand);
    return acc;
  }, {});

  // Every canonical breed shows, including the ones at zero — an empty row is
  // itself the answer to "are we running any Broilers?". Breeds found on batches
  // but missing from the canonical list (legacy or renamed) are appended rather
  // than dropped, so the rows always sum to the farm total.
  const knownRows: SpeciesRow[] = POULTRY_BREEDS.map(
    (breed) =>
      byBreed[breed] ?? { breed, batches: 0, deployed: 0, mortality: 0, sold: 0, onHand: 0 },
  );
  const extraRows: SpeciesRow[] = Object.values(byBreed).filter(
    (r) => !POULTRY_BREEDS.includes(r.breed as (typeof POULTRY_BREEDS)[number]),
  );
  const rows = [...knownRows, ...extraRows];

  const totalOnHand = rows.reduce((a, r) => a + r.onHand, 0);
  const totalBatches = rows.reduce((a, r) => a + r.batches, 0);

  return (
    <Card title="Species Deployed" className="mb-6">
      <div className="flex justify-between items-baseline mb-5">
        <span className="text-[0.7rem] text-muted uppercase tracking-wide">
          Flock composition by breed
        </span>
        <span className="text-sm text-muted">
          <strong className="text-white text-lg">{totalOnHand.toLocaleString()}</strong> birds on
          hand
          <span className="mx-2 text-hairline">|</span>
          {totalBatches} {totalBatches === 1 ? "batch" : "batches"}
        </span>
      </div>

      {totalBatches === 0 ? (
        <p className="text-muted text-center py-6">
          No batches yet. Deploy your first batch to begin.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            // Guarded: an all-sold-out flock is a real state, and 0/0 would
            // otherwise render a NaN-width bar.
            const pct = totalOnHand > 0 ? (r.onHand / totalOnHand) * 100 : 0;
            const dimmed = r.onHand === 0 ? "opacity-50" : "";
            return (
              <div key={r.breed} className={dimmed}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="font-medium">{r.breed}</span>
                  <span className="text-sm">
                    <strong>{r.onHand.toLocaleString()}</strong>
                    <span className="text-muted"> on hand</span>
                    <span className="text-muted ml-2 tabular-nums">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <ProgressBar value={pct} />
                <div className="text-[0.7rem] text-muted mt-1.5">
                  deployed {r.deployed.toLocaleString()}
                  <span className="mx-1.5">·</span>
                  mortality {r.mortality.toLocaleString()}
                  <span className="mx-1.5">·</span>
                  sold {r.sold.toLocaleString()}
                  <span className="mx-1.5">·</span>
                  {r.batches} {r.batches === 1 ? "batch" : "batches"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
